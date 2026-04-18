"""
Database connection pool for Anomaly Service.
Uses readonly_svc user — SELECT only on earnings_schema.
"""
import asyncpg
from src.config import READONLY_DB_URL

# Single readonly pool
readonly_pool = None


async def init_db():
    """Initialize readonly connection pool."""
    global readonly_pool
    try:
        readonly_pool = await asyncpg.create_pool(
            READONLY_DB_URL,
            min_size=2,
            max_size=10,
            command_timeout=30
        )
        # Verify connectivity
        async with readonly_pool.acquire() as conn:
            await conn.fetchval('SELECT 1')
        print("✓ Readonly pool initialized")
    except Exception as e:
        print(f"✗ Failed to init readonly pool: {e}")
        raise


async def close_db():
    """Close readonly connection pool."""
    global readonly_pool
    if readonly_pool:
        await readonly_pool.close()
        print("✓ Readonly pool closed")


async def get_readonly_conn():
    """Async generator: yield connection from readonly pool."""
    async with readonly_pool.acquire() as conn:
        yield conn
