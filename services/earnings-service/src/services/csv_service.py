import csv
import io
from decimal import Decimal
from uuid import UUID

import asyncpg
from pydantic import ValidationError

from src.metrics import shifts_imported_total, csv_rows_skipped_total
from src.models import ShiftCreate

MAX_ROWS = 500
MAX_FILE_SIZE = 2 * 1024 * 1024
EXPECTED_HEADERS = {
    'platform',
    'city_zone',
    'worker_category',
    'shift_date',
    'hours_worked',
    'gross_earned',
    'platform_deduction',
    'net_received',
}


def _normalize_headers(headers: list[str] | None) -> list[str]:
    if not headers:
        return []
    return [h.strip().lower() for h in headers]


async def import_csv(conn: asyncpg.Connection, worker_id: UUID, file_bytes: bytes) -> dict:
    if len(file_bytes) > MAX_FILE_SIZE:
        raise ValueError('CSV file exceeds 2MB limit')

    text = file_bytes.decode('utf-8-sig')
    reader = csv.DictReader(io.StringIO(text))

    normalized = _normalize_headers(reader.fieldnames)
    if set(normalized) != EXPECTED_HEADERS:
        raise ValueError(
            'CSV headers must include exactly: platform, city_zone, worker_category, '
            'shift_date, hours_worked, gross_earned, platform_deduction, net_received'
        )

    raw_rows = list(reader)
    if len(raw_rows) > MAX_ROWS:
        raise ValueError('CSV import supports maximum 500 rows')

    valid_rows: list[ShiftCreate] = []
    errors: list[dict] = []

    for idx, row in enumerate(raw_rows, start=2):
        try:
            normalized_row = {
                (key or '').strip().lower(): (value or '').strip()
                for key, value in row.items()
            }
            payload = {
                'platform': normalized_row.get('platform', ''),
                'city_zone': normalized_row.get('city_zone', ''),
                'worker_category': normalized_row.get('worker_category', ''),
                'shift_date': normalized_row.get('shift_date', ''),
                'hours_worked': Decimal(normalized_row.get('hours_worked', '')),
                'gross_earned': Decimal(normalized_row.get('gross_earned', '')),
                'platform_deduction': Decimal(normalized_row.get('platform_deduction', '')),
                'net_received': Decimal(normalized_row.get('net_received', '')),
                'screenshot_url': None,
            }
            valid_rows.append(ShiftCreate(**payload))
        except (ValidationError, Exception) as exc:
            errors.append({'row': idx, 'reason': str(exc)})

    skipped = len(errors)
    if skipped > 0:
        csv_rows_skipped_total.inc(skipped)

    if valid_rows:
        await conn.executemany(
            """
            INSERT INTO earnings_schema.shifts (
              worker_id, platform, city_zone, worker_category,
              shift_date, hours_worked, gross_earned, platform_deduction,
              net_received, import_source, verify_status
            )
            VALUES (
              $1, $2, $3, $4,
              $5, $6, $7, $8,
              $9, 'csv', 'NO_SCREENSHOT'
            )
            """,
            [
                (
                    worker_id,
                    row.platform,
                    row.city_zone,
                    row.worker_category,
                    row.shift_date,
                    row.hours_worked,
                    row.gross_earned,
                    row.platform_deduction,
                    row.net_received,
                )
                for row in valid_rows
            ],
        )
        shifts_imported_total.inc(len(valid_rows))

    return {
        'imported': len(valid_rows),
        'skipped': skipped,
        'errors': errors,
    }
