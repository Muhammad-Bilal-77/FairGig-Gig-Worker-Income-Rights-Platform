#!/usr/bin/env python3
"""
COMPREHENSIVE ANOMALY DETECTION INTEGRATION TEST

This test creates a single worker with multiple anomalies to demonstrate
all 5 anomaly detection checks working together.
"""

import requests
import json
import time
import asyncpg
import asyncio
from uuid import uuid4
from datetime import datetime, timedelta
import sys

ANOMALY_URL = "http://localhost:4003"
DB_URL = "postgresql://fairgig_admin:fairgig_admin_secret_2026@localhost:5433/fairgig"

async def setup_comprehensive_test_data():
    """Create a worker with multiple overlapping anomalies."""
    conn = await asyncpg.connect(DB_URL)
    
    try:
        worker_id = uuid4()
        email = f"test-comprehensive-{int(time.time())}@seed.com"
        
        # Insert worker
        await conn.execute(
            """
            INSERT INTO auth_schema.users 
            (id, email, password_hash, full_name, phone, role, city, city_zone, worker_category)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            """,
            worker_id,
            email,
            "$2a$12$jPVSLeok2cZrAEJMbfOxnuf4pK1ZmNzIist9YYLsYTpbUqGESc8Cu",
            "Comprehensive Anomaly Test Worker",
            "03001234567",
            "worker",
            "Lahore",
            "DHA",
            "ride_hailing"
        )
        
        today = datetime.now().date()
        month_start = today.replace(day=1)
        prev_month_end = month_start - timedelta(days=1)
        prev_month_start = prev_month_end.replace(day=1)
        
        # ════════════════════════════════════════════════════════════════
        # SETUP: Historical baseline (20-85 days old)
        # Normal pattern: Every 2 days, 1000 PKR gross, 30% deduction
        # ════════════════════════════════════════════════════════════════
        for i in range(8):
            shift_date = today - timedelta(days=85 - i*8)
            
            gross_earned = 1000.00
            platform_deduction = gross_earned * 0.30
            net_received = gross_earned - platform_deduction
            
            await conn.execute(
                """
                INSERT INTO earnings_schema.shifts
                (id, worker_id, platform, city_zone, worker_category, shift_date,
                 hours_worked, gross_earned, platform_deduction,
                 net_received, verify_status)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                """,
                uuid4(), worker_id, 'Careem', 'DHA', 'ride_hailing',
                shift_date, 5.0, gross_earned, platform_deduction,
                net_received, 'CONFIRMED'
            )
        
        # ════════════════════════════════════════════════════════════════
        # ANOMALY 1: Long shift gap (15-20 days old)
        # Gap of 30+ days from last baseline shift
        # ════════════════════════════════════════════════════════════════
        gap_shift_date = today - timedelta(days=35)
        gross_earned = 1000.00
        platform_deduction = gross_earned * 0.30
        net_received = gross_earned - platform_deduction
        
        await conn.execute(
            """
            INSERT INTO earnings_schema.shifts
            (id, worker_id, platform, city_zone, worker_category, shift_date,
             hours_worked, gross_earned, platform_deduction,
             net_received, verify_status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            """,
            uuid4(), worker_id, 'Careem', 'DHA', 'ride_hailing',
            gap_shift_date, 5.0, gross_earned, platform_deduction,
            net_received, 'CONFIRMED'
        )
        
        # ════════════════════════════════════════════════════════════════
        # PREVIOUS MONTH: Normal earnings (for monthly drop comparison)
        # 5 shifts in previous month with consistent PKR 7000 gross
        # ════════════════════════════════════════════════════════════════
        for i in range(5):
            days_offset = int((i / 5) * (prev_month_end - prev_month_start).days)
            shift_date = prev_month_start + timedelta(days=days_offset)
            
            gross_earned = 7000.00
            platform_deduction = gross_earned * 0.30
            net_received = gross_earned - platform_deduction
            
            await conn.execute(
                """
                INSERT INTO earnings_schema.shifts
                (id, worker_id, platform, city_zone, worker_category, shift_date,
                 hours_worked, gross_earned, platform_deduction,
                 net_received, verify_status)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                """,
                uuid4(), worker_id, 'Careem', 'DHA', 'ride_hailing',
                shift_date, 7.0, gross_earned, platform_deduction,
                net_received, 'CONFIRMED'
            )
        
        # ════════════════════════════════════════════════════════════════
        # CURRENT MONTH SHIFTS: Multiple anomalies
        # ════════════════════════════════════════════════════════════════
        
        # Day 1: Deduction spike (39% instead of normal 30%)
        gross_earned = 1000.00
        platform_deduction = gross_earned * 0.39
        net_received = gross_earned - platform_deduction
        
        await conn.execute(
            """
            INSERT INTO earnings_schema.shifts
            (id, worker_id, platform, city_zone, worker_category, shift_date,
             hours_worked, gross_earned, platform_deduction,
             net_received, verify_status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            """,
            uuid4(), worker_id, 'Careem', 'DHA', 'ride_hailing',
            month_start, 5.0, gross_earned, platform_deduction,
            net_received, 'CONFIRMED'
        )
        
        # Day 5: Hourly rate anomaly (60 PKR/hour instead of normal 200 PKR/hour)
        hours_worked = 5.0
        gross_earned = 300.00  # 60 PKR/hour
        platform_deduction = gross_earned * 0.30
        net_received = gross_earned - platform_deduction
        
        await conn.execute(
            """
            INSERT INTO earnings_schema.shifts
            (id, worker_id, platform, city_zone, worker_category, shift_date,
             hours_worked, gross_earned, platform_deduction,
             net_received, verify_status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            """,
            uuid4(), worker_id, 'Careem', 'DHA', 'ride_hailing',
            month_start + timedelta(days=5), hours_worked, gross_earned,
            platform_deduction, net_received, 'CONFIRMED'
        )
        
        # Day 10: Normal shift to establish pattern
        gross_earned = 1000.00
        platform_deduction = gross_earned * 0.30
        net_received = gross_earned - platform_deduction
        
        await conn.execute(
            """
            INSERT INTO earnings_schema.shifts
            (id, worker_id, platform, city_zone, worker_category, shift_date,
             hours_worked, gross_earned, platform_deduction,
             net_received, verify_status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            """,
            uuid4(), worker_id, 'Careem', 'DHA', 'ride_hailing',
            month_start + timedelta(days=10), 5.0, gross_earned,
            platform_deduction, net_received, 'CONFIRMED'
        )
        
        print(f"\n✓ Created comprehensive test worker: {email}")
        print(f"  Worker ID: {worker_id}")
        print(f"  \n  Test Data Setup:")
        print(f"  - 8 historical baseline shifts (85 days ago, normal: 30% deduction, PKR 1000)")
        print(f"  - 1 gap shift (35 days ago, creating 30+ day gap)")
        print(f"  - 5 previous month shifts (normal: PKR 7000 gross)")
        print(f"  - 3 current month shifts with anomalies:")
        print(f"    • Day 1: Deduction spike (39% vs normal 30%)")
        print(f"    • Day 5: Hourly rate anomaly (PKR 60/hr vs normal PKR 200/hr)")
        print(f"    • Day 10: Normal shift")
        print(f"  \n  Expected Anomalies:")
        print(f"  1. HIGH: Deduction rate spike (9pp above baseline)")
        print(f"  2. HIGH: Monthly income drop (very low current month activity)")
        print(f"  3. MEDIUM: Hourly rate anomaly (30% of baseline)")
        print(f"  4. LOW: Long shift gap (~30 days)")
        
        return str(worker_id)
        
    finally:
        await conn.close()

