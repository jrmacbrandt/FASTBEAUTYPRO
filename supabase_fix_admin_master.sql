-- ===========================================
-- CORRIGIR ADMIN MASTER - FastBeautyPro
-- Email: jrmacbrandt@gmail.com
-- 
-- EXECUTE ESTE SCRIPT NO SUPABASE SQL EDITOR
-- ===========================================

-- 1. PRIMEIRO: Verificar roles disponíveis no enum
SELECT 'PASSO 1: ROLES DISPONIVEIS NO ENUM' as step;
SELECT enumlabel as role_type
FROM pg_enum 
WHERE enumtypid = 'public.user_role'::regtype;

-- 2. ADICIONAR 'master' AO ENUM (SE NÃO EXISTIR)
-- Isso será ignorado silenciosamente se já existir
DO $$ 
BEGIN
    ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'master';
EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'Value master already exists in enum user_role';
END $$;

-- 3. VERIFICAR USUÁRIO ATUAL
SELECT 'PASSO 3: DADOS DO USUARIO' as step;
SELECT 
    u.id,
    u.email,
    p.full_name,
    p.role::text as current_role,
    p.status::text as current_status
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email = 'jrmacbrandt@gmail.com';

-- 4. ATUALIZAR ROLE PARA 'master'
UPDATE public.profiles
SET 
    role = 'master'::user_role,
    status = 'active'::user_status
WHERE id = (
    SELECT id FROM auth.users WHERE email = 'jrmacbrandt@gmail.com'
);

-- 5. VERIFICAR RESULTADO FINAL
SELECT 'PASSO 5: RESULTADO APOS CORRECAO' as step;
SELECT 
    u.email,
    p.full_name,
    p.role::text as role,
    p.status::text as status
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
WHERE u.email = 'jrmacbrandt@gmail.com';

-- 6. AGORA O LOGIN DEVE FUNCIONAR:
-- Email: jrmacbrandt@gmail.com
-- Senha: Ze001300$
-- Acesso: /login-master -> redireciona para /admin-master
