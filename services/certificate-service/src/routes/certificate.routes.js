/**
 * Certificate Routes
 */

const authenticate = require('../hooks/authenticate');
const {
  generateCertificate,
  getCertificateByRef,
  listCertificates,
  getCertificateSummary,
} = require('../services/certificate.service');
const {
  certificateGenerated,
  certificateViewCount,
} = require('../metrics');
const db = require('../db');

async function certificateRoutes(fastify) {
  /**
   * POST /api/certificates/generate
   * Generate a new certificate for the worker
   */
  fastify.post('/api/certificates/generate', { onRequest: [authenticate] }, async (request, reply) => {
    try {
      const { from_date, to_date } = request.body;
      const workerId = request.user.sub || request.user.id;

      // Validation
      if (!from_date || !to_date) {
        return reply.code(400).send({ error: 'Missing date range', message: 'from_date and to_date required' });
      }

      const fromDate = new Date(from_date);
      const toDate = new Date(to_date);

      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        return reply.code(400).send({ error: 'Invalid date format', message: 'Use YYYY-MM-DD format' });
      }

      if (toDate < fromDate) {
        return reply.code(400).send({ error: 'Invalid date range', message: 'to_date must be >= from_date' });
      }

      const dayDiff = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24));
      if (dayDiff > 365) {
        return reply.code(400).send({ error: 'Date range too long', message: 'Maximum 365 days' });
      }

      // Generate certificate
      const certPool = db.getCertificatePool();
      const readonlyPool = db.getReadonlyPool();

      const result = await generateCertificate(
        readonlyPool,
        certPool,
        workerId,
        from_date,
        to_date,
        request.user.name
      );

      certificateGenerated.inc({ status: 'success' });
      reply.code(201).send(result);
    } catch (err) {
      certificateGenerated.inc({ status: 'error' });
      console.error('Certificate generation error:', err);
      reply.code(500).send({ error: 'Generation failed', message: err.message });
    }
  });

  /**
   * GET /api/certificates/:cert_ref
   * View certificate HTML (public - no auth required)
   */
  fastify.get('/api/certificates/:cert_ref', async (request, reply) => {
    try {
      const { cert_ref } = request.params;
      const readonlyPool = db.getReadonlyPool();

      const certificate = await getCertificateByRef(readonlyPool, cert_ref);
      if (!certificate) {
        // Return HTML 404 page
        const notFoundHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>Certificate Not Found</title>
            <style>
              body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; }
              .error { color: #d32f2f; }
            </style>
          </head>
          <body>
            <h1 class="error">Certificate Not Found</h1>
            <p>The certificate reference <strong>${cert_ref}</strong> does not exist.</p>
            <p>Please check the URL and try again.</p>
          </body>
          </html>
        `;
        reply.type('text/html').code(404).send(notFoundHtml);
        return;
      }

      certificateViewCount.inc();
      reply.type('text/html').send(certificate.html_content);
    } catch (err) {
      console.error('Certificate retrieval error:', err);
      reply.code(500).send({ error: 'retrieval failed', message: err.message });
    }
  });

  /**
   * GET /api/certificates
   * List certificates for the authenticated worker
   */
  fastify.get('/api/certificates', { onRequest: [authenticate] }, async (request, reply) => {
    try {
      const workerId = request.user.sub || request.user.id;
      const readonlyPool = db.getReadonlyPool();

      const certificates = await listCertificates(readonlyPool, workerId);
      reply.send({ certificates });
    } catch (err) {
      console.error('Certificate list error:', err);
      reply.code(500).send({ error: 'List failed', message: err.message });
    }
  });

  /**
   * GET /api/certificates/:cert_ref/json
   * Get certificate summary as JSON (auth required - worker who owns it)
   */
  fastify.get('/api/certificates/:cert_ref/json', { onRequest: [authenticate] }, async (request, reply) => {
    try {
      const { cert_ref } = request.params;
      const workerId = request.user.sub || request.user.id;
      const readonlyPool = db.getReadonlyPool();

      // First verify ownership
      const certificate = await getCertificateByRef(readonlyPool, cert_ref);
      if (!certificate || certificate.worker_id !== workerId) {
        return reply.code(403).send({ error: 'Forbidden', message: 'You do not have access to this certificate' });
      }

      const summary = await getCertificateSummary(readonlyPool, cert_ref);
      reply.send(summary);
    } catch (err) {
      console.error('Certificate JSON error:', err);
      reply.code(500).send({ error: 'Retrieval failed', message: err.message });
    }
  });

  /**
   * GET /health
   * Health check
   */
  fastify.get('/health', async (request, reply) => {
    reply.send({ status: 'ok', service: 'certificate-service' });
  });
}

module.exports = certificateRoutes;
