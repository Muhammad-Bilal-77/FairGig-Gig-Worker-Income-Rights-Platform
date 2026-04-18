// Business logic layer. No HTTP, no Fastify types here.
// Every function has a single responsibility.
// Every function documents what it does, why, and what it throws.

import bcrypt from 'bcryptjs';
import { randomUUID, randomBytes } from 'crypto';
import { createHash } from 'crypto';
import { query, withTransaction } from '../db.js';
import { config } from '../config.js';
import { sendVerificationEmail } from '../utils/mailer.js';

// ── Helpers ──────────────────────────────────────────────

// SHA-256 hash of a token — stored in DB instead of raw token.
// If DB is leaked, attacker gets hashes — cannot reconstruct JWTs.
export function hashToken(raw) {
  return createHash('sha256').update(raw).digest('hex');
}

// Sanitize a display name — allow ASCII printable + Urdu Unicode block.
// Strips control characters, emoji, and other unexpected characters.
function sanitizeName(name) {
  return name
    .replace(/[^\x20-\x7E\u0600-\u06FF\u0750-\u077F]/g, '')
    .trim()
    .slice(0, 100);
}

// ── User lookups ─────────────────────────────────────────

// Returns full user row including password_hash (needed for login check).
// ONLY call this in verifyCredentials — never return this object to client.
export async function findUserByEmailInternal(email) {
  const result = await query(
    `SELECT id, email, password_hash, full_name, phone, role,
            city, city_zone, worker_category,
            is_active, is_verified, email_verified, verification_status,
            last_login_at, created_at,
            failed_login_attempts, locked_until
     FROM auth_schema.users
     WHERE email = $1`,
    [email]
  );
  return result.rows[0] || null;
}

// Returns safe user object — NO password_hash. Use this everywhere else.
export async function findUserById(id) {
  const result = await query(
    `SELECT id, email, full_name, phone, role,
            city, city_zone, worker_category,
            is_active, is_verified, email_verified, verification_status,
            last_login_at, created_at
     FROM auth_schema.users
     WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

// ── Registration ─────────────────────────────────────────

export async function registerUser(body) {
  const email     = body.email.toLowerCase().trim();
  const full_name = sanitizeName(body.full_name);
  const role      = body.role;
  const phone     = body.phone?.trim()           || null;
  const city      = body.city?.trim()            || null;
  const city_zone = body.city_zone?.trim()       || null;
  const worker_category = body.worker_category   || null;

  // Check duplicate BEFORE hashing (hashing is expensive — 250ms).
  const existing = await query(
    'SELECT id FROM auth_schema.users WHERE email = $1',
    [email]
  );
  if (existing.rows.length > 0) {
    const err = new Error('Email already registered');
    err.statusCode = 409;
    throw err;
  }

  const password_hash = await bcrypt.hash(body.password, config.bcrypt.saltRounds);

  const result = await query(
    `INSERT INTO auth_schema.users
       (email, password_hash, full_name, role, phone,
        city, city_zone, worker_category, verification_status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'PENDING_EMAIL')
     RETURNING id, email, full_name, role, phone,
               city, city_zone, worker_category,
               is_active, is_verified, email_verified, verification_status, created_at`,
    [email, password_hash, full_name, role,
     phone, city, city_zone, worker_category]
  );

  const newUserId = result.rows[0].id;

  // Generate Email Verification Token
  const rawToken = randomBytes(32).toString('hex');
  const hashedToken = hashToken(rawToken);
  
  // 24 hour expiry
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  
  await query(
    `INSERT INTO auth_schema.email_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [newUserId, hashedToken, expiresAt]
  );

  // Send email (non-blocking)
  sendVerificationEmail(email, rawToken, full_name);

  return result.rows[0];
}

// ── Login / credential verification ──────────────────────

// TIMING SAFETY: Always run bcrypt.compare even when user is not found.
// An attacker cannot determine whether an email exists by measuring
// response time — both paths take ~250ms because bcrypt always runs.
const DUMMY_HASH = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGGaaaaabbbbbcccccdddddeeeee';

