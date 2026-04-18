import asyncio
from datetime import date
from uuid import UUID

import asyncpg

from src.models import ShiftCreate
from src.services.anomaly_client import notify_anomaly_service


def _record_to_dict(record: asyncpg.Record | None) -> dict | None:
    if record is None:
        return None
    return dict(record)


async def create_shift(conn: asyncpg.Connection, worker_id: UUID, data: ShiftCreate) -> dict:
    record = await conn.fetchrow(
        """
        INSERT INTO earnings_schema.shifts (
            worker_id, platform, city_zone, worker_category,
            shift_date, hours_worked, gross_earned, platform_deduction,
            net_received, screenshot_url, import_source, verify_status
        )
        VALUES (
            $1, $2, $3, $4,
            $5, $6, $7, $8,
            $9, $10, 'manual',
            CASE WHEN $10::text IS NULL THEN 'NO_SCREENSHOT' ELSE 'PENDING' END
        )
        RETURNING *
        """,
        worker_id,
        data.platform,
        data.city_zone,
        data.worker_category,
        data.shift_date,
        data.hours_worked,
        data.gross_earned,
        data.platform_deduction,
        data.net_received,
        data.screenshot_url,
    )

    shift = _record_to_dict(record)
    if shift is None:
        raise ValueError('Failed to create shift')

    asyncio.create_task(notify_anomaly_service(worker_id, shift))
    return shift


async def list_shifts(
    conn: asyncpg.Connection,
    worker_id: UUID | None,
    from_date: date | None,
    to_date: date | None,
    platform: str | None,
    limit: int,
    offset: int,
) -> list[dict]:
    conditions: list[str] = []
    args: list = []

    if worker_id is not None:
        args.append(worker_id)
        conditions.append(f'worker_id = ${len(args)}')

    if from_date is not None:
        args.append(from_date)
        conditions.append(f'shift_date >= ${len(args)}')

    if to_date is not None:
        args.append(to_date)
        conditions.append(f'shift_date <= ${len(args)}')

    if platform is not None:
        args.append(platform)
        conditions.append(f'platform = ${len(args)}')

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ''

    args.append(limit)
    limit_idx = len(args)
    args.append(offset)
    offset_idx = len(args)

    rows = await conn.fetch(
        f"""
        SELECT *
        FROM earnings_schema.shifts
        {where_clause}
        ORDER BY shift_date DESC, created_at DESC
        LIMIT ${limit_idx}
        OFFSET ${offset_idx}
        """,
        *args,
    )

    return [dict(row) for row in rows]


async def get_shift(
    conn: asyncpg.Connection,
    shift_id: UUID,
    worker_id: UUID,
    can_view_all: bool = False,
) -> dict:
    row = await conn.fetchrow(
        """
        SELECT *
        FROM earnings_schema.shifts
        WHERE id = $1
        """,
        shift_id,
    )

    if row is None:
        raise ValueError('Shift not found')

    shift = dict(row)
    if not can_view_all and shift['worker_id'] != worker_id:
        raise PermissionError('You are not allowed to access this shift')

    return shift


async def update_screenshot(
    conn: asyncpg.Connection,
    shift_id: UUID,
    worker_id: UUID,
    screenshot_url: str,
) -> dict:
    row = await conn.fetchrow(
        """
        UPDATE earnings_schema.shifts
        SET screenshot_url = $3,
            verify_status = 'PENDING',
            updated_at = NOW()
        WHERE id = $1 AND worker_id = $2
        RETURNING *
        """,
        shift_id,
        worker_id,
        screenshot_url,
    )

    if row is None:
        raise ValueError('Shift not found or not owned by worker')

    return dict(row)


async def delete_shift(conn: asyncpg.Connection, shift_id: UUID, worker_id: UUID) -> None:
    row = await conn.fetchrow(
        """
        SELECT verify_status
        FROM earnings_schema.shifts
        WHERE id = $1 AND worker_id = $2
        """,
        shift_id,
        worker_id,
    )

    if row is None:
        raise ValueError('Shift not found or not owned by worker')

    if row['verify_status'] != 'PENDING':
        raise ValueError('Only PENDING shifts can be deleted')

    await conn.execute(
        """
        DELETE FROM earnings_schema.shifts
        WHERE id = $1 AND worker_id = $2
        """,
        shift_id,
        worker_id,
    )


async def get_worker_summary(
    conn: asyncpg.Connection,
    worker_id: UUID,
    from_date: date,
    to_date: date,
) -> dict:
    totals = await conn.fetchrow(
        """
        SELECT
          COALESCE(SUM(gross_earned), 0) AS total_gross,
          COALESCE(SUM(platform_deduction), 0) AS total_deductions,
          COALESCE(SUM(net_received), 0) AS total_net,
          COALESCE(SUM(hours_worked), 0) AS total_hours,
          COUNT(*) AS shift_count,
          COALESCE(AVG(effective_hourly_rate), 0) AS avg_hourly_rate,
          COALESCE(AVG(deduction_rate), 0) AS avg_deduction_rate,
          COALESCE(SUM(net_received) FILTER (WHERE verify_status = 'CONFIRMED'), 0) AS verified_net
        FROM earnings_schema.shifts
        WHERE worker_id = $1
          AND shift_date BETWEEN $2 AND $3
        """,
        worker_id,
        from_date,
        to_date,
    )

    platform_rows = await conn.fetch(
        """
        SELECT
          platform,
          COALESCE(SUM(net_received), 0) AS net,
          COUNT(*) AS shifts,
          COALESCE(AVG(effective_hourly_rate), 0) AS avg_rate
        FROM earnings_schema.shifts
        WHERE worker_id = $1
          AND shift_date BETWEEN $2 AND $3
        GROUP BY platform
        ORDER BY platform
        """,
        worker_id,
        from_date,
        to_date,
    )

    by_platform = {
        row['platform']: {
            'net': row['net'],
            'shifts': row['shifts'],
            'avg_rate': row['avg_rate'],
        }
        for row in platform_rows
    }

    result = dict(totals) if totals is not None else {}
    result['by_platform'] = by_platform
    return result
