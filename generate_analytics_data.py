#!/usr/bin/env python3
"""
Generate realistic seed data for analytics visualization
Creates 100 worker accounts with 2 shifts each across 8 weeks
"""

import asyncpg
import asyncio
from datetime import datetime, timedelta
from uuid import uuid4
import random
import sys
import time

DB_URL = "postgresql://fairgig_admin:fairgig_admin_secret_2026@localhost:5433/fairgig"

# Configuration
PLATFORMS = ["Careem", "Foodpanda", "Bykea", "InDrive"]
CITIES = {
    "Lahore": ["DHA", "Gulberg", "Johar Town", "Mall Road"],
    "Karachi": ["DHA", "Clifton", "Gulshan-e-Iqbal", "Defence"],
    "Islamabad": ["F-7", "F-8", "G-7", "G-8"],
}
WORKER_CATEGORIES = ["ride_hailing", "delivery", "freelance"]

# Realistic earnings ranges (PKR per hour)
EARNINGS_RANGES = {
    "Careem": {"hours": (6, 10), "gross_per_hour": (800, 1500), "deduction_rate": (0.28, 0.32)},
    "Foodpanda": {"hours": (5, 8), "gross_per_hour": (600, 1000), "deduction_rate": (0.25, 0.30)},
    "Bykea": {"hours": (5, 9), "gross_per_hour": (500, 900), "deduction_rate": (0.22, 0.28)},
    "InDrive": {"hours": (4, 8), "gross_per_hour": (400, 800), "deduction_rate": (0.20, 0.25)},
}

