DO $$
DECLARE
    worker_id UUID;
    feb_date DATE;
    mar_date DATE;
    worker_ids UUID[] := ARRAY[
        '1c7b74d8-a951-4773-880a-5531fb26112c'::UUID,
        'fc77b97d-c09c-4a27-9672-c0f36bdde238'::UUID,
        'd6e3a42a-9ba6-4a31-8a53-b9a617ad378d'::UUID
    ];
    feb_dates DATE[] := ARRAY['2026-02-02', '2026-02-09', '2026-02-16', '2026-02-23', '2026-02-28']::DATE[];
    mar_dates DATE[] := ARRAY['2026-03-02', '2026-03-09', '2026-03-16', '2026-03-23', '2026-03-30']::DATE[];
BEGIN
    FOREACH worker_id IN ARRAY worker_ids LOOP
        -- Align worker
        UPDATE auth_schema.users 
        SET city_zone = 'Johar Town', worker_category = 'delivery' 
        WHERE id = worker_id;

        -- Healthy shifts (Feb)
        FOREACH feb_date IN ARRAY feb_dates LOOP
            INSERT INTO earnings_schema.shifts (
                worker_id, platform, city_zone, worker_category, shift_date, 
                hours_worked, gross_earned, platform_deduction, net_received,
                verify_status, import_source
            ) VALUES (
                worker_id, 'Careem', 'Johar Town', 'delivery', feb_date,
                8, 4000, 1000, 3000,
                'CONFIRMED', 'manual'
            );
        END LOOP;

        -- Crisis shifts (Mar)
        FOREACH mar_date IN ARRAY mar_dates LOOP
            INSERT INTO earnings_schema.shifts (
                worker_id, platform, city_zone, worker_category, shift_date, 
                hours_worked, gross_earned, platform_deduction, net_received,
                verify_status, import_source
            ) VALUES (
                worker_id, 'Careem', 'Johar Town', 'delivery', mar_date,
                8, 2710, 685, 2025,
                'CONFIRMED', 'manual'
            );
        END LOOP;
    END LOOP;
    
    -- Refresh views
    PERFORM analytics_schema.refresh_all_views();
END $$;
