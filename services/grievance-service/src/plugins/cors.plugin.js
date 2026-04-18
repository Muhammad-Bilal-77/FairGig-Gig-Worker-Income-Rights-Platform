// CORS plugin — allows cross-origin requests from frontend

import fp from 'fastify-plugin';
import fastifyCors from '@fastify/cors';

async function corsPlugin(fastify) {
  await fastify.register(fastifyCors, {
    origin: true, // Allow all origins in development
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });
}

export default fp(corsPlugin, {
  name: 'cors-plugin',
  fastify: '4.x',
});
