from uuid import UUID

import asyncpg
from fastapi import APIRouter, Depends, HTTPException

from src.auth import require_role
from src.database import get_earnings_conn, get_readonly_conn
from src.metrics import verifications_total
from src.models import VerificationUpdate

router = APIRouter(tags=['verification'])


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
