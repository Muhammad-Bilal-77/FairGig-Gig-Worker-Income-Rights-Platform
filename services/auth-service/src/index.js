import { randomUUID }    from 'crypto';
import Fastify           from 'fastify';
import { config }        from './config.js';
import { connectDB, pool } from './db.js';
import { runStartupTasks, cleanupExpiredTokens } from './startup.js';
import jwtPlugin         from './plugins/jwt.plugin.js';
import corsPlugin        from './plugins/cors.plugin.js';
import authRoutes        from './routes/auth.routes.js';
import internalRoutes    from './routes/internal.routes.js';
import { httpDurationHistogram } from './metrics.js';

async function buildApp() {
  const fastify = Fastify({
    logger: {
      level: config.log.level,
      transport: config.nodeEnv === 'development'
        ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } }
        : undefined,
    },
    // Unique ID on every request — passed to downstream services
    // as X-Request-ID for distributed tracing
    genReqId: () => randomUUID(),
    requestIdHeader: 'x-request-id',
    // Serialize dates as ISO strings not epoch numbers
    ajv: {
      customOptions: {
        coerceTypes:   true, // Coerce strings to numbers/booleans in query/params
        removeAdditional: true,
        useDefaults:   true,
      },
    },
  });

  // ── Request timing hook (Prometheus) ──────────────────
  fastify.addHook('onRequest', (request, reply, done) => {
    request.startTime = Date.now();
    done();
  });

  fastify.addHook('onResponse', (request, reply, done) => {
    const duration = (Date.now() - request.startTime) / 1000;
    httpDurationHistogram.observe(
      {
        method:      request.method,
        route:       request.routerPath || request.url,
        status_code: reply.statusCode,
      },
      duration
    );
    done();
  });

  // ── Global error handler ──────────────────────────────
  fastify.setErrorHandler((error, request, reply) => {
    const statusCode = error.statusCode || 500;

    fastify.log.error({
      err:       error,
      requestId: request.id,
      method:    request.method,
      url:       request.url,
    }, 'Request error');

    // Fastify validation errors (ajv) — return 400 with field details
    if (error.validation) {
      return reply.status(400).send({
        error:   'Validation Error',
        message: 'Request body or parameters failed validation',
        details: error.validation.map(v => ({
          field:   v.instancePath || v.dataPath || 'unknown',
          message: v.message,
        })),
      });
    }

    // Known application errors (set statusCode in service layer)
    if (statusCode < 500) {
      return reply.status(statusCode).send({
        error:   error.message,
      });
    }

    // Unknown 500 errors — never expose stack to client in production
    return reply.status(500).send({
      error: 'Internal server error',
      ...(config.nodeEnv === 'development'
        ? { debug: error.stack }
        : {}),
    });
  });



  // ── Plugin registration (ORDER MATTERS) ───────────────
  await fastify.register(corsPlugin);
  await fastify.register(jwtPlugin);

  // ── Route registration ────────────────────────────────
  await fastify.register(authRoutes,     { prefix: '/api/auth' });
  await fastify.register(internalRoutes);

  // ── 404 handler (MUST be last) ─────────────────────────
  fastify.setNotFoundHandler((request, reply) => {
    fastify.log.warn({
      method: request.method,
      url:    request.url,
      ip:     request.ip,
    }, 'Route not found');

    reply.status(404).send({
      error:  'Not Found',
      message: `Route ${request.method} ${request.url} not found on this server`,
      method: request.method,
      path:   request.url,
    });
  });

  return fastify;
}

async function main() {
  // Step 1: Verify environment is complete (crashes with clear message if not)
  // config.js runs required() — errors thrown at import time above

  // Step 2: Connect to PostgreSQL
  await connectDB();

  // Step 3: Run startup tasks (migrations, cleanup, permission check)
  await runStartupTasks();

  // Step 4: Build the Fastify app
  const app = await buildApp();

  // Step 5: Start listening
  try {
    await app.listen({
      port: config.port,
      host: '0.0.0.0',
    });
    console.log(`\n╔═══════════════════════════════════════╗`);
    console.log(`║   FairGig Auth Service RUNNING        ║`);
    console.log(`║   Port:    ${config.port}                       ║`);
    console.log(`║   Env:     ${config.nodeEnv.padEnd(27)}║`);
    console.log(`║   Health:  http://localhost:${config.port}/health ║`);
    console.log(`║   Metrics: http://localhost:${config.port}/metrics║`);
    console.log(`╚═══════════════════════════════════════╝\n`);
  } catch (err) {
    console.error('[auth-service] Failed to start server:', err);
    process.exit(1);
  }

  // Step 6: Schedule periodic cleanup every 6 hours
  const SIX_HOURS = 6 * 60 * 60 * 1000;
  const cleanupInterval = setInterval(async () => {
    try {
      await cleanupExpiredTokens();
    } catch (err) {
      console.error('[cleanup] Token cleanup failed:', err.message);
    }
  }, SIX_HOURS);
  cleanupInterval.unref(); // Don't block process exit

  // Step 7: Graceful shutdown
  const shutdown = async (signal) => {
    console.log(`\n[auth-service] ${signal} received. Shutting down gracefully...`);
    clearInterval(cleanupInterval);
    await app.close();     // Stop accepting new requests, finish in-flight
    await pool.end();      // Close all DB connections
    console.log('[auth-service] Shutdown complete.');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));

  // Step 8: Handle uncaught errors — log and exit so process manager restarts
  process.on('uncaughtException', (err) => {
    console.error('[auth-service] Uncaught exception:', err);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    console.error('[auth-service] Unhandled rejection:', reason);
    process.exit(1);
  });
}

main();
