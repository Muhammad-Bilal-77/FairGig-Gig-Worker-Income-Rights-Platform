"""Analytics service business logic"""

from ..database import db
from ..config import config
from ..models import (
    CommissionTrendsResponse, CommissionTrendRow,
    IncomeDistributionResponse, IncomeDistributionRow,
    VulnerabilityFlagsResponse, VulnerabilityFlagRow,
    TopComplaintsResponse, TopComplaintsRow,
    SummaryResponse, RefreshResponse,
)
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

async def get_commission_trends(
    platform: str = None,
    city_zone: str = None,
    weeks: int = 8,
) -> CommissionTrendsResponse:
    """Get commission trends from materialized view"""
    
    # Validate weeks
    weeks = min(max(weeks, 1), 52)
    
    # Build query
    query = """
    SELECT
        platform,
        city_zone,
        worker_category,
        week_start,
        avg_deduction_rate,
        worker_count,
        total_gross_pkr
    FROM analytics_schema.platform_commission_trends
    WHERE 1=1
    """
    params = []
    param_count = 1
    
    if platform:
        query += f" AND platform = ${param_count}"
        params.append(platform)
        param_count += 1
    
    if city_zone:
        query += f" AND city_zone = ${param_count}"
        params.append(city_zone)
        param_count += 1
    
    # K-anonymity: only include rows with worker_count >= threshold
    query += f" AND worker_count >= {config.k_anonymity_threshold}"
    
    query += " ORDER BY week_start DESC LIMIT $" + str(param_count)
    params.append(weeks * 10)  # Rough limit
    
    async with db.readonly_pool.acquire() as conn:
        rows = await conn.fetch(query, *params)
    
    # Second k-anonymity check (defensive)
    filtered_rows = []
    for row in rows:
        if row['worker_count'] < config.k_anonymity_threshold:
            logger.warning(
                f"K-anonymity violation filtered: platform={row['platform']}, "
                f"worker_count={row['worker_count']} < {config.k_anonymity_threshold}"
            )
            continue
        
        filtered_rows.append(CommissionTrendRow(
            platform=row['platform'],
            city_zone=row['city_zone'],
            worker_category=row['worker_category'],
            week_start=row['week_start'],
            avg_deduction_rate=row['avg_deduction_rate'],
            worker_count=row['worker_count'],
            total_gross_pkr=row['total_gross_pkr'],
        ))
    
    return CommissionTrendsResponse(trends=filtered_rows)

async def get_income_distribution(
    city_zone: str = None,
    platform: str = None,
) -> IncomeDistributionResponse:
    """Get income distribution from materialized view"""
    
    query = """
    SELECT
        city_zone,
        platform,
        worker_category,
        median_hourly_rate,
        median_deduction_rate,
        worker_count
    FROM analytics_schema.city_median_by_zone
    WHERE worker_count >= $1
    """
    params = [config.k_anonymity_threshold]
    param_count = 2
    
    if city_zone:
        query += f" AND city_zone = ${param_count}"
        params.append(city_zone)
        param_count += 1
    
    if platform:
        query += f" AND platform = ${param_count}"
        params.append(platform)
        param_count += 1
    
    query += " ORDER BY median_hourly_rate DESC"
    
    async with db.readonly_pool.acquire() as conn:
        rows = await conn.fetch(query, *params)
    
    # K-anonymity check
    filtered_rows = []
    for row in rows:
        if row['worker_count'] < config.k_anonymity_threshold:
            continue
        
        filtered_rows.append(IncomeDistributionRow(
            city_zone=row['city_zone'],
            platform=row['platform'],
            worker_category=row['worker_category'],
            median_hourly_rate=row['median_hourly_rate'],
            median_deduction_rate=row['median_deduction_rate'],
            worker_count=row['worker_count'],
        ))
    
    return IncomeDistributionResponse(distribution=filtered_rows)

async def get_vulnerability_flags() -> VulnerabilityFlagsResponse:
    """Get vulnerability flags from materialized view"""
    
    query = """
    SELECT
        city_zone,
        platform,
        worker_category,
        current_month,
        affected_worker_count,
        avg_income_drop,
        max_income_drop
    FROM analytics_schema.vulnerability_flags
    WHERE affected_worker_count >= $1
    ORDER BY current_month DESC, affected_worker_count DESC
    """
    
    async with db.readonly_pool.acquire() as conn:
        rows = await conn.fetch(query, config.k_anonymity_threshold)
    
    # K-anonymity check + no individual worker data
    filtered_rows = []
    for row in rows:
        if row['affected_worker_count'] < config.k_anonymity_threshold:
            continue
        
        filtered_rows.append(VulnerabilityFlagRow(
            city_zone=row['city_zone'],
            platform=row['platform'],
            worker_category=row['worker_category'],
            current_month=row['current_month'].isoformat() if isinstance(row['current_month'], datetime) else str(row['current_month']),
            affected_worker_count=row['affected_worker_count'],
            avg_income_drop=row['avg_income_drop'],
            max_income_drop=row['max_income_drop'],
        ))
    
    return VulnerabilityFlagsResponse(flags=filtered_rows)

