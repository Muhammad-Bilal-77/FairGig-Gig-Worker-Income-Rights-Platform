import requests
import json
import time
import asyncpg
import asyncio
from uuid import uuid4
from datetime import datetime, timedelta
import sys

ANOMALY_URL = "http://localhost:4003"
AUTH_URL = "http://localhost:4001"
DB_URL = "postgresql://fairgig_admin:fairgig_admin_secret_2026@localhost:5433/fairgig"

async def setup_test_data():
    """Insert test shifts covering previous and current month."""
    conn = await asyncpg.connect(DB_URL)
    
    try:
        # Create a test worker
        worker_id = uuid4()
        email = f"test-monthly-drop-{int(time.time())}@seed.com"
        
        # Insert worker
        await conn.execute(
            """
            INSERT INTO auth_schema.users 
            (id, email, password_hash, full_name, phone, role, city, city_zone, worker_category)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            """,
            worker_id,
            email,
            "$2a$12$jPVSLeok2cZrAEJMbfOxnuf4pK1ZmNzIist9YYLsYTpbUqGESc8Cu",  # password123
            "Test Worker Monthly Drop",
            "03001234567",
            "worker",
            "Lahore",
            "DHA",
            "ride_hailing"
        )
        
        # Get month boundaries
        today = datetime.now().date()
        month_start = today.replace(day=1)
        prev_month_end = month_start - timedelta(days=1)
        prev_month_start = prev_month_end.replace(day=1)
        
        # Insert 5 shifts for previous month with PKR 5000 net income each
        for i in range(5):
            # Spread shifts across previous month
            days_offset = int((i / 5) * (prev_month_end - prev_month_start).days)
            shift_date = prev_month_start + timedelta(days=days_offset)
            
            gross_earned = 7000.00
            platform_deduction = gross_earned * 0.30
            net_received = gross_earned - platform_deduction
            
            shift_id = uuid4()
            
            await conn.execute(
                """
                INSERT INTO earnings_schema.shifts
                (id, worker_id, platform, city_zone, worker_category, shift_date, 
                 hours_worked, gross_earned, platform_deduction, 
                 net_received, verify_status)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                """,
                shift_id, worker_id, 'Careem', 'DHA', 'ride_hailing',
                shift_date, 5.0, gross_earned, platform_deduction,
                net_received, 'CONFIRMED'
            )
        
        # Insert 3 shifts for current month with 21% less net income
        baseline_net = 7000.00 * 0.70  # Net from previous month
        dropped_net = baseline_net * 0.79  # 21% drop
        dropped_gross = dropped_net / 0.70  # Work backwards to gross
        
        for i in range(3):
            days_offset = int((i / 3) * 10)  # Spread over first 10 days
            shift_date = month_start + timedelta(days=days_offset)
            
            platform_deduction = dropped_gross * 0.30
            net_received = dropped_net
            
            shift_id = uuid4()
            
            await conn.execute(
                """
                INSERT INTO earnings_schema.shifts
                (id, worker_id, platform, city_zone, worker_category, shift_date, 
                 hours_worked, gross_earned, platform_deduction, 
                 net_received, verify_status)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                """,
                shift_id, worker_id, 'Careem', 'DHA', 'ride_hailing',
                shift_date, 5.0, dropped_gross, platform_deduction,
                net_received, 'CONFIRMED'
            )
        
        prev_month_total = baseline_net * 5
        curr_month_total = dropped_net * 3
        drop_pct = ((prev_month_total - curr_month_total) / prev_month_total) * 100
        
        print(f"\n✓ Created test worker: {email}")
        print(f"  Worker ID: {worker_id}")
        print(f"  - 5 shifts in previous month: PKR {prev_month_total:,.2f} total")
        print(f"  - 3 shifts in current month: PKR {curr_month_total:,.2f} total")
        print(f"  - Income drop: {drop_pct:.1f}%")
        
        return str(worker_id), email
    finally:
        await conn.close()

print("="*70)
print("  ANOMALY DETECTION TEST FOR MONTHLY INCOME DROP")
print("="*70)

# Setup test data
print("\n1. Setting up test data...")
try:
    worker_id, email = asyncio.run(setup_test_data())
except Exception as e:
    print(f"   Error setting up test data: {e}")
    sys.exit(1)

# Wait for database to commit
print("\n2. Waiting for database to commit...")
time.sleep(2)

# Analyze
print("\n3. Analyzing for anomalies...")
r = requests.post(
    f"{ANOMALY_URL}/api/anomaly/analyze",
    json={
        "worker_id": worker_id,
        "lookback_days": 90
    },
    timeout=10
)
print(f"   Status: {r.status_code}")

if r.status_code == 200:
    analysis = r.json()
    
    print(f"\n   ANALYSIS RESULTS:")
    print(f"   - Shifts analyzed: {analysis.get('shift_count_analyzed')}")
    print(f"   - Total anomalies: {analysis.get('anomaly_count')}")
    print(f"   - High severity: {analysis.get('high_count')}")
    print(f"   - Medium severity: {analysis.get('medium_count')}")
    print(f"   - Low severity: {analysis.get('low_count')}")
    
    print(f"\n   SUMMARY: {analysis.get('summary', 'N/A')}")
    
    anomalies = analysis.get('anomalies', [])
    
    if anomalies:
        print(f"\n   ✓ ANOMALIES DETECTED:")
        for i, anomaly in enumerate(anomalies, 1):
            severity = anomaly.get('severity')
            check_name = anomaly.get('check_name')
            detected_value = anomaly.get('detected_value')
            baseline_value = anomaly.get('baseline_value')
            plain_english = anomaly.get('plain_english', '')
            
            print(f"\n   {i}. [{severity}] {check_name}")
            print(f"      Detected Value: {detected_value}")
            print(f"      Baseline Value: {baseline_value}")
            print(f"      Explanation:")
            print(f"        {plain_english}")
    else:
        print(f"\n   ✗ No anomalies detected (EXPECTED monthly drop NOT found)")
else:
    print(f"   Error: {r.status_code}")
    print(f"   {r.json()}")

print("\n" + "="*70)
