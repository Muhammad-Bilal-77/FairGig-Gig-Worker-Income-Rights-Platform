/**
 * Certificate Service Configuration
 */

module.exports = {
  port: process.env.PORT || 4006,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database
  certificateDbUrl: process.env.CERTIFICATE_DB_URL || 'postgresql://certificate_svc:certificate_svc_secret_2026@localhost:5432/fairgig',
  readonlyDbUrl: process.env.READONLY_DB_URL || 'postgresql://readonly_svc:readonly_svc_secret_2026@localhost:5432/fairgig',
  
  // JWT
  jwtSecret: process.env.JWT_ACCESS_SECRET || 'test-secret-key',
  
  // Auth Service
  authServiceUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:4001',
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
};
