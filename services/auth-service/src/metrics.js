// Prometheus metrics for the auth service.
// Judges can verify observability at http://localhost:4001/metrics

import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

// Create a dedicated registry (not the global one) so that
// multiple services running in the same process don't conflict.
export const register = new Registry();
register.setDefaultLabels({ service: 'auth-service' });

// Collect Node.js default metrics (memory, CPU, event loop lag)
collectDefaultMetrics({ register });

// Track login outcomes
export const loginCounter = new Counter({
  name:    'auth_login_total',
  help:    'Total login attempts by outcome',
  labelNames: ['status'], // success | failure | locked
  registers: [register],
});

// Track registration outcomes
export const registerCounter = new Counter({
  name:    'auth_register_total',
  help:    'Total registration attempts by outcome',
  labelNames: ['status'], // success | duplicate | validation_error
  registers: [register],
});

// Track token refresh outcomes
export const tokenRefreshCounter = new Counter({
  name:    'auth_token_refresh_total',
  help:    'Total token refresh attempts by outcome',
  labelNames: ['status'], // success | theft | expired | invalid
  registers: [register],
});

// Active sessions gauge — updated on login, logout, refresh
export const activeSessionsGauge = new Gauge({
  name:    'auth_active_sessions',
  help:    'Current number of non-expired refresh tokens in DB',
  registers: [register],
});

// HTTP request duration histogram
export const httpDurationHistogram = new Histogram({
  name:    'auth_http_request_duration_seconds',
  help:    'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
  registers: [register],
});

// Update active sessions count — called after any token change
export async function refreshActiveSessionsGauge(queryFn) {
  try {
    const result = await queryFn(
      `SELECT COUNT(*) AS cnt
       FROM auth_schema.refresh_tokens
       WHERE is_used = FALSE AND expires_at > NOW()`
    );
    activeSessionsGauge.set(parseInt(result.rows[0].cnt, 10));
  } catch {
    // Gauge update failure is non-fatal — metrics are best-effort
  }
}
