"""Analytics Service main FastAPI application"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, Response
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
import logging
import sys

# Import core modules
from .config import config
from .database import init_db, close_db, db
from .scheduler import scheduler, start_scheduler, stop_scheduler
from .metrics import registry, analytics_requests_total
from .routers.analytics import router as analytics_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifespan events"""
    
    # Startup
    logger.info("🚀 Analytics Service starting...")
    try:
        await init_db()
        logger.info("✅ Database pools initialized")
    except Exception as e:
        logger.error(f"❌ Failed to initialize database: {e}")
        sys.exit(1)
    
    try:
        await start_scheduler()
        logger.info("✅ APScheduler started - view refresh scheduled every 15 minutes")
    except Exception as e:
        logger.error(f"❌ Failed to start scheduler: {e}")
        sys.exit(1)
    
    logger.info(f"✅ K-anonymity threshold set to {config.k_anonymity_threshold}")
    logger.info(f"✅ Service running on http://0.0.0.0:{config.port}")
    
    yield
    
    # Shutdown
    logger.info("🛑 Analytics Service shutting down...")
    
    try:
        await stop_scheduler()
        logger.info("✅ APScheduler stopped")
    except Exception as e:
        logger.error(f"⚠️  Error stopping scheduler: {e}")
    
    try:
        await close_db()
        logger.info("✅ Database pools closed")
    except Exception as e:
        logger.error(f"⚠️  Error closing database: {e}")
    
    logger.info("✅ Analytics Service shutdown complete")

# Create FastAPI app
app = FastAPI(
    title="FairGig Analytics Service",
    description="Advocate dashboard API for worker fairness analytics with k-anonymity enforcement",
    version="1.0.0",
    lifespan=lifespan,
)

# Include routers
app.include_router(analytics_router)

# Request timing middleware
@app.middleware("http")
async def add_request_id(request: Request, call_next):
    """Add request ID and timing to all requests"""
    request.state.request_id = request.headers.get("X-Request-ID", "unknown")
    response = await call_next(request)
    response.headers["X-Request-ID"] = request.state.request_id
    return response

# Health check endpoints
@app.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "analytics",
        "port": config.port,
    }

@app.get("/ready")
async def readiness():
    """Readiness probe for Kubernetes"""
    try:
        # Quick check: verify both pools are connected
        async with db.readonly_pool.acquire() as conn:
            await conn.fetchval("SELECT 1")
        return {
            "status": "ready",
            "service": "analytics",
        }
    except Exception as e:
        logger.error(f"Readiness check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={"status": "not_ready", "error": str(e)}
        )

@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint"""
    return Response(
        content=generate_latest(registry),
        media_type=CONTENT_TYPE_LATEST,
    )

# Root endpoint
@app.get("/")
async def root():
    """API root - returns service info"""
    return {
        "service": "FairGig Analytics Service",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "readiness": "/ready",
            "metrics": "/metrics",
            "analytics": {
                "commission_trends": "GET /api/analytics/commission-trends",
                "income_distribution": "GET /api/analytics/income-distribution",
                "vulnerability_flags": "GET /api/analytics/vulnerability-flags",
                "top_complaints": "GET /api/analytics/top-complaints",
                "summary": "GET /api/analytics/summary",
                "refresh": "POST /api/analytics/refresh (advocate only)",
            },
            "docs": "/docs",
            "openapi": "/openapi.json",
        },
        "note": "All analytics endpoints require JWT token with advocate or verifier role",
        "k_anonymity_threshold": config.k_anonymity_threshold,
    }

# Exception handler
@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle all unhandled exceptions"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": str(exc)},
    )

if __name__ == "__main__":
    import uvicorn
    
    logger.info("Starting Analytics Service...")
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=config.port,
        log_level="info",
    )
