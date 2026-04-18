-- ══════════════════════════════════════════════════════════
-- 03_views.sql — Materialized views for k-anonymous analytics
-- ══════════════════════════════════════════════════════════
--
-- Why materialized views:
-- 1. Analytics queries are expensive (aggregate across many rows)
-- 2. Workers need city median on every dashboard load — must be fast
-- 3. k-anonymity: HAVING COUNT(*) >= 5 means if fewer than 5 workers
--    contributed to a city_zone + platform combination, that row is
--    suppressed entirely. Individual workers cannot be reverse-engineered.
-- 4. Views refresh every 15 minutes via a scheduled job in analytics service
-- 5. Analytics service reads ONLY from these views — never raw worker tables

-- Grant readonly_svc access to the views
GRANT USAGE ON SCHEMA analytics_schema TO readonly_svc;

-- ── View 1: City-wide median by zone/platform/category ──
-- This is what the worker dashboard shows for comparison.
-- "Your effective hourly rate vs workers like you in your zone"

CREATE MATERIALIZED VIEW analytics_schema.city_median_by_zone AS
SELECT
  city_zone,
  platform,
  worker_category,
  -- Median effective hourly rate (PKR/hour)
  PERCENTILE_CONT(0.5) WITHIN GROUP (
    ORDER BY effective_hourly_rate
  )::DECIMAL(10,2)                        AS median_hourly_rate,
  -- Median deduction rate (as decimal: 0.28 = 28%)
  PERCENTILE_CONT(0.5) WITHIN GROUP (
    ORDER BY deduction_rate
  )::DECIMAL(5,4)                         AS median_deduction_rate,
  -- Average weekly net earnings
  AVG(net_received / 7.0)::DECIMAL(10,2)  AS avg_daily_net,
  COUNT(DISTINCT worker_id)               AS worker_count,
  COUNT(*)                                AS shift_count,
  MAX(shift_date)                         AS last_updated
FROM earnings_schema.shifts
WHERE verify_status = 'CONFIRMED'
  AND shift_date >= NOW() - INTERVAL '30 days'
GROUP BY city_zone, platform, worker_category
-- k-anonymity: suppress groups smaller than 5 workers
HAVING COUNT(DISTINCT worker_id) >= 5;

CREATE UNIQUE INDEX idx_city_median_unique
  ON analytics_schema.city_median_by_zone(city_zone, platform, worker_category);

-- ── View 2: Platform commission rate trends over time ──
-- Shows advocate: Careem raised commission from 28% to 33% in DHA
-- over the last 8 weeks. Individual workers could never see this.

CREATE MATERIALIZED VIEW analytics_schema.platform_commission_trends AS
SELECT
  platform,
  city_zone,
  worker_category,
  DATE_TRUNC('week', shift_date)          AS week_start,
  AVG(deduction_rate)::DECIMAL(5,4)       AS avg_deduction_rate,
  MIN(deduction_rate)::DECIMAL(5,4)       AS min_deduction_rate,
  MAX(deduction_rate)::DECIMAL(5,4)       AS max_deduction_rate,
  STDDEV(deduction_rate)::DECIMAL(5,4)    AS stddev_deduction_rate,
  COUNT(DISTINCT worker_id)               AS worker_count,
  SUM(gross_earned)::DECIMAL(14,2)        AS total_gross_pkr,
  SUM(platform_deduction)::DECIMAL(14,2)  AS total_deductions_pkr
FROM earnings_schema.shifts
WHERE verify_status = 'CONFIRMED'
  AND shift_date >= NOW() - INTERVAL '90 days'
GROUP BY platform, city_zone, worker_category,
         DATE_TRUNC('week', shift_date)
HAVING COUNT(DISTINCT worker_id) >= 5;

CREATE INDEX idx_commission_trends_platform
  ON analytics_schema.platform_commission_trends(platform, week_start DESC);

