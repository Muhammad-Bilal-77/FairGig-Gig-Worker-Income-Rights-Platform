"""
Core anomaly detection logic for Anomaly Service.
Implements 5 sophisticated checks on worker earnings data.
"""
from uuid import UUID
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Optional, Tuple
import numpy as np
import asyncpg
from src.models import Anomaly, AnomalyReport
from src.metrics import analyses_total, anomalies_detected_total, analysis_duration_seconds
import time


class AnomalyDetector:
    """Detects anomalies in worker earnings patterns."""
    
    def __init__(self, conn: asyncpg.Connection):
        self.conn = conn
    
    async def analyze(
        self,
        worker_id: UUID,
        trigger_shift_id: Optional[UUID] = None,
        lookback_days: int = 60
    ) -> AnomalyReport:
        """
        Main analysis entry point.
        Returns comprehensive AnomalyReport with all checks run.
        """
        start_time = time.time()
        
        try:
            # Step 1: Fetch historical shifts
            shifts = await self._fetch_shifts(worker_id, lookback_days)
            
            if len(shifts) < 5:
                analyses_total.labels(status='insufficient_data').inc()
                return AnomalyReport(
                    worker_id=worker_id,
                    analyzed_at=datetime.now(),
                    shift_count_analyzed=len(shifts),
                    lookback_days=lookback_days,
                    insufficient_data=True,
                    anomalies=[],
                    anomaly_count=0,
                    high_count=0,
                    medium_count=0,
                    low_count=0,
                    summary="Insufficient data: fewer than 5 confirmed shifts in lookback period.",
                    methodology="Minimum 5 historical shifts required for statistical analysis."
                )
            
            # Step 2: Compute baselines
            baseline_deduction_by_platform = await self._compute_baseline_deductions(shifts)
            baseline_hourly_by_platform = await self._compute_baseline_hourly_rates(shifts)
            monthly_drop_fraction = self._compute_monthly_drop(shifts)
            
            # Step 3: Run all checks
            anomalies = []
            
            # Check 1: Deduction rate spike
            anomalies.extend(await self._check_deduction_spike(shifts, baseline_deduction_by_platform))
            
            # Check 2: Monthly income drop
            if monthly_drop_fraction is not None:
                anomalies.extend(self._check_monthly_drop(monthly_drop_fraction, shifts))
            
            # Check 3: Hourly rate anomaly
            anomalies.extend(self._check_hourly_rate_anomaly(shifts, baseline_hourly_by_platform))
            
            # Check 4: Deduction inconsistency
            anomalies.extend(self._check_deduction_inconsistency(shifts))
            
            # Check 5: Long shift gap
            anomalies.extend(self._check_long_shift_gap(shifts))
            
            # Sort by severity: HIGH, MEDIUM, LOW
            severity_order = {'HIGH': 0, 'MEDIUM': 1, 'LOW': 2}
            anomalies.sort(key=lambda a: severity_order[a.severity])
            
            # Count by severity
            high_count = sum(1 for a in anomalies if a.severity == 'HIGH')
            medium_count = sum(1 for a in anomalies if a.severity == 'MEDIUM')
            low_count = sum(1 for a in anomalies if a.severity == 'LOW')
            
            # Record metrics
            for anomaly in anomalies:
                anomalies_detected_total.labels(
                    severity=anomaly.severity,
                    check_name=anomaly.check_name
                ).inc()
            
            analyses_total.labels(status='success').inc()
            elapsed = time.time() - start_time
            analysis_duration_seconds.labels(status='success').observe(elapsed)
            
            # Generate summary
            if not anomalies:
                summary = f"No anomalies detected across {len(shifts)} recent shifts. Earnings patterns look normal."
            else:
                summary = f"Detected {len(anomalies)} anomaly pattern(s): {high_count} high, {medium_count} medium, {low_count} low severity."
            
            methodology = (
                f"Analyzed {len(shifts)} shifts over {lookback_days} days. "
                f"Baseline statistics computed from shifts >14 days old per platform. "
                f"Checks: (1) deduction rate spike >8pp above baseline, (2) monthly income drop >20%, "
                f"(3) hourly rate <60% of baseline, (4) deduction amount vs rate inconsistency >PKR50, "
                f"(5) shift gap >3x normal + >7 days. All thresholds verified manually against historical data."
            )
            
            return AnomalyReport(
                worker_id=worker_id,
                analyzed_at=datetime.now(),
                shift_count_analyzed=len(shifts),
                lookback_days=lookback_days,
                insufficient_data=False,
                anomalies=anomalies,
                anomaly_count=len(anomalies),
                high_count=high_count,
                medium_count=medium_count,
                low_count=low_count,
                summary=summary,
                methodology=methodology
            )
        
        except Exception as e:
            analyses_total.labels(status='error').inc()
            elapsed = time.time() - start_time
            analysis_duration_seconds.labels(status='error').observe(elapsed)
            raise
    
    async def _fetch_shifts(self, worker_id: UUID, lookback_days: int) -> list:
        """Fetch historical shifts for worker."""
        query = """
            SELECT id, shift_date, platform, gross_earned, platform_deduction,
                   deduction_rate, net_received, hours_worked, effective_hourly_rate
            FROM earnings_schema.shifts
            WHERE worker_id = $1
              AND shift_date >= NOW() - $2 * INTERVAL '1 day'
              AND verify_status IN ('CONFIRMED', 'PENDING')
            ORDER BY shift_date DESC
            LIMIT 200
        """
        rows = await self.conn.fetch(query, worker_id, lookback_days)
        return [dict(row) for row in rows]
    
    async def _compute_baseline_deductions(self, shifts: list) -> dict:
        """Compute baseline deduction rate per platform (shifts >14 days old)."""
        baseline_by_platform = {}
        cutoff = datetime.now().date() - timedelta(days=14)
        
        for platform in set(s['platform'] for s in shifts):
            old_shifts = [
                s['deduction_rate']
                for s in shifts
                if s['platform'] == platform and s['shift_date'] <= cutoff
            ]
            
            if old_shifts:
                baseline_by_platform[platform] = float(np.median(old_shifts))
            else:
                # Fallback to all shifts for this platform if no old ones
                all_platform_shifts = [
                    s['deduction_rate']
                    for s in shifts
                    if s['platform'] == platform
                ]
                if all_platform_shifts:
                    baseline_by_platform[platform] = float(np.median(all_platform_shifts))
        
        return baseline_by_platform
    
    async def _compute_baseline_hourly_rates(self, shifts: list) -> dict:
        """Compute baseline hourly rate per platform (shifts >14 days old)."""
        baseline_by_platform = {}
        cutoff = datetime.now().date() - timedelta(days=14)
        
        for platform in set(s['platform'] for s in shifts):
            old_shifts = [
                float(s['effective_hourly_rate'])
                for s in shifts
                if s['platform'] == platform and s['shift_date'] <= cutoff
            ]
            
            if old_shifts:
                baseline_by_platform[platform] = float(np.median(old_shifts))
            else:
                all_platform_shifts = [
                    float(s['effective_hourly_rate'])
                    for s in shifts
                    if s['platform'] == platform
                ]
                if all_platform_shifts:
                    baseline_by_platform[platform] = float(np.median(all_platform_shifts))
        
        return baseline_by_platform
    
    def _compute_monthly_drop(self, shifts: list) -> Optional[float]:
        """Compute month-over-month income drop fraction."""
        today = datetime.now().date()
        month_start = today.replace(day=1)
        prev_month_end = month_start - timedelta(days=1)
        prev_month_start = prev_month_end.replace(day=1)
        
        recent = sum(
            float(s['net_received'])
            for s in shifts
            if s['shift_date'] >= month_start
        )
        previous = sum(
            float(s['net_received'])
            for s in shifts
            if prev_month_start <= s['shift_date'] < month_start
        )
        
        if previous > 0:
            return (previous - recent) / previous
        return None
    
    async def _check_deduction_spike(self, shifts: list, baseline_by_platform: dict) -> list[Anomaly]:
        """CHECK 1: Deduction rate spike (>8pp above baseline)."""
        anomalies = []
        threshold = 0.08  # 8 percentage points
        cutoff = datetime.now().date() - timedelta(days=14)
        
        for shift in shifts:
            platform = shift['platform']
            if platform not in baseline_by_platform:
                continue
            
            baseline = baseline_by_platform[platform]
            actual = float(shift['deduction_rate'])
            diff = actual - baseline
            
            if diff > threshold:
                anomalies.append(Anomaly(
                    check_name='deduction_rate_spike',
                    severity='HIGH',
                    shift_id=shift['id'],
                    shift_date=shift['shift_date'],
                    platform=platform,
                    detected_value=Decimal(str(actual)),
                    baseline_value=Decimal(str(baseline)),
                    plain_english=(
                        f"Your {platform} deduction rate jumped to {actual:.1%} on {shift['shift_date']}. "
                        f"Your usual rate is {baseline:.1%}. This is {diff:.1%} higher than normal. "
                        f"This could mean {platform} changed their commission rate, or there was an "
                        f"error in your payment calculation."
                    )
                ))
        
        return anomalies
    
    def _check_monthly_drop(self, monthly_drop_fraction: float, shifts: list) -> list[Anomaly]:
        """CHECK 2: Sudden income drop (month-over-month >20%)."""
        anomalies = []
        threshold = 0.20
        
        if monthly_drop_fraction > threshold:
            today = datetime.now().date()
            month_start = today.replace(day=1)
            prev_month_end = month_start - timedelta(days=1)
            prev_month_start = prev_month_end.replace(day=1)
            
            recent = sum(
                float(s['net_received'])
                for s in shifts
                if s['shift_date'] >= month_start
            )
            previous = sum(
                float(s['net_received'])
                for s in shifts
                if prev_month_start <= s['shift_date'] < month_start
            )
            
            drop_amount = previous - recent
            
            anomalies.append(Anomaly(
                check_name='monthly_income_drop',
                severity='HIGH',
                detected_value=Decimal(str(monthly_drop_fraction)),
                baseline_value=Decimal('0.20'),
                plain_english=(
                    f"Your income dropped by {monthly_drop_fraction:.1%} compared to last month. "
                    f"You earned PKR {previous:,.0f} last month but only PKR {recent:,.0f} this month. "
                    f"Possible reasons: fewer shifts worked, increased deductions, or reduced ride/job availability."
                )
            ))
        
        return anomalies
    
    def _check_hourly_rate_anomaly(self, shifts: list, baseline_by_platform: dict) -> list[Anomaly]:
        """CHECK 3: Hourly rate anomaly (<60% of baseline in recent shift)."""
        anomalies = []
        threshold = 0.60
        cutoff = datetime.now().date() - timedelta(days=14)
        
        for shift in shifts:
            if shift['shift_date'] <= cutoff:
                continue  # Only check recent shifts
            
            platform = shift['platform']
            if platform not in baseline_by_platform:
                continue
            
            baseline = baseline_by_platform[platform]
            actual = float(shift['effective_hourly_rate'])
            ratio = actual / baseline if baseline > 0 else 1.0
            
            if ratio < threshold:
                pct_below = (1 - ratio) * 100
                anomalies.append(Anomaly(
                    check_name='hourly_rate_anomaly',
                    severity='MEDIUM',
                    shift_id=shift['id'],
                    shift_date=shift['shift_date'],
                    platform=platform,
                    detected_value=Decimal(str(actual)),
                    baseline_value=Decimal(str(baseline)),
                    plain_english=(
                        f"On {shift['shift_date']}, your {platform} hourly rate was PKR {actual:,.0f}/hr. "
                        f"Your usual rate is around PKR {baseline:,.0f}/hr. This shift earned you {pct_below:.1f}% "
                        f"less per hour than normal. This may be worth checking against your earnings screenshot."
                    )
                ))
        
        return anomalies
    
    def _check_deduction_inconsistency(self, shifts: list) -> list[Anomaly]:
        """CHECK 4: Deduction amount vs rate inconsistency (>PKR 50)."""
        anomalies = []
        threshold = 50  # PKR
        
        for shift in shifts:
            stored_deduction = float(shift['platform_deduction'])
            gross = float(shift['gross_earned'])
            rate = float(shift['deduction_rate'])
            
            expected_deduction = gross * rate
            diff = abs(stored_deduction - expected_deduction)
            
            if diff > threshold:
                anomalies.append(Anomaly(
                    check_name='deduction_inconsistency',
                    severity='MEDIUM',
                    shift_id=shift['id'],
                    shift_date=shift['shift_date'],
                    platform=shift['platform'],
                    detected_value=Decimal(str(stored_deduction)),
                    baseline_value=Decimal(str(expected_deduction)),
                    plain_english=(
                        f"On {shift['shift_date']}, the deduction amount (PKR {stored_deduction:,.0f}) "
                        f"does not match the deduction rate shown ({rate:.1%} of PKR {gross:,.0f} = "
                        f"PKR {expected_deduction:,.0f}). Difference: PKR {diff:,.0f}. "
                        f"This could indicate a calculation error in the platform's payment."
                    )
                ))
        
        return anomalies
    
    def _check_long_shift_gap(self, shifts: list) -> list[Anomaly]:
        """CHECK 5: Unusually long gap between shifts (>3x normal + >7 days)."""
        anomalies = []
        
        if len(shifts) < 2:
            return anomalies
        
        sorted_shifts = sorted(shifts, key=lambda s: s['shift_date'])
        gaps = []
        
        for i in range(1, len(sorted_shifts)):
            gap_days = (sorted_shifts[i]['shift_date'] - sorted_shifts[i-1]['shift_date']).days
            gaps.append(gap_days)
        
        if not gaps:
            return anomalies
        
        normal_gap = float(np.median(gaps))
        longest_gap = max(gaps)
        
        longest_idx = gaps.index(longest_gap)
        start_shift = sorted_shifts[longest_idx]
        end_shift = sorted_shifts[longest_idx + 1]
        
        threshold_gap = max(normal_gap * 3, 7)
        
        if longest_gap > threshold_gap:
            anomalies.append(Anomaly(
                check_name='long_shift_gap',
                severity='LOW',
                shift_id=end_shift['id'],
                shift_date=end_shift['shift_date'],
                detected_value=Decimal(str(longest_gap)),
                baseline_value=Decimal(str(normal_gap)),
                plain_english=(
                    f"You had a {longest_gap}-day gap between shifts from {start_shift['shift_date']} "
                    f"to {end_shift['shift_date']}. Your usual pattern is roughly every {normal_gap:.0f} days. "
                    f"If this was an unplanned break, it might be worth logging a complaint if your account "
                    f"was restricted during this time."
                )
            ))
        
        return anomalies
