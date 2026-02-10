-- ================================================================
-- RELATÓRIO COMPLETO DE DEPENDÊNCIAS E PERMISSÕES
-- ================================================================

-- 1. Listar TODAS as tabelas que impedem a exclusão de um Tenant (Foreign Keys)
SELECT
    kcu.table_name AS tabela_filha,
    kcu.column_name AS coluna_filha,
    tc.constraint_name AS nome_restricao
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND ccu.table_name = 'tenants';

-- 2. Verificar permissões ATUAIS do Master (RLS Policies)
SELECT tablename, policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE policyname LIKE '%master%' 
OR policyname LIKE '%Master%';

-- 3. Verificar triggers que podem impedir Update/Delete
SELECT 
    event_object_table AS table_name, 
    trigger_name, 
    event_manipulation AS event,
    action_statement AS definition
FROM information_schema.triggers
WHERE event_object_table = 'tenants';
