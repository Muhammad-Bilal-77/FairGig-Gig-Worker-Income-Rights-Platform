/**
 * Certificate Service - Main Entry Point
 */

const Fastify = require('fastify');
const config = require('./config');
const db = require('./db');
const jwtPlugin = require('./plugins/jwt.plugin');
const corsPlugin = require('./plugins/cors.plugin');
const { metricsMiddleware, metricsResponse } = require('./metrics');
const certificateRoutes = require('./routes/certificate.routes');

async function buildApp() {
  const fastify = Fastify({
    logger: {
      level: config.logLevel,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
    },
  });

  // Register plugins
  await fastify.register(corsPlugin);
  await fastify.register(jwtPlugin);

  // Register middleware
  metricsMiddleware(fastify);
  metricsResponse(fastify);

  // Register routes
  await fastify.register(certificateRoutes);

  return fastify;
}

async function start() {
  try {
    console.log('🚀 Certificate Service starting...');

    // Initialize database pools
    await db.initializePools();
    console.log('✅ Database pools initialized');

    // Build and start app
    const fastify = await buildApp();
    console.log('✅ Fastify app built');

    await fastify.listen({ port: config.port, host: '0.0.0.0' });
    console.log(`✅ Certificate Service listening on http://0.0.0.0:${config.port}`);
    console.log(`  Health check: http://localhost:${config.port}/health`);
    console.log(`  Metrics: http://localhost:${config.port}/metrics`);

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n⏸️  Shutting down gracefully...');
      await db.closePools();
      await fastify.close();
      process.exit(0);
    });
  } catch (err) {
    console.error('✗ Fatal startup error:', err.message);
    console.error(err);
    process.exit(1);
  }
}

start();
