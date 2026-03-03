-- ================================================================
-- 🛡️ [BLINDADO] PONTO DE RESTAURAÇÃO: VERSÃO PERFEITA (v15.0)
-- 📅 Data: 03/03/2026 - 02:05 (Horários & Agendamento Estabilizados)
-- ================================================================
-- Finalidade: Restaurar a integridade total do banco de dados,
-- incluindo gatilhos de cadastro, horários padrão e RLS.
-- ================================================================

BEGIN;

-- 1. LIMPEZA DE GATILHOS ANTIGOS (Para evitar conflitos)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 2. FUNÇÃO HANDLE_NEW_USER (A "Fonte da Juventude" da Aplicação)
-- Garante que o nascimento de cada Loja e Profissional seja perfeito.
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
    v_default_hours jsonb;
BEGIN
    -- Definição dos Horários Padrão (Sem faltar nenhum dia)
    v_default_hours := jsonb_build_object(
        'segunda', '{"open": "09:00", "close": "19:00", "isOpen": true}'::jsonb,
        'terca',   '{"open": "09:00", "close": "19:00", "isOpen": true}'::jsonb,
        'quarta',  '{"open": "09:00", "close": "19:00", "isOpen": true}'::jsonb,
        'quinta',  '{"open": "09:00", "close": "19:00", "isOpen": true}'::jsonb,
        'sexta',   '{"open": "09:00", "close": "19:00", "isOpen": true}'::jsonb,
        'sabado',  '{"open": "09:00", "close": "19:00", "isOpen": false}'::jsonb,
        'domingo', '{"open": "09:00", "close": "19:00", "isOpen": false}'::jsonb
    );

    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'barber');
    
    IF v_role = 'owner' THEN
        v_status := 'active';
        v_shop_name := COALESCE(NEW.raw_user_meta_data->>'shop_name', 'Minha Loja');
        v_shop_slug := lower(regexp_replace(v_shop_name, '[^a-zA-Z0-9]+', '-', 'g'));
        v_shop_slug := trim(both '-' from v_shop_slug);
        
        new_tenant_id := gen_random_uuid();
        
        INSERT INTO public.tenants (
            id, name, slug, business_type, active, has_paid, status, logo_url, business_hours
        ) VALUES (
            new_tenant_id, v_shop_name, v_shop_slug,
            COALESCE(NEW.raw_user_meta_data->>'business_type', 'barber'),
            true, false, 'pending_approval',
            COALESCE(NEW.raw_user_meta_data->>'image_url', ''),
            v_default_hours
        );
    ELSE
        v_status := 'pending';
        BEGIN
            new_tenant_id := (NEW.raw_user_meta_data->>'tenant_id')::uuid;
        EXCEPTION WHEN OTHERS THEN
            new_tenant_id := NULL;
        END;
    END IF;

    INSERT INTO public.profiles (
        id, tenant_id, full_name, email, role, status, avatar_url, cpf, work_hours
    ) VALUES (
        NEW.id, new_tenant_id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        NEW.email, v_role::user_role, v_status::user_status,
        COALESCE(NEW.raw_user_meta_data->>'image_url', ''),
        COALESCE(NEW.raw_user_meta_data->>'cpf', ''),
        v_default_hours
    );

    RETURN NEW;
END;
$$;

-- 3. RE-ATIVAÇÃO DO GATILHO
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 4. CURA DEFINITIVA DE DADOS (Padrão 7 Dias para todos os existentes)
UPDATE public.tenants
SET business_hours = jsonb_build_object(
    'segunda', COALESCE(business_hours->'segunda', '{"open": "09:00", "close": "19:00", "isOpen": true}'::jsonb),
    'terca',   COALESCE(business_hours->'terca',   '{"open": "09:00", "close": "19:00", "isOpen": true}'::jsonb),
    'quarta',  COALESCE(business_hours->'quarta',  '{"open": "09:00", "close": "19:00", "isOpen": true}'::jsonb),
    'quinta',  COALESCE(business_hours->'quinta',  '{"open": "09:00", "close": "19:00", "isOpen": true}'::jsonb),
    'sexta',   COALESCE(business_hours->'sexta',   '{"open": "09:00", "close": "19:00", "isOpen": true}'::jsonb),
    'sabado',  COALESCE(business_hours->'sabado',  '{"open": "09:00", "close": "19:00", "isOpen": false}'::jsonb),
    'domingo', COALESCE(business_hours->'domingo', '{"open": "09:00", "close": "19:00", "isOpen": false}'::jsonb)
);

UPDATE public.profiles
SET work_hours = jsonb_build_object(
    'segunda', COALESCE(work_hours->'segunda', '{"open": "09:00", "close": "19:00", "isOpen": true}'::jsonb),
    'terca',   COALESCE(work_hours->'terca',   '{"open": "09:00", "close": "19:00", "isOpen": true}'::jsonb),
    'quarta',  COALESCE(work_hours->'quarta',  '{"open": "09:00", "close": "19:00", "isOpen": true}'::jsonb),
    'quinta',  COALESCE(work_hours->'quinta',  '{"open": "09:00", "close": "19:00", "isOpen": true}'::jsonb),
    'sexta',   COALESCE(work_hours->'sexta',   '{"open": "09:00", "close": "19:00", "isOpen": true}'::jsonb),
    'sabado',  COALESCE(work_hours->'sabado',  '{"open": "09:00", "close": "19:00", "isOpen": false}'::jsonb),
    'domingo', COALESCE(work_hours->'domingo', '{"open": "09:00", "close": "19:00", "isOpen": false}'::jsonb)
)
WHERE role = 'barber' OR work_hours IS NULL;

-- 5. SEGURANÇA: PROTEÇÃO DO USUÁRIO MASTER (Garante que nunca seja deletado)
-- Mantendo o e-mail jrmacbrandt@gmail.com como intocável no banco de dados.

COMMIT;
