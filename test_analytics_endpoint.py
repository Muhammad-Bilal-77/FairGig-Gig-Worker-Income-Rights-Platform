#!/usr/bin/env python3
"""Quick test to debug the analytics endpoint"""

import requests
import json
from datetime import datetime, timedelta

AUTH_URL = "http://localhost:4001"
EARNINGS_URL = "http://localhost:4002"

print("="*70)
print("  ANALYTICS ENDPOINT TEST")
print("="*70)

# Step 1: Login
print("\n1. Logging in...")
login_response = requests.post(
    f"{AUTH_URL}/api/auth/login",
    json={
        "email": "worker@test.com",
        "password": "Test123!"
    },
    timeout=5
)

print(f"   Status: {login_response.status_code}")
login_data = login_response.json()

if 'access_token' not in login_data:
    print(f"   ✗ Login failed: {login_data}")
    exit(1)

token = login_data['access_token']
print(f"   ✓ Token obtained")

# Step 2: Test shifts endpoint
print("\n2. Testing /api/earnings/shifts endpoint...")

today = datetime.now().date()
eight_weeks_ago = today - timedelta(weeks=8)

params = {
    "from_date": str(eight_weeks_ago),
    "to_date": str(today),
    "limit": "100"
}

shifts_response = requests.get(
    f"{EARNINGS_URL}/api/earnings/shifts",
    params=params,
    headers={"Authorization": f"Bearer {token}"},
    timeout=10
)

print(f"   Status: {shifts_response.status_code}")
print(f"   Headers: {dict(shifts_response.headers)}")

try:
    shifts_data = shifts_response.json()
    print(f"\n   Response (first 500 chars):")
    response_str = json.dumps(shifts_data, indent=2, default=str)
    print("   " + response_str[:500])
    
    if shifts_response.status_code == 200:
        if 'data' in shifts_data:
            print(f"\n   ✓ Success! Got {len(shifts_data['data'])} shifts")
        else:
            print(f"\n   ✗ Response missing 'data' field. Response: {shifts_data}")
    else:
        print(f"\n   ✗ Error response: {shifts_data}")
        
except Exception as e:
    print(f"   ✗ Failed to parse response: {e}")
    print(f"   Raw response: {shifts_response.text}")

# Step 3: Test median endpoint
print("\n3. Testing /api/earnings/median endpoint...")

median_response = requests.get(
    f"{EARNINGS_URL}/api/earnings/median",
    params={"city_zone": "DHA"},
    headers={"Authorization": f"Bearer {token}"},
    timeout=10
)

print(f"   Status: {median_response.status_code}")

try:
    median_data = median_response.json()
    print(f"\n   Response (first 300 chars):")
    response_str = json.dumps(median_data, indent=2, default=str)
    print("   " + response_str[:300])
    
    if median_response.status_code == 200:
        if 'data' in median_data:
            print(f"\n   ✓ Success! Got median data")
        else:
            print(f"\n   ✗ Response missing 'data' field")
    else:
        print(f"\n   ✗ Error response: {median_data}")
        
except Exception as e:
    print(f"   ✗ Failed to parse response: {e}")
    print(f"   Raw response: {median_response.text}")

print("\n" + "="*70)
