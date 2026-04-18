#!/usr/bin/env python3
"""Direct test of median API with complete logging"""

import asyncpg
import asyncio
import json
from decimal import Decimal

DB_URL = "postgresql://fairgig_admin:fairgig_admin_secret_2026@localhost:5433/fairgig"

async def test():
    conn = await asyncpg.connect(DB_URL)
    
    try:
        print("=" * 70)
        print("  CHECKING MEDIAN DATA DIRECTLY FROM DATABASE")
        print("=" * 70)
        
        # Check what's in the materialized view
        rows = await conn.fetch("""
            SELECT city_zone, platform, worker_category, median_hourly_rate, worker_count
            FROM analytics_schema.city_median_by_zone
            ORDER BY city_zone
        """)
        
        print(f"\n✅ Found {len(rows)} median entries in view")
        print("\nData:")
        for row in rows:
            print(f"  City: {row['city_zone']:15} | Platform: {row['platform']:12} | Median: {row['median_hourly_rate']:8.2f} Rs/hr | Workers: {row['worker_count']}")
        
        # Check what the active user has
        print("\n" + "=" * 70)
        print("  CHECKING USER PROFILE")
        print("=" * 70)
        
        user = await conn.fetchrow("""
            SELECT id, email, city_zone, worker_category FROM auth_schema.users WHERE email = 'worker@test.com'
        """)
        
        if user:
            print(f"\n✅ User found:")
            print(f"   Email: {user['email']}")
            print(f"   City zone: {user['city_zone']}")
            print(f"   Category: {user['worker_category']}")
            
            # Check user's shifts
            shifts = await conn.fetch("""
                SELECT COUNT(*) as count, city_zone, 
                       ROUND(AVG(net_received / hours_worked)::numeric, 2) as avg_hourly
                FROM earnings_schema.shifts 
                WHERE worker_id = $1
                GROUP BY city_zone
            """, user['id'])
            
            print(f"\n   Shifts by city zone:")
            for shift_row in shifts:
                print(f"     {shift_row['city_zone']:15} | {shift_row['count']:3} shifts | Avg: {shift_row['avg_hourly']} Rs/hr")
        else:
            print("❌ User not found")
        
        # Check what medians exist for DHA
        print("\n" + "=" * 70)
        print("  MEDIANS AVAILABLE FOR DHA")
        print("=" * 70)
        dha_medians = await conn.fetch("""
            SELECT platform, worker_category, median_hourly_rate, worker_count
            FROM analytics_schema.city_median_by_zone
            WHERE city_zone = 'DHA'
        """)
        
        if dha_medians:
            print(f"\n✅ Found {len(dha_medians)} medians for DHA:")
            total = 0
            for m in dha_medians:
                print(f"   {m['platform']:12} | {m['median_hourly_rate']:8.2f} Rs/hr | {m['worker_count']:3} workers")
                total += float(m['median_hourly_rate'])
            
            avg_median = total / len(dha_medians)
            print(f"\n   Average median for DHA: {avg_median:.2f} Rs/hr")
        else:
            print("❌ No medians found for DHA")
        
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(test())
