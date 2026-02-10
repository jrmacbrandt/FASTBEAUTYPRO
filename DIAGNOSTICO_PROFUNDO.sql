-- ================================================================
-- DIAGNÓSTICO PROFUNDO DE BLOQUEIOS (EXECUÇÃO OBRIGATÓRIA)
-- ================================================================
-- O sistema não consegue deletar unidades porque existem dados vinculados
-- em tabelas que não mapeamos ainda. Precisamos descobrir QUAIS.

-- 1. QUAIS TABELAS DEPENDEM DE TENANTS? (Foreign Keys)
-- Esta consulta mostra TODAS as tabelas que travam a exclusão.
SELECT
    kcu.table_name AS tabela_bloqueadora,
    kcu.column_name AS coluna_vinculo
FROM information_schema.key_column_usage AS kcu
JOIN information_schema.table_constraints AS tc
    ON kcu.constraint_name = tc.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND ccu.table_name = 'tenants';

-- 2. EXISTEM TRIGGERS QUE IMPEDEM EXCLUSÃO?
SELECT 
    event_object_table AS tabela,
    trigger_name AS nome_gatilho,
    event_manipulation AS evento,
    action_statement AS acao
FROM information_schema.triggers
WHERE event_object_table = 'tenants';

-- 3. QUAIS PERMISSÕES O MASTER TEM HOJE?
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE policyname LIKE '%master%' 
ORDER BY tablename;

-- ================================================================
-- IMPORTANTE:
-- Por favor, execute este script e COPIE OS RESULTADOS PRINCIPAIS
-- (Tabela 1 e Tabela 3 são as mais importantes)
-- Sem isso, ficaremos tentando adivinhar quais tabelas deletar.
-- ================================================================
