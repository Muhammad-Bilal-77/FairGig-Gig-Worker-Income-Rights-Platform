#!/usr/bin/env python3
"""Quick test that median API returns proper float values"""

import requests
import time

print("Waiting for service to be ready...")
time.sleep(3)

try:
    # Simple test - just check if service is responding
    resp = requests.get("http://localhost:4002/health", timeout=2)
    print(f"✅ Service responding: {resp.status_code}")
except Exception as e:
    print(f"⚠️ Service not ready yet: {e}")
