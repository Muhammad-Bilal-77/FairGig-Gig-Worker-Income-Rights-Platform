"""
FastAPI application entry point for Anomaly Service.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from asyncpg import PostgresError
from src.database import init_db, close_db
from src.metrics import metrics_middleware, metrics_response
from src.routers import anomaly
from src.config import ANOMALY_PORT, NODE_ENV


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle."""
    print("🚀 Starting Anomaly Service...")
    await init_db()
    yield
    print("🛑 Shutting down Anomaly Service...")
    await close_db()


app = FastAPI(
    title="Anomaly Detection Service",
    description="Detects anomalies in gig worker earnings",
    version="1.0.0",
    lifespan=lifespan
)

if NODE_ENV.lower() in ('development', 'dev', 'local'):
    app.add_middleware(
        CORSMiddleware,
        allow_origins=['*'],
        allow_credentials=True,
        allow_methods=['*'],
        allow_headers=['*'],
    )

# Add middleware
app.middleware('http')(metrics_middleware)


@app.exception_handler(ValueError)
async def value_error_handler(request, exc):
    """Convert ValueError to 400 Bad Request."""
    return JSONResponse(
        status_code=400,
        content={'detail': str(exc)}
    )


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request, exc):
    """Convert Pydantic validation errors to 400 Bad Request with sanitized fields."""
    errors = []
    for error in exc.errors():
        # Sanitize error context
        if 'ctx' in error and isinstance(error['ctx'], dict):
            error['ctx'] = {k: str(v) for k, v in error['ctx'].items()}
        errors.append(error)
    
    return JSONResponse(
        status_code=400,
        content={'detail': 'Validation error', 'errors': errors}
    )


@app.exception_handler(PostgresError)
async def postgres_error_handler(request, exc):
    """Convert PostgreSQL errors to 500 Internal Server Error."""
    print(f"Database error: {exc}")
    return JSONResponse(
        status_code=500,
        content={'detail': 'Database error'}
    )


@app.get('/health')
async def health():
    """Health check endpoint."""
    return {
        'status': 'ok',
        'service': 'anomaly-service',
        'port': ANOMALY_PORT,
        'environment': NODE_ENV
    }


@app.get('/metrics')
async def metrics():
    """Prometheus metrics endpoint."""
    return metrics_response()


# Include routers
app.include_router(anomaly.router)


if __name__ == '__main__':
    import uvicorn
    uvicorn.run(
        app,
        host='0.0.0.0',
        port=ANOMALY_PORT,
        reload=(NODE_ENV == 'development')
    )
