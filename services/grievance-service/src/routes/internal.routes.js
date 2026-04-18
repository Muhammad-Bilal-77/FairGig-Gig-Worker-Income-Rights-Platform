// Internal endpoints — health check, metrics, readiness

import { register } from '../metrics.js';
import { pool } from '../db.js';

async function internalRoutes(fastify) {
  // GET /health — Health check
  fastify.get('/health', async (request, reply) => {
    try {
      // Check DB connectivity
      const client = await pool.connect();
      try {
        await client.query('SELECT NOW()');
      } finally {
        client.release();
      }
      
      return reply.code(200).send({
        status: 'healthy',
        service: 'grievance-service',
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      return reply.code(503).send({
        status: 'unhealthy',
        service: 'grievance-service',
        error: err.message,
      });
    }
  });
  
  // GET /ready — Readiness check (same as health for now)
  fastify.get('/ready', async (request, reply) => {
    try {
      const client = await pool.connect();
      try {
        await client.query('SELECT NOW()');
      } finally {
        client.release();
      }
      
      return reply.code(200).send({ ready: true });
    } catch (err) {
      return reply.code(503).send({ ready: false, error: err.message });
    }
  });
  
  // GET /metrics — Prometheus metrics
  fastify.get('/metrics', async (request, reply) => {
    reply.type('text/plain; version=0.0.4; charset=utf-8');
    return register.metrics();
  });
}

export default internalRoutes;
