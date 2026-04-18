#!/usr/bin/env python3
"""Add shifts for the current logged-in user to test analytics"""

import asyncpg
import asyncio
from datetime import datetime, timedelta
from uuid import uuid4
import random

DB_URL = "postgresql://fairgig_admin:fairgig_admin_secret_2026@localhost:5433/fairgig"

async def add_user_shifts():
    conn = await asyncpg.connect(DB_URL)
    
    try:
        # Get worker@test.com user ID
        user = await conn.fetchrow(
            "SELECT id, city_zone FROM auth_schema.users WHERE email = 'worker@test.com'"
        )
        
        if not user:
            print("❌ worker@test.com not found")
            return
        
        user_id = user['id']
        city_zone = user['city_zone'] or 'DHA'
        
        print(f"✓ Found user: {user_id}")
        print(f"✓ City zone: {city_zone}")
        
        # Add 10 shifts for this user across different platforms and dates
        today = datetime.now().date()
        platforms = ['Careem', 'Foodpanda', 'Bykea', 'InDrive']
        
        for i in range(10):
            shift_date = today - timedelta(days=random.randint(1, 40))
            platform = platforms[i % len(platforms)]
            hours = round(random.uniform(5, 10), 1)
            
            if platform == 'Careem':
                gross = round(hours * random.uniform(900, 1200), 2)
                deduction_rate = 0.30
            elif platform == 'Foodpanda':
                gross = round(hours * random.uniform(700, 900), 2)
                deduction_rate = 0.27
            elif platform == 'Bykea':
                gross = round(hours * random.uniform(600, 800), 2)
                deduction_rate = 0.25
            else:  # InDrive
                gross = round(hours * random.uniform(500, 700), 2)
                deduction_rate = 0.22
            
            deduction = round(gross * deduction_rate, 2)
            net = round(gross - deduction, 2)
            
            await conn.execute(
                """
                INSERT INTO earnings_schema.shifts
                (worker_id, platform, city_zone, worker_category,
                 shift_date, hours_worked, gross_earned,
                 platform_deduction, net_received, verify_status)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                """,
                user_id, platform, city_zone, 'ride_hailing',
                shift_date, hours, gross, deduction, net, 'CONFIRMED'
            )
        
        print(f"✓ Added 10 shifts for worker@test.com")
        
        # Count shifts now
        count = await conn.fetchval(
            "SELECT COUNT(*) FROM earnings_schema.shifts WHERE worker_id = $1",
            user_id
        )
        print(f"✓ Total shifts for user: {count}")
        
        # Refresh the views
        print("✓ Refreshing materialized views...")
        await conn.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_schema.city_median_by_zone")
        print("✓ Refreshed city_median_by_zone")
        
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(add_user_shifts())
