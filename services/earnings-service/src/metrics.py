import time
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from fastapi import Request, Response

shifts_created_total = Counter(
    'shifts_created_total',
    'Total number of shifts created',
    ['platform', 'worker_category'],
)

shifts_imported_total = Counter(
    'shifts_imported_total',
    'Total number of shifts imported via CSV',
)

csv_rows_skipped_total = Counter(
    'csv_rows_skipped_total',
    'Total number of CSV rows skipped due to validation errors',
)

verifications_total = Counter(
    'verifications_total',
    'Total number of verification actions',
    ['status'],
)

anomaly_notify_errors_total = Counter(
    'anomaly_notify_errors_total',
    'Total anomaly-notify call failures',
)

http_request_duration_seconds = Histogram(
    'http_request_duration_seconds',
    'Request duration in seconds',
    ['method', 'path', 'status_code'],
)


async def metrics_middleware(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    elapsed = time.perf_counter() - start

    http_request_duration_seconds.labels(
        method=request.method,
        path=request.url.path,
        status_code=str(response.status_code),
    ).observe(elapsed)

    return response


def metrics_response() -> Response:
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)
