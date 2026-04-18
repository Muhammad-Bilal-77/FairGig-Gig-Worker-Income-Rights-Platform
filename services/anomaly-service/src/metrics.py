"""
Prometheus metrics for Anomaly Service.
"""
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from starlette.requests import Request
from starlette.responses import Response
import time

# Counters
analyses_total = Counter(
    'anomaly_analyses_total',
    'Total anomaly analyses performed',
    ['status']  # success, insufficient_data, error
)
anomalies_detected_total = Counter(
    'anomalies_detected_total',
    'Total anomalies detected',
    ['severity', 'check_name']  # HIGH, MEDIUM, LOW; check names
)

# Histograms
analysis_duration_seconds = Histogram(
    'anomaly_analysis_duration_seconds',
    'Time taken to analyze a worker',
    ['status']
)
http_request_duration_seconds = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration in seconds',
    ['method', 'path', 'status_code']
)


async def metrics_middleware(request: Request, call_next):
    """Record HTTP request duration and status."""
    start = time.time()
    response = await call_next(request)
    elapsed = time.time() - start
    http_request_duration_seconds.labels(
        method=request.method,
        path=request.url.path,
        status_code=response.status_code
    ).observe(elapsed)
    return response


def metrics_response():
    """Return Prometheus text format."""
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
