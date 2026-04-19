"""Pydantic models for analytics responses"""

from pydantic import BaseModel, Field
from datetime import datetime, date
from typing import List, Optional, Any

class CommissionTrendRow(BaseModel):
    """Commission trend row"""
    platform: str
    city_zone: Optional[str] = None
    worker_category: Optional[str] = None
    week_start: date
    avg_deduction_rate: float
    worker_count: int
    total_gross_pkr: float

class CommissionTrendsResponse(BaseModel):
    """Commission trends response"""
    trends: List[CommissionTrendRow]
    meta: Optional[Any] = None

class IncomeDistributionRow(BaseModel):
    """Income distribution row"""
    city_zone: Optional[str] = None
    platform: str
    worker_category: Optional[str] = None
    median_hourly_rate: float
    median_deduction_rate: float
    worker_count: int

class IncomeDistributionResponse(BaseModel):
    """Income distribution response"""
    distribution: List[IncomeDistributionRow]

class VulnerabilityFlagRow(BaseModel):
    """Vulnerability flag row"""
    city_zone: Optional[str] = None
    platform: str
    worker_category: Optional[str] = None
    current_month: str
    affected_worker_count: int
    avg_income_drop: float
    max_income_drop: float

class VulnerabilityFlagsResponse(BaseModel):
    """Vulnerability flags response"""
    flags: List[VulnerabilityFlagRow]

class TopComplaintsRow(BaseModel):
    """Top complaints row"""
    platform: str
    category: str
    city_zone: Optional[str] = None
    week_start: date
    complaint_count: int
    total_upvotes: int
    escalated_count: int

class TopComplaintsResponse(BaseModel):
    """Top complaints response"""
    complaints: List[TopComplaintsRow]

class PlatformHealthMetric(BaseModel):
    """Metrics for one platform for radar chart"""
    subject: str
    scores: dict  # mapping platform name to score 0-100

class PlatformHealthResponse(BaseModel):
    """Response for radar chart"""
    metrics: List[dict]  # List of objects like {subject: 'Support', Foodpanda: 80, ...}

class SystemCorrelationPoint(BaseModel):
    """Income vs grievance correlation point"""
    name: str # e.g. "Week 1"
    avgIncome: float
    complaints: int
    deductions: float

class SystemCorrelationResponse(BaseModel):
    """Correlation response"""
    data: List[SystemCorrelationPoint]

class SummaryResponse(BaseModel):
    """Analytics summary response"""
    total_confirmed_shifts: int = 0
    total_workers_active_30d: int = 0
    platforms_tracked: List[str] = Field(default_factory=list)
    highest_deduction_rate: Optional[dict] = None
    lowest_deduction_rate: Optional[dict] = None
    most_complained_platform: str = "N/A"
    vulnerability_flag_count: int = 0
    avg_monthly_income: float = 0.0
    open_complaints_count: int = 0
    views_last_refreshed_at: datetime = Field(default_factory=datetime.utcnow)
    k_anonymity_threshold: int = 5

class RefreshResponse(BaseModel):
    """View refresh response"""
    refreshed_at: datetime
    message: str
