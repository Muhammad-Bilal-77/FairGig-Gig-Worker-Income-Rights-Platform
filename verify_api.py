import requests
import json

# Login as advocate
auth_url = "http://localhost:4001/api/auth/login"
creds = {"email": "mb3454545@gmail.com", "password": "Password1234"}

try:
    resp = requests.post(auth_url, json=creds)
    resp.raise_for_status()
    auth_data = resp.json()
    token = auth_data["access_token"]
    
    # Check vulnerability flags
    vuln_url = "http://localhost:4005/api/analytics/vulnerability-flags"
    headers = {"Authorization": f"Bearer {token}"}
    
    vuln_resp = requests.get(vuln_url, headers=headers)
    vuln_resp.raise_for_status()
    data = vuln_resp.json()
    
    print("\n[ACTIVE VULNERABILITY FLAGS]")
    print("-" * 50)
    for f in data['flags']:
        print(f"{f['city_zone']:12} | {f['platform']:10} | {f['worker_category']:15} | Drop: {f['avg_income_drop'] * 100:5.1f}% | Workers: {f['affected_worker_count']}")
    print("-" * 50)
except Exception as e:
    print(f"\n[VERIFICATION FAILED]: {e}")
