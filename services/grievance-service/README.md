# Grievance Service

Worker complaint management and grievance clustering for FairGig.

## Overview

The Grievance Service manages the complaint bulletin board where any worker can post grievances anonymously or with their identity. Advocates can view, tag, and escalate complaints. The system automatically detects similar complaints to help cluster widespread issues.

**Key features:**
- **Public read**: Anyone can list and view complaints (no authentication required)
- **Anonymous posting**: Workers can omit their identity when filing complaints
- **Upvoting**: Workers can upvote complaints they relate to
- **Advocacy**: Advocates can tag, escalate, and resolve complaints
- **Clustering**: The system suggests similar complaints when a new one is posted
- **Statistics**: Breakdowns by platform, category, and top issues this week

## Quick Start

```bash
# Install dependencies
npm install

# Start service (requires .env at repository root)
npm start

# Or development mode with file watching
npm run dev
```

Service runs on port 4004 (configurable via `GRIEVANCE_PORT`).

## API Quick Reference

Public (no auth):
- `GET /api/grievance/complaints` — List all complaints
- `GET /api/grievance/complaints/:id` — Get single complaint
- `GET /api/grievance/stats` — Get statistics

Authenticated (bearer token):
- `POST /api/grievance/complaints` — Create complaint (anonymous option)
- `POST /api/grievance/complaints/:id/upvote` — Upvote a complaint
- `DELETE /api/grievance/complaints/:id/upvote` — Remove upvote
- `DELETE /api/grievance/complaints/:id` — Delete own complaint (OPEN only)

Advocate only:
- `POST /api/grievance/complaints/:id/tags` — Add tag
- `PATCH /api/grievance/complaints/:id/status` — Escalate/resolve

Internal:
- `GET /health` — Health check
- `GET /ready` — Readiness probe
- `GET /metrics` — Prometheus metrics

## Business Rules

1. **Public read**: Anyone can view all complaints
2. **Anonymous posting**: `POST` body can include `"anonymous": true` to hide poster identity
3. **Upvoting**: One upvote per user per complaint (unique constraint + ON CONFLICT DO NOTHING)
4. **Clustering**: When a complaint is created, similar existing complaints are returned in response
5. **Advocacy**: Only advocates can tag, escalate, or resolve
6. **Deletion**: Workers can only delete their own OPEN complaints
7. **Stats**: Sorted by upvote count DESC, then created_at DESC

## Database

Requires PostgreSQL with `grievance_schema` tables:
- `complaints` — Main grievance records
- `complaint_tags` — Advocate-applied tags
- `complaint_upvotes` — User upvotes (unique: complaint_id + user_id)

Database URL: `GRIEVANCE_DB_URL` environment variable

## Authentication

Uses JWT access tokens issued by auth-service.
- Verify with `JWT_ACCESS_SECRET` environment variable
- Add Bearer token to `Authorization` header for protected endpoints
- `request.user` contains decoded token: `{ sub, role, name, ... }`

## Testing Examples

See README.md full section for comprehensive test commands with curl examples.

## Port
4004

## API docs
See `docs/api-contracts.md`
