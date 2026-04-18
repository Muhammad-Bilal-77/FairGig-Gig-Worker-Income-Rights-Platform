from collections.abc import AsyncGenerator
import asyncpg

from src.config import EARNINGS_DB_URL, READONLY_DB_URL


earnings_pool: asyncpg.Pool | None = None
readonly_pool: asyncpg.Pool | None = None


async def init_db() -> None:
    global earnings_pool, readonly_pool

    earnings_pool = await asyncpg.create_pool(
        dsn=EARNINGS_DB_URL,
        min_size=2,
        max_size=10,
        command_timeout=30,
    )
    readonly_pool = await asyncpg.create_pool(
        dsn=READONLY_DB_URL,
        min_size=1,
        max_size=5,
        command_timeout=30,
    )

    async with earnings_pool.acquire() as conn:
        await conn.fetchval('SELECT 1')
    async with readonly_pool.acquire() as conn:
        await conn.fetchval('SELECT 1')


async def close_db() -> None:
    global earnings_pool, readonly_pool

    if earnings_pool is not None:
        await earnings_pool.close()
        earnings_pool = None

    if readonly_pool is not None:
        await readonly_pool.close()
        readonly_pool = None


async def get_earnings_conn() -> AsyncGenerator[asyncpg.Connection, None]:
    if earnings_pool is None:
        raise RuntimeError('earnings_pool is not initialized')

    async with earnings_pool.acquire() as conn:
        yield conn


async def get_readonly_conn() -> AsyncGenerator[asyncpg.Connection, None]:
    if readonly_pool is None:
        raise RuntimeError('readonly_pool is not initialized')

    async with readonly_pool.acquire() as conn:
        yield conn
