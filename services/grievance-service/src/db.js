// Database connection management

import pg from 'pg';
import { config } from './config.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.db.url,
  ...config.db.pool,
});

export async function connectDB() {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT NOW() AS now, current_user AS db_user, version() AS pg_version'
    );
    const { now, db_user, pg_version } = result.rows[0];
    console.log(`[db] Connected as "${db_user}" at ${now}`);
    console.log(`[db] PostgreSQL: ${pg_version.split(',')[0]}`);
  } finally {
    client.release();
  }
}

export async function query(sql, params = []) {
  const start = Date.now();
  try {
    const result = await pool.query(sql, params);
    const duration = Date.now() - start;
    if (duration > 500) {
      console.warn(`[db] Slow query (${duration}ms): ${sql.slice(0, 100)}`);
    }
    return result;
  } catch (err) {
    console.error(`[db] Query error: ${err.message}`);
    console.error(`[db] SQL: ${sql.slice(0, 200)}`);
    throw err;
  }
}

export async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
