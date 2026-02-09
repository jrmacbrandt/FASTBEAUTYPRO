-- ================================================================
-- CORREÇÃO URGENTE: Atualizar Role para Master
-- Execute APENAS este comando no SQL Editor do Supabase
-- ================================================================

-- 1. Verificar o estado atual
SELECT id, email, role, full_name, tenant_id
FROM profiles 
WHERE email = 'jrmacbrandt@gmail.com';

-- 2. FORÇAR atualização do role para 'master'
UPDATE profiles 
SET 
    role = 'master'::user_role,  -- Força o tipo explícito
    tenant_id = NULL,
    updated_at = NOW()
WHERE email = 'jrmacbrandt@gmail.com'
RETURNING id, email, role, full_name;

-- 3. Verificar se funcionou
SELECT id, email, role, full_name, tenant_id
FROM profiles 
WHERE email = 'jrmacbrandt@gmail.com';

-- Se ainda não funcionar, tente este comando alternativo:
-- UPDATE profiles SET role = 'master' WHERE id = (SELECT id FROM profiles WHERE email = 'jrmacbrandt@gmail.com');
