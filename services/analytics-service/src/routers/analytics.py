"""Analytics API routes"""

from fastapi import APIRouter, Depends, HTTPException, Query
from ..auth import require_advocate_or_verifier, require_advocate, verify_token
from ..services.analytics_service import (
    get_commission_trends,
    get_income_distribution,
    get_vulnerability_flags,
    get_top_complaints,
    get_summary,
    refresh_all_views,
)
from ..models import (
    CommissionTrendsResponse,
    IncomeDistributionResponse,
    VulnerabilityFlagsResponse,
    TopComplaintsResponse,
    SummaryResponse,
    RefreshResponse,
)
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

@router.get("/commission-trends", response_model=CommissionTrendsResponse)
async def commission_trends(
    token: dict = Depends(require_advocate_or_verifier),
    platform: str = Query(None),
    city_zone: str = Query(None),
    weeks: int = Query(8, ge=1, le=52),
):
    """
    Get commission trends over time
    
    Requires: advocate or verifier role
    Query params:
    - platform: filter by platform (Careem, Foodpanda, Upwork, etc)
    - city_zone: filter by city_zone
    - weeks: number of weeks of history (default 8, max 52)
    
    Returns trends with k-anonymity enforcement (worker_count >= 5)
    """
    
    try:
        response = await get_commission_trends(
            platform=platform,
            city_zone=city_zone,
            weeks=weeks,
        )
        return response
    except Exception as e:
        logger.error(f"Error fetching commission trends: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch commission trends")

@router.get("/income-distribution", response_model=IncomeDistributionResponse)
async def income_distribution(
    token: dict = Depends(require_advocate_or_verifier),
    city_zone: str = Query(None),
    platform: str = Query(None),
):
    """
    Get income distribution by zone and platform
    
    Requires: advocate or verifier role
    Query params:
    - city_zone: filter by city_zone
    - platform: filter by platform
    
    Returns median rates by worker_category with k-anonymity enforcement
    """
    
    try:
        response = await get_income_distribution(
            city_zone=city_zone,
            platform=platform,
        )
        return response
    except Exception as e:
        logger.error(f"Error fetching income distribution: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch income distribution")

@router.get("/vulnerability-flags", response_model=VulnerabilityFlagsResponse)
async def vulnerability_flags(
    token: dict = Depends(require_advocate_or_verifier),
):
    """
    Get vulnerability flags for workers
    
    Requires: advocate or verifier role
    
    Returns flags ordered by month (recent first) and affected_worker_count (high first)
    K-anonymity enforced: no individual worker data exposed
    """
    
    try:
        response = await get_vulnerability_flags()
        return response
    except Exception as e:
        logger.error(f"Error fetching vulnerability flags: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch vulnerability flags")

@router.get("/top-complaints", response_model=TopComplaintsResponse)
async def top_complaints(
    token: dict = Depends(require_advocate_or_verifier),
    weeks: int = Query(4, ge=1, le=12),
):
    """
    Get top complaint categories
    
    Requires: advocate or verifier role
    Query params:
    - weeks: number of weeks to analyze (default 4, max 12)
    
    Returns complaints ordered by complaint_count and total_upvotes
    """
    
    try:
        response = await get_top_complaints(weeks=weeks)
        return response
    except Exception as e:
        logger.error(f"Error fetching top complaints: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch top complaints")

@router.get("/summary", response_model=SummaryResponse)
async def summary(
    token: dict = Depends(require_advocate_or_verifier),
):
    """
    Get analytics dashboard summary
    
    Requires: advocate or verifier role
    
    Returns key metrics:
    - Total confirmed shifts
    - Active workers in last 30 days
    - Platforms tracked
    - Highest/lowest deduction rates
    - Most complained platform
    - Vulnerability flag count
    - Last view refresh timestamp
    - K-anonymity threshold
    """
    
    try:
        response = await get_summary()
        return response
    except Exception as e:
        logger.error(f"Error fetching summary: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch summary")

@router.post("/refresh", response_model=RefreshResponse)
async def refresh(
    token: dict = Depends(require_advocate),
):
    """
    Manually refresh all materialized views
    
    Requires: advocate role (NOT verifier)
    
    Returns timestamp of refresh completion
    """
    
    try:
        response = await refresh_all_views()
        logger.info(f"Manual refresh triggered by user {token.get('user_id')}")
        return response
    except Exception as e:
        logger.error(f"Error refreshing views: {e}")
        raise HTTPException(status_code=500, detail="Failed to refresh views")
