-- ============================================
-- FASTBEAUTYPRO: SCRIPT COMPLETO DE CONFIGURAÇÃO
-- Execute este script no SQL Editor do Supabase
-- https://supabase.com/dashboard/project/sxunkigrburoknsshezl/sql/new
-- ============================================

-- 1. Garantir extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Criar tabela tenants (caso não exista)
CREATE TABLE IF NOT EXISTS public.tenants (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    slug text UNIQUE NOT NULL,
    business_type text DEFAULT 'barber',
    active boolean DEFAULT true,
    has_paid boolean DEFAULT false,
    logo_url text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 3. Criar tabela profiles (caso não exista)
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
    full_name text,
    cpf text,
    email text,
    role text DEFAULT 'barber',
    status text DEFAULT 'pending',
    avatar_url text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 4. Habilitar RLS
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 5. Remover políticas antigas (para evitar conflitos)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
DROP POLICY IF EXISTS "Service can insert tenants" ON public.tenants;
DROP POLICY IF EXISTS "Users can view their tenant" ON public.tenants;
DROP POLICY IF EXISTS "Enable insert for service role" ON public.tenants;

-- 6. Criar políticas de acesso
-- Permitir que o serviço crie perfis (via trigger) - Essencial para o signup
CREATE POLICY "Enable insert for service role" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Permitir que o serviço crie tenants (via trigger) - Essencial para o signup
CREATE POLICY "Enable insert for service role" ON public.tenants FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view their tenant" ON public.tenants FOR SELECT USING (
    id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);
CREATE POLICY "Users can update their tenant" ON public.tenants FOR UPDATE USING (
    id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid() AND role = 'owner')
);

-- 7. Remover trigger antigo
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 8. Criar a função handle_new_user corrigida
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    new_tenant_id uuid;
    v_role text;
    v_status text;
BEGIN
    -- Extrair o role do metadata
    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'barber');
    
    -- Definir status baseado no role
    IF v_role = 'owner' THEN
        v_status := 'active';
        
        -- Criar o tenant para proprietários
        INSERT INTO public.tenants (
            id,
            name,
            slug,
            business_type,
            active,
            has_paid
        ) VALUES (
            uuid_generate_v4(),
            COALESCE(NEW.raw_user_meta_data->>'shop_name', 'Minha Loja'),
            COALESCE(NEW.raw_user_meta_data->>'shop_slug', 'loja-' || substr(md5(random()::text), 1, 8)),
            'barber',
            true,
            false
        )
        RETURNING id INTO new_tenant_id;
    ELSE
        v_status := 'pending';
        -- Para profissionais, usa o tenant_id passado
        new_tenant_id := (NEW.raw_user_meta_data->>'tenant_id')::uuid;
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

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log do erro (opcional, pode ser visto nos logs do Supabase)
    RAISE LOG 'Erro ao criar perfil para usuário %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- 9. Criar a trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 10. Verificar se a trigger foi criada
SELECT 
    trg.tgname AS trigger_name,
    proc.proname AS function_name,
    'Trigger criada com sucesso!' AS status
FROM pg_trigger trg
JOIN pg_proc proc ON trg.tgfoid = proc.oid
WHERE trg.tgname = 'on_auth_user_created';