-- ── View 3: Vulnerability flags ──
-- Workers whose income dropped more than 20% month-on-month.
-- Shown to advocates anonymized — no names, no IDs in the view.
-- Why: advocates need to identify at-risk workers without
-- compromising individual privacy.

CREATE MATERIALIZED VIEW analytics_schema.vulnerability_flags AS
WITH monthly_earnings AS (
  SELECT
    worker_id,
    city_zone,
    platform,
    worker_category,
    DATE_TRUNC('month', shift_date)   AS month,
    SUM(net_received)                 AS monthly_net,
    COUNT(*)                          AS shift_count
  FROM earnings_schema.shifts
  WHERE verify_status = 'CONFIRMED'
    AND shift_date >= NOW() - INTERVAL '60 days'
  GROUP BY worker_id, city_zone, platform, worker_category,
           DATE_TRUNC('month', shift_date)
),
month_pairs AS (
  SELECT
    curr.worker_id,
    curr.city_zone,
    curr.platform,
    curr.worker_category,
    curr.month                              AS current_month,
    curr.monthly_net                        AS current_net,
    prev.monthly_net                        AS previous_net,
    ((prev.monthly_net - curr.monthly_net)
      / NULLIF(prev.monthly_net, 0))        AS drop_fraction
  FROM monthly_earnings curr
  JOIN monthly_earnings prev
    ON curr.worker_id = prev.worker_id
   AND curr.month = prev.month + INTERVAL '1 month'
)
SELECT
  city_zone,
  platform,
  worker_category,
  current_month,
  -- Anonymized: count of affected workers, not their IDs
  COUNT(*)                                  AS affected_worker_count,
  AVG(drop_fraction)::DECIMAL(5,4)          AS avg_income_drop,
  MAX(drop_fraction)::DECIMAL(5,4)          AS max_income_drop
FROM month_pairs
WHERE drop_fraction > 0.20
GROUP BY city_zone, platform, worker_category, current_month
HAVING COUNT(*) >= 3;

CREATE INDEX idx_vuln_flags_month
  ON analytics_schema.vulnerability_flags(current_month DESC);

-- ── View 4: Top complaint categories this week ──
-- For advocate dashboard — what are workers complaining about most?

CREATE MATERIALIZED VIEW analytics_schema.top_complaint_categories AS
SELECT
  platform,
  category,
  city_zone,
  DATE_TRUNC('week', created_at)  AS week_start,
  COUNT(*)                        AS complaint_count,
  SUM(upvote_count)               AS total_upvotes,
  COUNT(CASE WHEN status = 'ESCALATED'
        THEN 1 END)               AS escalated_count
FROM grievance_schema.complaints
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY platform, category, city_zone,
         DATE_TRUNC('week', created_at);

CREATE INDEX idx_top_complaints_week
  ON analytics_schema.top_complaint_categories(week_start DESC, complaint_count DESC);

-- ── Refresh function ──
-- Called by analytics service on a 15-minute schedule
CREATE OR REPLACE FUNCTION analytics_schema.refresh_all_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY
    analytics_schema.city_median_by_zone;
  REFRESH MATERIALIZED VIEW CONCURRENTLY
    analytics_schema.platform_commission_trends;
  REFRESH MATERIALIZED VIEW CONCURRENTLY
    analytics_schema.vulnerability_flags;
  REFRESH MATERIALIZED VIEW CONCURRENTLY
    analytics_schema.top_complaint_categories;
END;
$$ LANGUAGE plpgsql;

-- Grant execute to analytics service
GRANT EXECUTE ON FUNCTION analytics_schema.refresh_all_views()
  TO analytics_svc;

-- Grant SELECT on materialized views to readonly_svc and analytics_svc
GRANT SELECT ON ALL TABLES IN SCHEMA analytics_schema TO readonly_svc;
GRANT SELECT ON ALL TABLES IN SCHEMA analytics_schema TO analytics_svc;
