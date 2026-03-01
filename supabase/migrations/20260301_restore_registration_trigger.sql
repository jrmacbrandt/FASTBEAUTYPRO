-- ================================================================
-- 🛡️ RESTAURAÇÃO: GATILHO DE CADASTRO ORIGINAL (v12.0)
-- ================================================================
-- Finalidade: Restaurar a lógica "Perfeita" de criação de perfis e 
-- estabelecimentos, removendo erros de UUID e garantindo o vínculo.
-- ================================================================

BEGIN;

-- 1. Remover triggers e funções antigas para limpeza total
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 2. Recriar a função com gen_random_uuid() (Nativo do Postgres 15+)
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
    -- Extrair o role do metadata (prioriza o que vem do cadastro)
    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'barber');
    
    -- Lógica para Proprietários (Owners)
    IF v_role = 'owner' THEN
        v_status := 'active';
        
        -- Extrair dados da loja
        v_shop_name := COALESCE(NEW.raw_user_meta_data->>'shop_name', 'Minha Loja');
        v_shop_slug := lower(regexp_replace(v_shop_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(NEW.id::text, 1, 4);
        
        -- Gerar ID único para o Tenant
        new_tenant_id := gen_random_uuid();
        
        -- Criar o Registro do Estabelecimento (Tenant)
        INSERT INTO public.tenants (
            id,
            name,
            slug,
            business_type,
            active,
            has_paid,
            status
        ) VALUES (
            new_tenant_id,
            v_shop_name,
            v_shop_slug,
            COALESCE(NEW.raw_user_meta_data->>'business_type', 'barber'),
            true,
            false,
            'pending'
        );
    ELSE
        -- Lógica para Profissionais (Barber)
        v_status := 'pending';
        -- Tenta pegar o tenant_id do convite
        BEGIN
            new_tenant_id := (NEW.raw_user_meta_data->>'tenant_id')::uuid;
        EXCEPTION WHEN OTHERS THEN
            new_tenant_id := NULL;
        END;
    END IF;

    -- Criar o Perfil do Usuário
    INSERT INTO public.profiles (
        id,
        tenant_id,
        full_name,
        email,
        role,
        status,
        avatar_url,
        cpf
    ) VALUES (
        NEW.id,
        new_tenant_id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        NEW.email,
        v_role::user_role,
        v_status::user_status,
        COALESCE(NEW.raw_user_meta_data->>'image_url', ''),
        COALESCE(NEW.raw_user_meta_data->>'cpf', '')
    );

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log de erro silencioso no banco para não travar o Auth
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- 3. Re-garantir permissões
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;

-- 4. Re-ativar a Trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

COMMIT;
