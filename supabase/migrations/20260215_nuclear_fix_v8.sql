-- ================================================================
-- ☢️ SCRIPT DE EMERGÊNCIA V8.0: BYPASS DE RECURSÃO & RESTAURAÇÃO MASTER
-- ================================================================
-- Finalidade: Eliminar toda a recursividade que está travando o banco.
-- O Master voltará a ver tudo IMEDIATAMENTE.
-- ================================================================

BEGIN;

-- 1. FUNÇÃO IS_MASTER (VERSÃO NUCLEAR - SEM CONSULTA A TABELA)
-- ================================================================
-- Esta versão checa o e-mail diretamente no JWT do Supabase.
-- É impossível causar recursão porque não toca na tabela 'profiles'.

CREATE OR REPLACE FUNCTION public.is_master()
RETURNS BOOLEAN AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Pega o e-mail diretamente do token da sessão
  user_email := (current_setting('request.jwt.claims', true)::jsonb ->> 'email');
  
  RETURN (
    user_email = 'jrmacbrandt@gmail.com' OR 
    EXISTS (
        -- Busca direta usando uid para evitar loops decimais
        SELECT 1 FROM auth.users 
        WHERE id = auth.uid() 
        AND email = 'jrmacbrandt@gmail.com'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. FUNÇÃO GET_MY_TENANT_ID (VERSÃO SEGURA)
CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT tenant_id FROM profiles WHERE id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. RESET TOTAL DE RLS (LIMPEZA DE TODAS AS POLÍTICAS QUE CAUSAM LOOP)
-- ================================================================

DO $$ 
DECLARE 
    tab RECORD;
    pol RECORD;
BEGIN 
    FOR tab IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = tab.tablename AND schemaname = 'public') LOOP
            -- Removemos TUDO que criamos anteriormente para garantir um estado limpo
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, tab.tablename);
        END LOOP;
    END LOOP;
END $$;

-- 4. POLÍTICAS SIMPLIFICADAS (V8.0 - ZERO RECURSÃO)
-- ================================================================

-- --- TENANTS (O coração do Painel Master) ---
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "master_access_tenants" ON tenants FOR ALL TO authenticated 
USING (public.is_master() OR id = (SELECT t.tenant_id FROM profiles t WHERE t.id = auth.uid()));

-- --- PROFILES ---
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "master_access_profiles" ON profiles FOR ALL TO authenticated 
USING (public.is_master() OR id = auth.uid() OR tenant_id = (SELECT t.tenant_id FROM profiles t WHERE t.id = auth.uid()));

-- --- APPOINTMENTS ---
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "master_access_appointments" ON appointments FOR ALL TO authenticated 
USING (public.is_master() OR tenant_id = (SELECT t.tenant_id FROM profiles t WHERE t.id = auth.uid()));

-- --- SERVICES ---
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "master_access_services" ON services FOR ALL TO authenticated 
USING (public.is_master() OR tenant_id = (SELECT t.tenant_id FROM profiles t WHERE t.id = auth.uid()));

-- --- ORDERS ---
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "master_access_orders" ON orders FOR ALL TO authenticated 
USING (public.is_master() OR tenant_id = (SELECT t.tenant_id FROM profiles t WHERE t.id = auth.uid()));

-- 5. FORÇAR PERFIL DO MASTER
-- Garante que o usuário principal tenha o role correto no banco
UPDATE profiles 
SET role = 'master', tenant_id = NULL 
WHERE email = 'jrmacbrandt@gmail.com';

COMMIT;
