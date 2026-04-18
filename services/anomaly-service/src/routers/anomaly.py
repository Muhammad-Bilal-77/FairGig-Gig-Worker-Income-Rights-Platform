"""
Anomaly detection endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from uuid import UUID
from src.database import get_readonly_conn
from src.auth import get_optional_user, require_role
from src.models import AnalyzeRequest, AnomalyReport, ExplainResponse, CheckDescription
from src.services.detector import AnomalyDetector

router = APIRouter(prefix='/api/anomaly', tags=['anomaly'])


@router.post('/analyze')
async def analyze(
    request: AnalyzeRequest,
    user: Optional[dict] = Depends(get_optional_user),
    conn = Depends(get_readonly_conn)
) -> AnomalyReport:
    """
    Analyze worker for anomalies.
    
    Auth: Optional Bearer token. If no token, still process (internal call).
    
    This is the main endpoint judges will call directly.
    """
    detector = AnomalyDetector(conn)
    report = await detector.analyze(
        worker_id=request.worker_id,
        trigger_shift_id=request.trigger_shift_id,
        lookback_days=request.lookback_days
    )
    return report


@router.get('/worker/{worker_id}')
async def get_worker_analysis(
    worker_id: UUID,
    user: dict = Depends(require_role('worker', 'verifier', 'advocate')),
    conn = Depends(get_readonly_conn)
) -> AnomalyReport:
    """
    Get anomaly analysis for a specific worker.
    
    Auth: Bearer token required.
    - workers can only query their own analysis
    - verifiers/advocates can query any worker
    """
    # Check ownership
    if user['role'] == 'worker' and str(user['user_id']) != str(worker_id):
        raise HTTPException(status_code=403, detail="Workers can only view their own analysis")
    
    detector = AnomalyDetector(conn)
    report = await detector.analyze(worker_id=worker_id)
    return report


@router.get('/explain')
async def explain() -> ExplainResponse:
    """
    Documentation of all anomaly checks.
    
    Auth: None required. Judges use this to understand detection logic.
    """
    checks = [
        CheckDescription(
            name='deduction_rate_spike',
            description='Platform suddenly increases commission/deduction percentage on a shift',
            threshold='8 percentage points above baseline',
            severity='HIGH',
            data_required='At least 5 confirmed shifts older than 14 days for baseline'
        ),
        CheckDescription(
            name='monthly_income_drop',
            description='Worker earnings drop significantly month-over-month',
            threshold='20% reduction in net income compared to previous month',
            severity='HIGH',
            data_required='Shifts from current month and previous month'
        ),
        CheckDescription(
            name='hourly_rate_anomaly',
            description='Single shift has exceptionally low hourly rate compared to norm',
            threshold='Less than 60% of baseline hourly rate',
            severity='MEDIUM',
            data_required='At least 5 baseline shifts >14 days old for comparison'
        ),
        CheckDescription(
            name='deduction_inconsistency',
            description='Deduction amount does not match the stated deduction rate',
            threshold='More than PKR 50 difference between stated and calculated deduction',
            severity='MEDIUM',
            data_required='Shifts with complete deduction data'
        ),
        CheckDescription(
            name='long_shift_gap',
            description='Unusually long gap between consecutive shift dates',
            threshold='Longest gap > 3x normal gap AND > 7 days',
            severity='LOW',
            data_required='At least 2 shifts to establish pattern'
        )
    ]
    return ExplainResponse(checks=checks)
