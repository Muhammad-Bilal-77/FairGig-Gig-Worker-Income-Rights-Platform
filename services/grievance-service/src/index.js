// Grievance Service entry point

import { randomUUID } from 'crypto';
import Fastify from 'fastify';
import { config } from './config.js';
import { connectDB } from './db.js';
import jwtPlugin from './plugins/jwt.plugin.js';
import corsPlugin from './plugins/cors.plugin.js';
import complaintsRoutes from './routes/complaints.routes.js';
import internalRoutes from './routes/internal.routes.js';
import { httpDurationHistogram } from './metrics.js';

async function buildApp() {
  const fastify = Fastify({
    logger: {
      level: config.log.level,
      transport: config.nodeEnv === 'development'
        ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } }
        : undefined,
    },
    genReqId: () => randomUUID(),
    requestIdHeader: 'x-request-id',
    ajv: {
      customOptions: {
        coerceTypes:   'array',
        removeAdditional: true,
        useDefaults:   true,
      },
    },
  });

  // Request timing hook (Prometheus)
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

  // Register plugins
  await fastify.register(jwtPlugin);
  await fastify.register(corsPlugin);

  // Register routes
  await fastify.register(internalRoutes);
  await fastify.register(complaintsRoutes, { prefix: '/api/grievance' });

  return fastify;
}

async function start() {
  try {
    // Connect to DB first — fail fast if unreachable
    await connectDB();

    // Build and start app
    const fastify = await buildApp();
    await fastify.listen({ port: config.port, host: '0.0.0.0' });

    console.log(`✓ Grievance Service listening on port ${config.port}`);
    console.log(`  Health check: http://localhost:${config.port}/health`);
    console.log(`  Metrics: http://localhost:${config.port}/metrics`);
  } catch (err) {
    console.error('Fatal startup error:', err);
    process.exit(1);
  }
}

start();
