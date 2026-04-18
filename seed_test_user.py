import requests
import json
import uuid
import psycopg2
from datetime import datetime, timedelta
import random

BASE_URL = "http://localhost:4001"
EARNINGS_API = "http://localhost:4002"
EMAIL = "mb3454545@gmail.com"
PASSWORD = "Password1234"
DB_URL = "postgresql://fairgig_admin:fairgig_admin_secret_2026@localhost:5433/fairgig"

def register_user():
    print(f"Registering user {EMAIL}...")
    try:
        resp = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": EMAIL,
            "password": PASSWORD,
            "full_name": "Test Anomaly Worker",
            "role": "worker",
            "city": "Karachi",
            "city_zone": "Korangi",
            "worker_category": "food_delivery"
        })
        if resp.status_code == 201:
            print("User registered successfully.")
            return resp.json()['user']['id']
        elif resp.status_code == 409:
            print("User already exists, fetching ID...")
            return get_user_id_from_db()
        else:
            print(f"Registration failed: {resp.text}")
            return None
    except Exception as e:
        print(f"Error: {e}")
        return None

def get_user_id_from_db():
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    cur.execute("SELECT id FROM auth_schema.users WHERE email = %s", (EMAIL,))
    row = cur.fetchone()
    conn.close()
    return row[0] if row else None

def approve_user_in_db(user_id):
    print(f"Approving user {user_id} in DB...")
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    cur.execute("""
        UPDATE auth_schema.users 
        SET is_verified = true, 
            email_verified = true, 
            verification_status = 'APPROVED' 
        WHERE id = %s
    """, (user_id,))
    conn.commit()
    conn.close()

def login():
    print("Logging in...")
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": EMAIL,
        "password": PASSWORD
    })
    return resp.json()['access_token']

def insert_shift_direct(user_id, date, platform, hours, gross, deduction, net, status='CONFIRMED'):
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO earnings_schema.shifts (
            worker_id, platform, city_zone, worker_category, 
            shift_date, hours_worked, gross_earned, platform_deduction, 
            net_received, verify_status, import_source
        ) VALUES (
            %s, %s, 'Korangi', 'food_delivery', 
            %s, %s, %s, %s, 
            %s, %s, 'manual'
        )
    """, (user_id, platform, date, hours, gross, deduction, net, status))
    conn.commit()
    conn.close()

def seed_data(user_id):
    print("Seeding shifts...")
    today = datetime.now()
    
    # 1. BASELINE: 30 shifts (Days -60 to -21)
    # Platforms: Foodpanda, Bykea
    # Normal stats: ~800/hr, 15% deduction
    for i in range(21, 61):
        if i % 2 == 0: # Mon/Wed/Fri worker
            d = (today - timedelta(days=i)).date()
            insert_shift_direct(
                user_id, d, 'foodpanda', 6, 5000, 750, 4250
            )

    # 2. LONG GAP: No shifts from -20 to -6
    print("Created a 15-day gap...")

    # 3. TRIGGER: Deduction Spike (Day -5)
    # Baseline was 15%. Trigger 30%.
    insert_shift_direct(
        user_id, (today - timedelta(days=5)).date(), 'foodpanda', 5, 4000, 1200, 2800
    )

    # 4. TRIGGER: Hourly Rate Anomaly (Day -4)
    # Baseline was ~700-800. Trigger 250.
    insert_shift_direct(
        user_id, (today - timedelta(days=4)).date(), 'foodpanda', 8, 2000, 300, 1700
    )

    # 5. TRIGGER: Math Error / Inconsistency (Day -3)
    # Gross 1000, 15% rate should be 150. We put 600.
    insert_shift_direct(
        user_id, (today - timedelta(days=3)).date(), 'foodpanda', 4, 1000, 600, 400
    )

    # 6. TRIGGER: Monthly Income Drop
    # Previous month (Days 30-60) had ~15 shifts * 4250 = ~63,000 net.
    # Current month (last 30 days) has only these 4 anomalous shifts = ~5,000 net.
    # Drop is > 90%, which is > 20%.
    print("Income drop triggered by low recent activity.")

def main():
    u_id = register_user()
    if u_id:
        approve_user_in_db(u_id)
        seed_data(u_id)
        print("\nSUCCESS! Test worker seeded.")
        print(f"Email: {EMAIL}")
        print(f"Password: {PASSWORD}")
    else:
        print("Failed to setup user.")

if __name__ == "__main__":
    main()
