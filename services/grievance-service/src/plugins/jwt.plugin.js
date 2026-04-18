// JWT plugin — registers @fastify/jwt with access token namespace

import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import { config } from '../config.js';

async function jwtPlugin(fastify) {
  await fastify.register(fastifyJwt, {
    secret:     config.jwt.accessSecret,
    namespace:  'access',
    jwtVerify:  'accessVerify',
    jwtSign:    'accessSign',
    sign: {
      expiresIn: '15m',
      issuer:    'fairgig-auth',
      audience:  'fairgig-api',
    },
    verify: {
      issuer:   'fairgig-auth',
      audience: 'fairgig-api',
    },
  });
}

export default fp(jwtPlugin, {
  name: 'jwt-plugin',
  fastify: '4.x',
});
