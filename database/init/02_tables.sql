-- ══════════════════════════════════════════════════════════
-- 02_tables.sql — All table definitions with indexes
-- ══════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════
-- AUTH SCHEMA TABLES
-- ══════════════════════════════════════════════════════

-- Why UUID primary keys: no sequential ID guessing attacks.
-- A user cannot guess another user's ID by incrementing.

CREATE TABLE auth_schema.users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL,
  full_name       TEXT NOT NULL,
  phone           TEXT,
  -- Role determines what the user can see and do.
  -- worker: log earnings, upload screenshots, get certificate
  -- verifier: review and verify screenshots
  -- advocate: view anonymized aggregate analytics, moderate grievances
  role            TEXT NOT NULL DEFAULT 'worker'
                  CHECK (role IN ('worker', 'verifier', 'advocate')),
  city            TEXT,
  -- City zone is stored on the user for analytics grouping.
  -- Workers in DHA vs Gulberg vs Saddar may have different rates.
  city_zone       TEXT,
  -- Worker category determines which median they compare against.
  -- A Careem driver compares against other Careem drivers, not freelancers.
  worker_category TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  is_verified     BOOLEAN DEFAULT FALSE,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email    ON auth_schema.users(email);
CREATE INDEX idx_users_role     ON auth_schema.users(role);
CREATE INDEX idx_users_zone     ON auth_schema.users(city_zone)
  WHERE role = 'worker';

-- Refresh token table for JWT rotation security.
-- Why: if a refresh token is stolen and used, we detect
-- the double-use and invalidate the entire token family.
CREATE TABLE auth_schema.refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth_schema.users(id)
              ON DELETE CASCADE,
  token_hash  TEXT UNIQUE NOT NULL,
  family      TEXT NOT NULL,
  is_used     BOOLEAN DEFAULT FALSE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_refresh_user   ON auth_schema.refresh_tokens(user_id);
CREATE INDEX idx_refresh_family ON auth_schema.refresh_tokens(family);

-- ══════════════════════════════════════════════════════
-- EARNINGS SCHEMA TABLES
-- ══════════════════════════════════════════════════════

CREATE TABLE earnings_schema.shifts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id           UUID NOT NULL,
  -- Platform name: Careem, Bykea, Foodpanda, Upwork, etc.
  platform            TEXT NOT NULL,
  city_zone           TEXT NOT NULL,
  worker_category     TEXT NOT NULL,
  shift_date          DATE NOT NULL,
  hours_worked        DECIMAL(5,2) NOT NULL
                      CHECK (hours_worked > 0 AND hours_worked <= 24),
  -- All amounts in Pakistani Rupees (PKR)
  gross_earned        DECIMAL(12,2) NOT NULL CHECK (gross_earned >= 0),
  platform_deduction  DECIMAL(12,2) NOT NULL CHECK (platform_deduction >= 0),
  net_received        DECIMAL(12,2) NOT NULL CHECK (net_received >= 0),
  -- Computed: net must equal gross minus deduction (within 1 PKR rounding)
  -- Enforced at application level, not DB level (allows rounding)
  -- Screenshot verification fields
  screenshot_url      TEXT,
  screenshot_public_id TEXT,
  verify_status       TEXT NOT NULL DEFAULT 'PENDING'
                      CHECK (verify_status IN (
                        'PENDING',
                        'CONFIRMED',
                        'FLAGGED',
                        'UNVERIFIABLE',
                        'NO_SCREENSHOT'
                      )),
  verified_by         UUID,
  verified_at         TIMESTAMPTZ,
  verifier_note       TEXT,
  -- Source of this record (manual entry or CSV import)
  import_source       TEXT DEFAULT 'manual'
                      CHECK (import_source IN ('manual', 'csv')),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Computed column: effective hourly rate
-- Why stored: analytics queries use this frequently.
-- GENERATED ALWAYS means DB keeps it in sync automatically.
ALTER TABLE earnings_schema.shifts
  ADD COLUMN effective_hourly_rate DECIMAL(10,2)
  GENERATED ALWAYS AS (
    CASE WHEN hours_worked > 0
    THEN ROUND(net_received / hours_worked, 2)
    ELSE 0 END
  ) STORED;

-- Computed column: deduction rate as percentage
ALTER TABLE earnings_schema.shifts
  ADD COLUMN deduction_rate DECIMAL(5,4)
  GENERATED ALWAYS AS (
    CASE WHEN gross_earned > 0
    THEN ROUND(platform_deduction / gross_earned, 4)
    ELSE 0 END
  ) STORED;

-- Indexes for common query patterns
CREATE INDEX idx_shifts_worker
  ON earnings_schema.shifts(worker_id, shift_date DESC);
CREATE INDEX idx_shifts_platform_zone
  ON earnings_schema.shifts(platform, city_zone, worker_category)
  WHERE verify_status = 'CONFIRMED';
CREATE INDEX idx_shifts_date
  ON earnings_schema.shifts(shift_date DESC);
