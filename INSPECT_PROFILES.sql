
SELECT id, email, role, status, tenant_id, full_name, created_at 
FROM profiles 
WHERE email IN ('jrbrandt@hotmail.com', 'jrmacbrandt@yahoo.com');

SELECT * FROM tenants WHERE id IN (
    SELECT tenant_id FROM profiles WHERE email IN ('jrbrandt@hotmail.com', 'jrmacbrandt@yahoo.com')
);
