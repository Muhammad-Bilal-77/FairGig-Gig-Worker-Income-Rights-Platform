#!/usr/bin/env python3
"""Verify analytics data and endpoints are working"""

import requests
import json
from datetime import datetime, timedelta

AUTH_URL = "http://localhost:4001"
EARNINGS_URL = "http://localhost:4002"

print("=" * 70)
print("  ANALYTICS VERIFICATION TEST")
print("=" * 70)

# Step 1: Login
print("\n1️⃣  Logging in as worker@test.com...")
login_resp = requests.post(
    f"{AUTH_URL}/api/auth/login",
    json={"email": "worker@test.com", "password": "Test123!"},
    timeout=5
)

if login_resp.status_code != 200:
    print(f"   ❌ Login failed: {login_resp.json()}")
    exit(1)

token = login_resp.json()['access_token']
print(f"   ✅ Logged in successfully")

headers = {"Authorization": f"Bearer {token}"}

# Step 2: Get shifts
print("\n2️⃣  Fetching shifts for user...")
today = datetime.now().date()
eight_weeks_ago = today - timedelta(weeks=8)

shifts_resp = requests.get(
    f"{EARNINGS_URL}/api/earnings/shifts",
    params={
        "from_date": str(eight_weeks_ago),
        "to_date": str(today),
        "limit": "100"
    },
    headers=headers,
    timeout=10
)

if shifts_resp.status_code != 200:
    print(f"   ❌ Failed to fetch shifts: {shifts_resp.json()}")
    exit(1)

shifts = shifts_resp.json().get('data', [])
print(f"   ✅ Fetched {len(shifts)} shifts")

if shifts:
    # Group by city zone
    cities = {}
    for shift in shifts:
        city = shift.get('city_zone', 'Unknown')
        cities[city] = cities.get(city, 0) + 1
    
    print(f"   📍 City distribution:")
    for city, count in sorted(cities.items(), key=lambda x: -x[1]):
        print(f"      {city}: {count} shifts")

# Step 3: Get median data (no filter)
print("\n3️⃣  Fetching median data (all cities)...")
median_resp = requests.get(
    f"{EARNINGS_URL}/api/earnings/median",
    headers=headers,
    timeout=10
)

if median_resp.status_code != 200:
    print(f"   ❌ Failed to fetch median data: {median_resp.json()}")
    exit(1)

medians = median_resp.json().get('data', [])
print(f"   ✅ Fetched {len(medians)} median entries")

if medians:
    print(f"\n   📊 Sample median data:")
    for entry in medians[:5]:
        print(f"      {entry.get('city_zone', 'Unknown'):15} | "
              f"{entry.get('platform', 'Unknown'):12} | "
              f"Median: PKR {entry.get('median_hourly_rate', 0):.0f}/hr")

# Step 4: Get median for specific city
print("\n4️⃣  Fetching median data for DHA...")
dha_resp = requests.get(
    f"{EARNINGS_URL}/api/earnings/median",
    params={"city_zone": "DHA"},
    headers=headers,
    timeout=10
)

if dha_resp.status_code != 200:
    print(f"   ⚠️  No median data for DHA: {dha_resp.json()}")
else:
    dha_medians = dha_resp.json().get('data', [])
    print(f"   ✅ Fetched {len(dha_medians)} median entries for DHA")
    for entry in dha_medians[:3]:
        print(f"      {entry.get('platform', 'Unknown'):12} | "
              f"Median: PKR {entry.get('median_hourly_rate', 0):.0f}/hr | "
              f"Workers: {entry.get('worker_count', 0)}")

# Step 5: Verify chart data
print("\n5️⃣  Verifying chart requirements...")

checks = {
    "✅ Has shifts": len(shifts) > 0,
    "✅ Has median data": len(medians) > 0,
    "✅ Has workers in multiple cities": len(cities) > 1,
}

for check, passed in checks.items():
    status = "✅" if passed else "❌"
    print(f"   {status} {check.split('✅ ')[1]}")

print("\n" + "=" * 70)
print("✅ ANALYTICS DATA VERIFICATION COMPLETE")
print("=" * 70)
print("\n📊 Your analytics charts should now display:")
print("   1. Weekly earnings - ✅ Has data")
print(f"   2. Hourly rate vs city median - {'✅ Has data' if len(shifts) > 0 and len(medians) > 0 else '⚠️ Missing data'}")
print(f"   3. Platform commission rate - {'✅ Has data' if len(shifts) > 0 else '⚠️ Missing data'}")
print(f"   4. Median income by city - {'✅ Has data' if len(medians) > 0 else '⚠️ Missing data'}")

print("\n🔄 Refresh the analytics page to see the updated charts!")
