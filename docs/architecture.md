# FairGig Architecture

## Pattern: Shared-Database Modular Monolith

```
┌─────────────────────────────────────────────────────────┐
│                    Nginx Gateway (:80)                    │
│  Rate limiting │ CORS │ Security headers │ Routing       │
└──────┬──────┬──────┬──────┬──────┬──────┬───────────────┘
       │      │      │      │      │      │
  ┌────┘  ┌───┘  ┌───┘  ┌───┘  ┌───┘  ┌───┘
  ▼       ▼      ▼      ▼      ▼      ▼
Auth   Earnings Anomaly Griev. Analy. Cert.
:4001  :4002    :4003   :4004  :4005  :4006
  │       │              │      │      │
  │       │              │      │      │
  ▼       ▼              ▼      ▼      ▼
┌─────────────────────────────────────────┐
│         PostgreSQL (fairgig DB)         │
│  auth_schema │ earnings_schema │ ...    │
│  Schema-level permission isolation      │
└─────────────────────────────────────────┘
```

## Key Design Decisions

1. **Schema-per-service isolation** — Each service has its own PostgreSQL user
   that can only access its own schema. Enforced at DB level.

2. **Read-only cross-schema user** — Analytics and certificate services read
   earnings data via a dedicated `readonly_svc` user. Cannot modify data.

3. **k-anonymity in materialized views** — All analytics views have
   `HAVING COUNT(DISTINCT worker_id) >= 5` to prevent individual identification.

4. **Direct DB reads for inter-service data** — No HTTP between most services.
   Anomaly service is the exception (called via HTTP for computation).

5. **JWT at gateway** — Nginx validates tokens and sets `X-User-Role` header.
   Services trust the gateway.

## Services

| Service | Tech Stack | Schema | Port |
|---------|-----------|--------|------|
| auth-service | Node.js + Fastify | auth_schema | 4001 |
| earnings-service | Python FastAPI | earnings_schema | 4002 |
| anomaly-service | Python FastAPI | (reads earnings via HTTP) | 4003 |
| grievance-service | Node.js + Fastify | grievance_schema | 4004 |
| analytics-service | Python FastAPI | analytics_schema | 4005 |
| certificate-service | Node.js + Fastify | certificates_schema | 4006 |
