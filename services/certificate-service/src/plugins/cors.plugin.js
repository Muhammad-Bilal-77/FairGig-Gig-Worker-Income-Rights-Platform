/**
 * CORS Plugin - Register @fastify/cors
 */

const fastifyCors = require('@fastify/cors');

async function corsPlugin(fastify) {
  await fastify.register(fastifyCors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    credentials: true,
  });
}

module.exports = corsPlugin;
