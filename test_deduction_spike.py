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
    """Insert test shifts with controlled deduction rates."""
    conn = await asyncpg.connect(DB_URL)
    
    try:
        # Create a test worker
        worker_id = uuid4()
        email = f"test-deduction-spike-{int(time.time())}@seed.com"
        
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
            "Test Worker Deduction Spike",
            "03001234567",
            "worker",
            "Lahore",
            "DHA",
            "ride_hailing"
        )
        
        # Insert baseline shifts (15-90 days old) with 30% deduction rate
        baseline_shifts = []
        for i in range(5):
            shift_date = datetime.now().date() - timedelta(days=15 + i*15)
            gross_earned = 1000.00
            # platform_deduction = 30% of gross_earned
            platform_deduction = gross_earned * 0.30
            net_received = gross_earned - platform_deduction
            
            shift_id = uuid4()
            baseline_shifts.append(shift_id)
            
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
        
        # Insert spike shift (today) with 39% deduction rate (9pp above baseline)
        spike_date = datetime.now().date()
        gross_earned = 1000.00
        # platform_deduction = 39% of gross_earned (9 percentage points higher than baseline)
        platform_deduction = gross_earned * 0.39
        net_received = gross_earned - platform_deduction
        
        spike_shift_id = uuid4()
        
        await conn.execute(
            """
            INSERT INTO earnings_schema.shifts
            (id, worker_id, platform, city_zone, worker_category, shift_date, 
             hours_worked, gross_earned, platform_deduction, 
             net_received, verify_status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            """,
            spike_shift_id, worker_id, 'Careem', 'DHA', 'ride_hailing',
            spike_date, 5.0, gross_earned, platform_deduction,
            net_received, 'CONFIRMED'
        )
        
        print(f"\n✓ Created test worker: {email}")
        print(f"  Worker ID: {worker_id}")
        print(f"  - 5 baseline shifts with 30% deduction (15-75 days old)")
        print(f"  - 1 spike shift with 39% deduction (today)")
        
        return str(worker_id), email
    finally:
        await conn.close()

print("="*70)
print("  ANOMALY DETECTION TEST FOR DEDUCTION SPIKE")
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
        "lookback_days": 120
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
            shift_date = anomaly.get('shift_date')
            platform = anomaly.get('platform')
            detected_value = anomaly.get('detected_value')
            baseline_value = anomaly.get('baseline_value')
            plain_english = anomaly.get('plain_english', '')
            
            print(f"\n   {i}. [{severity}] {check_name}")
            print(f"      Platform: {platform}")
            print(f"      Date: {shift_date}")
            print(f"      Detected Value: {detected_value}")
            print(f"      Baseline Value: {baseline_value}")
            print(f"      Explanation:")
            print(f"        {plain_english}")
    else:
        print(f"\n   ✗ No anomalies detected (EXPECTED deduction spike NOT found)")
else:
    print(f"   Error: {r.status_code}")
    print(f"   {r.json()}")

print("\n" + "="*70)
