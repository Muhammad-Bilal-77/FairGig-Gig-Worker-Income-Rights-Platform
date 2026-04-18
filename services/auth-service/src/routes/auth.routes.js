import { randomUUID }   from 'crypto';
import { config }       from '../config.js';
import {
  registerBodySchema,
  loginBodySchema,
  refreshBodySchema,
  safeUserSchema,
} from '../schemas/auth.schemas.js';
import {
  registerUser,
  verifyCredentials,
  findUserById,
  storeRefreshToken,
  rotateRefreshToken,
  revokeAllUserTokens,
  hashToken,
  verifyEmailToken,
  approveUser,
  resendVerificationEmail,
  listWorkersForVerifier,
  setWorkerActiveStatus,
} from '../services/auth.service.js';
import { authenticate, requireRole } from '../hooks/authenticate.js';
import {
  loginCounter,
  registerCounter,
  tokenRefreshCounter,
  refreshActiveSessionsGauge,
} from '../metrics.js';
import { query } from '../db.js';
import { sendWorkerStatusUpdateEmail } from '../utils/mailer.js';

export default async function authRoutes(fastify) {

  // ── POST /api/auth/register ──────────────────────────
  fastify.post('/register', {
    schema: {
      body: registerBodySchema,
      response: {
        201: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            user: safeUserSchema,
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const user = await registerUser(request.body);
      registerCounter.inc({ status: 'success' });
      return reply.status(201).send({
        message: 'Account created successfully. You can now log in.',
        user,
      });
    } catch (err) {
      if (err.statusCode === 409) {
        registerCounter.inc({ status: 'duplicate' });
      }
      throw err;
    }
  });


  // ── POST /api/auth/login ─────────────────────────────
  fastify.post('/login', {
    schema: {
      body: loginBodySchema,
      response: {
        200: {
          type: 'object',
          properties: {
            access_token:  { type: 'string' },
            refresh_token: { type: 'string' },
            token_type:    { type: 'string' },
            expires_in:    { type: 'number' },
            user: safeUserSchema,
          },
        },
      },
    },
  }, async (request, reply) => {
    const { email, password } = request.body;

    let user;
    try {
      user = await verifyCredentials(email, password);
    } catch (err) {
      if (err.statusCode === 429) {
        loginCounter.inc({ status: 'locked' });
        return reply.status(429).send({
          error: err.message,
          seconds_remaining: err.secondsRemaining,
          retry_after: new Date(
            Date.now() + err.secondsRemaining * 1000
          ).toISOString(),
        });
      }
      if (err.code === 'EMAIL_NOT_VERIFIED') {
        loginCounter.inc({ status: 'email_not_verified' });
        return reply.status(403).send({
          error: err.message,
          code: 'EMAIL_NOT_VERIFIED',
        });
      }
      loginCounter.inc({ status: 'failure' });
      // Always 401 — never reveal which field is wrong
      return reply.status(401).send({
        error: 'Invalid email or password',
      });
    }

    // Build JWT payload — minimal, no sensitive data
    const jwtPayload = {
      sub:    user.id,
      role:   user.role,
      name:   user.full_name,
      zone:   user.city_zone || null,
      status: user.verification_status,
    };

    // Sign access token (15 min)
    const access_token  = fastify.jwt.access.sign(jwtPayload);

    // Sign refresh token (7 days) with a new family ID
    const family        = randomUUID();
    const refresh_token = fastify.jwt.refresh.sign({ sub: user.id, family });

    // Store hashed refresh token in DB
    await storeRefreshToken(user.id, hashToken(refresh_token), family);

    loginCounter.inc({ status: 'success' });
    await refreshActiveSessionsGauge(query);

    return reply.send({
      access_token,
      refresh_token,
      token_type: 'Bearer',
      expires_in: 900, // 15 minutes in seconds
      user: {
        id:              user.id,
        email:           user.email,
        full_name:       user.full_name,
        phone:           user.phone,
        role:            user.role,
        city:            user.city,
        city_zone:       user.city_zone,
        worker_category:     user.worker_category,
        is_active:           user.is_active,
        is_verified:         user.is_verified,
        email_verified:      user.email_verified,
        verification_status: user.verification_status,
        created_at:          user.created_at,
        last_login_at:       user.last_login_at,
      },
    });
  });


  // ── POST /api/auth/refresh ───────────────────────────
  fastify.post('/refresh', {
    schema: { body: refreshBodySchema },
  }, async (request, reply) => {
    const { refresh_token } = request.body;

    // Verify refresh token signature and expiry using REFRESH secret
    let decoded;
    try {
      decoded = fastify.jwt.refresh.verify(refresh_token);
    } catch (err) {
      tokenRefreshCounter.inc({ status: 'invalid' });
      return reply.status(401).send({
        error: 'Invalid or malformed refresh token',
      });
    }

    // Generate replacement refresh token (same family)
    const new_refresh_token = fastify.jwt.refresh.sign({
      sub:    decoded.sub,
      family: decoded.family,
    });

    // Rotate in DB — validates old token, stores new, detects theft
    let userId;
    try {
      userId = await rotateRefreshToken(
        hashToken(refresh_token),
        hashToken(new_refresh_token),
        decoded.family
      );
    } catch (err) {
      if (err.code === 'TOKEN_REUSE') {
        tokenRefreshCounter.inc({ status: 'theft' });
      } else if (err.code === 'TOKEN_EXPIRED') {
        tokenRefreshCounter.inc({ status: 'expired' });
      } else {
        tokenRefreshCounter.inc({ status: 'invalid' });
      }
      return reply.status(401).send({ error: err.message });
    }

    const user = await findUserById(userId);
    if (!user || !user.is_active) {
      return reply.status(401).send({
        error: 'User account not found or deactivated',
      });
    }

    const access_token = fastify.jwt.access.sign({
      sub:    user.id,
      role:   user.role,
      name:   user.full_name,
      zone:   user.city_zone || null,
      status: user.verification_status,
    });

    tokenRefreshCounter.inc({ status: 'success' });
    await refreshActiveSessionsGauge(query);

    return reply.send({
      access_token,
      refresh_token: new_refresh_token,
      token_type: 'Bearer',
      expires_in: 900,
    });
  });


  // ── POST /api/auth/logout ────────────────────────────
  fastify.post('/logout', {
    preHandler: [authenticate],
  }, async (request, reply) => {
    const revoked = await revokeAllUserTokens(request.user.sub);
    await refreshActiveSessionsGauge(query);
    return reply.send({
      message: `Logged out successfully. ${revoked} session(s) terminated.`,
    });
  });


  // ── GET /api/auth/me ─────────────────────────────────
  fastify.get('/me', {
    preHandler: [authenticate],
    schema: {
      response: { 200: safeUserSchema },
    },
  }, async (request, reply) => {
    const user = await findUserById(request.user.sub);
    if (!user) {
      return reply.status(404).send({
        error: 'User not found',
        message: 'Your account may have been deactivated. Contact support.',
      });
    }
    return reply.send(user);
  });

  // ── GET /api/auth/profile ───────────────────────────
  // Alias for /me — convenience endpoint
  fastify.get('/profile', {
    preHandler: [authenticate],
    schema: {
      response: { 200: safeUserSchema },
    },
  }, async (request, reply) => {
    const user = await findUserById(request.user.sub);
    if (!user) {
      return reply.status(404).send({
        error: 'User not found',
        message: 'Your account may have been deactivated. Contact support.',
      });
    }
    return reply.send(user);
  });
  // ── PUT /api/auth/me ───────────────────────────────────
  // Update user profile
  fastify.put('/me', {
    preHandler: [authenticate],
    schema: {
      body: {
        type: 'object',
        properties: {
          full_name: { type: 'string', minLength: 2, maxLength: 100 },
          phone: { type: 'string' },
          city: { type: 'string', maxLength: 100 },
          city_zone: { type: 'string', maxLength: 100 },
          worker_category: { type: 'string' },
        },
      },
      response: { 200: safeUserSchema },
    },
  }, async (request, reply) => {
    const userId = request.user.sub;
    const updates = request.body;
    
    // Sanitize updates
    const updateFields = {};
    if (updates.full_name) {
      updateFields.full_name = updates.full_name.trim().slice(0, 100);
    }
    if (updates.phone !== undefined) {
      updateFields.phone = updates.phone?.trim() || null;
    }
    if (updates.city !== undefined) {
      updateFields.city = updates.city?.trim() || null;
    }
    if (updates.city_zone !== undefined) {
      updateFields.city_zone = updates.city_zone?.trim() || null;
    }
    if (updates.worker_category !== undefined) {
      updateFields.worker_category = updates.worker_category || null;
    }

    if (Object.keys(updateFields).length === 0) {
      return reply.status(400).send({ error: 'No fields to update' });
    }

    // Build SET clause dynamically
    const setClause = Object.keys(updateFields)
      .map((field) => `${field} = $${Object.keys(updateFields).indexOf(field) + 1}`)
      .join(', ');

    const values = Object.values(updateFields);
    values.push(userId);

    try {
      const result = await query(
        `UPDATE auth_schema.users
         SET ${setClause}
         WHERE id = $${values.length}
         RETURNING id, email, full_name, phone, role,
                   city, city_zone, worker_category,
                   is_active, is_verified, email_verified, verification_status,
                   last_login_at, created_at`,
        values
      );

      if (result.rows.length === 0) {
        return reply.status(404).send({ error: 'User not found' });
      }

      return reply.send(result.rows[0]);
    } catch (err) {
      fastify.log.error(err);
      throw err;
    }
  });
  // ── POST /api/auth/verify-email ──────────────────────
  fastify.post('/verify-email', {
    schema: {
      body: {
        type: 'object',
        required: ['token'],
        properties: { token: { type: 'string' } }
      }
    }
  }, async (request, reply) => {
    const { token } = request.body;
    await verifyEmailToken(token);
    return reply.send({ message: 'Email verified successfully. Your account is now pending manual approval.' });
  });

  // ── POST /api/auth/resend-verification ────────────────
  fastify.post('/resend-verification', {
    schema: {
      body: {
        type: 'object',
        required: ['email'],
        properties: { email: { type: 'string', format: 'email' } }
      }
    }
  }, async (request, reply) => {
    const { email } = request.body;
    const result = await resendVerificationEmail(email);
    return reply.send(result);
  });

  // ── POST /api/auth/approve ───────────────────────────
  fastify.post('/approve', {
    preHandler: [authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['user_id'],
        properties: { user_id: { type: 'string', format: 'uuid' } }
      }
    }
  }, async (request, reply) => {
    const { user_id } = request.body;
    
    // Only verifiers and admins can even call this route
    if (request.user.role !== 'verifier' && request.user.role !== 'admin') {
      return reply.status(403).send({ error: 'Forsake. Only verifiers or admins can approve users.' });
    }

    try {
      await approveUser(user_id, request.user.sub, request.user.role);
      return reply.send({ message: 'User approved successfully.' });
    } catch (err) {
      // Allow the 404/403/400 errors from approveUser to propagate correctly
      throw err; 
    }
  });

  // ── GET /api/auth/workers ───────────────────────────
  // Verifier dashboard worker list (active only by default)
  fastify.get('/workers', {
    preHandler: [authenticate, requireRole('verifier', 'admin')],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          include_inactive: { type: 'boolean', default: false },
          search: { type: 'string', maxLength: 150 },
          limit: { type: 'integer', minimum: 1, maximum: 500, default: 100 },
          offset: { type: 'integer', minimum: 0, default: 0 },
        },
      },
    },
  }, async (request, reply) => {
    const workers = await listWorkersForVerifier({
      includeInactive: Boolean(request.query.include_inactive),
      search: request.query.search || null,
      limit: request.query.limit,
      offset: request.query.offset,
    });

    return reply.send({
      success: true,
      data: workers,
      count: workers.length,
    });
  });

  // ── PATCH /api/auth/workers/:id/status ──────────────
  // Verifier can activate/deactivate worker accounts
  fastify.patch('/workers/:id/status', {
    preHandler: [authenticate, requireRole('verifier', 'admin')],
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        required: ['is_active'],
        additionalProperties: false,
        properties: {
          is_active: { type: 'boolean' },
        },
      },
    },
  }, async (request, reply) => {
    const updatedWorker = await setWorkerActiveStatus(
      request.params.id,
      request.body.is_active
    );

    const actorName = request.user?.name || 'FairGig verifier team';
    sendWorkerStatusUpdateEmail(
      updatedWorker.email,
      updatedWorker.full_name,
      updatedWorker.is_active,
      actorName,
    );

    return reply.send({
      success: true,
      data: updatedWorker,
    });
  });

}
