# FairGig Database

PostgreSQL 16 with schema-per-service isolation.

## Schemas
- `auth_schema` — User accounts, refresh tokens
- `earnings_schema` — Shift records, earnings data
- `grievance_schema` — Complaints, tags, upvotes
- `analytics_schema` — Materialized views for k-anonymous analytics
- `certificates_schema` — Income certificates

## Initialization
SQL files in `init/` run automatically on first `docker compose up`:
1. `01_schemas.sql` — Creates schemas, users, permissions
2. `02_tables.sql` — Creates all tables with indexes
3. `03_views.sql` — Creates materialized views
4. `04_seed.sql` — Seeds 50 workers + realistic earnings data

## Reset
```bash
docker compose down -v && docker compose up -d
```
