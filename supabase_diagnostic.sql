-- ============================================
-- FASTBEAUTYPRO: DIAGNÓSTICO DO PROBLEMA
-- Execute este script no SQL Editor do Supabase
-- ============================================

-- 1. Verificar estrutura da tabela tenants
SELECT '=== ESTRUTURA DA TABELA TENANTS ===' AS info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'tenants' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Verificar estrutura da tabela profiles
SELECT '=== ESTRUTURA DA TABELA PROFILES ===' AS info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'profiles' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Verificar se a trigger existe
SELECT '=== TRIGGER EXISTENTE ===' AS info;
SELECT 
    trg.tgname AS trigger_name,
    proc.proname AS function_name,
    ns.nspname AS schema
FROM pg_trigger trg
JOIN pg_proc proc ON trg.tgfoid = proc.oid
JOIN pg_namespace ns ON proc.pronamespace = ns.oid
WHERE trg.tgname = 'on_auth_user_created';

-- 4. Verificar se há restrições que podem estar causando o erro
SELECT '=== CONSTRAINTS DA TABELA TENANTS ===' AS info;
SELECT 
    tc.constraint_name,
    tc.constraint_type
FROM information_schema.table_constraints tc
WHERE tc.table_name = 'tenants';

-- 5. Verificar se existe extensão uuid-ossp
SELECT '=== EXTENSÃO UUID ===' AS info;
SELECT * FROM pg_extension WHERE extname = 'uuid-ossp';
