from uuid import UUID

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query

from src.auth import require_role
from src.database import get_earnings_conn, get_readonly_conn
from src.metrics import verifications_total
from src.models import VerificationUpdate

router = APIRouter(tags=['verification'])
REPORTING_TIMEZONE = 'Asia/Karachi'


def _normalize_status_list(raw_statuses: str | None) -> list[str] | None:
    if raw_statuses is None or raw_statuses.strip() == '':
        return None

    alias_map = {
        'APPROVED': 'CONFIRMED',
        'REJECTED': 'UNVERIFIABLE',
        'FLAGGED': 'FLAGGED',
        'FLAGED': 'FLAGGED',
        'PENDING': 'PENDING',
        'CONFIRMED': 'CONFIRMED',
        'UNVERIFIABLE': 'UNVERIFIABLE',
        'NO_SCREENSHOT': 'NO_SCREENSHOT',
    }

    statuses: list[str] = []
    for part in raw_statuses.split(','):
        normalized = alias_map.get(part.strip().upper())
        if normalized is None:
            raise ValueError(f'Invalid status filter: {part.strip()}')
        statuses.append(normalized)

    # Preserve order while removing duplicates.
    unique_statuses = list(dict.fromkeys(statuses))
    return unique_statuses


@router.patch('/shifts/{shift_id}/verify')
async def verify_shift(
    shift_id: UUID,
    payload: VerificationUpdate,
    user: dict = Depends(require_role('verifier', 'advocate')),
    conn: asyncpg.Connection = Depends(get_earnings_conn),
):
    shift = await conn.fetchrow(
        """
        SELECT id
        FROM earnings_schema.shifts
        WHERE id = $1
        """,
        shift_id,
    )
    if shift is None:
        raise HTTPException(status_code=404, detail='Shift not found')

    updated = await conn.fetchrow(
        """
        UPDATE earnings_schema.shifts
        SET verify_status = $2,
            verified_by = $3,
            verified_at = NOW(),
            verifier_note = $4,
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
        """,
        shift_id,
        payload.status,
        UUID(user['user_id']),
        payload.note,
    )

    verifications_total.labels(status=payload.status).inc()
    return {'success': True, 'data': dict(updated)}


@router.get('/shifts/pending-verification')
async def list_pending_verification(
    user: dict = Depends(require_role('verifier', 'advocate')),
    conn: asyncpg.Connection = Depends(get_readonly_conn),
):
    _ = user
    rows = await conn.fetch(
        """
        SELECT
          s.id,
          s.worker_id,
          s.platform,
          s.city_zone,
          s.worker_category,
          s.shift_date,
          s.hours_worked,
          s.gross_earned,
          s.platform_deduction,
          s.net_received,
          s.effective_hourly_rate,
          s.deduction_rate,
          s.screenshot_url,
          s.screenshot_public_id,
          s.verify_status,
          s.import_source,
          s.created_at,
          s.updated_at,
          u.full_name AS worker_full_name,
          u.email AS worker_email,
          u.city AS worker_city,
          u.city_zone AS worker_profile_city_zone
        FROM earnings_schema.shifts s
        LEFT JOIN auth_schema.users u ON u.id = s.worker_id
        WHERE s.verify_status = 'PENDING'
          AND s.screenshot_url IS NOT NULL
        ORDER BY s.created_at ASC
        LIMIT 50
        """
    )

    return {'success': True, 'data': [dict(row) for row in rows]}


