from datetime import date, timedelta
from decimal import Decimal
from uuid import UUID

import asyncpg
from fastapi import APIRouter, Depends, Query

from src.auth import require_role
from src.database import get_earnings_conn, get_readonly_conn
from src.services.shift_service import get_worker_summary

router = APIRouter(tags=['analytics'])


@router.get('/median')
async def median_endpoint(
    city_zone: str | None = Query(default=None),
    platform: str | None = Query(default=None),
    worker_category: str | None = Query(default=None),
    user: dict = Depends(require_role('worker', 'verifier', 'advocate')),
    readonly_conn: asyncpg.Connection = Depends(get_readonly_conn),
    earnings_conn: asyncpg.Connection = Depends(get_earnings_conn),
):
    conditions: list[str] = []
    args: list = []

    if city_zone is not None:
        args.append(city_zone)
        conditions.append(f'city_zone = ${len(args)}')
    if platform is not None:
        args.append(platform)
        conditions.append(f'platform = ${len(args)}')
    if worker_category is not None:
        args.append(worker_category)
        conditions.append(f'worker_category = ${len(args)}')

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ''

    rows = await readonly_conn.fetch(
        f"""
        SELECT city_zone, platform, worker_category,
               median_hourly_rate, median_deduction_rate, worker_count
        FROM analytics_schema.city_median_by_zone
        {where_clause}
        ORDER BY city_zone, platform, worker_category
        """,
        *args,
    )

    your_hourly_rate = None
    if user['role'] == 'worker':
        your_hourly_rate = await earnings_conn.fetchval(
            """
            SELECT AVG(effective_hourly_rate)
            FROM earnings_schema.shifts
            WHERE worker_id = $1
              AND shift_date >= CURRENT_DATE - INTERVAL '30 days'
            """,
            UUID(user['user_id']),
        )

    result = []
    for row in rows:
        item = dict(row)
        # Convert Decimal values to float for JSON serialization
        if 'median_hourly_rate' in item and item['median_hourly_rate'] is not None:
            item['median_hourly_rate'] = float(item['median_hourly_rate'])
        if 'median_deduction_rate' in item and item['median_deduction_rate'] is not None:
            item['median_deduction_rate'] = float(item['median_deduction_rate'])
        if 'avg_daily_net' in item and item['avg_daily_net'] is not None:
            item['avg_daily_net'] = float(item['avg_daily_net'])
            
        if your_hourly_rate is not None:
            item['your_hourly_rate'] = float(your_hourly_rate) if your_hourly_rate else None
            if your_hourly_rate and item['median_hourly_rate']:
                if your_hourly_rate > item['median_hourly_rate']:
                    item['percentile_vs_median'] = 'above_median'
                elif your_hourly_rate < item['median_hourly_rate']:
                    item['percentile_vs_median'] = 'below_median'
                else:
                    item['percentile_vs_median'] = 'at_median'
            else:
                item['percentile_vs_median'] = None
        else:
            item['your_hourly_rate'] = None
            item['percentile_vs_median'] = None

        result.append(item)

    return {'success': True, 'data': result}


@router.get('/summary')
async def summary_endpoint(
    from_date: date | None = Query(default=None),
    to_date: date | None = Query(default=None),
    user: dict = Depends(require_role('worker')),
    conn: asyncpg.Connection = Depends(get_earnings_conn),
):
    end_date = to_date or date.today()
    start_date = from_date or (end_date - timedelta(days=30))

    summary = await get_worker_summary(conn, UUID(user['user_id']), start_date, end_date)
    return {'success': True, 'data': summary}
