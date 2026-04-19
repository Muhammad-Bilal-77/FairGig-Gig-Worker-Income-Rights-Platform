DO $$
DECLARE
    v_worker_id UUID;
    v_mar_date DATE;
    v_apr_date DATE;
    v_worker_ids UUID[] := ARRAY[
        '1c7b74d8-a951-4773-880a-5531fb26112c'::UUID,
        'fc77b97d-c09c-4a27-9672-c0f36bdde238'::UUID,
        'd6e3a42a-9ba6-4a31-8a53-b9a617ad378d'::UUID,
        'b0e8a440-1bb1-4b6d-9b72-717aaa3ec2c8'::UUID,
        '0181de80-dc3d-4df2-b949-64c273d55c9f'::UUID
    ];
    -- March 2026 (Healthy)
    v_mar_dates DATE[] := ARRAY['2026-03-02', '2026-03-09', '2026-03-16', '2026-03-23', '2026-03-30']::DATE[];
    -- April 2026 (Crisis)
    v_apr_dates DATE[] := ARRAY['2026-04-02', '2026-04-06', '2026-04-08', '2026-04-12', '2026-04-15']::DATE[];
BEGIN
    -- Cleanup previous test data
    DELETE FROM earnings_schema.shifts WHERE worker_id = ANY (v_worker_ids);

    FOREACH v_worker_id IN ARRAY v_worker_ids LOOP
        -- Align worker
        UPDATE auth_schema.users 
        SET city_zone = 'Johar Town', worker_category = 'delivery' 
        WHERE id = v_worker_id;

        -- Healthy shifts (Mar)
        FOREACH v_mar_date IN ARRAY v_mar_dates LOOP
            INSERT INTO earnings_schema.shifts (
                worker_id, platform, city_zone, worker_category, shift_date, 
                hours_worked, gross_earned, platform_deduction, net_received,
                verify_status, import_source
            ) VALUES (
                v_worker_id, 'Careem', 'Johar Town', 'delivery', v_mar_date,
                8, 4000, 1000, 3000,
                'CONFIRMED', 'manual'
            );
        END LOOP;

        -- Crisis shifts (Apr)
        FOREACH v_apr_date IN ARRAY v_apr_dates LOOP
            INSERT INTO earnings_schema.shifts (
                worker_id, platform, city_zone, worker_category, shift_date, 
                hours_worked, gross_earned, platform_deduction, net_received,
                verify_status, import_source
            ) VALUES (
                v_worker_id, 'Careem', 'Johar Town', 'delivery', v_apr_date,
                8, 2710, 685, 2025,
                'CONFIRMED', 'manual'
            );
        END LOOP;
    END LOOP;
    
    -- Refresh views
    PERFORM analytics_schema.refresh_all_views();
END $$;
