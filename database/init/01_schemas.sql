-- ══════════════════════════════════════════════════════════
-- 01_schemas.sql — Schema isolation + service-specific users
-- ══════════════════════════════════════════════════════════
--
-- Why separate schemas: each service connects with its own
-- PostgreSQL user that only has permissions on its own schema.
-- This enforces data boundaries at the database level.
-- Even if a service has a bug, it literally cannot read or
-- write another service's data.

-- Create schemas
CREATE SCHEMA IF NOT EXISTS auth_schema;
CREATE SCHEMA IF NOT EXISTS earnings_schema;
CREATE SCHEMA IF NOT EXISTS grievance_schema;
CREATE SCHEMA IF NOT EXISTS analytics_schema;
CREATE SCHEMA IF NOT EXISTS certificates_schema;

-- ── Service users ──────────────────────────────────────

-- Auth service user
CREATE USER auth_svc WITH PASSWORD 'auth_svc_secret_2026';
GRANT CONNECT ON DATABASE fairgig TO auth_svc;
GRANT USAGE, CREATE ON SCHEMA auth_schema TO auth_svc;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth_schema
  GRANT ALL ON TABLES TO auth_svc;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth_schema
  GRANT ALL ON SEQUENCES TO auth_svc;

-- Earnings service user
CREATE USER earnings_svc WITH PASSWORD 'earnings_svc_secret_2026';
GRANT CONNECT ON DATABASE fairgig TO earnings_svc;
GRANT USAGE, CREATE ON SCHEMA earnings_schema TO earnings_svc;
ALTER DEFAULT PRIVILEGES IN SCHEMA earnings_schema
  GRANT ALL ON TABLES TO earnings_svc;
ALTER DEFAULT PRIVILEGES IN SCHEMA earnings_schema
  GRANT ALL ON SEQUENCES TO earnings_svc;

-- Grievance service user
CREATE USER grievance_svc WITH PASSWORD 'grievance_svc_secret_2026';
GRANT CONNECT ON DATABASE fairgig TO grievance_svc;
GRANT USAGE, CREATE ON SCHEMA grievance_schema TO grievance_svc;
ALTER DEFAULT PRIVILEGES IN SCHEMA grievance_schema
  GRANT ALL ON TABLES TO grievance_svc;
ALTER DEFAULT PRIVILEGES IN SCHEMA grievance_schema
  GRANT ALL ON SEQUENCES TO grievance_svc;

-- Analytics service user
CREATE USER analytics_svc WITH PASSWORD 'analytics_svc_secret_2026';
GRANT CONNECT ON DATABASE fairgig TO analytics_svc;
GRANT USAGE, CREATE ON SCHEMA analytics_schema TO analytics_svc;
ALTER DEFAULT PRIVILEGES IN SCHEMA analytics_schema
  GRANT ALL ON TABLES TO analytics_svc;
ALTER DEFAULT PRIVILEGES IN SCHEMA analytics_schema
  GRANT ALL ON SEQUENCES TO analytics_svc;

-- Certificate service user
CREATE USER certificate_svc WITH PASSWORD 'certificate_svc_secret_2026';
GRANT CONNECT ON DATABASE fairgig TO certificate_svc;
GRANT USAGE, CREATE ON SCHEMA certificates_schema TO certificate_svc;
ALTER DEFAULT PRIVILEGES IN SCHEMA certificates_schema
  GRANT ALL ON TABLES TO certificate_svc;
ALTER DEFAULT PRIVILEGES IN SCHEMA certificates_schema
  GRANT ALL ON SEQUENCES TO certificate_svc;

-- ── Read-only cross-schema user ────────────────────────
-- Used by analytics and certificate services to read
-- earnings data without being able to modify it.
-- This is the k-anonymity enforcement user.

CREATE USER readonly_svc WITH PASSWORD 'readonly_svc_secret_2026';
GRANT CONNECT ON DATABASE fairgig TO readonly_svc;
GRANT USAGE ON SCHEMA earnings_schema TO readonly_svc;
GRANT USAGE ON SCHEMA grievance_schema TO readonly_svc;
GRANT USAGE ON SCHEMA auth_schema TO readonly_svc;
-- Read-only on all current and future tables in these schemas
ALTER DEFAULT PRIVILEGES IN SCHEMA earnings_schema
  GRANT SELECT ON TABLES TO readonly_svc;
ALTER DEFAULT PRIVILEGES IN SCHEMA grievance_schema
  GRANT SELECT ON TABLES TO readonly_svc;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth_schema
  GRANT SELECT ON TABLES TO readonly_svc;
