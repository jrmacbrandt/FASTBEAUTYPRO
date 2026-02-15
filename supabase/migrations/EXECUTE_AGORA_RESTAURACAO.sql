-- ================================================================
-- ⚡ RESTAURAÇÃO DE EMERGÊNCIA TOTAL - EXECUTE AGORA
-- ================================================================
-- Este script remove TODAS as políticas RLS problemáticas e
-- desabilita RLS temporariamente para restaurar o acesso aos dados.
-- ================================================================

BEGIN;

-- PASSO 1: Remover funções que causam loops
DROP FUNCTION IF EXISTS public.is_master() CASCADE;
DROP FUNCTION IF EXISTS public.get_my_tenant_id() CASCADE;

-- PASSO 2: Limpar todas as políticas RLS
DO $$ 
DECLARE 
    r RECORD;
BEGIN 
    FOR r IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
            r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- PASSO 3: Desabilitar RLS em TODAS as tabelas
DO $$ 
DECLARE 
    r RECORD;
BEGIN 
    FOR r IN (
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', r.tablename);
    END LOOP;
END $$;

-- PASSO 4: Garantir perfil Master correto
UPDATE profiles 
SET role = 'master', tenant_id = NULL 
WHERE email = 'jrmacbrandt@gmail.com';

COMMIT;

-- ================================================================
-- ✅ APÓS EXECUTAR ESTE SCRIPT:
-- ================================================================
-- 1. Recarregue o painel admin-master (F5)
-- 2. Recarregue o painel admin da loja (F5)
-- 3. Todos os dados devem aparecer imediatamente
-- 
-- ⚠️ SEGURANÇA: RLS está desabilitado temporariamente.
-- Vamos reconstruir as políticas corretas depois, uma de cada vez.
-- ================================================================
