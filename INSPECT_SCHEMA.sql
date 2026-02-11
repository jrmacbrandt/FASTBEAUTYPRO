SELECT 
    table_name, 
    column_name, 
    data_type 
FROM 
    information_schema.columns 
WHERE 
    table_schema = 'public' 
    AND table_name IN ('appointments', 'orders', 'order_items', 'appointment_items', 'appointment_services', 'products');
