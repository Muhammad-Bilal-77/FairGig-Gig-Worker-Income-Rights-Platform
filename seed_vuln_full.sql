DO $$
DECLARE
    v_worker_id UUID;
    v_mar_date DATE;
    v_apr_date DATE;
    
    -- Cohort 1: Johar Town / Delivery (Already done, but we'll refresh)
    v_c1_ids UUID[] := ARRAY[
        '1c7b74d8-a951-4773-880a-5531fb26112c'::UUID,
        'fc77b97d-c09c-4a27-9672-c0f36bdde238'::UUID,
        'd6e3a42a-9ba6-4a31-8a53-b9a617ad378d'::UUID,
        'b0e8a440-1bb1-4b6d-9b72-717aaa3ec2c8'::UUID,
        '0181de80-dc3d-4df2-b949-64c273d55c9f'::UUID
    ];
    
    -- Cohort 2: DHA / Ride Hailing (CRITICAL 55% drop)
    v_c2_ids UUID[] := ARRAY[
        '93af53c5-1758-4125-914e-b33ccdbfe48a'::UUID,
        '506aaf11-1bf2-484b-bac3-a65eb0915ab6'::UUID,
        '39530f38-bf34-4346-bf19-2eca4ef17eb2'::UUID,
        '6ea921b6-d93a-4f7a-95d0-810befe4e60a'::UUID,
        'f258ddd5-2ade-4b83-aec8-37a3ed9d5c64'::UUID
    ];
    
    -- Cohort 3: Gulberg / Freelance (MEDIUM 25% drop)
    v_c3_ids UUID[] := ARRAY[
        'ccca82ed-611a-47ce-a697-133c2eea2e24'::UUID,
        '13311b24-efa1-499f-b290-ba7381ceea1f'::UUID,
        '41573f38-365d-4255-92bd-ba2ac6af526c'::UUID,
        '6ee60508-e9f0-478a-97ec-3434d6505cb8'::UUID,
        'a109b1a1-4068-4fda-aadd-c873955032fd'::UUID
    ];
    
    -- Cohort 4: Saddar / Delivery (HIGH 45% drop)
    v_c4_ids UUID[] := ARRAY[
        '95f4494b-e159-430e-8b7e-e0ab11c40c75'::UUID,
        'c45c3f33-5a7d-4422-9762-479b6680e952'::UUID,
        'ed61ccd6-eb1a-4e9c-ad3b-7df324b464d7'::UUID,
        'e9ba98a0-b1dc-4d05-a867-b477fc79a9c5'::UUID,
        'defb0cf9-a680-4f2e-b6ce-83e6907994c9'::UUID
    ];

    v_mar_dates DATE[] := ARRAY['2026-03-02', '2026-03-09', '2026-03-16', '2026-03-23', '2026-03-30']::DATE[];
    v_apr_dates DATE[] := ARRAY['2026-04-02', '2026-04-06', '2026-04-08', '2026-04-12', '2026-04-15']::DATE[];
    
BEGIN
    -- Cleanup all test workers
    DELETE FROM earnings_schema.shifts WHERE worker_id = ANY (v_c1_ids || v_c2_ids || v_c3_ids || v_c4_ids);

    -- Seed Cohort 1: Johar Town (32.5% Drop)
    FOREACH v_worker_id IN ARRAY v_c1_ids LOOP
        UPDATE auth_schema.users SET city_zone = 'Johar Town', worker_category = 'delivery' WHERE id = v_worker_id;
        FOREACH v_mar_date IN ARRAY v_mar_dates LOOP
            INSERT INTO earnings_schema.shifts (worker_id, platform, city_zone, worker_category, shift_date, hours_worked, gross_earned, platform_deduction, net_received, verify_status)
            VALUES (v_worker_id, 'Careem', 'Johar Town', 'delivery', v_mar_date, 8, 4000, 1000, 3000, 'CONFIRMED');
        END LOOP;
        FOREACH v_apr_date IN ARRAY v_apr_dates LOOP
            INSERT INTO earnings_schema.shifts (worker_id, platform, city_zone, worker_category, shift_date, hours_worked, gross_earned, platform_deduction, net_received, verify_status)
            VALUES (v_worker_id, 'Careem', 'Johar Town', 'delivery', v_apr_date, 8, 2710, 685, 2025, 'CONFIRMED');
        END LOOP;
    END LOOP;

    -- Seed Cohort 2: DHA Ride Hailing (55% Drop)
    FOREACH v_worker_id IN ARRAY v_c2_ids LOOP
        UPDATE auth_schema.users SET city_zone = 'DHA', worker_category = 'ride_hailing' WHERE id = v_worker_id;
        FOREACH v_mar_date IN ARRAY v_mar_dates LOOP
            INSERT INTO earnings_schema.shifts (worker_id, platform, city_zone, worker_category, shift_date, hours_worked, gross_earned, platform_deduction, net_received, verify_status)
            VALUES (v_worker_id, 'Careem', 'DHA', 'ride_hailing', v_mar_date, 8, 5000, 1250, 3750, 'CONFIRMED');
        END LOOP;
        FOREACH v_apr_date IN ARRAY v_apr_dates LOOP
            INSERT INTO earnings_schema.shifts (worker_id, platform, city_zone, worker_category, shift_date, hours_worked, gross_earned, platform_deduction, net_received, verify_status)
            VALUES (v_worker_id, 'Careem', 'DHA', 'ride_hailing', v_apr_date, 8, 2250, 560, 1690, 'CONFIRMED');
        END LOOP;
    END LOOP;

    -- Seed Cohort 3: Gulberg Freelance (25% Drop)
    FOREACH v_worker_id IN ARRAY v_c3_ids LOOP
        UPDATE auth_schema.users SET city_zone = 'Gulberg', worker_category = 'freelance' WHERE id = v_worker_id;
        FOREACH v_mar_date IN ARRAY v_mar_dates LOOP
            INSERT INTO earnings_schema.shifts (worker_id, platform, city_zone, worker_category, shift_date, hours_worked, gross_earned, platform_deduction, net_received, verify_status)
            VALUES (v_worker_id, 'Upwork', 'Gulberg', 'freelance', v_mar_date, 8, 8000, 1600, 6400, 'CONFIRMED');
        END LOOP;
        FOREACH v_apr_date IN ARRAY v_apr_dates LOOP
            INSERT INTO earnings_schema.shifts (worker_id, platform, city_zone, worker_category, shift_date, hours_worked, gross_earned, platform_deduction, net_received, verify_status)
            VALUES (v_worker_id, 'Upwork', 'Gulberg', 'freelance', v_apr_date, 8, 6000, 1200, 4800, 'CONFIRMED');
        END LOOP;
    END LOOP;

    -- Seed Cohort 4: Saddar Delivery (45% Drop)
    FOREACH v_worker_id IN ARRAY v_c4_ids LOOP
        UPDATE auth_schema.users SET city_zone = 'Saddar', worker_category = 'delivery' WHERE id = v_worker_id;
        FOREACH v_mar_date IN ARRAY v_mar_dates LOOP
            INSERT INTO earnings_schema.shifts (worker_id, platform, city_zone, worker_category, shift_date, hours_worked, gross_earned, platform_deduction, net_received, verify_status)
            VALUES (v_worker_id, 'Foodpanda', 'Saddar', 'delivery', v_mar_date, 8, 3000, 600, 2400, 'CONFIRMED');
        END LOOP;
        FOREACH v_apr_date IN ARRAY v_apr_dates LOOP
            INSERT INTO earnings_schema.shifts (worker_id, platform, city_zone, worker_category, shift_date, hours_worked, gross_earned, platform_deduction, net_received, verify_status)
            VALUES (v_worker_id, 'Foodpanda', 'Saddar', 'delivery', v_apr_date, 8, 1650, 330, 1320, 'CONFIRMED');
        END LOOP;
    END LOOP;
    
    PERFORM analytics_schema.refresh_all_views();
END $$;
