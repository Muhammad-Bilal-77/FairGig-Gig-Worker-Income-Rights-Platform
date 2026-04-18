"""Database connection pools — analytics_svc and readonly_svc"""

import asyncpg
import logging
from .config import config

logger = logging.getLogger(__name__)

# Two separate pools:
# - analytics_svc: Can call refresh_all_views()
# - readonly_svc: Read-only for queries
analytics_pool = None
readonly_pool = None

class DatabaseManager:
    """Database connection manager"""
    readonly_pool = None
    analytics_pool = None

db = DatabaseManager()

async def init_db():
    """Initialize both database pools"""
    global analytics_pool, readonly_pool
    
    # Analytics pool (can call refresh functions)
    analytics_pool = await asyncpg.create_pool(
        config.analytics_db_url,
        min_size=2,
        max_size=10,
        max_queries=50000,
    )
    
    # Readonly pool (for queries)
    readonly_pool = await asyncpg.create_pool(
        config.readonly_db_url,
        min_size=2,
        max_size=10,
        max_queries=50000,
    )
    
    # Store in db manager
    db.analytics_pool = analytics_pool
    db.readonly_pool = readonly_pool
    
    # Test connections
    async with analytics_pool.acquire() as conn:
        result = await conn.fetchval("SELECT NOW()")
        logger.info(f"✓ Analytics pool connected: {result}")
        user = await conn.fetchval("SELECT current_user")
        logger.info(f"  User: {user}")
    
    async with readonly_pool.acquire() as conn:
        result = await conn.fetchval("SELECT NOW()")
        logger.info(f"✓ Read-only pool connected: {result}")
        user = await conn.fetchval("SELECT current_user")
        logger.info(f"  User: {user}")

async def close_db():
    """Close both database pools"""
    if analytics_pool:
        await analytics_pool.close()
        logger.info("Analytics pool closed")
    
    if readonly_pool:
        await readonly_pool.close()
        logger.info("Read-only pool closed")

async def refresh_views():
    """Call the materialized view refresh function via analytics pool"""
    async with analytics_pool.acquire() as conn:
        result = await conn.fetchrow(
            "SELECT * FROM analytics_schema.refresh_all_views()"
        )
        logger.info(f"✓ Views refreshed: {result}")
        return result