async def generate_data():
    """Generate and insert analytics data"""
    
    conn = await asyncpg.connect(DB_URL)
    
    try:
        # Use bcrypt hash for 'password123'
        default_pass = "$2a$12$jPVSLeok2cZrAEJMbfOxnuf4pK1ZmNzIist9YYLsYTpbUqGESc8Cu"
        
        print("=" * 70)
        print("  GENERATING ANALYTICS SEED DATA")
        print("=" * 70)
        print(f"\n📊 Plan: 100 workers × 2 shifts = 200 shifts")
        print("   Platforms: Careem, Foodpanda, Bykea, InDrive")
        print("   Date range: Last 8 weeks")
        print("   Locations: Lahore, Karachi, Islamabad")
        
        # Get today's date
        today = datetime.now().date()
        eight_weeks_ago = today - timedelta(weeks=8)
        
        workers_created = 0
        shifts_created = 0
        
        print(f"\n1️⃣  Creating 100 worker accounts...")
        
        # Create workers
        timestamp = int(time.time())
        for i in range(1, 101):
            worker_id = uuid4()
            email = f"worker.{timestamp}.{i}@seed.com"
            city_name = random.choice(list(CITIES.keys()))
            city_zone = random.choice(CITIES[city_name])
            worker_category = random.choice(WORKER_CATEGORIES)
            phone = f"0300{i:07d}"
            
            await conn.execute(
                """
                INSERT INTO auth_schema.users 
                (id, email, password_hash, full_name, phone, role, city, city_zone, worker_category)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                """,
                worker_id, email, default_pass,
                f"Analytics Worker {i}", phone, "worker",
                city_name, city_zone, worker_category
            )
            workers_created += 1
            
            if i % 25 == 0:
                print(f"   ✓ Created {i} workers...")
            
            # Create 2 shifts for this worker
            for shift_num in range(2):
                # Randomize shift date within 8 weeks
                days_back = random.randint(0, 55)
                shift_date = today - timedelta(days=days_back)
                
                # Pick random platform
                platform = random.choice(PLATFORMS)
                earnings_config = EARNINGS_RANGES[platform]
                
                # Generate realistic hours and earnings
                hours_worked = round(random.uniform(
                    earnings_config["hours"][0],
                    earnings_config["hours"][1]
                ), 1)
                
                gross_per_hour = random.uniform(
                    earnings_config["gross_per_hour"][0],
                    earnings_config["gross_per_hour"][1]
                )
                gross_earned = round(hours_worked * gross_per_hour, 2)
                
                deduction_rate = random.uniform(
                    earnings_config["deduction_rate"][0],
                    earnings_config["deduction_rate"][1]
                )
                platform_deduction = round(gross_earned * deduction_rate, 2)
                net_received = round(gross_earned - platform_deduction, 2)
                
                # Verify status randomly (use valid enum values)
                verify_status = random.choice(["CONFIRMED", "PENDING", "FLAGGED"])
                
                await conn.execute(
                    """
                    INSERT INTO earnings_schema.shifts
                    (worker_id, platform, city_zone, worker_category,
                     shift_date, hours_worked, gross_earned,
                     platform_deduction, net_received, verify_status)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    """,
                    worker_id, platform, city_zone, worker_category,
                    shift_date, hours_worked, gross_earned,
                    platform_deduction, net_received, verify_status
                )
                shifts_created += 1
        
        print(f"\n2️⃣  Creating shifts for all workers...")
        print(f"   ✓ Created {shifts_created} shifts")
        
        # Verify data was inserted
        worker_count = await conn.fetchval(
            "SELECT COUNT(*) FROM auth_schema.users WHERE role = 'worker'"
        )
        shift_count = await conn.fetchval(
            "SELECT COUNT(*) FROM earnings_schema.shifts"
        )
        
        print(f"\n3️⃣  Verification:")
        print(f"   ✓ Total workers in DB: {worker_count}")
        print(f"   ✓ Total shifts in DB: {shift_count}")
        
        # Show statistics
        stats = await conn.fetchrow("""
            SELECT
              COUNT(DISTINCT worker_id) as unique_workers,
              COUNT(*) as total_shifts,
              ROUND(AVG(hours_worked)::numeric, 2) as avg_hours,
              ROUND(AVG(gross_earned)::numeric, 2) as avg_gross,
              ROUND(AVG(net_received)::numeric, 2) as avg_net,
              MIN(shift_date) as oldest_shift,
              MAX(shift_date) as newest_shift
            FROM earnings_schema.shifts
        """)
        
        print(f"\n4️⃣  Analytics Summary:")
        print(f"   • Unique workers: {stats['unique_workers']}")
        print(f"   • Total shifts: {stats['total_shifts']}")
        print(f"   • Avg hours/shift: {stats['avg_hours']}")
        print(f"   • Avg gross earnings: PKR {stats['avg_gross']}")
        print(f"   • Avg net earnings: PKR {stats['avg_net']}")
        print(f"   • Date range: {stats['oldest_shift']} to {stats['newest_shift']}")
        
        # Show platform breakdown
        platform_stats = await conn.fetch("""
            SELECT
              platform,
              COUNT(*) as shift_count,
              COUNT(DISTINCT worker_id) as worker_count,
              ROUND(AVG(gross_earned)::numeric, 2) as avg_gross,
              ROUND(AVG(net_received)::numeric, 2) as avg_net
            FROM earnings_schema.shifts
            GROUP BY platform
            ORDER BY shift_count DESC
        """)
        
        print(f"\n5️⃣  Platform Breakdown:")
        for row in platform_stats:
            print(f"   {row['platform']:12} | {row['shift_count']:3} shifts | "
                  f"{row['worker_count']:3} workers | "
                  f"Gross: PKR {row['avg_gross']:.0f} | Net: PKR {row['avg_net']:.0f}")
        
        # Show city breakdown
        city_stats = await conn.fetch("""
            SELECT
              city_zone,
              COUNT(*) as shift_count,
              COUNT(DISTINCT worker_id) as worker_count,
              ROUND(AVG(net_received)::numeric, 2) as avg_net
            FROM earnings_schema.shifts
            GROUP BY city_zone
            ORDER BY shift_count DESC
        """)
        
        print(f"\n6️⃣  Location Breakdown:")
        for row in city_stats:
            print(f"   {row['city_zone']:15} | {row['shift_count']:3} shifts | "
                  f"{row['worker_count']:3} workers | Avg net: PKR {row['avg_net']:.0f}")
        
        print("\n" + "=" * 70)
        print("✅ Analytics data generated successfully!")
        print("=" * 70)
        print("\n📱 Next steps:")
        print("   1. Open http://localhost:8080/app/worker/analytics")
        print("   2. Log in with: worker@test.com / Test123!")
        print("   3. Try different date ranges (4w, 8w, 6m)")
        print("   4. Try different platform filters")
        print("   5. Check the charts - they should now show data!")
        print("\n")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(generate_data())
