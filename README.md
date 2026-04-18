# FairGig — Gig Worker Income & Rights Platform

**SOFTEC 2026 Web Dev Competition — FAST-NU**

FairGig empowers Pakistani gig workers (Careem drivers, food delivery riders, freelancers) to log and verify their earnings, detect unfair platform deductions, generate income certificates for banks/landlords, and collectively surface systemic unfairness through anonymized aggregate analytics.

## 🚧 Project Status: What is Built Till Now

The project is currently under active development. Here is a breakdown of what has been implemented so far:

### 1. Robust Monorepo Infrastructure (✅ Completed)
- **Shared-database modular monolith** pattern established using Docker Compose.
- **PostgreSQL 16** with schema-per-service isolation configured (each service has its own dedicated schema, isolated tables, and restricted DB users).
- **Redis** configured for caching, sessions, and request rate limiting.
- **API Gateway (Nginx)** acting as the central entry point (`http://localhost:80`) handling routing and CORS requests.
- **Monitoring Stack** structured with **Prometheus** (`http://localhost:9090`) and **Grafana** (`http://localhost:3010`) dashboards for observing microservices.
- Complete database schemas mapped, and **mock data seeders** built for demo preparations.

### 2. IAM / Auth Service (✅ Completed)
The Identity & Access Management (IAM) backbone is fully operational (*built in Node.js + Fastify*).
- **Security:** Timing-safe bcrypt login, active session theft detection, and dual-JWT setup (access + refresh tokens securely managed).
- **Role-Based Access Control (RBAC):** Strict JWT verifications spanning `worker`, `verifier`, `advocate`, and `admin` roles.
- **2-Step Verification Workflow State Machine:** Built to combat Sybil attacks with a multi-stage approval process:
  1. `PENDING_EMAIL`: SMTP service sends a unique secure verification link upon registration.
  2. `PENDING_MANUAL`: User clicks the link to verify email; awaits manual admin audit.
  3. `APPROVED`: Admin/Verifier conditionally approves the user via their own dashboard.
- Fully documented in [services/auth-service/README.md](./services/auth-service/README.md) with frontend integration guides.

### 3. Additional Microservices & Frontend (🏗️ Scaffolded / Pending)
The following modules have their project folder structures, dependencies, web servers, and basic routes mapped out but are awaiting heavy business logic:
- **`earnings-service`** (Python FastAPI)
- **`anomaly-service`** (Python FastAPI)
- **`grievance-service`** (Node.js + Fastify)
- **`analytics-service`** (Python FastAPI)
- **`certificate-service`** (Node.js + Fastify)
- **`frontend`** (React + Vite template configured)

---

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
