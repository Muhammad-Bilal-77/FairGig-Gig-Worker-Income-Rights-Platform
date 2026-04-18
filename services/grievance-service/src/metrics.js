// Prometheus metrics for the grievance service

import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

export const register = new Registry();
register.setDefaultLabels({ service: 'grievance-service' });

collectDefaultMetrics({ register });

export const complaintCounter = new Counter({
  name:    'grievance_complaints_total',
  help:    'Total complaints created',
  labelNames: ['platform', 'category'],
  registers: [register],
});

export const upvoteCounter = new Counter({
  name:    'grievance_upvotes_total',
  help:    'Total upvote actions',
  labelNames: ['action'], // add | remove
  registers: [register],
});

export const escalationCounter = new Counter({
  name:    'grievance_escalations_total',
  help:    'Total complaint escalations',
  labelNames: ['action'], // escalate | resolve
  registers: [register],
});

export const httpDurationHistogram = new Histogram({
  name:    'grievance_http_request_duration_seconds',
  help:    'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
  registers: [register],
});

export const openComplaintsGauge = new Gauge({
  name:    'grievance_open_complaints',
  help:    'Number of open complaints',
  registers: [register],
});
