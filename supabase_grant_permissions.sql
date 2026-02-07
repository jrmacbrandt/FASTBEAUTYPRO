-- ============================================
-- FASTBEAUTYPRO: CORRIGIR PERMISSÕES DA TRIGGER
-- O problema é que a função precisa de permissões do supabase_auth_admin
-- Execute no SQL Editor do Supabase
-- ============================================

-- 1. Garantir que a função tem permissões de execução para supabase_auth_admin
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;

-- 2. Remover permissões desnecessárias
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated, anon, public;

-- 3. Verificar as permissões atuais da função
SELECT 
    proname AS function_name,
    proowner::regrole AS owner,
    proacl AS permissions
FROM pg_proc
WHERE proname = 'handle_new_user';

-- 4. Verificar se o usuário postgres_admin pode executar a função
SELECT has_function_privilege('supabase_auth_admin', 'handle_new_user()', 'EXECUTE') AS can_execute;

-- Resultado esperado: can_execute = true