@router.get('/verifier/submissions')
async def list_submissions(
    statuses: str | None = Query(
        default=None,
        description='Comma-separated statuses. Supports APPROVED/REJECTED/FLAGGED aliases.',
    ),
    from_date: str | None = Query(default=None),
    to_date: str | None = Query(default=None),
    platform: str | None = Query(default=None),
    city_zone: str | None = Query(default=None),
    worker_category: str | None = Query(default=None),
    worker_query: str | None = Query(default=None),
    only_with_screenshot: bool = Query(default=True),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    user: dict = Depends(require_role('verifier', 'advocate')),
    conn: asyncpg.Connection = Depends(get_readonly_conn),
):
    _ = user

    try:
        normalized_statuses = _normalize_status_list(statuses)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    conditions: list[str] = []
    args: list = []

    if normalized_statuses is not None:
        args.append(normalized_statuses)
        conditions.append(f's.verify_status = ANY(${len(args)}::text[])')

    if from_date is not None and from_date.strip() != '':
        args.append(from_date)
        conditions.append(f's.shift_date >= ${len(args)}::date')

    if to_date is not None and to_date.strip() != '':
        args.append(to_date)
        conditions.append(f's.shift_date <= ${len(args)}::date')

    if platform is not None and platform.strip() != '':
        args.append(platform.strip())
        conditions.append(f's.platform = ${len(args)}')

    if city_zone is not None and city_zone.strip() != '':
        args.append(city_zone.strip())
        conditions.append(f's.city_zone = ${len(args)}')

    if worker_category is not None and worker_category.strip() != '':
        args.append(worker_category.strip())
        conditions.append(f's.worker_category = ${len(args)}')

    if worker_query is not None and worker_query.strip() != '':
        args.append(f"%{worker_query.strip()}%")
        idx = len(args)
        conditions.append(
            f"""
            (
              u.full_name ILIKE ${idx}
              OR u.email ILIKE ${idx}
              OR s.worker_id::text ILIKE ${idx}
              OR s.id::text ILIKE ${idx}
            )
            """
        )

    if only_with_screenshot:
        conditions.append('s.screenshot_url IS NOT NULL')

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ''

    total = await conn.fetchval(
        f"""
        SELECT COUNT(*)
        FROM earnings_schema.shifts s
        LEFT JOIN auth_schema.users u ON u.id = s.worker_id
        {where_clause}
        """,
        *args,
    )

    args.append(limit)
    limit_idx = len(args)
    args.append(offset)
    offset_idx = len(args)

    rows = await conn.fetch(
        f"""
        SELECT
          s.id,
          s.worker_id,
          s.platform,
          s.city_zone,
          s.worker_category,
          s.shift_date,
          s.hours_worked,
          s.gross_earned,
          s.platform_deduction,
          s.net_received,
          s.effective_hourly_rate,
          s.deduction_rate,
          s.screenshot_url,
          s.screenshot_public_id,
          s.verify_status,
          s.verified_by,
          s.verified_at,
          s.verifier_note,
          s.import_source,
          s.created_at,
          s.updated_at,
          u.full_name AS worker_full_name,
          u.email AS worker_email,
          u.city AS worker_city,
          u.city_zone AS worker_profile_city_zone,
          v.full_name AS verifier_full_name,
          v.email AS verifier_email
        FROM earnings_schema.shifts s
        LEFT JOIN auth_schema.users u ON u.id = s.worker_id
        LEFT JOIN auth_schema.users v ON v.id = s.verified_by
        {where_clause}
        ORDER BY s.created_at DESC
        LIMIT ${limit_idx}
        OFFSET ${offset_idx}
        """,
        *args,
    )

    return {
        'success': True,
        'data': [dict(row) for row in rows],
        'meta': {
            'total': int(total or 0),
            'limit': limit,
            'offset': offset,
        },
    }



