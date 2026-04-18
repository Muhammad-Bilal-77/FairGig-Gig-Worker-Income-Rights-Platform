/**
 * Certificate Service - Business Logic
 */

const { v4: uuidv4 } = require('uuid');
const Handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');
const config = require('../config');

let certificateTemplate = null;

function loadTemplate() {
  if (!certificateTemplate) {
    const templatePath = path.join(__dirname, '../templates/certificate.hbs');
    const templateContent = fs.readFileSync(templatePath, 'utf-8');
    certificateTemplate = Handlebars.compile(templateContent);
  }
  return certificateTemplate;
}

/**
 * Fetch worker info from Auth Service
 */
async function fetchWorkerInfo(workerId) {
  try {
    const response = await fetch(`${config.authServiceUrl}/internal/users/${workerId}`);
    if (response.status === 404) {
      throw new Error('Worker not found');
    }
    if (!response.ok) {
      throw new Error(`Auth service error: ${response.statusText}`);
    }
    return await response.json();
  } catch (err) {
    throw new Error(`Failed to fetch worker info: ${err.message}`);
  }
}

/**
 * Fetch earnings data for the worker
 */
async function fetchEarningsData(readonlyPool, workerId, fromDate, toDate) {
  const query = `
    SELECT
      platform,
      shift_date,
      hours_worked,
      gross_earned,
      platform_deduction,
      net_received,
      effective_hourly_rate,
      verify_status
    FROM earnings_schema.shifts
    WHERE worker_id = $1
      AND shift_date BETWEEN $2 AND $3
      AND verify_status IN ('CONFIRMED', 'PENDING')
    ORDER BY shift_date ASC
  `;

  const result = await readonlyPool.query(query, [workerId, fromDate, toDate]);
  return result.rows;
}

/**
 * Compute summary statistics
 */
function computeSummary(shifts) {
  if (shifts.length === 0) {
    return {
      total_gross: 0,
      total_deductions: 0,
      total_net: 0,
      total_hours: 0,
      shift_count: 0,
      verified_count: 0,
      platform_breakdown: {},
      avg_hourly_rate: 0,
    };
  }

  const summary = {
    total_gross: 0,
    total_deductions: 0,
    total_net: 0,
    total_hours: 0,
    shift_count: shifts.length,
    verified_count: 0,
    platform_breakdown: {},
    avg_hourly_rate: 0,
  };

  for (const shift of shifts) {
    summary.total_gross += parseFloat(shift.gross_earned) || 0;
    summary.total_deductions += parseFloat(shift.platform_deduction) || 0;
    summary.total_net += parseFloat(shift.net_received) || 0;
    summary.total_hours += parseFloat(shift.hours_worked) || 0;

    if (shift.verify_status === 'CONFIRMED') {
      summary.verified_count += 1;
    }

    // Platform breakdown
    const platform = shift.platform || 'Unknown';
    if (!summary.platform_breakdown[platform]) {
      summary.platform_breakdown[platform] = 0;
    }
    summary.platform_breakdown[platform] += parseFloat(shift.net_received) || 0;
  }

  summary.avg_hourly_rate = summary.total_hours > 0 
    ? summary.total_net / summary.total_hours 
    : 0;

  return summary;
}

/**
 * Generate certificate reference
 */
function generateCertRef() {
  return 'FG-' + Date.now().toString(36).toUpperCase();
}

/**
 * Main certificate generation function
 */