export async function verifyCredentials(email, password) {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await findUserByEmailInternal(normalizedEmail);

  // Always hash — timing attack prevention
  const hashToCheck = user ? user.password_hash : DUMMY_HASH;
  const passwordMatch = await bcrypt.compare(password, hashToCheck);

  // Check lockout AFTER bcrypt (to maintain constant timing)
  if (user && user.locked_until && new Date(user.locked_until) > new Date()) {
    const secondsRemaining = Math.ceil(
      (new Date(user.locked_until) - new Date()) / 1000
    );
    const err = new Error('Account temporarily locked due to too many failed attempts');
    err.statusCode = 429;
    err.secondsRemaining = secondsRemaining;
    throw err;
  }

  if (!user || !passwordMatch) {
    // Increment failed attempt counter if user exists
    if (user) {
      const newCount = (user.failed_login_attempts || 0) + 1;
      const shouldLock = newCount >= config.security.maxFailedAttempts;
      await query(
        `UPDATE auth_schema.users
         SET failed_login_attempts = $1,
             locked_until = $2,
             updated_at = NOW()
         WHERE id = $3`,
        [
          newCount,
          shouldLock
            ? new Date(Date.now() + config.security.lockoutDurationMs)
            : null,
          user.id,
        ]
      );
    }
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }

  if (!user.is_active) {
    const err = new Error('Account is deactivated. Contact support.');
    err.statusCode = 403;
    throw err;
  }

  // Successful login — reset lockout counters
  await query(
    `UPDATE auth_schema.users
     SET failed_login_attempts = 0,
         locked_until = NULL,
         last_login_at = NOW(),
         updated_at = NOW()
     WHERE id = $1`,
    [user.id]
  );

  return user;
}

// ── Refresh token management ─────────────────────────────

export async function storeRefreshToken(userId, tokenHash, family) {
  const expiresAt = new Date(Date.now() + config.jwt.refreshExpiryMs);
  await query(
    `INSERT INTO auth_schema.refresh_tokens
       (user_id, token_hash, family, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [userId, tokenHash, family, expiresAt]
  );
}

// Atomically rotate a refresh token using a DB transaction.
// Returns user_id of the token owner on success.
// Throws 401 on any invalid state.
// Throws 401 + deletes entire family on double-use (theft detected).
export async function rotateRefreshToken(oldHash, newHash, newFamily) {
  return await withTransaction(async (client) => {
    // FOR UPDATE locks the row — prevents race conditions from
    // concurrent refresh requests with the same token.
    const result = await client.query(
      `SELECT id, user_id, family, is_used, expires_at
       FROM auth_schema.refresh_tokens
       WHERE token_hash = $1
       FOR UPDATE`,
      [oldHash]
    );

    const token = result.rows[0];

    if (!token) {
      const err = new Error('Refresh token not recognized');
      err.statusCode = 401;
      throw err;
    }

    if (new Date() > new Date(token.expires_at)) {
      // Clean up expired token
      await client.query(
        'DELETE FROM auth_schema.refresh_tokens WHERE id = $1',
        [token.id]
      );
      const err = new Error('Refresh token has expired. Please log in again.');
      err.statusCode = 401;
      err.code = 'TOKEN_EXPIRED';
      throw err;
    }

    if (token.is_used) {
      // THEFT DETECTED — invalidate entire session family immediately.
      // The attacker used this token before the legitimate user could.
      // Both will now be logged out. The legitimate user must re-login.
      await client.query(
        'DELETE FROM auth_schema.refresh_tokens WHERE family = $1',
        [token.family]
      );
      const err = new Error(
        'Security alert: refresh token reuse detected. ' +
        'All sessions have been terminated for your safety. Please log in again.'
      );
      err.statusCode = 401;
      err.code = 'TOKEN_REUSE';
      throw err;
    }

    // Mark old token as used — cannot be used again
    await client.query(
      'UPDATE auth_schema.refresh_tokens SET is_used = TRUE WHERE id = $1',
      [token.id]
    );

    // Insert new token in the same family
    const expiresAt = new Date(Date.now() + config.jwt.refreshExpiryMs);
    await client.query(
      `INSERT INTO auth_schema.refresh_tokens
         (user_id, token_hash, family, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [token.user_id, newHash, token.family, expiresAt]
    );

    return token.user_id;
  });
}

