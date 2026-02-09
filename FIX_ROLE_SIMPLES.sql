-- ================================================================
-- CORREÇÃO SIMPLES: Atualizar Role para Master
-- Execute no SQL Editor do Supabase
-- ================================================================

-- 1. Ver estado atual
SELECT id, email, role, full_name, tenant_id
FROM profiles 
WHERE email = 'jrmacbrandt@gmail.com';

-- 2. Atualizar para master (SEM updated_at)
UPDATE profiles 
SET 
    role = 'master'::user_role,
    tenant_id = NULL
WHERE email = 'jrmacbrandt@gmail.com'
RETURNING id, email, role, full_name;

-- 3. Confirmar
SELECT id, email, role, full_name, tenant_id
FROM profiles 
WHERE email = 'jrmacbrandt@gmail.com';
