import requests
import json

AUTH_URL = "http://localhost:4001"
EARNINGS_URL = "http://localhost:4002"

print("="*70)
print("  DETAILED SHIFT CREATION TEST")
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
    print(f"   ✓ Token: {token[:20]}...")
    print(f"   ✓ Worker ID: {worker_id}")
    
    # Create shift with 45% deduction
    print("\n2. Creating shift...")
    shift_data = {
        "platform": "Careem",
        "city_zone": "Karachi-DHA",
        "worker_category": "ride_hailing",
        "shift_date": "2026-04-18",
        "hours_worked": 8.0,
        "gross_earned": 9600.00,
        "platform_deduction": 4320.00,
        "net_received": 5280.00
    }
    
    print(f"   Request data:")
    for k, v in shift_data.items():
        print(f"     - {k}: {v}")
    
    r = requests.post(
        f"{EARNINGS_URL}/api/earnings/shifts",
        json=shift_data,
        headers={"Authorization": f"Bearer {token}"},
        timeout=10
    )
    print(f"\n   Response Status: {r.status_code}")
    shift_response = r.json()
    
    print(f"\n   FULL RESPONSE:")
    print(json.dumps(shift_response, indent=2, default=str))
    
    if r.status_code == 201:
        print(f"\n   ✓ Shift created")
    else:
        print(f"\n   ✗ Creation failed")
else:
    print(f"   ✗ Login failed")

print("\n" + "="*70)
