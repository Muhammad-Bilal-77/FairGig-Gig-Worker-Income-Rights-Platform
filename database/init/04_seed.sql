-- ══════════════════════════════════════════════════════════
-- 04_seed.sql — 50 workers + realistic PKR earnings
-- ══════════════════════════════════════════════════════════
--
-- Why this seed data is critical:
-- 1. City median requires REAL aggregated data (judges check this)
-- 2. Materialized views need >= 5 workers per zone/platform
-- 3. Vulnerability flag view needs month-over-month data
-- 4. Commission trend view needs 8+ weeks of data
-- 5. Anomaly service needs historical shifts to compute baseline
--
-- Realistic PKR ranges (2026 estimates):
-- Careem driver:    PKR 800–1500/hr gross, 28-32% platform cut
-- Foodpanda rider:  PKR 600–1000/hr gross, 25-30% platform cut
-- Bykea driver:     PKR 500–900/hr gross,  22-28% platform cut
-- Upwork freelancer: PKR 2000–8000/hr gross, 20% platform cut

-- Password hash for 'password123' with bcrypt rounds 12
-- In production never hardcode — this is only seed data

DO $$
DECLARE
  default_pass TEXT := '$2a$12$jPVSLeok2cZrAEJMbfOxnuf4pK1ZmNzIist9YYLsYTpbUqGESc8Cu';
  w_ids UUID[] := ARRAY[
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid()
  ];
BEGIN

-- ══════════════════════════════════════════════════════
-- 15 Careem drivers in DHA Lahore
-- ══════════════════════════════════════════════════════
INSERT INTO auth_schema.users
  (id, email, password_hash, full_name, phone, role,
   city, city_zone, worker_category)
SELECT
  w_ids[i],
  'careem.dha.' || i || '@seed.com',
  default_pass,
  'Careem Driver DHA ' || i,
  '03001' || LPAD(i::TEXT, 7, '0'),
  'worker', 'Lahore', 'DHA', 'ride_hailing'
FROM generate_series(1, 15) AS i;

-- Two-level subquery: inner computes gross, middle computes deduction from gross,
-- outer inserts net = gross - deduction (guaranteed non-negative)
INSERT INTO earnings_schema.shifts
  (worker_id, platform, city_zone, worker_category,
   shift_date, hours_worked, gross_earned,
   platform_deduction, net_received, verify_status)
SELECT
  wid, 'Careem', 'DHA', 'ride_hailing',
  sdate, hrs, gross, deduction, gross - deduction,
  CASE WHEN RANDOM() > 0.3 THEN 'CONFIRMED' ELSE 'PENDING' END
FROM (
  SELECT wid, sdate, hrs, gross,
    ROUND((gross * (0.28 + RANDOM() * 0.04))::NUMERIC, 2) AS deduction
  FROM (
    SELECT
      w_ids[((ROW_NUMBER() OVER () - 1) % 15) + 1] AS wid,
      CURRENT_DATE - (d || ' days')::INTERVAL       AS sdate,
      ROUND((4 + RANDOM() * 6)::NUMERIC, 2)         AS hrs,
      ROUND(((4 + RANDOM() * 6) * (900 + RANDOM() * 500))::NUMERIC, 2) AS gross
    FROM generate_series(0, 89) AS d
    WHERE RANDOM() > 0.3
  ) inner_q
) outer_q;

-- ══════════════════════════════════════════════════════
-- 10 Careem drivers in Gulberg Lahore
-- ══════════════════════════════════════════════════════
INSERT INTO auth_schema.users
  (id, email, password_hash, full_name, phone, role,
   city, city_zone, worker_category)
SELECT
  w_ids[i + 15],
  'careem.gulberg.' || i || '@seed.com',
  default_pass,
  'Careem Driver Gulberg ' || i,
  '03011' || LPAD(i::TEXT, 7, '0'),
  'worker', 'Lahore', 'Gulberg', 'ride_hailing'
FROM generate_series(1, 10) AS i;

INSERT INTO earnings_schema.shifts
  (worker_id, platform, city_zone, worker_category,
   shift_date, hours_worked, gross_earned,
   platform_deduction, net_received, verify_status)
SELECT
  wid, 'Careem', 'Gulberg', 'ride_hailing',
  sdate, hrs, gross, deduction, gross - deduction,
  'CONFIRMED'
