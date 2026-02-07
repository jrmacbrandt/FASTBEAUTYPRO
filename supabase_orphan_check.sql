-- ============================================
-- VERIFICAR USUÁRIOS ÓRFÃOS E STATUS DA TRIGGER
-- ============================================

-- 1. USUÁRIOS SEM PROFILE (indica que trigger falhou)
SELECT 
    'USUARIOS_ORFAOS' AS check_type,
    au.id,
    au.email,
    au.created_at,
    au.raw_user_meta_data->>'role' as intended_role,
    au.raw_user_meta_data->>'full_name' as intended_name,
    au.raw_user_meta_data->>'shop_name' as intended_shop
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL
ORDER BY au.created_at DESC;

-- 2. TODOS OS PROFILES EXISTENTES
SELECT 
    'PROFILES_EXISTENTES' AS check_type,
    p.id,
    p.email,
    p.full_name,
    p.role,
    p.status,
    p.tenant_id,
    t.name as tenant_name
FROM public.profiles p
LEFT JOIN public.tenants t ON p.tenant_id = t.id
ORDER BY p.id;

-- 3. STATUS DA TRIGGER
SELECT 
    'TRIGGER_STATUS' AS check_type,
    trg.tgname AS trigger_name,
    CASE trg.tgenabled
        WHEN 'O' THEN 'Origin-Normal'
        WHEN 'D' THEN 'DISABLED'
        WHEN 'R' THEN 'Replica'
        WHEN 'A' THEN 'ALWAYS'
    END AS status
FROM pg_trigger trg
WHERE trg.tgname = 'on_auth_user_created';
