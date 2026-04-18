from contextlib import asynccontextmanager

import asyncpg
from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src.config import EARNINGS_PORT, NODE_ENV
from src.database import init_db, close_db
import src.database as database
from src.metrics import metrics_middleware, metrics_response
from src.routers.shifts import router as shifts_router
from src.routers.verification import router as verification_router
from src.routers.analytics import router as analytics_router


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await init_db()
    yield
    await close_db()


app = FastAPI(title='Earnings Service', version='1.0.0', lifespan=lifespan)

if NODE_ENV.lower() in ('development', 'dev', 'local'):
    app.add_middleware(
        CORSMiddleware,
        allow_origins=['*'],
        allow_credentials=True,
        allow_methods=['*'],
        allow_headers=['*'],
    )

app.middleware('http')(metrics_middleware)


@app.exception_handler(ValueError)
async def value_error_handler(_request: Request, exc: ValueError):
    return JSONResponse(status_code=400, content={'success': False, 'error': str(exc)})


@app.exception_handler(RequestValidationError)
async def request_validation_error_handler(_request: Request, exc: RequestValidationError):
    sanitized_errors = []
    for item in exc.errors():
        normalized = dict(item)
        ctx = normalized.get('ctx')
        if isinstance(ctx, dict) and 'error' in ctx:
            ctx['error'] = str(ctx['error'])
        sanitized_errors.append(normalized)

    return JSONResponse(
        status_code=400,
        content=jsonable_encoder({'success': False, 'error': sanitized_errors}),
    )


@app.exception_handler(asyncpg.PostgresError)
async def postgres_error_handler(_request: Request, exc: asyncpg.PostgresError):
    print(f'Database error: {exc}')
    return JSONResponse(
        status_code=500,
        content={'success': False, 'error': 'Internal database error'},
    )


@app.get('/health')
async def health():
    db_connected = False
    if database.earnings_pool is not None:
        async with database.earnings_pool.acquire() as conn:
            db_connected = (await conn.fetchval('SELECT 1')) == 1

    return {
        'status': 'ok',
        'service': 'earnings-service',
        'db_connected': db_connected,
        'port': EARNINGS_PORT,
    }


@app.get('/metrics')
async def metrics():
    return metrics_response()


app.include_router(verification_router, prefix='/api/earnings')
app.include_router(shifts_router, prefix='/api/earnings')
app.include_router(analytics_router, prefix='/api/earnings')
