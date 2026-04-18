import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import websocket from '@fastify/websocket';
import client from 'prom-client';
import { authMiddleware } from '@trust-network/auth-middleware';
import { trustRoutes } from './routes/trust.routes';
import {
  registerWebSocketRoutes,
  startTrustUpdateConsumer,
} from './services/websocket.service';
import { startScheduler, stopScheduler } from './services/scheduler.service';
import { initializeGraphSchema, closeNeo4j } from './utils/neo4j';
import { logger } from './utils/logger';

const PORT = parseInt(process.env.TRUST_ENGINE_PORT || '3002', 10);

async function bootstrap(): Promise<void> {
  const fastify = Fastify({ logger: false, trustProxy: true });

  await fastify.register(helmet, { contentSecurityPolicy: false });
  await fastify.register(cors, { origin: '*' });
  await fastify.register(websocket);
  await fastify.register(authMiddleware);

  await fastify.register(trustRoutes);
  registerWebSocketRoutes(fastify);

  client.collectDefaultMetrics({ prefix: 'trust_engine_' });

  fastify.get('/health', async () => ({
    status: 'ok',
    service: 'trust-engine',
    timestamp: new Date().toISOString(),
  }));

  fastify.get('/metrics', async (_request, reply) => {
    reply.header('Content-Type', client.register.contentType);
    return client.register.metrics();
  });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received. Shutting down`);
    await stopScheduler();
    await fastify.close();
    await closeNeo4j();
    process.exit(0);
  };

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });

  await initializeGraphSchema();
  await startScheduler();
  await startTrustUpdateConsumer();

  await fastify.listen({ port: PORT, host: '0.0.0.0' });
  logger.info(`Trust Engine running on port ${PORT}`);
}

void bootstrap();
