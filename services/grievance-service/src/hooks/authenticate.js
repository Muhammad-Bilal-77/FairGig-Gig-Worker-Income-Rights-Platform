// Authentication hook — verifies access tokens and sets request.user

export async function authenticate(request, reply) {
  try {
    await request.accessVerify();
  } catch (err) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'A valid access token is required. Obtain one via POST /api/auth/login',
    });
  }
}

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
