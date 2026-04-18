// Internal endpoints — called by other FairGig services, not by users.
// Nginx does NOT expose /internal/* paths to the internet.
// No auth required — these only work from localhost or Docker network.

import { listUsers, findUserById } from '../services/auth.service.js';
import { query } from '../db.js';
import { register } from '../metrics.js';

export default async function internalRoutes(fastify) {

  // ── GET /health ──────────────────────────────────────
  // Basic liveness check — no DB query.
  fastify.get('/health', async () => ({
    status:  'ok',
    service: 'auth-service',
    version: '1.0.0',
    uptime:  process.uptime(),
  }));


  // ── GET /internal/health ─────────────────────────────
  // Deep health check — verifies DB connectivity and reports stats.
  fastify.get('/internal/health', async (request, reply) => {
    try {
      const [userResult, tokenResult] = await Promise.all([
        query('SELECT COUNT(*) AS total FROM auth_schema.users'),
        query(
          `SELECT
             COUNT(*) FILTER (WHERE is_used = FALSE AND expires_at > NOW()) AS active,
             COUNT(*) AS total
           FROM auth_schema.refresh_tokens`
        ),
      ]);
      return reply.send({
        status:          'ok',
        service:         'auth-service',
        db:              'connected',
        user_count:      parseInt(userResult.rows[0].total, 10),
        active_sessions: parseInt(tokenResult.rows[0].active, 10),
        total_tokens:    parseInt(tokenResult.rows[0].total, 10),
        timestamp:       new Date().toISOString(),
        uptime_seconds:  Math.floor(process.uptime()),
      });
    } catch (err) {
      return reply.status(503).send({
        status:  'error',
        service: 'auth-service',
        db:      'disconnected',
        error:   err.message,
      });
    }
  });


  // ── GET /metrics ─────────────────────────────────────
  // Prometheus scrape endpoint — Prometheus container polls this.
  fastify.get('/metrics', async (request, reply) => {
    reply.header('Content-Type', register.contentType);
    return reply.send(await register.metrics());
  });


  // ── GET /internal/users ──────────────────────────────
  // List users — called by earnings service to validate worker IDs,
  // by analytics service to count workers per zone.
  fastify.get('/internal/users', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          role:   { type: 'string', enum: ['worker', 'verifier', 'advocate'] },
          limit:  { type: 'integer', minimum: 1, maximum: 500, default: 100 },
          offset: { type: 'integer', minimum: 0, default: 0 },
        },
      },
    },
  }, async (request, reply) => {
    const users = await listUsers(request.query);
    return reply.send({ users, count: users.length });
  });


  // ── GET /internal/users/:id ──────────────────────────
  // Get single user by UUID — called when other services need to
  // validate that a worker_id exists and is active.
  fastify.get('/internal/users/:id', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
    },
  }, async (request, reply) => {
    const user = await findUserById(request.params.id);
    if (!user) {
      return reply.status(404).send({
        error:   'User not found',
        user_id: request.params.id,
      });
    }
    return reply.send(user);
  });

}
