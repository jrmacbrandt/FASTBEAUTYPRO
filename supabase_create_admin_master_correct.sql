-- ============================================
-- CRIAR ADMIN MASTER - ORDEM CORRETA
-- Email: jrmacbrandt@gmail.com
-- Senha: Ze001300$
-- ============================================

-- ETAPA 1: CRIAR USUÁRIO NO DASHBOARD
-- ====================================
-- Vá para: Authentication > Users > Add User
-- Email: jrmacbrandt@gmail.com
-- Password: Ze001300$
-- Auto Confirm User: ✅ MARCAR
-- Clique: Create User

-- ETAPA 2: VERIFICAR SE O USUÁRIO FOI CRIADO
-- ===========================================
SELECT 'USUARIO CRIADO NO AUTH' as step;
SELECT 
    id,
    email,
    email_confirmed_at,
    created_at
FROM auth.users
WHERE email = 'jrmacbrandt@gmail.com';

-- ETAPA 3: CRIAR PROFILE MASTER
-- ==============================
INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    status,
    tenant_id
) VALUES (
    (SELECT id FROM auth.users WHERE email = 'jrmacbrandt@gmail.com'),
    'jrmacbrandt@gmail.com',
    'J. Roberto',
    'master'::user_role,
    'active'::user_status,
    NULL
);

-- ETAPA 4: VERIFICAR CONFIGURAÇÃO FINAL
-- ======================================
SELECT 'CONFIGURACAO FINAL' as step;
SELECT 
    u.id,
    u.email,
    u.email_confirmed_at,
    p.full_name,
    p.role::text as role,
    p.status::text as status
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
WHERE u.email = 'jrmacbrandt@gmail.com';

-- RESULTADO ESPERADO:
-- email_confirmed_at: deve ter uma data
-- role: master
-- status: active

-- AGORA PODE FAZER LOGIN EM:
-- https://fastbeautypro.vercel.app/login-master
