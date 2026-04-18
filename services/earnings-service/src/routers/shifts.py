from datetime import date
from uuid import UUID

import asyncpg
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status

from src.auth import get_current_user, require_role
from src.database import get_earnings_conn
from src.metrics import shifts_created_total
from src.models import ShiftCreate
from src.services.csv_service import import_csv
from src.services.shift_service import (
    create_shift,
    delete_shift,
    get_shift,
    list_shifts,
    update_screenshot,
)

router = APIRouter(tags=['shifts'])


@router.post('/shifts', status_code=status.HTTP_201_CREATED)
async def create_shift_endpoint(
    payload: ShiftCreate,
    user: dict = Depends(require_role('worker')),
    conn: asyncpg.Connection = Depends(get_earnings_conn),
):
    shift = await create_shift(conn, UUID(user['user_id']), payload)
    shifts_created_total.labels(
        platform=payload.platform,
        worker_category=payload.worker_category,
    ).inc()
    return {'success': True, 'data': shift}


@router.get('/shifts')
async def list_shifts_endpoint(
    from_date: date | None = Query(default=None),
    to_date: date | None = Query(default=None),
    platform: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user: dict = Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_earnings_conn),
):
    role = user['role']
    worker_scope = None if role in ('verifier', 'advocate') else UUID(user['user_id'])

    shifts = await list_shifts(
        conn,
        worker_scope,
        from_date,
        to_date,
        platform,
        limit,
        offset,
    )
    return {'success': True, 'data': shifts}


@router.get('/shifts/{shift_id}')
async def get_shift_endpoint(
    shift_id: UUID,
    user: dict = Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_earnings_conn),
):
    can_view_all = user['role'] in ('verifier', 'advocate')
    try:
        shift = await get_shift(conn, shift_id, UUID(user['user_id']), can_view_all=can_view_all)
        return {'success': True, 'data': shift}
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.delete('/shifts/{shift_id}')
async def delete_shift_endpoint(
    shift_id: UUID,
    user: dict = Depends(require_role('worker')),
    conn: asyncpg.Connection = Depends(get_earnings_conn),
):
    try:
        await delete_shift(conn, shift_id, UUID(user['user_id']))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {'success': True, 'data': {'deleted': True}}


@router.post('/shifts/{shift_id}/screenshot')
async def update_screenshot_endpoint(
    shift_id: UUID,
    screenshot_url: str = Query(..., min_length=8),
    user: dict = Depends(require_role('worker')),
    conn: asyncpg.Connection = Depends(get_earnings_conn),
):
    try:
        shift = await update_screenshot(conn, shift_id, UUID(user['user_id']), screenshot_url)
        return {'success': True, 'data': shift}
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post('/shifts/import')
async def import_shifts_endpoint(
    file: UploadFile = File(...),
    user: dict = Depends(require_role('worker')),
    conn: asyncpg.Connection = Depends(get_earnings_conn),
):
    if file.content_type not in ('text/csv', 'application/vnd.ms-excel', 'application/octet-stream'):
        raise HTTPException(status_code=400, detail='Upload a CSV file')

    file_bytes = await file.read()
    result = await import_csv(conn, UUID(user['user_id']), file_bytes)
    return {'success': True, 'data': result}
