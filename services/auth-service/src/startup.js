// Startup tasks that run once before the server accepts traffic.
// Each task is idempotent — safe to run on every restart.

import { query } from './db.js';

// Task 1: Apply schema migrations needed by auth service.
// The auth_schema.users table exists from Prompt 1 but is missing
// the lockout columns. Add them here idempotently.
async function applyMigrations() {
  await query(`
    ALTER TABLE auth_schema.users
      ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'PENDING_EMAIL',
      ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth_schema.users(id);

    -- Add STATUS check constraint
    ALTER TABLE auth_schema.users DROP CONSTRAINT IF EXISTS users_status_check;
    ALTER TABLE auth_schema.users ADD CONSTRAINT users_status_check 
      CHECK (verification_status IN ('PENDING_EMAIL', 'PENDING_MANUAL', 'APPROVED', 'REJECTED'));

    -- Update ROLE check constraint to include admin
    ALTER TABLE auth_schema.users DROP CONSTRAINT IF EXISTS users_role_check;
    ALTER TABLE auth_schema.users ADD CONSTRAINT users_role_check 
      CHECK (role IN ('worker', 'verifier', 'advocate', 'admin'));

    CREATE TABLE IF NOT EXISTS auth_schema.email_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth_schema.users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL
    );
  `);
  console.log('[startup] Migrations applied');
}

// Task 2: Clean up expired refresh tokens.
// Tokens expire after 7 days. This cleanup runs on startup and
// then every 6 hours via a scheduled interval.
export async function cleanupExpiredTokens() {
  const result = await query(`
    DELETE FROM auth_schema.refresh_tokens
    WHERE expires_at < NOW()
  `);
  const deleted = result.rowCount;
  if (deleted > 0) {
    console.log(`[startup] Cleaned up ${deleted} expired refresh tokens`);
  }
}

// Task 3: Verify auth_svc user has correct schema access.
// This catches permission misconfigurations immediately at startup.
async function verifyPermissions() {
  try {
    await query('SELECT COUNT(*) FROM auth_schema.users LIMIT 1');
    await query('SELECT COUNT(*) FROM auth_schema.refresh_tokens LIMIT 1');
    console.log('[startup] Schema permissions verified');
  } catch (err) {
    throw new Error(
      `[startup] Permission check failed: ${err.message}\n` +
      `Ensure auth_svc user has USAGE on auth_schema and SELECT/INSERT/UPDATE/DELETE on all tables.`
    );
  }
}

export async function runStartupTasks() {
  console.log('[startup] Running startup tasks...');
  await applyMigrations();
  await verifyPermissions();
  await cleanupExpiredTokens();
  console.log('[startup] All startup tasks complete');
}