async def get_top_complaints(weeks: int = 4) -> TopComplaintsResponse:
    """Get top complaints from materialized view"""
    
    weeks = min(max(weeks, 1), 12)
    
    query = """
    SELECT
        platform,
        category,
        city_zone,
        week_start,
        complaint_count,
        total_upvotes,
        escalated_count
    FROM analytics_schema.top_complaint_categories
    ORDER BY complaint_count DESC, total_upvotes DESC
    LIMIT $1
    """
    
    async with db.readonly_pool.acquire() as conn:
        rows = await conn.fetch(query, weeks * 10)
    
    rows_list = [
        TopComplaintsRow(
            platform=row['platform'],
            category=row['category'],
            city_zone=row['city_zone'],
            week_start=row['week_start'],
            complaint_count=row['complaint_count'],
            total_upvotes=row['total_upvotes'],
            escalated_count=row['escalated_count'],
        )
        for row in rows
    ]
    
    return TopComplaintsResponse(complaints=rows_list)

async def get_summary() -> SummaryResponse:
    """Get summary dashboard data"""
    
    async with db.readonly_pool.acquire() as conn:
        # Total confirmed shifts
        total_shifts = await conn.fetchval(
            "SELECT COUNT(*) FROM earnings_schema.shifts WHERE verify_status = 'CONFIRMED'"
        )
        
        # Active workers in last 30 days
        active_workers = await conn.fetchval(
            """
            SELECT COUNT(DISTINCT worker_id)
            FROM earnings_schema.shifts
            WHERE shift_date >= CURRENT_DATE - INTERVAL '30 days'
            AND verify_status = 'CONFIRMED'
            """
        )
        
        # Platforms
        platforms = await conn.fetch(
            "SELECT DISTINCT platform FROM earnings_schema.shifts ORDER BY platform"
        )
        platforms_list = [p['platform'] for p in platforms]
        
        # Highest deduction rate
        highest = await conn.fetchrow(
            """
            SELECT platform, city_zone, MAX(deduction_rate) as rate
            FROM earnings_schema.shifts
            WHERE verify_status = 'CONFIRMED'
            GROUP BY platform, city_zone
            ORDER BY rate DESC LIMIT 1
            """
        )
        
        # Lowest deduction rate
        lowest = await conn.fetchrow(
            """
            SELECT platform, city_zone, MIN(deduction_rate) as rate
            FROM earnings_schema.shifts
            WHERE verify_status = 'CONFIRMED'
            GROUP BY platform, city_zone
            ORDER BY rate ASC LIMIT 1
            """
        )
        
        # Most complained platform
        most_complained = await conn.fetchval(
            """
            SELECT platform
            FROM grievance_schema.complaints
            GROUP BY platform
            ORDER BY COUNT(*) DESC LIMIT 1
            """
        )
        
        # Vulnerability flag count
        flag_count = await conn.fetchval(
            "SELECT COUNT(*) FROM analytics_schema.vulnerability_flags"
        )
    
    # Get last refresh time (from separate query or hardcoded)
    last_refresh = datetime.utcnow()
    
    return SummaryResponse(
        total_confirmed_shifts=total_shifts or 0,
        total_workers_active_30d=active_workers or 0,
        platforms_tracked=platforms_list,
        highest_deduction_rate={
            "platform": highest['platform'] if highest else None,
            "city_zone": highest['city_zone'] if highest else None,
            "rate": float(highest['rate']) if highest else None,
        },
        lowest_deduction_rate={
            "platform": lowest['platform'] if lowest else None,
            "city_zone": lowest['city_zone'] if lowest else None,
            "rate": float(lowest['rate']) if lowest else None,
        },
        most_complained_platform=most_complained or "N/A",
        vulnerability_flag_count=flag_count or 0,
        views_last_refreshed_at=last_refresh,
        k_anonymity_threshold=config.k_anonymity_threshold,
    )

async def refresh_all_views() -> RefreshResponse:
    """Manually refresh all materialized views"""
    
    async with db.analytics_pool.acquire() as conn:
        result = await conn.fetchrow(
            "SELECT * FROM analytics_schema.refresh_all_views()"
        )
    
    return RefreshResponse(
        refreshed_at=datetime.utcnow(),
        message=f"Views refreshed successfully: {result}",
    )
