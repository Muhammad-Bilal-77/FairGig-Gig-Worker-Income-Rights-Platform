// Registers TWO @fastify/jwt instances with different namespaces.
// This is the ONLY correct approach in @fastify/jwt v8 for dual-secret JWTs.
//
// After registration:
//   fastify.accessSign(payload)     — signs with ACCESS_SECRET, 15m expiry
//   fastify.accessVerify(token)     — verifies with ACCESS_SECRET
//   fastify.refreshSign(payload)    — signs with REFRESH_SECRET, 7d expiry
//   fastify.refreshVerify(token)    — verifies with REFRESH_SECRET
//
// The authenticate hook uses fastify.accessVerify() directly.

import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import { config } from '../config.js';

async function jwtPlugin(fastify) {
  // Access token JWT — short-lived, used for every API call
  await fastify.register(fastifyJwt, {
    secret:     config.jwt.accessSecret,
    namespace:  'access',
    jwtVerify:  'accessVerify',
    jwtSign:    'accessSign',
    sign: {
      expiresIn: config.jwt.accessExpiry,
      issuer:    'fairgig-auth',
      audience:  'fairgig-api',
    },
    verify: {
      issuer:   'fairgig-auth',
      audience: 'fairgig-api',
    },
  });

  // Refresh token JWT — long-lived, stored (hashed) in DB
  await fastify.register(fastifyJwt, {
    secret:     config.jwt.refreshSecret,
    namespace:  'refresh',
    jwtVerify:  'refreshVerify',
    jwtSign:    'refreshSign',
    sign: {
      expiresIn: config.jwt.refreshExpiry,
      issuer:    'fairgig-auth',
      audience:  'fairgig-refresh',
    },
    verify: {
      issuer:   'fairgig-auth',
      audience: 'fairgig-refresh',
    },
  });
}

export default fp(jwtPlugin, {
  name: 'jwt-plugin',
  fastify: '4.x',
});
