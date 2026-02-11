
DO $$
DECLARE
    v_tenant_id UUID := '00000000-0000-0000-0000-000000000000'; -- Replace with valid tenant_id if needed, or rely on Mock
    v_client_phone TEXT := '5511999999999';
    v_order_id UUID;
    v_appt_id UUID;
    v_stamps INT;
    v_vouchers INT;
BEGIN
    RAISE NOTICE '🚀 Starting Loyalty Verification...';

    -- 0. Ensure Client Exists
    INSERT INTO clients (tenant_id, name, phone)
    VALUES (v_tenant_id, 'Test Loyalty', v_client_phone)
    ON CONFLICT DO NOTHING;

    -- 1. Create Appointment (Linked to Client)
    INSERT INTO appointments (tenant_id, client_id, status, appointment_time, customer_name)
    SELECT v_tenant_id, id, 'pending_payment', now(), 'Test Loyalty'
    FROM clients WHERE phone = v_client_phone
    RETURNING id INTO v_appt_id;

    -- 2. Create Order
    INSERT INTO orders (tenant_id, appointment_id, total_value, status)
    VALUES (v_tenant_id, v_appt_id, 50.00, 'awaiting_payment')
    RETURNING id INTO v_order_id;

    -- 3. Complete Order (Should trigger stamp +1)
    UPDATE orders SET status = 'completed' WHERE id = v_order_id;

    -- 4. Verify Stamps
    SELECT stamps_count INTO v_stamps FROM client_loyalty 
    WHERE client_phone = v_client_phone AND tenant_id = v_tenant_id;

    RAISE NOTICE '✅ Stamps Count: %', v_stamps;

    -- 5. Cheat: Set start to target-1 and trigger again
    UPDATE client_loyalty SET stamps_count = 4 WHERE client_phone = v_client_phone;
    
    -- New Order to trigger 5th stamp
    INSERT INTO appointments (tenant_id, client_id, status, appointment_time, customer_name)
    SELECT v_tenant_id, id, 'pending_payment', now(), 'Test Loyalty 2'
    FROM clients WHERE phone = v_client_phone
    RETURNING id INTO v_appt_id;

    INSERT INTO orders (tenant_id, appointment_id, total_value, status)
    VALUES (v_tenant_id, v_appt_id, 50.00, 'awaiting_payment')
    RETURNING id INTO v_order_id;

    UPDATE orders SET status = 'completed' WHERE id = v_order_id;

    -- 6. Verify Voucher
    SELECT count(*) INTO v_vouchers FROM loyalty_vouchers 
    WHERE client_phone = v_client_phone AND status = 'active';

    IF v_vouchers > 0 THEN
        RAISE NOTICE '🎉 SUCCESSS: Voucher Generated!';
    ELSE
        RAISE NOTICE '❌ FAILURE: No Voucher found.';
    END IF;

    -- Cleanup
    -- DELETE FROM orders WHERE id = v_order_id; ...
END $$;