print("╔" + "═"*68 + "╗")
print("║" + " "*10 + "COMPREHENSIVE ANOMALY DETECTION INTEGRATION TEST" + " "*10 + "║")
print("╚" + "═"*68 + "╝")

# Setup test data
print("\n[1/4] Setting up comprehensive test data...")
try:
    worker_id = asyncio.run(setup_comprehensive_test_data())
except Exception as e:
    print(f"   ✗ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Wait for database
print("\n[2/4] Waiting for database to commit (2 seconds)...")
time.sleep(2)

# Analyze
print("\n[3/4] Sending analysis request to anomaly service...")
r = requests.post(
    f"{ANOMALY_URL}/api/anomaly/analyze",
    json={
        "worker_id": worker_id,
        "lookback_days": 120
    },
    timeout=10
)

if r.status_code != 200:
    print(f"   ✗ Error: {r.status_code}")
    print(f"   {r.json()}")
    sys.exit(1)

# Display results
print("\n[4/4] Processing and displaying results...\n")
analysis = r.json()

print("╔" + "═"*68 + "╗")
print("║" + " "*20 + "ANALYSIS RESULTS" + " "*32 + "║")
print("╠" + "═"*68 + "╣")
print(f"║ Shifts analyzed:    {str(analysis.get('shift_count_analyzed')):>51} │")
print(f"║ Total anomalies:    {str(analysis.get('anomaly_count')):>51} │")
print(f"║ HIGH severity:      {str(analysis.get('high_count')):>51} │")
print(f"║ MEDIUM severity:    {str(analysis.get('medium_count')):>51} │")
print(f"║ LOW severity:       {str(analysis.get('low_count')):>51} │")
print("╠" + "═"*68 + "╣")
print(f"║                                                                    │")
print(f"║ Summary: {analysis.get('summary', 'N/A'):<56} │")
print("╚" + "═"*68 + "╝")

anomalies = analysis.get('anomalies', [])
if anomalies:
    print(f"\n✓ ANOMALIES DETECTED ({len(anomalies)} total):\n")
    
    for i, anomaly in enumerate(anomalies, 1):
        severity = anomaly.get('severity')
        check_name = anomaly.get('check_name')
        detected_value = anomaly.get('detected_value')
        baseline_value = anomaly.get('baseline_value')
        plain_english = anomaly.get('plain_english', '')
        shift_date = anomaly.get('shift_date')
        platform = anomaly.get('platform')
        
        # Color-coded severity
        severity_symbol = '🔴' if severity == 'HIGH' else '🟠' if severity == 'MEDIUM' else '🟡'
        
        print(f"{severity_symbol} [{i}] {severity:6} - {check_name.upper()}")
        if shift_date:
            print(f"      Date: {shift_date}")
        if platform:
            print(f"      Platform: {platform}")
        print(f"      Detected: {detected_value}")
        print(f"      Baseline: {baseline_value}")
        print(f"      Details:")
        for line in plain_english.split('\n'):
            print(f"        {line}")
        print()
else:
    print(f"\n✗ No anomalies detected. This is unexpected!\n")

print("═"*70)
print("INTEGRATION TEST COMPLETE")
print("═"*70)
