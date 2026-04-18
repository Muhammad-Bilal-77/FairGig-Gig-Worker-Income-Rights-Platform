/**
 * JWT Plugin - Register fastify-jwt
 */

const fastifyJwt = require('@fastify/jwt');
const config = require('../config');

async function jwtPlugin(fastify) {
  await fastify.register(fastifyJwt, {
    secret: config.jwtSecret,
  });
}

module.exports = jwtPlugin;
