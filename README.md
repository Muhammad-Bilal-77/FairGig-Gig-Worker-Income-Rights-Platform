# FairGig — Gig Worker Income & Rights Platform

**SOFTEC 2026 Web Dev Competition — FAST-NU**

FairGig empowers Pakistani gig workers (Careem drivers, food delivery riders, freelancers) to log and verify their earnings, detect unfair platform deductions, generate income certificates for banks/landlords, and collectively surface systemic unfairness through anonymized aggregate analytics.

## Quick Start

### 1. Start infrastructure
```bash
docker compose up -d
```

### 2. Verify everything is running
```bash
docker compose ps
```
All services must show healthy status.

### 3. Access points
| Service | URL | Credentials |
|---------|-----|-------------|
| API Gateway | http://localhost:80 | — |
| PostgreSQL | localhost:5432 | fairgig_admin / fairgig_admin_secret_2026 |
| Redis | localhost:6379 | — |
| Grafana | http://localhost:3010 | admin / admin123 |
| Prometheus | http://localhost:9090 | — |

### 4. Database credentials
See `.env` file for all connection strings.
Each service uses its own DB user with schema-level isolation.

### 5. Start individual services
See `services/*/README.md` for each service.

## Architecture

- **Pattern:** Shared-database modular monolith with process separation
- **Database:** PostgreSQL 16 with schema-per-service isolation
- **Gateway:** Nginx with rate limiting and CORS
- **Monitoring:** Prometheus + Grafana

## Services

| Service | Tech | Port |
|---------|------|------|
| auth-service | Node.js + Fastify | 4001 |
| earnings-service | Python FastAPI | 4002 |
| anomaly-service | Python FastAPI | 4003 |
| grievance-service | Node.js + Fastify | 4004 |
| analytics-service | Python FastAPI | 4005 |
| certificate-service | Node.js + Fastify | 4006 |
| frontend | React + Vite | 3000 |
| gateway | Nginx | 80 |
