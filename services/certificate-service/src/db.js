/**
 * Database connection pools - two roles:
 * - certificate_svc: Can write to certificates table
 * - readonly_svc: Read-only access to earnings data
 */

const { Pool } = require('pg');
const config = require('./config');

let certificatePool = null;
let readonlyPool = null;

async function initializePools() {
  try {
    // Connection pool for certificate_svc (write access to certificates table)
    certificatePool = new Pool({
      connectionString: config.certificateDbUrl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Connection pool for readonly_svc (read-only access to earnings data)
    readonlyPool = new Pool({
      connectionString: config.readonlyDbUrl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Test connections
    const certConn = await certificatePool.connect();
    const certResult = await certConn.query('SELECT NOW() as time');
    certConn.release();
    console.log(`✓ Certificate pool connected: ${certResult.rows[0].time}`);
    console.log(`  User: certificate_svc`);

    const readConn = await readonlyPool.connect();
    const readResult = await readConn.query('SELECT NOW() as time');
    readConn.release();
    console.log(`✓ Read-only pool connected: ${readResult.rows[0].time}`);
    console.log(`  User: readonly_svc`);

    return { certificatePool, readonlyPool };
  } catch (err) {
    console.error('✗ Database connection failed:', err.message);
    process.exit(1);
  }
}

async function closePools() {
  if (certificatePool) await certificatePool.end();
  if (readonlyPool) await readonlyPool.end();
}

module.exports = {
  initializePools,
  closePools,
  getCertificatePool: () => certificatePool,
  getReadonlyPool: () => readonlyPool,
};