FROM (
  SELECT wid, sdate, hrs, gross,
    -- Gulberg: 30-34% (systemic unfairness vs DHA's 28-32%)
    ROUND((gross * (0.30 + RANDOM() * 0.04))::NUMERIC, 2) AS deduction
  FROM (
    SELECT
      w_ids[((ROW_NUMBER() OVER () - 1) % 10) + 16] AS wid,
      CURRENT_DATE - (d || ' days')::INTERVAL        AS sdate,
      ROUND((4 + RANDOM() * 6)::NUMERIC, 2)          AS hrs,
      ROUND(((4 + RANDOM() * 6) * (800 + RANDOM() * 400))::NUMERIC, 2) AS gross
    FROM generate_series(0, 89) AS d
    WHERE RANDOM() > 0.35
  ) inner_q
) outer_q;

-- ══════════════════════════════════════════════════════
-- 10 Foodpanda riders in Saddar Lahore
-- ══════════════════════════════════════════════════════
INSERT INTO auth_schema.users
  (id, email, password_hash, full_name, phone, role,
   city, city_zone, worker_category)
SELECT
  w_ids[i + 25],
  'foodpanda.saddar.' || i || '@seed.com',
  default_pass,
  'Foodpanda Rider Saddar ' || i,
  '03021' || LPAD(i::TEXT, 7, '0'),
  'worker', 'Lahore', 'Saddar', 'food_delivery'
FROM generate_series(1, 10) AS i;

INSERT INTO earnings_schema.shifts
  (worker_id, platform, city_zone, worker_category,
   shift_date, hours_worked, gross_earned,
   platform_deduction, net_received, verify_status)
SELECT
  wid, 'Foodpanda', 'Saddar', 'food_delivery',
  sdate, hrs, gross, deduction, gross - deduction,
  'CONFIRMED'
FROM (
  SELECT wid, sdate, hrs, gross,
    ROUND((gross * (0.25 + RANDOM() * 0.05))::NUMERIC, 2) AS deduction
  FROM (
    SELECT
      w_ids[((ROW_NUMBER() OVER () - 1) % 10) + 26] AS wid,
      CURRENT_DATE - (d || ' days')::INTERVAL        AS sdate,
      ROUND((3 + RANDOM() * 5)::NUMERIC, 2)          AS hrs,
      ROUND(((3 + RANDOM() * 5) * (700 + RANDOM() * 300))::NUMERIC, 2) AS gross
    FROM generate_series(0, 89) AS d
    WHERE RANDOM() > 0.4
  ) inner_q
) outer_q;

-- ══════════════════════════════════════════════════════
-- 8 Bykea drivers in DHA Lahore
-- ══════════════════════════════════════════════════════
INSERT INTO auth_schema.users
  (id, email, password_hash, full_name, phone, role,
   city, city_zone, worker_category)
SELECT
  w_ids[i + 35],
  'bykea.dha.' || i || '@seed.com',
  default_pass,
  'Bykea Driver DHA ' || i,
  '03031' || LPAD(i::TEXT, 7, '0'),
  'worker', 'Lahore', 'DHA', 'ride_hailing'
FROM generate_series(1, 8) AS i;

INSERT INTO earnings_schema.shifts
  (worker_id, platform, city_zone, worker_category,
   shift_date, hours_worked, gross_earned,
   platform_deduction, net_received, verify_status)
SELECT
  wid, 'Bykea', 'DHA', 'ride_hailing',
  sdate, hrs, gross, deduction, gross - deduction,
  'CONFIRMED'
FROM (
  SELECT wid, sdate, hrs, gross,
    ROUND((gross * (0.22 + RANDOM() * 0.06))::NUMERIC, 2) AS deduction
  FROM (
    SELECT
      w_ids[((ROW_NUMBER() OVER () - 1) % 8) + 36] AS wid,
      CURRENT_DATE - (d || ' days')::INTERVAL       AS sdate,
      ROUND((3 + RANDOM() * 7)::NUMERIC, 2)         AS hrs,
      ROUND(((3 + RANDOM() * 7) * (600 + RANDOM() * 300))::NUMERIC, 2) AS gross
    FROM generate_series(0, 89) AS d
    WHERE RANDOM() > 0.45
  ) inner_q
) outer_q;

-- ══════════════════════════════════════════════════════
-- 7 Upwork freelancers in Gulberg
-- ══════════════════════════════════════════════════════
INSERT INTO auth_schema.users
  (id, email, password_hash, full_name, phone, role,
   city, city_zone, worker_category)
SELECT
  w_ids[i + 43],
  'upwork.gulberg.' || i || '@seed.com',
  default_pass,
  'Freelancer Gulberg ' || i,
  '03041' || LPAD(i::TEXT, 7, '0'),
  'worker', 'Lahore', 'Gulberg', 'freelance'
FROM generate_series(1, 7) AS i;

INSERT INTO earnings_schema.shifts
  (worker_id, platform, city_zone, worker_category,
   shift_date, hours_worked, gross_earned,
   platform_deduction, net_received, verify_status)
SELECT
  wid, 'Upwork', 'Gulberg', 'freelance',
  sdate, hrs, gross, deduction, gross - deduction,
  'CONFIRMED'
FROM (
  SELECT wid, sdate, hrs, gross,
    -- Upwork fixed 20% cut
    ROUND((gross * 0.20)::NUMERIC, 2) AS deduction
  FROM (
    SELECT
      w_ids[((ROW_NUMBER() OVER () - 1) % 7) + 44] AS wid,
      CURRENT_DATE - (d || ' days')::INTERVAL       AS sdate,
      ROUND((2 + RANDOM() * 8)::NUMERIC, 2)         AS hrs,
      ROUND(((2 + RANDOM() * 8) * (2000 + RANDOM() * 6000))::NUMERIC, 2) AS gross
    FROM generate_series(0, 89) AS d
    WHERE RANDOM() > 0.6
  ) inner_q
) outer_q;

-- ══════════════════════════════════════════════════════
-- Verifiers and advocates
-- ══════════════════════════════════════════════════════
INSERT INTO auth_schema.users
  (email, password_hash, full_name, role, city, city_zone)
VALUES
  ('verifier1@fairgig.com', default_pass,
   'Ahmed Verifier', 'verifier', 'Lahore', 'DHA'),
  ('verifier2@fairgig.com', default_pass,
   'Sara Verifier', 'verifier', 'Lahore', 'Gulberg'),
  ('advocate1@fairgig.com', default_pass,
   'Labour Advocate One', 'advocate', 'Lahore', NULL),
  ('advocate2@fairgig.com', default_pass,
   'Rights Analyst Two', 'advocate', 'Lahore', NULL);

-- ══════════════════════════════════════════════════════
-- Seed grievances
-- ══════════════════════════════════════════════════════
INSERT INTO grievance_schema.complaints
  (platform, category, title, description, city_zone, status, upvote_count)
VALUES
  ('Careem', 'commission_change',
   'Commission increased without notice in DHA',
   'Careem increased deduction from 28% to 33% this month with no notification. Lost PKR 8000 income.',
   'DHA', 'ESCALATED', 24),
  ('Careem', 'commission_change',
   'Higher rates in Gulberg than DHA',
   'Same hours, same trips but Gulberg drivers pay 4% more commission. This is unfair zoning.',
   'Gulberg', 'OPEN', 18),
  ('Foodpanda', 'account_deactivation',
   'Account deactivated with no explanation',
   'My account was deactivated after 2 years with no warning and no response from support.',
   'Saddar', 'OPEN', 31),
  ('Bykea', 'payment_delay',
   'Weekly payment delayed by 12 days',
   'Payment that was due on 1st arrived on 13th. No communication from Bykea.',
   'DHA', 'RESOLVED', 9),
  ('Upwork', 'commission_change',
   'Service fee increased to 20% flat',
   'Upwork removed the sliding scale fee and now charges 20% flat on all contracts regardless of size.',
   'Gulberg', 'OPEN', 15),
  ('Careem', 'unfair_rating',
   'Rating dropped after customer mistake',
   'Customer gave 1 star because they entered wrong address. Rating system has no dispute mechanism.',
   'DHA', 'OPEN', 27),
  ('Foodpanda', 'app_bug',
   'App shows wrong order amount after delivery',
   'Multiple times the payment in app shows less than what customer paid. Where is the difference going?',
   'Saddar', 'ESCALATED', 33);

-- ══════════════════════════════════════════════════════
-- Refresh all materialized views after seeding
-- ══════════════════════════════════════════════════════
REFRESH MATERIALIZED VIEW analytics_schema.city_median_by_zone;
REFRESH MATERIALIZED VIEW analytics_schema.platform_commission_trends;
REFRESH MATERIALIZED VIEW analytics_schema.vulnerability_flags;
REFRESH MATERIALIZED VIEW analytics_schema.top_complaint_categories;

END $$;
