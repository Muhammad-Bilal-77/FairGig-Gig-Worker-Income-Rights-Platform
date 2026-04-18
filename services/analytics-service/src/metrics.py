"""Prometheus metrics for analytics service"""

from prometheus_client import Counter, Histogram, Gauge, CollectorRegistry, generate_latest

# Create a registry for this service
registry = CollectorRegistry()

# Counters
analytics_requests_total = Counter(
    "analytics_requests_total",
    "Total analytics API requests",
    labelnames=["endpoint", "status"],
    registry=registry,
)

view_refresh_total = Counter(
    "analytics_view_refresh_total",
    "Total view refresh operations",
    labelnames=["status"],  # success | failure
    registry=registry,
)

# Histograms
request_duration_seconds = Histogram(
    "analytics_request_duration_seconds",
    "Request duration in seconds",
    labelnames=["endpoint"],
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5],
    registry=registry,
)

# Gauges
k_anonymity_violations = Gauge(
    "analytics_k_anonymity_violations",
    "Count of k-anonymity violations detected and filtered",
    registry=registry,
)

views_last_refresh_timestamp = Gauge(
    "analytics_views_last_refresh_timestamp",
    "Timestamp of last view refresh",
    registry=registry,
)
