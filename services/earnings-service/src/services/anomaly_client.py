from uuid import UUID
import httpx

from src.config import ANOMALY_SERVICE_URL
from src.metrics import anomaly_notify_errors_total


async def notify_anomaly_service(worker_id: UUID, new_shift: dict) -> None:
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(
                f'{ANOMALY_SERVICE_URL}/api/anomaly/analyze',
                json={
                    'worker_id': str(worker_id),
                    'trigger_shift_id': str(new_shift['id']),
                },
            )
    except Exception as exc:
        anomaly_notify_errors_total.inc()
        print(f'Anomaly service notify failed (non-fatal): {exc}')