CREATE INDEX idx_shifts_verify
  ON earnings_schema.shifts(verify_status)
  WHERE verify_status = 'PENDING';

-- ══════════════════════════════════════════════════════
-- GRIEVANCE SCHEMA TABLES
-- ══════════════════════════════════════════════════════

CREATE TABLE grievance_schema.complaints (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- poster_id is nullable — anonymous posts allowed
  poster_id       UUID,
  platform        TEXT NOT NULL,
  -- Category for clustering similar complaints
  category        TEXT NOT NULL
                  CHECK (category IN (
                    'commission_change',
                    'account_deactivation',
                    'payment_delay',
                    'unfair_rating',
                    'safety_concern',
                    'app_bug',
                    'other'
                  )),
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  city_zone       TEXT,
  -- Status managed by advocates
  status          TEXT NOT NULL DEFAULT 'OPEN'
                  CHECK (status IN ('OPEN', 'ESCALATED', 'RESOLVED')),
  escalated_by    UUID,
  escalated_at    TIMESTAMPTZ,
  resolved_by     UUID,
  resolved_at     TIMESTAMPTZ,
  upvote_count    INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_complaints_platform
  ON grievance_schema.complaints(platform, category);
CREATE INDEX idx_complaints_status
  ON grievance_schema.complaints(status, created_at DESC);
CREATE INDEX idx_complaints_zone
  ON grievance_schema.complaints(city_zone, created_at DESC);

-- Tags applied by advocates to group and categorize complaints
CREATE TABLE grievance_schema.complaint_tags (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL
               REFERENCES grievance_schema.complaints(id)
               ON DELETE CASCADE,
  tag          TEXT NOT NULL,
  tagged_by    UUID NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tags_complaint ON grievance_schema.complaint_tags(complaint_id);
CREATE INDEX idx_tags_tag       ON grievance_schema.complaint_tags(tag);

-- Upvotes — one per user per complaint
CREATE TABLE grievance_schema.complaint_upvotes (
  complaint_id UUID NOT NULL
               REFERENCES grievance_schema.complaints(id)
               ON DELETE CASCADE,
  user_id      UUID NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (complaint_id, user_id)
);

-- ══════════════════════════════════════════════════════
-- CERTIFICATES SCHEMA TABLES
-- ══════════════════════════════════════════════════════

CREATE TABLE certificates_schema.certificates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Public-facing certificate ID — shorter, for sharing with banks
  cert_ref        TEXT UNIQUE NOT NULL,
  worker_id       UUID NOT NULL,
  worker_name     TEXT NOT NULL,
  date_from       DATE NOT NULL,
  date_to         DATE NOT NULL,
  -- Snapshot of earnings at time of generation
  total_gross     DECIMAL(12,2) NOT NULL,
  total_deductions DECIMAL(12,2) NOT NULL,
  total_net       DECIMAL(12,2) NOT NULL,
  total_hours     DECIMAL(8,2) NOT NULL,
  shift_count     INTEGER NOT NULL,
  verified_count  INTEGER NOT NULL,
  -- Rendered HTML stored for quick retrieval
  rendered_html   TEXT,
  -- Platform breakdown JSON: {"Careem": 45000, "Bykea": 12000}
  platform_breakdown JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_certs_worker  ON certificates_schema.certificates(worker_id);
CREATE INDEX idx_certs_ref     ON certificates_schema.certificates(cert_ref);

-- ══════════════════════════════════════════════════════
-- GRANT SELECT on existing tables to readonly_svc
-- (ALTER DEFAULT PRIVILEGES only affects FUTURE tables)
-- ══════════════════════════════════════════════════════

GRANT SELECT ON ALL TABLES IN SCHEMA auth_schema TO readonly_svc;
GRANT SELECT ON ALL TABLES IN SCHEMA earnings_schema TO readonly_svc;
GRANT SELECT ON ALL TABLES IN SCHEMA grievance_schema TO readonly_svc;

-- Grant service users full access on their existing tables
GRANT ALL ON ALL TABLES IN SCHEMA auth_schema TO auth_svc;
GRANT ALL ON ALL SEQUENCES IN SCHEMA auth_schema TO auth_svc;
GRANT ALL ON ALL TABLES IN SCHEMA earnings_schema TO earnings_svc;
GRANT ALL ON ALL SEQUENCES IN SCHEMA earnings_schema TO earnings_svc;
GRANT ALL ON ALL TABLES IN SCHEMA grievance_schema TO grievance_svc;
GRANT ALL ON ALL SEQUENCES IN SCHEMA grievance_schema TO grievance_svc;
GRANT ALL ON ALL TABLES IN SCHEMA analytics_schema TO analytics_svc;
GRANT ALL ON ALL SEQUENCES IN SCHEMA analytics_schema TO analytics_svc;
GRANT ALL ON ALL TABLES IN SCHEMA certificates_schema TO certificate_svc;
GRANT ALL ON ALL SEQUENCES IN SCHEMA certificates_schema TO certificate_svc;
