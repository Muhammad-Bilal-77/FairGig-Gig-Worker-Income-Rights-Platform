#!/usr/bin/env python3
"""Test the median API endpoint"""

import requests

AUTH_URL = "http://localhost:4001"
EARNINGS_URL = "http://localhost:4002"

# Login
login_resp = requests.post(
    f"{AUTH_URL}/api/auth/login",
    json={"email": "mb3454545@gmail.com", "password": "password123"},
)

if login_resp.status_code == 200:
    token = login_resp.json()['access_token']
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get median for DHA
    resp = requests.get(
        f"{EARNINGS_URL}/api/earnings/median",
        params={"city_zone": "DHA"},
        headers=headers
    )
    
    print("Response status:", resp.status_code)
    print("Response data:")
    data = resp.json()
    import json
    print(json.dumps(data, indent=2, default=str))
