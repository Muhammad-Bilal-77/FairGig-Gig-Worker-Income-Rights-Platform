// Grievance Service entry point

import { randomUUID } from 'crypto';
import Fastify from 'fastify';
import { config } from './config.js';
import { connectDB } from './db.js';
import jwtPlugin from './plugins/jwt.plugin.js';
import corsPlugin from './plugins/cors.plugin.js';
import fastifyWebsocket from '@fastify/websocket';
import { notificationEmitter } from './services/grievance.service.js';
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
  await fastify.register(fastifyWebsocket);

  fastify.get('/api/grievance/ws/notifications', { websocket: true }, (connection, req) => {
    // We expect the user token in query param for simplest WS auth, or just rely on cookie
    // Let's do simple query token auth
    const token = req.query.token;
    if (!token) {
      connection.socket.close(1008, 'Token required');
      return;
    }

    try {
      const decoded = fastify.jwt.verify(token);
      const userId = decoded.sub;

      const listener = (notification) => {
        if (notification.user_id === userId) {
          connection.socket.send(JSON.stringify(notification));
        }
      };

      notificationEmitter.on('notification', listener);

      connection.socket.on('close', () => {
        notificationEmitter.off('notification', listener);
      });
      connection.socket.on('error', () => {
        notificationEmitter.off('notification', listener);
      });
    } catch (err) {
      connection.socket.close(1008, 'Invalid token');
    }
  });

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
