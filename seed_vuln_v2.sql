DO $$
DECLARE
    worker_id UUID;
    mar_date DATE;
    apr_date DATE;
    worker_ids UUID[] := ARRAY[
        '1c7b74d8-a951-4773-880a-5531fb26112c'::UUID,
        'fc77b97d-c09c-4a27-9672-c0f36bdde238'::UUID,
        'd6e3a42a-9ba6-4a31-8a53-b9a617ad378d'::UUID
    ];
    -- March 2026 (Healthy)
    mar_dates DATE[] := ARRAY['2026-03-02', '2026-03-09', '2026-03-16', '2026-03-23', '2026-03-30']::DATE[];
    -- April 2026 (Crisis)
    apr_dates DATE[] := ARRAY['2026-04-02', '2026-04-06', '2026-04-08', '2026-04-12', '2026-04-15']::DATE[];
BEGIN
    -- Cleanup previous test data
    DELETE FROM earnings_schema.shifts WHERE worker_id ANY (worker_ids);

    FOREACH worker_id IN ARRAY worker_ids LOOP
        -- Align worker
        UPDATE auth_schema.users 
        SET city_zone = 'Johar Town', worker_category = 'delivery' 
        WHERE id = worker_id;

        -- Healthy shifts (Mar)
        FOREACH mar_date IN ARRAY mar_dates LOOP
            INSERT INTO earnings_schema.shifts (
                worker_id, platform, city_zone, worker_category, shift_date, 
                hours_worked, gross_earned, platform_deduction, net_received,
                verify_status, import_source
            ) VALUES (
                worker_id, 'Careem', 'Johar Town', 'delivery', mar_date,
                8, 4000, 1000, 3000,
                'CONFIRMED', 'manual'
            );
        END LOOP;

        -- Crisis shifts (Apr)
        FOREACH apr_date IN ARRAY apr_dates LOOP
            INSERT INTO earnings_schema.shifts (
                worker_id, platform, city_zone, worker_category, shift_date, 
                hours_worked, gross_earned, platform_deduction, net_received,
                verify_status, import_source
            ) VALUES (
                worker_id, 'Careem', 'Johar Town', 'delivery', apr_date,
                8, 2710, 685, 2025,
                'CONFIRMED', 'manual'
            );
        END LOOP;
    END LOOP;
    
    -- Refresh views
    PERFORM analytics_schema.refresh_all_views();
END $$;
