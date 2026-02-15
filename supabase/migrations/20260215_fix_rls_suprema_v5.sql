-- ================================================================
-- 🛡️ SCRIPT DE SEGURANÇA SUPREMA V5.0 (RLS & ACESSO UNIVERSAL)
-- ================================================================
-- Finalidade: Restaurar acesso irrestrito ao Master Admin e 
-- isolamento correto para Proprietários/Barbeiros, eliminando
-- recursão infinita e garantindo carregamento de dados.
-- Inclui verificações de existência de tabelas (Defensivo).
-- ================================================================

BEGIN;

-- 1. FUNÇÕES DE APOIO (SECURITY DEFINER - SEM RECURSÃO)
-- ================================================================

CREATE OR REPLACE FUNCTION public.is_master()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND (role IN ('master', 'admin_master') OR email = 'jrmacbrandt@gmail.com')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT tenant_id FROM profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. LIMPEZA TOTAL DE POLÍTICAS CONFLITANTES
-- ================================================================

DO $$ 
DECLARE 
    tab RECORD;
    pol RECORD;
BEGIN 
    FOR tab IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = tab.tablename AND schemaname = 'public') LOOP
            IF pol.policyname LIKE '%master%' 
               OR pol.policyname LIKE '%tenant%' 
               OR pol.policyname LIKE '%isolation%' 
               OR pol.policyname LIKE '%read_own%'
               OR pol.policyname LIKE '%universal%'
               OR pol.policyname LIKE '%access%'
            THEN
                EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, tab.tablename);
            END IF;
        END LOOP;
    END LOOP;
END $$;

-- 3. DEFINIÇÃO DE POLÍTICAS POR TABELA (MODO DEFENSIVO)
-- ================================================================

-- --- PROFILES (Obrigatória) ---
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_universal_access" ON profiles FOR ALL TO authenticated
USING (id = auth.uid() OR public.is_master() OR tenant_id = public.get_my_tenant_id())
WITH CHECK (id = auth.uid() OR public.is_master());

-- --- TENANTS (Obrigatória) ---
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenants_universal_access" ON tenants FOR ALL TO authenticated
USING (id = public.get_my_tenant_id() OR public.is_master())
WITH CHECK (public.is_master());

-- --- APPOINTMENTS (Obrigatória) ---
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "appointments_universal_access" ON appointments FOR ALL TO authenticated
USING (tenant_id = public.get_my_tenant_id() OR public.is_master())
WITH CHECK (tenant_id = public.get_my_tenant_id() OR public.is_master());

-- --- SERVICES (Obrigatória) ---
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "services_universal_access" ON services FOR ALL TO authenticated
USING (tenant_id = public.get_my_tenant_id() OR public.is_master() OR active = true)
WITH CHECK (tenant_id = public.get_my_tenant_id() OR public.is_master());

-- --- ORDERS (Obrigatória) ---
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders_universal_access" ON orders FOR ALL TO authenticated
USING (tenant_id = public.get_my_tenant_id() OR public.is_master())
WITH CHECK (tenant_id = public.get_my_tenant_id() OR public.is_master());

-- --- TABELAS OPCIONAIS (VERIFICA SE EXISTE ANTES DE APLICAR) ---
DO $$ 
BEGIN
    -- ORDER_ITEMS
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'order_items') THEN
        ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "order_items_universal_access" ON order_items FOR ALL TO authenticated
        USING (EXISTS (SELECT 1 FROM orders WHERE id = order_id AND (tenant_id = public.get_my_tenant_id() OR public.is_master())))
        WITH CHECK (EXISTS (SELECT 1 FROM orders WHERE id = order_id AND (tenant_id = public.get_my_tenant_id() OR public.is_master())));
    END IF;

    -- PRODUCTS
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'products') THEN
        ALTER TABLE products ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "products_universal_access" ON products FOR ALL TO authenticated
        USING (tenant_id = public.get_my_tenant_id() OR public.is_master())
        WITH CHECK (tenant_id = public.get_my_tenant_id() OR public.is_master());
    END IF;

    -- NOTIFICATIONS
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications') THEN
        ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "notifications_universal_access" ON notifications FOR ALL TO authenticated
        USING (tenant_id = public.get_my_tenant_id() OR public.is_master())
        WITH CHECK (tenant_id = public.get_my_tenant_id() OR public.is_master());
    END IF;

    -- INVENTORY_LOGS
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'inventory_logs') THEN
        ALTER TABLE inventory_logs ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "inventory_universal_access" ON inventory_logs FOR ALL TO authenticated
        USING (tenant_id = public.get_my_tenant_id() OR public.is_master())
        WITH CHECK (tenant_id = public.get_my_tenant_id() OR public.is_master());
    END IF;

    -- LOYALTY
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'client_loyalty') THEN
        ALTER TABLE client_loyalty ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "loyalty_universal_access" ON client_loyalty FOR ALL TO authenticated
        USING (tenant_id = public.get_my_tenant_id() OR public.is_master());
    END IF;

    -- SUBSCRIPTIONS
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'client_subscriptions') THEN
        ALTER TABLE client_subscriptions ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "subs_universal_access" ON client_subscriptions FOR ALL TO authenticated
        USING (tenant_id = public.get_my_tenant_id() OR public.is_master());
    END IF;

    -- COUPONS
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'coupons') THEN
        ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "coupons_universal_access" ON coupons FOR ALL TO authenticated
        USING (public.is_master() OR active = true)
        WITH CHECK (public.is_master());
    END IF;
END $$;

COMMIT;
