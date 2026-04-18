/**
 * Prometheus Metrics for Certificate Service
 */

const { Counter, Histogram, register } = require('prom-client');

const certificateGenerated = new Counter({
  name: 'certificate_generated_total',
  help: 'Total number of certificates generated',
  labelNames: ['status'],
});

const certificateViewCount = new Counter({
  name: 'certificate_views_total',
  help: 'Total number of certificate views',
});

const certificateGenerationDuration = new Histogram({
  name: 'certificate_generation_duration_seconds',
  help: 'Certificate generation duration in seconds',
});

function metricsMiddleware(fastify) {
  fastify.addHook('onRequest', async (request, reply) => {
    request.startTime = Date.now();
  });

  fastify.addHook('onResponse', async (request, reply) => {
    const duration = (Date.now() - request.startTime) / 1000;
    if (request.url.includes('/api/certificates/generate')) {
      certificateGenerationDuration.observe(duration);
    }
  });
}

function metricsResponse(fastify) {
  fastify.get('/metrics', async (request, reply) => {
    reply.type('text/plain');
    return register.metrics();
  });
}

module.exports = {
  register,
  certificateGenerated,
  certificateViewCount,
  certificateGenerationDuration,
  metricsMiddleware,
  metricsResponse,
};
