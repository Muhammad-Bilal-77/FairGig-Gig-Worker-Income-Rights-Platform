import pg from 'pg';

const BASE = 'http://localhost:4001';

async function json(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body };
}

async function run() {
  const pool = new pg.Pool({ connectionString: 'postgresql://fairgig_admin:fairgig_admin_secret_2026@localhost:5433/fairgig' });

  // Cleanup just in case
  await pool.query("DELETE FROM auth_schema.users WHERE email = 'testworker123@test.com'");

  console.log('1. Registering new worker...');
  const regWorker = await json(`${BASE}/api/auth/register`, {
    method: 'POST',
    body: JSON.stringify({ email: 'testworker123@test.com', password: 'password123!!!', full_name: 'Test Worker', role: 'worker', city_zone: 'DHA', worker_category: 'ride_hailing' })
  });

  // Look up token in DB
  const resToken = await pool.query("SELECT token_hash FROM auth_schema.email_tokens ORDER BY expires_at DESC LIMIT 1");
  console.log('In DB: Token hash found:', resToken.rowCount > 0);
  
  // Let's force-verify via DB to simulate email click
  const workerRes = await pool.query("SELECT id FROM auth_schema.users WHERE email = 'testworker123@test.com'");
  const workerId = workerRes.rows[0].id;
  await pool.query("UPDATE auth_schema.users SET verification_status = 'PENDING_MANUAL' WHERE id = $1", [workerId]);
  console.log('Forced PENDING_MANUAL state on worker');

  // Let's test login of a PENDING_MANUAL user
  const loginWorker = await json(`${BASE}/api/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email: 'testworker123@test.com', password: 'password123!!!' })
  });
  if (loginWorker.body.user) {
    console.log('Worker Login Post-Email status:', loginWorker.body.user.verification_status);
  }

  // Let's login as a known verifier from seeds (verifier1@fairgig.com)
  const loginVerifier = await json(`${BASE}/api/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email: 'verifier1@fairgig.com', password: 'password123' })
  });
  const verifierToken = loginVerifier.body.access_token;
  
  // Verifier approves worker
  console.log('2. Verifier approving worker...');
  const appWorker = await json(`${BASE}/api/auth/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${verifierToken}` },
    body: JSON.stringify({ user_id: workerId })
  });
  console.log(appWorker.body);

  // Worker logins again now
  const loginWorker2 = await json(`${BASE}/api/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email: 'testworker123@test.com', password: 'password123!!!' })
  });
  console.log('Worker Login Post-Approval status:', loginWorker2.body.user.verification_status);

  // Clean up
  await pool.query("DELETE FROM auth_schema.users WHERE email = 'testworker123@test.com'");
  await pool.end();
}

run().catch(console.error);
