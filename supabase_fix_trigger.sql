-- ============================================
-- FASTBEAUTYPRO: CORREÇÃO FINAL DA TRIGGER
-- ERRO ENCONTRADO: uuid_generate_v4() does not exist
-- SOLUÇÃO: Usar gen_random_uuid() que é nativo do PostgreSQL
-- Execute no SQL Editor do Supabase
-- ============================================

-- 1. Remover triggers e funções antigas
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 2. Criar a função handle_new_user CORRIGIDA
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    new_tenant_id uuid;
    v_role text;
    v_status text;
    v_shop_name text;
    v_shop_slug text;
BEGIN
    -- Extrair o role do metadata (deve ser: owner, barber, ou master)
    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'barber');
    
    IF v_role = 'owner' THEN
        v_status := 'active';
        
        -- Extrair nome da loja e gerar slug
        v_shop_name := COALESCE(NEW.raw_user_meta_data->>'shop_name', 'Minha Loja');
        v_shop_slug := lower(regexp_replace(v_shop_name, '[^a-zA-Z0-9]+', '-', 'g'));
        
        -- USAR gen_random_uuid() QUE É NATIVO DO POSTGRESQL
        new_tenant_id := gen_random_uuid();
        
        -- Criar o tenant para proprietários
        INSERT INTO public.tenants (
            id,
            name,
            slug,
            business_type,
            active,
            has_paid
        ) VALUES (
            new_tenant_id,
            v_shop_name,
            v_shop_slug,
            'barber',
            true,
            false
        );
    ELSE
        v_status := 'pending';
        -- Para profissionais, usa o tenant_id passado
        BEGIN
            new_tenant_id := (NEW.raw_user_meta_data->>'tenant_id')::uuid;
        EXCEPTION WHEN OTHERS THEN
            new_tenant_id := NULL;
        END;
    END IF;

    -- Criar o perfil do usuário COM CAST PARA ENUMS
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
        NEW.id,
        new_tenant_id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'cpf', ''),
        NEW.email,
        v_role::user_role,
        v_status::user_status,
        COALESCE(NEW.raw_user_meta_data->>'image_url', '')
    );

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    RAISE;
END;
$$;

-- 3. Dar permissões para supabase_auth_admin
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated, anon, public;

-- 4. Criar a trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 5. Verificar se a trigger foi criada
SELECT 'TRIGGER CRIADA COM SUCESSO!' AS status,
       trg.tgname AS trigger_name,
       proc.proname AS function_name
FROM pg_trigger trg
JOIN pg_proc proc ON trg.tgfoid = proc.oid
WHERE trg.tgname = 'on_auth_user_created';
