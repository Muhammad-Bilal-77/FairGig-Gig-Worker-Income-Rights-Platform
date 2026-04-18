/**
 * CORS Plugin - Register @fastify/cors
 */

const fastifyCors = require('@fastify/cors');

async function corsPlugin(fastify) {
  await fastify.register(fastifyCors, {
    origin: true,
    credentials: true,
  });
}

module.exports = corsPlugin;
