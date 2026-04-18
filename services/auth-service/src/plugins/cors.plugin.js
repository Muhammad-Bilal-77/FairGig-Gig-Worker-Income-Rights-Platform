import fp from 'fastify-plugin';
import cors from '@fastify/cors';
import { config } from '../config.js';

async function corsPlugin(fastify) {
  await fastify.register(cors, {
    origin: config.nodeEnv === 'production'
      ? ['https://fairgig.com']
      : true,
    methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposedHeaders: ['X-Request-ID'],
    credentials:    true,
    maxAge:         86400, // preflight cache: 24 hours
  });
}

export default fp(corsPlugin, { name: 'cors-plugin' });