// Logout: delete ALL refresh tokens for this user across all devices.
// Why all devices: gig workers may lose phones — they need full lockout.
export async function revokeAllUserTokens(userId) {
  const result = await query(
    'DELETE FROM auth_schema.refresh_tokens WHERE user_id = $1',
    [userId]
  );
  return result.rowCount;
}

// ── Two Step Verification ─────────────────────────────────────────

export async function verifyEmailToken(rawToken) {
  return await withTransaction(async (client) => {
    const hashedToken = hashToken(rawToken);
    
    // Find the token
    const result = await client.query(
      `SELECT id, user_id, expires_at FROM auth_schema.email_tokens
       WHERE token_hash = $1 FOR UPDATE`,
      [hashedToken]
    );

    const token = result.rows[0];
    if (!token) {
      const err = new Error('Invalid or expired verification link');
      err.statusCode = 400;
      throw err;
    }

    if (new Date() > new Date(token.expires_at)) {
      await client.query('DELETE FROM auth_schema.email_tokens WHERE id = $1', [token.id]);
      const err = new Error('Verification link has expired. Please request a new one.');
      err.statusCode = 400;
      throw err;
    }

    // Mark email as verified and transition to manual approval
    await client.query(
      `UPDATE auth_schema.users 
       SET email_verified = true, verification_status = 'PENDING_MANUAL'
       WHERE id = $1`,
      [token.user_id]
    );

    // Clean up used token
    await client.query('DELETE FROM auth_schema.email_tokens WHERE id = $1', [token.id]);
    
    return token.user_id;
  });
}

export async function approveUser(targetUserId, approverId, approverRole) {
  // First get target user role to enforce RBAC
  const targetUserResult = await query(
    'SELECT id, role, verification_status FROM auth_schema.users WHERE id = $1',
    [targetUserId]
  );
  
  const targetUser = targetUserResult.rows[0];
  if (!targetUser) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  if (targetUser.verification_status === 'APPROVED') {
    const err = new Error('User is already approved');
    err.statusCode = 400;
    throw err;
  }

  // RBAC Checks for Verification
  if (targetUser.role === 'verifier') {
    // Only admins can approve verifiers
    if (approverRole !== 'admin') {
      const err = new Error('Only admins can approve platform verifiers');
      err.statusCode = 403;
      throw err;
    }
  } else if (targetUser.role === 'worker' || targetUser.role === 'advocate') {
    // Both verifiers and admins can approve workers/advocates
    if (approverRole !== 'verifier' && approverRole !== 'admin') {
      const err = new Error(`Only a verifier or admin can approve a ${targetUser.role}`);
      err.statusCode = 403;
      throw err;
    }
  }

  // Effectuate approval
  await query(
    `UPDATE auth_schema.users 
     SET verification_status = 'APPROVED',
         is_verified = true,
         approved_by = $1,
         updated_at = NOW()
     WHERE id = $2`,
    [approverId, targetUserId]
  );
}

// ── Internal: user listing for other services ─────────────

export async function listUsers({ role, limit = 100, offset = 0 } = {}) {
  const params = [];
  const conditions = ['is_active = TRUE'];

  if (role) {
    params.push(role);
    conditions.push(`role = $${params.length}`);
  }

  params.push(Math.min(limit, 500), Math.max(offset, 0));

  const result = await query(
    `SELECT id, email, full_name, role, city, city_zone,
            worker_category, is_verified, created_at
     FROM auth_schema.users
     WHERE ${conditions.join(' AND ')}
     ORDER BY created_at ASC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return result.rows;
}
