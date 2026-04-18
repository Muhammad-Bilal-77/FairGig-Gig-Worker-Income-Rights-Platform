// authenticate: a Fastify preHandler that verifies access tokens.
// Add to any route that requires a logged-in user:
//   { preHandler: [authenticate] }
//
// On success: sets request.user = { sub, role, name, zone, iat, exp }
// On failure: returns 401 immediately — route handler never runs.

export async function authenticate(request, reply) {
  try {
    // accessVerify reads Authorization: Bearer <token>,
    // verifies signature with ACCESS_SECRET, checks expiry,
    // and sets request.user to the decoded payload.
    await request.accessVerify();
  } catch (err) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'A valid access token is required. '
             + 'Obtain one via POST /api/auth/login',
    });
  }
}

// requireRole returns a preHandler that checks user role.
// Usage: preHandler: [authenticate, requireRole('advocate')]
// Multiple roles: requireRole('verifier', 'advocate')
export function requireRole(...allowedRoles) {
  return async function roleGuard(request, reply) {
    if (!request.user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    if (!allowedRoles.includes(request.user.role)) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: `This endpoint requires one of these roles: ${allowedRoles.join(', ')}`,
        your_role: request.user.role,
      });
    }
  };
}
