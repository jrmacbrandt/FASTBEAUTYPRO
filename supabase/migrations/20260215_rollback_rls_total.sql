-- ================================================================
-- 🔄 ROLLBACK TOTAL: RESTAURAÇÃO DO ESTADO FUNCIONAL ORIGINAL
-- ================================================================
-- Finalidade: REVERTER todas as alterações de RLS que causaram perda de dados
-- e restaurar acesso total para todos os usuários autenticados.
-- ================================================================

BEGIN;

-- 1. REMOVER TODAS AS FUNÇÕES QUE CRIAMOS (PODEM ESTAR CAUSANDO LOOPS)
-- ================================================================
DROP FUNCTION IF EXISTS public.is_master() CASCADE;
DROP FUNCTION IF EXISTS public.get_my_tenant_id() CASCADE;

-- 2. REMOVER TODAS AS POLÍTICAS RLS DE TODAS AS TABELAS
-- ================================================================
DO $$ 
DECLARE 
    tab RECORD;
    pol RECORD;
BEGIN 
    FOR tab IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = tab.tablename AND schemaname = 'public') LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, tab.tablename);
        END LOOP;
    END LOOP;
END $$;

-- 3. DESABILITAR RLS TEMPORARIAMENTE NAS TABELAS PRINCIPAIS
-- ================================================================
-- Isso vai fazer todos os dados aparecerem imediatamente
ALTER TABLE IF EXISTS tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS services DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS products DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS coupons DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS client_loyalty DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS client_subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS campaigns DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS campaign_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS stock_transactions DISABLE ROW LEVEL SECURITY;

-- 4. GARANTIR QUE O PERFIL MASTER EXISTE E ESTÁ CORRETO
-- ================================================================
UPDATE profiles 
SET role = 'master', tenant_id = NULL 
WHERE email = 'jrmacbrandt@gmail.com';

COMMIT;

-- ================================================================
-- RESULTADO ESPERADO:
-- ================================================================
-- ✅ O painel Master voltará a mostrar todos os inquilinos
-- ✅ Cupons e demais dados voltarão a aparecer
-- ✅ Não haverá mais bloqueios de acesso
-- 
-- ⚠️ IMPORTANTE: Este é um estado temporário sem RLS.
-- Depois que confirmar que os dados estão visíveis, podemos
-- reativar RLS com políticas corretas e testadas.
-- ================================================================
