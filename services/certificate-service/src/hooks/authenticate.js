/**
 * Authentication Hook - Verify JWT and extract user info
 */

const config = require('../config');

async function authenticate(request, reply) {
  try {
    let authHeader = request.headers.authorization || '';
    if (!authHeader && request.query && request.query.token) {
      authHeader = `Bearer ${request.query.token}`;
    }
    if (!authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({ error: 'Unauthorized', message: 'Missing bearer token' });
    }

    const response = await fetch(`${config.authServiceUrl}/api/auth/me`, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
      },
    });

    if (!response.ok) {
      return reply.code(401).send({ error: 'Unauthorized', message: 'Invalid or expired token' });
    }

    const profile = await response.json();
    const user = profile?.user || profile;
    request.user = {
      id: user?.id,
      sub: user?.id,
      role: user?.role,
      name: user?.full_name || user?.name,
      zone: user?.city_zone || null,
      status: user?.verification_status,
      email: user?.email,
    };
  } catch (err) {
    request.log.error({ err }, 'Auth verification failed in certificate-service');
    return reply.code(401).send({ error: 'Unauthorized', message: 'Invalid or missing JWT token' });
  }
}

module.exports = authenticate;
