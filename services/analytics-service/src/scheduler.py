"""Background task scheduler for view refresh"""

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from .config import config
from .database import refresh_views
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()

async def refresh_materialized_views():
    """Refresh all materialized views"""
    try:
        result = await refresh_views()
        logger.info(f"✓ [scheduled] Materialized views refreshed at {datetime.now()}")
        logger.info(f"  Result: {result}")
    except Exception as err:
        logger.error(f"✗ [scheduled] View refresh failed: {err}")
        # Non-fatal — continue running

async def start_scheduler():
    """Start the APScheduler"""
    if not scheduler.running:
        # Add the refresh job every N minutes
        scheduler.add_job(
            refresh_materialized_views,
            'interval',
            minutes=config.view_refresh_interval,
            id='refresh_views',
            name='Refresh materialized views',
        )
        scheduler.start()
        logger.info(f"✓ Scheduler started: refresh every {config.view_refresh_interval} minutes")

async def stop_scheduler():
    """Stop the scheduler"""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("✓ Scheduler stopped")
