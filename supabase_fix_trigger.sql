-- ============================================
-- FASTBEAUTYPRO: CORREÇÃO COMPLETA DA TRIGGER
-- Execute este script no SQL Editor do Supabase
-- https://supabase.com/dashboard/project/sxunkigrburoknsshezl/sql/new
-- ============================================

-- 1. Remover triggers e funções antigas
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 2. Criar a função handle_new_user corrigida
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
    -- Extrair o role do metadata (com fallback para 'barber')
    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'barber');
    
    -- Log para debug
    RAISE NOTICE 'Creating user with role: %, email: %', v_role, NEW.email;
    
    -- Definir status baseado no role
    IF v_role = 'owner' THEN
        v_status := 'active';
        
        -- Extrair nome da loja e gerar slug
        v_shop_name := COALESCE(NEW.raw_user_meta_data->>'shop_name', 'Minha Loja');
        v_shop_slug := lower(regexp_replace(v_shop_name, '[^a-zA-Z0-9]+', '-', 'g'));
        
        RAISE NOTICE 'Creating tenant: name=%, slug=%', v_shop_name, v_shop_slug;
        
        -- Criar o tenant para proprietários
        INSERT INTO public.tenants (
            name,
            slug,
            business_type,
            active,
            has_paid
        ) VALUES (
            v_shop_name,
            v_shop_slug,
            'barber',
            true,
            false
        )
        RETURNING id INTO new_tenant_id;
        
        RAISE NOTICE 'Tenant created with ID: %', new_tenant_id;
    ELSE
        v_status := 'pending';
        -- Para profissionais, usa o tenant_id passado nos metadados
        BEGIN
            new_tenant_id := (NEW.raw_user_meta_data->>'tenant_id')::uuid;
        EXCEPTION WHEN OTHERS THEN
            new_tenant_id := NULL;
        END;
    END IF;

    -- Criar o perfil do usuário
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
        v_role,
        v_status,
        COALESCE(NEW.raw_user_meta_data->>'image_url', '')
    );
    
    RAISE NOTICE 'Profile created for user: %', NEW.id;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log detalhado do erro
    RAISE WARNING 'Error in handle_new_user for %: % (SQLSTATE: %)', NEW.email, SQLERRM, SQLSTATE;
    -- Re-raise o erro para que o signup falhe e mostre o erro
    RAISE;
END;
$$;

-- 3. Criar a trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 4. Verificar se a trigger foi criada
SELECT 
    trg.tgname AS trigger_name,
    proc.proname AS function_name,
    'Trigger criada com sucesso!' AS status
FROM pg_trigger trg
JOIN pg_proc proc ON trg.tgfoid = proc.oid
WHERE trg.tgname = 'on_auth_user_created';

-- 5. Mostrar as tabelas existentes
SELECT 'Tabelas criadas:' AS info;
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
