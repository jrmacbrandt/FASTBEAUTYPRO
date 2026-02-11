SELECT 
    event_object_table AS table_name, 
    trigger_name, 
    action_timing, 
    event_manipulation AS event, 
    action_statement AS definition 
FROM 
    information_schema.triggers 
WHERE 
    event_object_table IN ('orders', 'order_items', 'stock_transactions', 'products');
