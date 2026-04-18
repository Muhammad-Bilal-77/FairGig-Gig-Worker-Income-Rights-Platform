"""
Pydantic v2 models for Anomaly Service.
"""
from pydantic import BaseModel, Field
from typing import Optional, Literal
from uuid import UUID
from datetime import date, datetime
from decimal import Decimal


class Anomaly(BaseModel):
    """Represents a detected anomaly."""
    check_name: str
    severity: Literal['HIGH', 'MEDIUM', 'LOW']
    shift_id: Optional[UUID] = None
    shift_date: Optional[date] = None
    platform: Optional[str] = None
    detected_value: Optional[Decimal] = None
    baseline_value: Optional[Decimal] = None
    plain_english: str


class AnomalyReport(BaseModel):
    """Complete anomaly analysis report."""
    worker_id: UUID
    analyzed_at: datetime
    shift_count_analyzed: int
    lookback_days: int
    insufficient_data: bool
    anomalies: list[Anomaly]
    anomaly_count: int
    high_count: int
    medium_count: int
    low_count: int
    summary: str
    methodology: str


class AnalyzeRequest(BaseModel):
    """Request body for analyze endpoint."""
    worker_id: UUID
    trigger_shift_id: Optional[UUID] = None
    lookback_days: int = Field(default=60, ge=7, le=365)


class CheckDescription(BaseModel):
    """Describes a single anomaly check."""
    name: str
    description: str
    threshold: str
    severity: str
    data_required: str


class ExplainResponse(BaseModel):
    """Response from /explain endpoint."""
    checks: list[CheckDescription]
