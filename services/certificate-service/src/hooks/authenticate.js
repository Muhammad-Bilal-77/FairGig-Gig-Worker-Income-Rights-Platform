/**
 * Authentication Hook - Verify JWT and extract user info
 */

async function authenticate(request, reply) {
  try {
    if (!request.user) {
      await request.jwtVerify();
    }
  } catch (err) {
    reply.code(401).send({ error: 'Unauthorized', message: 'Invalid or missing JWT token' });
  }
}

module.exports = authenticate;
