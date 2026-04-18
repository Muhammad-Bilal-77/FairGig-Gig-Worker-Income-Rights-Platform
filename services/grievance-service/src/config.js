// Grievance Service configuration

import { config as dotenvConfig } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenvConfig({ path: resolve(__dirname, '../../../.env') });

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `\n[grievance-service] STARTUP FAILED\n` +
      `Missing required environment variable: ${name}\n` +
      `Ensure fairgig/.env exists and contains ${name}\n`
    );
  }
  return value;
}

export const config = {
  port:    parseInt(process.env.GRIEVANCE_PORT || '4004', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  db: {
    url: required('GRIEVANCE_DB_URL'),
    pool: {
      max:                    10,
      min:                    2,
      idleTimeoutMillis:      30_000,
      connectionTimeoutMillis: 5_000,
    },
  },

  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET'),
  },

  log: {
    level: process.env.LOG_LEVEL || 'info',
  },
};
