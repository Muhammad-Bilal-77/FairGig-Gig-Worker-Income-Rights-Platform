-- Standard refresh (more reliable for dev/seeding)
CREATE OR REPLACE FUNCTION analytics_schema.refresh_all_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW analytics_schema.city_median_by_zone;
  REFRESH MATERIALIZED VIEW analytics_schema.platform_commission_trends;
  REFRESH MATERIALIZED VIEW analytics_schema.vulnerability_flags;
  REFRESH MATERIALIZED VIEW analytics_schema.top_complaint_categories;
END;
$$ LANGUAGE plpgsql;
