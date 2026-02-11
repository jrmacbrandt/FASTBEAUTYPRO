
-- 1. Detalhes dos Perfis (Admin e Profissional)
SELECT 
    id as profile_id, 
    full_name, 
    email, 
    role, 
    status, 
    tenant_id, 
    created_at
FROM profiles
WHERE email IN ('jrbrandt@hotmail.com', 'jrmacbrandt@yahoo.com');

-- 2. Detalhes da Loja (Para conferir se o ID bate)
SELECT 
    id as tenant_id, 
    name, 
    slug 
FROM tenants 
WHERE id IN (
    SELECT tenant_id 
    FROM profiles 
    WHERE email IN ('jrbrandt@hotmail.com', 'jrmacbrandt@yahoo.com')
);
