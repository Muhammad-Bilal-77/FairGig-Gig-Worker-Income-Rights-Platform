-- 1. Get the worker ID for mb3454545@gmail.com
-- This assumes the user is already registered via the API.
DO $$
DECLARE
    vid UUID;
    today DATE := CURRENT_DATE;
    i INTEGER;
BEGIN
    SELECT id INTO vid FROM auth_schema.users WHERE email = 'mb3454545@gmail.com';
    
    IF vid IS NULL THEN
        RAISE NOTICE 'User mb3454545@gmail.com not found. Please register first.';
        RETURN;
    END IF;

    -- Manually Approve
    UPDATE auth_schema.users 
    SET is_verified = true, 
        email_verified = true, 
        verification_status = 'APPROVED' 
    WHERE id = vid;

    -- Clear existing shifts for this user to avoid duplication during testing
    DELETE FROM earnings_schema.shifts WHERE worker_id = vid;

    -- 2. BASELINE: Stable activity (Days -60 to -21)
    -- Log shifts every other day
    FOR i IN 21..60 LOOP
        IF i % 2 = 0 THEN
            INSERT INTO earnings_schema.shifts (
                worker_id, platform, city_zone, worker_category, 
                shift_date, hours_worked, gross_earned, platform_deduction, 
                net_received, verify_status, import_source
            ) VALUES (
                vid, 'foodpanda', 'Korangi', 'food_delivery', 
                today - i, 6.0, 5000.0, 750.0, 4250.0, 'CONFIRMED', 'manual'
            );
        END IF;
    END LOOP;

    -- 3. ANOMALY: Deduction Spike (Day -5)
    -- Baseline rate is 15%. This is 30% (+15pp spike).
    INSERT INTO earnings_schema.shifts (
        worker_id, platform, city_zone, worker_category, 
        shift_date, hours_worked, gross_earned, platform_deduction, 
        net_received, verify_status, import_source
    ) VALUES (
        vid, 'foodpanda', 'Korangi', 'food_delivery', 
        today - 5, 5.0, 4000.0, 1200.0, 2800.0, 'CONFIRMED', 'manual'
    );

    -- 4. ANOMALY: Hourly Rate Drop (Day -4)
    -- Baseline hourly is 4250/6 = 708/hr. This is 212/hr (< 60% drop).
    INSERT INTO earnings_schema.shifts (
        worker_id, platform, city_zone, worker_category, 
        shift_date, hours_worked, gross_earned, platform_deduction, 
        net_received, verify_status, import_source
    ) VALUES (
        vid, 'foodpanda', 'Korangi', 'food_delivery', 
        today - 4, 8.0, 2000.0, 300.0, 1700.0, 'CONFIRMED', 'manual'
    );

    -- 5. ANOMALY: Math Inconsistency (Day -3)
    -- Gross 1000, 15% rate should be 150. Deduction is 600 (PKR 450 error).
    INSERT INTO earnings_schema.shifts (
        worker_id, platform, city_zone, worker_category, 
        shift_date, hours_worked, gross_earned, platform_deduction, 
        net_received, verify_status, import_source
    ) VALUES (
        vid, 'foodpanda', 'Korangi', 'food_delivery', 
        today - 3, 4.0, 1000.0, 600.0, 400.0, 'CONFIRMED', 'manual'
    );

    -- 6. Monthly Income Drop and Long Gap are naturally triggered by this timeline.
    -- Previous month had 20 shifts. This month has only 3.

    RAISE NOTICE 'Seeding complete for worker %', vid;
END $$;
