#!/usr/bin/env python3
"""
Grievance Service verification tests.

Tests all 5 verification conditions:
1. GET /complaints output (first 2 items)
2. POST anonymous complaint response (show similar_complaints)
3. Stats output
4. Escalate response
5. Any errors
"""

import requests
import json
import time

GRIEVANCE_URL = "http://localhost:4004"
AUTH_URL = "http://localhost:4001"

print("="*70)
print("  GRIEVANCE SERVICE VERIFICATION TESTS")
print("="*70)

# ════════════════════════════════════════════════════════════════════════════════
# TEST 1: Public GET /complaints
# ════════════════════════════════════════════════════════════════════════════════
print("\n[TEST 1] GET /api/grievance/complaints (public)")
print("-" * 70)

try:
    r = requests.get(f"{GRIEVANCE_URL}/api/grievance/complaints")
    result = r.json()
    
    print(f"✅ Status: {r.status_code}")
    print(f"   Total complaints: {result.get('total')}")
    print(f"   Returned: {len(result.get('complaints', []))}")
    print(f"   Page: {result.get('page')}/{result.get('pages')}")
    
    # Show first 2 items
    if result.get('complaints'):
        print(f"\n   First 2 complaints:")
        for i, complaint in enumerate(result['complaints'][:2], 1):
            print(f"\n   {i}. ID: {complaint['id'][:8]}...")
            print(f"      Platform: {complaint['platform']}")
            print(f"      Category: {complaint['category']}")
            print(f"      Title: {complaint['title'][:50]}")
            print(f"      Status: {complaint['status']}")
            print(f"      Upvotes: {complaint['upvote_count']}")
            print(f"      Tags: {complaint.get('tags', [])}")
    
except Exception as e:
    print(f"❌ Error: {e}")

# ════════════════════════════════════════════════════════════════════════════════
# TEST 2: GET /stats
# ════════════════════════════════════════════════════════════════════════════════
print("\n[TEST 2] GET /api/grievance/stats (public)")
print("-" * 70)

try:
    r = requests.get(f"{GRIEVANCE_URL}/api/grievance/stats")
    stats = r.json()
    
    print(f"✅ Status: {r.status_code}")
    print(f"   Total: {stats['total']} | Open: {stats['open']} | Escalated: {stats['escalated']} | Resolved: {stats['resolved']}")
    
    if stats.get('by_platform'):
        print(f"\n   By Platform:")
        for p in stats['by_platform'][:3]:
            print(f"   - {p['platform']}: {p['count']} complaints (avg {p['avg_upvotes']} upvotes)")
    
    if stats.get('by_category'):
        print(f"\n   By Category:")
        for c in stats['by_category'][:3]:
            print(f"   - {c['category']}: {c['count']} complaints")
    
    if stats.get('top_this_week'):
        print(f"\n   Top this week:")
        for t in stats['top_this_week'][:2]:
            print(f"   - {t['title'][:45]} ({t['upvote_count']} upvotes)")
    
except Exception as e:
    print(f"❌ Error: {e}")

# ════════════════════════════════════════════════════════════════════════════════
# TEST 3: Login as worker and post anonymous complaint
# ════════════════════════════════════════════════════════════════════════════════
print("\n[TEST 3] POST ./api/grievance/complaints (anonymous)")
print("-" * 70)

worker_token = None
try:
    # Login as worker
    r = requests.post(
        f"{AUTH_URL}/api/auth/login",
        json={
            "email": "careem.dha.1@seed.com",
            "password": "password123"
        }
    )
    if r.status_code == 200:
        worker_token = r.json().get('access_token')
        print(f"✅ Worker logged in")
    else:
        print(f"❌ Login failed: {r.status_code}")
        worker_token = None
except Exception as e:
    print(f"❌ Login error: {e}")

if worker_token:
    try:
        # Post anonymous complaint
        r = requests.post(
            f"{GRIEVANCE_URL}/api/grievance/complaints",
            headers={"Authorization": f"Bearer {worker_token}"},
            json={
                "platform": "Careem",
                "category": "commission_change",
                "title": "Commission jumped to 35% this week",
                "description": "No notice given. Lost PKR 3000 this week alone.",
                "city_zone": "DHA",
                "anonymous": True
            }
        )
        
        if r.status_code == 201:
            complaint = r.json()
            print(f"✅ Status: {r.status_code}")
            print(f"   ID: {complaint['id'][:8]}...")
            print(f"   Platform: {complaint['platform']}")
            print(f"   Category: {complaint['category']}")
            print(f"   Title: {complaint['title']}")
            print(f"   Poster ID: {complaint.get('poster_id')} (should be None for anonymous)")
            print(f"   Status: {complaint['status']}")
            print(f"   Tags: {complaint.get('tags', [])}")
            
            # Show similar complaints
            similar = complaint.get('similar_complaints', [])
            print(f"\n   Similar complaints found: {len(similar)}")
            for s in similar[:2]:
                print(f"   - {s['title'][:50]}")
            
            complaint_id = complaint['id']
        else:
            print(f"❌ Failed to post complaint: {r.status_code}")
            print(f"   {r.text}")
            complaint_id = None
    
    except Exception as e:
        print(f"❌ Error posting complaint: {e}")
        complaint_id = None

