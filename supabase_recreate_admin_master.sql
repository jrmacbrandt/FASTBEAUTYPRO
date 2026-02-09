-- ============================================
-- DELETAR E RECRIAR ADMIN MASTER
-- Email: jrmacbrandt@gmail.com
-- Senha: Ze001300$
-- EXECUTE NO SUPABASE SQL EDITOR
-- ============================================

-- 1. VERIFICAR ESTADO ATUAL
SELECT 'ESTADO ATUAL DO USUARIO' as step;
SELECT 
    u.id,
    u.email,
    u.created_at,
    p.full_name,
    p.role::text,
    p.status::text
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email = 'jrmacbrandt@gmail.com';

-- 2. DELETAR PROFILE EXISTENTE (se existir)
DELETE FROM public.profiles
WHERE id = (SELECT id FROM auth.users WHERE email = 'jrmacbrandt@gmail.com');

-- 3. DELETAR USUÁRIO DO AUTH (isso também deleta o profile por cascade)
DELETE FROM auth.users
WHERE email = 'jrmacbrandt@gmail.com';

-- 4. VERIFICAR SE FOI DELETADO
SELECT 'VERIFICANDO DELECAO' as step;
SELECT COUNT(*) as usuarios_encontrados 
FROM auth.users 
WHERE email = 'jrmacbrandt@gmail.com';

-- 5. CRIAR NOVO USUÁRIO ADMIN MASTER
-- ATENÇÃO: Execute este código no Supabase Dashboard > Authentication > Users > Add user
-- OU use a função auth.admin_create_user (se disponível)

-- Como alternativa, você precisará:
-- 1. Ir para: Authentication > Users > Add User
-- 2. Email: jrmacbrandt@gmail.com
-- 3. Password: Ze001300$
-- 4. Email Confirm: ON (marcar como confirmado)
-- 5. Clicar em "Create User"
-- 6. Anotar o UUID do usuário criado

-- 6. APÓS CRIAR O USUÁRIO NO DASHBOARD, EXECUTE ESTE SCRIPT:
-- Substitua 'SEU_USER_ID_AQUI' pelo UUID do usuário que você criou

-- CRIAR PROFILE COM ROLE MASTER
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

-- 7. VERIFICAR CRIAÇÃO FINAL
SELECT 'VERIFICACAO FINAL' as step;
SELECT 
    u.id,
    u.email,
    u.email_confirmed_at,
    p.full_name,
    p.role::text as role,
    p.status::text as status,
    p.tenant_id
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
WHERE u.email = 'jrmacbrandt@gmail.com';

-- RESULTADO ESPERADO:
-- role: master
-- status: active
-- email_confirmed_at: NÃO NULO

-- APÓS EXECUTAR ESTE SCRIPT:
-- Tente fazer login em: https://fastbeautypro.vercel.app/login-master
-- Email: jrmacbrandt@gmail.com
-- Senha: Ze001300$
-- Deve redirecionar para: /admin-master
