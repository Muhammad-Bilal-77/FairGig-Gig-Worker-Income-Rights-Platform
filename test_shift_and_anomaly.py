import requests
import json

AUTH_URL = "http://localhost:4001"
EARNINGS_URL = "http://localhost:4002"
ANOMALY_URL = "http://localhost:4003"

print("="*70)
print("  TESTING SHIFT CREATION & ANOMALY DETECTION")
print("="*70)

# Login
print("\n1. Logging in...")
r = requests.post(
    f"{AUTH_URL}/api/auth/login",
    json={
        "email": "careem.dha.1@seed.com",
        "password": "password123"
    },
    timeout=5
)

print(f"   Status: {r.status_code}")
body = r.json()

if 'access_token' in body:
    token = body['access_token']
    worker_id = body.get('user', {}).get('id')
    print(f"   ✓ Token obtained")
    print(f"   ✓ Worker ID: {worker_id[:8]}...")
    
    # Create shift with 45% deduction
    print("\n2. Creating anomalous shift (45% deduction vs normal ~28%)...")
    shift_data = {
        "platform": "Careem",
        "city_zone": "Karachi-DHA",
        "worker_category": "ride_hailing",
        "shift_date": "2026-04-18",
        "hours_worked": 8.0,
        "gross_earned": 9600.00,
        "platform_deduction": 4320.00,  # 45%
        "net_received": 5280.00
    }
    
    r = requests.post(
        f"{EARNINGS_URL}/api/earnings/shifts",
        json=shift_data,
        headers={"Authorization": f"Bearer {token}"},
        timeout=10
    )
    print(f"   Status: {r.status_code}")
    shift_response = r.json()
    
    if r.status_code == 201:
        print(f"   ✓ Shift created successfully")
        print(f"   - Shift ID: {shift_response.get('id', 'N/A')[:8]}...")
        print(f"   - Deduction rate: {float(shift_response.get('deduction_rate', 0)):.1%}")
        print(f"   - Effective hourly rate: PKR {float(shift_response.get('effective_hourly_rate', 0)):,.0f}/hr")
        
        # Now analyze for anomalies
        print("\n3. Analyzing for anomalies (should detect deduction_rate_spike)...")
        import time
        time.sleep(1)
        
        r = requests.post(
            f"{ANOMALY_URL}/api/anomaly/analyze",
            json={
                "worker_id": worker_id,
                "lookback_days": 60
            },
            timeout=10
        )
        print(f"   Status: {r.status_code}")
        
        if r.status_code == 200:
            analysis = r.json()
            anomalies = analysis.get('anomalies', [])
            print(f"   ✓ Analysis complete")
            print(f"   - Shifts analyzed: {analysis.get('shift_count_analyzed')}")
            print(f"   - Anomalies found: {len(anomalies)}")
            print(f"   - High severity: {analysis.get('high_count')}")
            
            if anomalies:
                print(f"\n   ANOMALIES DETECTED:")
                for i, a in enumerate(anomalies, 1):
                    severity = a.get('severity')
                    check = a.get('check_name')
                    plain_text = a.get('plain_english', '')[:100]
                    print(f"\n   {i}. [{severity}] {check}")
                    print(f"      → {plain_text}...")
            else:
                print(f"   ℹ No anomalies detected (worker shifts are normal)")
        else:
            print(f"   ✗ Analysis failed: {shift_response}")
    else:
        print(f"   Status: {r.status_code}")
        print(f"   Response: {json.dumps(shift_response, indent=6)}")
else:
    print(f"   ✗ Login failed: {body}")

print("\n" + "="*70)