async function generateCertificate(readonlyPool, certPool, workerId, fromDate, toDate, workerName = null) {
  try {
    // Step 1: Fetch worker info
    const workerInfo = await fetchWorkerInfo(workerId);
    const workerFullName = workerName || workerInfo.name || `Worker ${workerId}`;

    // Step 2: Fetch earnings data
    const shifts = await fetchEarningsData(readonlyPool, workerId, fromDate, toDate);

    // Step 3: Compute summary
    const summary = computeSummary(shifts);

    // Step 4: Generate cert_ref
    const cert_ref = generateCertRef();

    // Step 5: Render HTML using Handlebars template
    const template = loadTemplate();
    const html = template({
      workerName: workerFullName,
      fromDate,
      toDate,
      certRef: cert_ref,
      timestamp: new Date().toISOString(),
      summary: {
        ...summary,
        // Format for template
        totalNetFormatted: summary.total_net.toFixed(2),
        totalHoursFormatted: summary.total_hours.toFixed(1),
        avgHourlyRateFormatted: summary.avg_hourly_rate.toFixed(2),
        verificationBadge: `${summary.verified_count} of ${summary.shift_count} shifts verified`,
      },
      shifts: shifts.map(s => ({
        ...s,
        shiftDate: s.shift_date,
        grossEarned: parseFloat(s.gross_earned).toFixed(2),
        platformDeduction: parseFloat(s.platform_deduction).toFixed(2),
        netReceived: parseFloat(s.net_received).toFixed(2),
        effectiveHourlyRate: parseFloat(s.effective_hourly_rate).toFixed(2),
        isVerified: s.verify_status === 'CONFIRMED',
      })),
      platformBreakdown: Object.entries(summary.platform_breakdown).map(([platform, net]) => ({
        platform,
        net: net.toFixed(2),
      })),
    });

    // Step 6: Store in certificates table
    const insertQuery = `
      INSERT INTO certificates_schema.certificates (
        id, cert_ref, worker_id, worker_name, date_from, date_to,
        total_gross, total_deductions, total_net, total_hours, shift_count, verified_count,
        rendered_html, platform_breakdown, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING id, cert_ref, created_at
    `;

    const insertResult = await certPool.query(insertQuery, [
      uuidv4(),
      cert_ref,
      workerId,
      workerFullName,
      fromDate,
      toDate,
      summary.total_gross,
      summary.total_deductions,
      summary.total_net,
      summary.total_hours,
      summary.shift_count,
      summary.verified_count,
      html,
      JSON.stringify(summary.platform_breakdown),
      new Date(),
    ]);

    // Step 7: Return response
    return {
      cert_ref,
      summary,
      view_url: `/api/certificates/${cert_ref}`,
      createdAt: insertResult.rows[0].created_at,
    };
  } catch (err) {
    throw new Error(`Certificate generation failed: ${err.message}`);
  }
}

/**
 * Retrieve certificate by reference
 */
async function getCertificateByRef(readonlyPool, cert_ref) {
  const query = `
    SELECT id, worker_id, cert_ref, worker_name, date_from, date_to,
           total_gross, total_deductions, total_net, total_hours,
           shift_count, verified_count, rendered_html, platform_breakdown, created_at
    FROM certificates_schema.certificates
    WHERE cert_ref = $1
  `;

  const result = await readonlyPool.query(query, [cert_ref]);
  return result.rows[0] || null;
}

/**
 * List certificates for a worker
 */
async function listCertificates(readonlyPool, workerId) {
  const query = `
    SELECT id, cert_ref, worker_name, date_from, date_to, total_net, shift_count, verified_count, created_at
    FROM certificates_schema.certificates
    WHERE worker_id = $1
    ORDER BY created_at DESC
  `;

  const result = await readonlyPool.query(query, [workerId]);
  return result.rows.map(row => ({
    ...row,
    view_url: `/api/certificates/${row.cert_ref}`,
  }));
}

/**
 * Get certificate summary (JSON)
 */
async function getCertificateSummary(readonlyPool, cert_ref) {
  const query = `
    SELECT cert_ref, worker_name, date_from, date_to, total_gross, total_deductions, total_net,
           total_hours, shift_count, verified_count, platform_breakdown, created_at
    FROM certificates_schema.certificates
    WHERE cert_ref = $1
  `;

  const result = await readonlyPool.query(query, [cert_ref]);
  return result.rows[0] || null;
}

module.exports = {
  generateCertificate,
  getCertificateByRef,
  listCertificates,
  getCertificateSummary,
};