@router.get('/verifier/stats')
async def verifier_stats(
        days: int = Query(default=7, ge=7, le=90),
        user: dict = Depends(require_role('verifier', 'advocate')),
        conn: asyncpg.Connection = Depends(get_readonly_conn),
):
        verifier_id = UUID(user['user_id'])

        personal = await conn.fetchrow(
                """
                SELECT
                    COUNT(*) FILTER (WHERE verify_status IN ('CONFIRMED', 'FLAGGED', 'UNVERIFIABLE')) AS total_reviewed,
                    COUNT(*) FILTER (WHERE verify_status = 'CONFIRMED') AS approved_count,
                    COUNT(*) FILTER (WHERE verify_status = 'FLAGGED') AS flagged_count,
                    COUNT(*) FILTER (WHERE verify_status = 'UNVERIFIABLE') AS rejected_count,
                    AVG(EXTRACT(EPOCH FROM (verified_at - created_at)))
                        FILTER (
                            WHERE verify_status IN ('CONFIRMED', 'FLAGGED', 'UNVERIFIABLE')
                                AND verified_at IS NOT NULL
                        ) AS avg_review_seconds
                FROM earnings_schema.shifts
                WHERE verified_by = $1
                """,
                verifier_id,
        )

        global_counts = await conn.fetchrow(
                """
                SELECT
                    COUNT(*) FILTER (WHERE verify_status = 'PENDING' AND screenshot_url IS NOT NULL) AS pending_queue_count,
                    COUNT(*) FILTER (WHERE verify_status IN ('CONFIRMED', 'FLAGGED', 'UNVERIFIABLE')) AS total_reviewed_global
                FROM earnings_schema.shifts
                """
        )

        activity_rows = await conn.fetch(
                """
                WITH days AS (
                    SELECT generate_series(
                        (NOW() AT TIME ZONE $3)::date - ($2::int - 1),
                        (NOW() AT TIME ZONE $3)::date,
                        INTERVAL '1 day'
                    )::date AS day
                )
                SELECT
                    d.day,
                    COALESCE(COUNT(s.id), 0) AS reviewed
                FROM days d
                LEFT JOIN earnings_schema.shifts s
                    ON s.verified_by = $1
                 AND s.verify_status IN ('CONFIRMED', 'FLAGGED', 'UNVERIFIABLE')
                 AND s.verified_at IS NOT NULL
                     AND (s.verified_at AT TIME ZONE $3)::date = d.day
                GROUP BY d.day
                ORDER BY d.day ASC
                """,
                verifier_id,
                days,
                    REPORTING_TIMEZONE,
        )

        platform_rows = await conn.fetch(
                """
                SELECT
                    platform,
                    COUNT(*) AS reviews
                FROM earnings_schema.shifts
                WHERE verified_by = $1
                    AND verify_status IN ('CONFIRMED', 'FLAGGED', 'UNVERIFIABLE')
                GROUP BY platform
                ORDER BY reviews DESC, platform ASC
                LIMIT 5
                """,
                verifier_id,
        )

        total_reviewed = int((personal or {}).get('total_reviewed') or 0)
        approved_count = int((personal or {}).get('approved_count') or 0)
        flagged_count = int((personal or {}).get('flagged_count') or 0)
        rejected_count = int((personal or {}).get('rejected_count') or 0)

        approval_rate = (approved_count / total_reviewed * 100.0) if total_reviewed > 0 else 0.0
        avg_review_seconds_raw = (personal or {}).get('avg_review_seconds')
        avg_review_seconds = float(avg_review_seconds_raw) if avg_review_seconds_raw is not None else 0.0

        pending_queue_count = int((global_counts or {}).get('pending_queue_count') or 0)
        total_reviewed_global = int((global_counts or {}).get('total_reviewed_global') or 0)

        return {
                'success': True,
                'data': {
                        'total_reviewed_by_you': total_reviewed,
                        'approved_by_you': approved_count,
                        'flagged_by_you': flagged_count,
                        'rejected_by_you': rejected_count,
                        'approval_rate': round(approval_rate, 2),
                        'avg_review_seconds': round(avg_review_seconds, 2),
                        'pending_queue_count': pending_queue_count,
                        'total_reviewed_global': total_reviewed_global,
                        'days': days,
                        'timezone': REPORTING_TIMEZONE,
                        'weekly_activity': [
                                {
                                        'date': row['day'].isoformat(),
                                        'reviewed': int(row['reviewed']),
                                }
                                for row in activity_rows
                        ],
                        'top_platforms': [
                                {
                                        'platform': row['platform'],
                                        'reviews': int(row['reviews']),
                                }
                                for row in platform_rows
                        ],
                },
        }
