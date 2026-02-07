-- ============================================
-- FASTBEAUTYPRO: TESTE DIRETO DE INSERT
-- Este script testa os INSERTs diretamente para identificar o erro
-- Execute no SQL Editor do Supabase
-- ============================================

-- TESTE 1: Inserir um tenant diretamente
DO $$
DECLARE
    test_tenant_id uuid;
BEGIN
    test_tenant_id := uuid_generate_v4();
    
    INSERT INTO public.tenants (
        id,
        name,
        slug,
        business_type,
        active,
        has_paid
    ) VALUES (
        test_tenant_id,
        'Teste Loja',
        'teste-loja-' || substr(md5(random()::text), 1, 6),
        'barber',
        true,
        false
    );
    
    RAISE NOTICE 'TENANT CRIADO COM SUCESSO! ID: %', test_tenant_id;
    
    -- Limpar após teste
    DELETE FROM public.tenants WHERE id = test_tenant_id;
    RAISE NOTICE 'Teste de tenant: OK';
END $$;

-- TESTE 2: Testar o INSERT no profiles (com um UUID fake)
-- Nota: Este teste vai falhar se não houver um user real no auth.users
-- mas vai mostrar exatamente qual é o erro
DO $$
DECLARE
    test_user_id uuid := uuid_generate_v4();
    test_tenant_id uuid;
BEGIN
    -- Primeiro criar um tenant temporário
    test_tenant_id := uuid_generate_v4();
    
    INSERT INTO public.tenants (id, name, slug, business_type, active, has_paid) 
    VALUES (test_tenant_id, 'Temp Tenant', 'temp-tenant-' || substr(md5(random()::text), 1, 4), 'barber', true, false);
    
    -- Tentar inserir um profile
    INSERT INTO public.profiles (
        id,
        tenant_id,
        full_name,
        cpf,
        email,
        role,
        status,
        avatar_url
    ) VALUES (
        test_user_id,
        test_tenant_id,
        'Teste Usuario',
        '12345678900',
        'teste@test.com',
        'owner'::user_role,
        'active'::user_status,
        ''
    );
    
    RAISE NOTICE 'PROFILE CRIADO COM SUCESSO! ID: %', test_user_id;
    
    -- Limpar após teste
    DELETE FROM public.profiles WHERE id = test_user_id;
    DELETE FROM public.tenants WHERE id = test_tenant_id;
    RAISE NOTICE 'Teste de profile: OK';
    
EXCEPTION WHEN OTHERS THEN
    -- Limpar em caso de erro
    DELETE FROM public.profiles WHERE id = test_user_id;
    DELETE FROM public.tenants WHERE id = test_tenant_id;
    RAISE NOTICE 'ERRO NO PROFILE: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END $$;

-- MOSTRAR RESULTADO FINAL
SELECT 'Se você viu "Teste de profile: OK", a trigger deve funcionar!' AS info;
