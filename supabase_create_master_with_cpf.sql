-- ============================================
-- CRIAR PROFILE ADMIN MASTER - COM CPF
-- ============================================

-- ETAPA 1: VERIFICAR SE USUÁRIO FOI CRIADO
SELECT 'VERIFICANDO USUARIO' as step;
SELECT id, email, email_confirmed_at 
FROM auth.users 
WHERE email = 'jrmacbrandt@gmail.com';

-- ETAPA 2: CRIAR PROFILE COM TODOS OS CAMPOS OBRIGATÓRIOS
INSERT INTO public.profiles (
    id,
    email,
    full_name,
    cpf,
    role,
    status,
    tenant_id
) VALUES (
    (SELECT id FROM auth.users WHERE email = 'jrmacbrandt@gmail.com'),
    'jrmacbrandt@gmail.com',
    'J. Roberto',
    '00000000000',
    'master'::user_role,
    'active'::user_status,
    NULL
);

-- ETAPA 3: VERIFICAR RESULTADO FINAL
SELECT 'RESULTADO FINAL' as step;
SELECT 
    u.id,
    u.email,
    u.email_confirmed_at,
    p.full_name,
    p.cpf,
    p.role::text as role,
    p.status::text as status
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
WHERE u.email = 'jrmacbrandt@gmail.com';

-- RESULTADO ESPERADO:
-- email_confirmed_at: data presente
-- cpf: 00000000000
-- role: master
-- status: active
