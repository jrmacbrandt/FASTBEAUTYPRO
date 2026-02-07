-- ============================================
-- FASTBEAUTYPRO: SOLUÇÃO ALTERNATIVA
-- Como não temos acesso para ALTER na auth.users,
-- vamos verificar o que está acontecendo e corrigir de outra forma
-- ============================================

-- 1. VERIFICAR SE A TRIGGER EXISTE (só visualizar, não alterar)
SELECT 
    '1. STATUS DA TRIGGER' AS step,
    trg.tgname AS trigger_name,
    CASE trg.tgenabled
        WHEN 'O' THEN '⚠️ Origin (normal)'
        WHEN 'D' THEN '❌ DISABLED'
        WHEN 'R' THEN '⚠️ Replica'
        WHEN 'A' THEN '✅ ALWAYS'
    END AS status
FROM pg_trigger trg
WHERE trg.tgname = 'on_auth_user_created';

-- 2. VERIFICAR TENANTS EXISTENTES
SELECT 
    '2. TENANTS CADASTRADOS' AS step,
    id,
    name,
    slug,
    active
FROM public.tenants
ORDER BY created_at DESC
LIMIT 5;

-- 3. VERIFICAR SE HÁ USERS ÓRFÃOS (sem profile)
SELECT 
    '3. USUARIOS SEM PROFILE' AS step,
    au.id,
    au.email,
    au.created_at,
    au.raw_user_meta_data->>'role' as intended_role
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL
ORDER BY au.created_at DESC
LIMIT 5;

-- 4. VERIFICAR ENUMS (business_type pode ser o problema)
SELECT 
    '4. ENUMS DISPONIVEIS' AS step,
    t.typname AS enum_name,
    e.enumlabel AS value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname IN ('business_type', 'user_role', 'user_status')
ORDER BY t.typname, e.enumsortorder;