# ════════════════════════════════════════════════════════════════════════════════
# TEST 4: Test upvote (twice for idempotency)
# ════════════════════════════════════════════════════════════════════════════════
if complaint_id and worker_token:
    print("\n[TEST 4] POST /upvote + idempotency check")
    print("-" * 70)
    
    try:
        # First upvote
        r1 = requests.post(
            f"{GRIEVANCE_URL}/api/grievance/complaints/{complaint_id}/upvote",
            headers={"Authorization": f"Bearer {worker_token}"}
        )
        
        if r1.status_code == 200:
            count1 = r1.json().get('upvote_count')
            print(f"✅ First upvote: {count1}")
            
            # Second upvote (idempotent test)
            r2 = requests.post(
                f"{GRIEVANCE_URL}/api/grievance/complaints/{complaint_id}/upvote",
                headers={"Authorization": f"Bearer {worker_token}"}
            )
            
            if r2.status_code == 200:
                count2 = r2.json().get('upvote_count')
                print(f"✅ Second upvote: {count2}")
                
                if count1 == count2:
                    print(f"✅ IDEMPOTENT: Count unchanged (both {count1})")
                else:
                    print(f"❌ NOT IDEMPOTENT: Count changed {count1} → {count2}")
            else:
                print(f"❌ Second upvote failed: {r2.status_code}")
        else:
            print(f"❌ First upvote failed: {r1.status_code}")
    
    except Exception as e:
        print(f"❌ Upvote test error: {e}")

# ════════════════════════════════════════════════════════════════════════════════
# TEST 5: Advocate actions (tag + escalate)
# ════════════════════════════════════════════════════════════════════════════════
if complaint_id:
    print("\n[TEST 5] Advocate actions (tag + escalate)")
    print("-" * 70)
    
    advocate_token = None
    try:
        # Login as advocate
        r = requests.post(
            f"{AUTH_URL}/api/auth/login",
            json={
                "email": "advocate1@fairgig.com",
                "password": "password123"
            }
        )
        if r.status_code == 200:
            advocate_token = r.json().get('access_token')
            print(f"✅ Advocate logged in")
        else:
            print(f"❌ Advocate login failed: {r.status_code}")
    except Exception as e:
        print(f"❌ Advocate login error: {e}")
    
    if advocate_token:
        # Add tag
        try:
            r = requests.post(
                f"{GRIEVANCE_URL}/api/grievance/complaints/{complaint_id}/tags",
                headers={"Authorization": f"Bearer {advocate_token}"},
                json={"tag": "commission_spike_april_2026"}
            )
            
            if r.status_code == 201:
                print(f"✅ Tag added: {r.json()['tag']}")
            else:
                print(f"❌ Tag failed: {r.status_code} - {r.text}")
        except Exception as e:
            print(f"❌ Tag error: {e}")
        
        # Escalate
        try:
            r = requests.patch(
                f"{GRIEVANCE_URL}/api/grievance/complaints/{complaint_id}/status",
                headers={"Authorization": f"Bearer {advocate_token}"},
                json={"status": "ESCALATED"}
            )
            
            if r.status_code == 200:
                escalated = r.json()
                print(f"✅ Escalated: status={escalated['status']}, escalated_by={escalated['escalated_by'][:8]}...")
                print(f"   Tag now shows: {escalated.get('tags', [])}")
            else:
                print(f"❌ Escalate failed: {r.status_code} - {r.text}")
        except Exception as e:
            print(f"❌ Escalate error: {e}")

# ════════════════════════════════════════════════════════════════════════════════
# TEST 6: Worker cannot escalate (403 test)
# ════════════════════════════════════════════════════════════════════════════════
if complaint_id and worker_token:
    print("\n[TEST 6] Worker cannot escalate (403 check)")
    print("-" * 70)
    
    try:
        r = requests.patch(
            f"{GRIEVANCE_URL}/api/grievance/complaints/{complaint_id}/status",
            headers={"Authorization": f"Bearer {worker_token}"},
            json={"status": "ESCALATED"}
        )
        
        if r.status_code == 403:
            print(f"✅ Correctly blocked: {r.status_code}")
            print(f"   {r.json()['error']}")
        else:
            print(f"❌ Should be 403, got: {r.status_code}")
    except Exception as e:
        print(f"❌ Error: {e}")

print("\n" + "="*70)
print("  VERIFICATION TESTS COMPLETE")
print("="*70)
