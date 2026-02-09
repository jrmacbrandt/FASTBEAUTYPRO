-- ===========================================
-- SCRIPT DE LIMPEZA DE USUÁRIOS
-- PRESERVA APENAS: jrmacbrandt@gmail.com
-- ===========================================

-- 1. Primeiro, identificar usuários a serem excluídos
SELECT 
    u.id,
    u.email,
    p.full_name,
    p.role
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.email != 'jrmacbrandt@gmail.com';

-- 2. Excluir profiles dos usuários (exceto o admin master)
DELETE FROM public.profiles 
WHERE id IN (
    SELECT id FROM auth.users 
    WHERE email != 'jrmacbrandt@gmail.com'
);

-- 3. Excluir tenants órfãos (que não pertencem ao admin master)
-- Primeiro, obtemos o tenant_id do admin master
DELETE FROM public.tenants 
WHERE id NOT IN (
    SELECT DISTINCT tenant_id 
    FROM public.profiles 
    WHERE tenant_id IS NOT NULL
);

-- 4. Por último, excluir os usuários do auth.users
DELETE FROM auth.users 
WHERE email != 'jrmacbrandt@gmail.com';

-- 5. Verificar resultado
SELECT 'USUÁRIOS RESTANTES:' as status;
SELECT u.email, p.full_name, p.role 
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id;

SELECT 'TENANTS RESTANTES:' as status;
SELECT id, name, slug FROM public.tenants;
