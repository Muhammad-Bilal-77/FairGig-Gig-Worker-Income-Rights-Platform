// IMPORTANT: dotenv must be configured FIRST before any other import
// uses process.env. The explicit path resolves to fairgig/.env
// regardless of which directory the process is started from.

import { config as dotenvConfig } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
// From src/ go up 3 levels: src -> auth-service -> services -> fairgig
dotenvConfig({ path: resolve(__dirname, '../../../.env') });

// required() crashes immediately on startup if a variable is missing.
// This is intentional: better to fail at boot with a clear message
// than to fail silently at runtime when the first request arrives.
function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `\n[auth-service] STARTUP FAILED\n` +
      `Missing required environment variable: ${name}\n` +
      `Ensure fairgig/.env exists and contains ${name}\n` +
      `Current working directory: ${process.cwd()}\n` +
      `Looking for .env at: ${resolve(__dirname, '../../../.env')}\n`
    );
  }
  return value;
}

export const config = {
  port:    parseInt(process.env.AUTH_PORT || '4001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  db: {
    url: required('AUTH_DB_URL'),
    pool: {
      max:                    10,
      min:                    2,
      idleTimeoutMillis:      30_000,
      connectionTimeoutMillis: 5_000,
    },
  },

  jwt: {
    accessSecret:        required('JWT_ACCESS_SECRET'),
    refreshSecret:       required('JWT_REFRESH_SECRET'),
    accessExpiry:        process.env.JWT_ACCESS_EXPIRY  || '15m',
    refreshExpiry:       process.env.JWT_REFRESH_EXPIRY || '7d',
    // 7 days in seconds — used for DB expiry timestamp calculation
    refreshExpiryMs:     7 * 24 * 60 * 60 * 1000,
  },

  smtp: {
    host:   required('EMAIL_HOST'),
    port:   parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_USE_TLS === 'true' ? false : true,
    user:   required('EMAIL_HOST_USER'),
    pass:   required('EMAIL_HOST_PASSWORD'),
  },

  bcrypt: {
    // 12 rounds = ~250ms on modern hardware.
    // Strong enough against offline brute force.
    // Fast enough that login feels instant to users.
    saltRounds: 12,
  },

  security: {
    // Lock account for 15 minutes after this many consecutive failures
    maxFailedAttempts: 5,
    lockoutDurationMs: 15 * 60 * 1000,
  },

  log: {
    level: process.env.LOG_LEVEL || 'info',
  },
};
