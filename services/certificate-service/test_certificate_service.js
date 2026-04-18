#!/usr/bin/env node

/**
 * Certificate Service Integration Test
 * Tests the full certificate generation and viewing flow
 */

const jwt = require('@fastify/jwt');
const { promisify } = require('util');

// Configuration
const API_URL = 'http://localhost:4006';
const JWT_SECRET = process.env.JWT_ACCESS_SECRET || 'dev_access_secret_change_me';
const WORKER_ID = '550e8400-e29b-41d4-a716-446655440001'; // UUID for testing
const WORKER_NAME = 'Ahmed Ali (Careem Driver)';

async function generateTestToken() {
  // Create a test JWT token
  const payload = {
    sub: WORKER_ID,
    id: WORKER_ID,
    email: 'careem.dha.1@seed.com',
    name: WORKER_NAME,
    role: 'worker',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
  };

  // Simple JWT creation without actual signing (for testing framework)
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = Buffer.from('test-signature').toString('base64url');
  
  return `${header}.${body}.${signature}`;
}

async function testHealthCheck() {
  console.log('\n📋 Test 1: Health Check');
  console.log('─'.repeat(50));
  
  try {
    const response = await fetch(`${API_URL}/health`);
    const data = await response.json();
    console.log('✅ Health check passed');
    console.log('   Response:', JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    console.log('❌ Health check failed:', err.message);
    return false;
  }
}

async function testMetrics() {
  console.log('\n📊 Test 2: Metrics Endpoint');
  console.log('─'.repeat(50));
  
  try {
    const response = await fetch(`${API_URL}/metrics`);
    const text = await response.text();
    console.log('✅ Metrics endpoint responded');
    console.log('   First 200 chars:', text.substring(0, 200));
    return true;
  } catch (err) {
    console.log('❌ Metrics failed:', err.message);
    return false;
  }
}

async function testGenerateCertificate(token) {
  console.log('\n🎓 Test 3: Generate Certificate');
  console.log('─'.repeat(50));
  
  const fromDate = '2026-04-01';
  const toDate = '2026-04-18';
  
  console.log(`Request: Generate certificate for ${fromDate} to ${toDate}`);
  
  try {
    const response = await fetch(`${API_URL}/api/certificates/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        from_date: fromDate,
        to_date: toDate,
      }),
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Certificate generated successfully');
      console.log(`   cert_ref: ${data.cert_ref}`);
      console.log(`   view_url: ${data.view_url}`);
      console.log(`   summary: Total Net PKR ${data.summary.total_net}`);
      return { success: true, ...data };
    } else if (response.status === 401) {
      console.log('⚠️  Unauthorized (expected - auth service may not have user)');
      console.log('   Response:', data);
      return { success: false, reason: 'auth' };
    } else {
      console.log('❌ Certificate generation failed');
      console.log('   Response:', data);
      return { success: false };
    }
  } catch (err) {
    console.log('❌ Error:', err.message);
    return { success: false };
  }
}

async function testViewCertificate(certRef) {
  console.log('\n👁️  Test 4: View Certificate (Public)');
  console.log('─'.repeat(50));
  
  console.log(`Request: GET /api/certificates/${certRef}`);
  
  try {
    const response = await fetch(`${API_URL}/api/certificates/${certRef}`);
    const html = await response.text();
    
    if (response.ok) {
      const hasTitle = html.includes('FairGig');
      const hasPrint = html.includes('Print');
      const hasUrdu = html.includes('گگ ورکر');
      const hasStyle = html.includes('@media print');
      
      console.log('✅ Certificate HTML retrieved');
      console.log(`   Content-Type: ${response.headers.get('content-type')}`);
      console.log(`   HTML size: ${html.length} bytes`);
      console.log(`   Contains FairGig branding: ${hasTitle ? '✓' : '✗'}`);
      console.log(`   Contains Print button: ${hasPrint ? '✓' : '✗'}`);
      console.log(`   Contains Urdu text: ${hasUrdu ? '✓' : '✗'}`);
      console.log(`   Contains print CSS: ${hasStyle ? '✓' : '✗'}`);
      console.log(`\n   First 500 chars of HTML:\n   ${html.substring(0, 500)}`);
      return true;
    } else {
      console.log('❌ Certificate not found (expected - no test data)');
      return false;
    }
  } catch (err) {
    console.log('❌ Error:', err.message);
    return false;
  }
}

async function testListCertificates(token) {
  console.log('\n📚 Test 5: List Certificates');
  console.log('─'.repeat(50));
  
  try {
    const response = await fetch(`${API_URL}/api/certificates`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ List endpoint working');
      console.log(`   Certificates found: ${data.certificates.length}`);
      if (data.certificates.length > 0) {
        console.log('   Sample:', data.certificates[0]);
      }
      return true;
    } else if (response.status === 401) {
      console.log('⚠️  Unauthorized (expected - auth may not recognize token)');
      return false;
    } else {
      console.log('❌ List failed');
      return false;
    }
  } catch (err) {
    console.log('❌ Error:', err.message);
    return false;
  }
}

async function runTests() {
  console.log('\n═'.repeat(50));
  console.log('  CERTIFICATE SERVICE TEST SUITE');
  console.log('═'.repeat(50));
  
  const token = await generateTestToken();
  console.log(`\n🔐 Test Token Generated:${token.substring(0, 50)}...`);
  
  const results = [];
  
  // Run tests
  results.push(await testHealthCheck());
  results.push(await testMetrics());
  
  const certResponse = await testGenerateCertificate(token);
  results.push(certResponse.success);
  
  if (certResponse.success && certResponse.cert_ref) {
    results.push(await testViewCertificate(certResponse.cert_ref));
  } else {
    console.log('\n👁️  Test 4: View Certificate (Public)');
    console.log('─'.repeat(50));
    console.log('⏭️  Skipped (no certificate reference)');
  }
  
  results.push(await testListCertificates(token));
  
  // Summary
  console.log('\n═'.repeat(50));
  console.log('  TEST SUMMARY');
  console.log('═'.repeat(50));
  const passed = results.filter(r => r === true).length;
  console.log(`✅ Passed: ${passed}/${results.length}`);
  console.log(`❌ Failed/Skipped: ${results.length - passed}/${results.length}`);
  console.log('\n📝 Notes:');
  console.log('- Auth token generation may fail if auth service not accessible');
  console.log('- Certificate generation requires worker in database');
  console.log('- Certificate viewing works without authentication');
  console.log('═'.repeat(50));
}

runTests().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
