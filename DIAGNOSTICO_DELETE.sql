-- ================================================================
-- DIAGNÓSTICO DE ERRO DE EXCLUSÃO
-- ================================================================

-- 1. Verificar qual é o seu UUID Real
SELECT id, email, role FROM profiles WHERE email = 'jrmacbrandt@gmail.com';

-- 2. Verificar se o UUID nas políticas está correto
SELECT tablename, policyname, qual, cmd 
FROM pg_policies 
WHERE policyname LIKE '%master%';

-- 3. Verificar se existem OUTRAS tabelas ligadas a tenants (Foreign Keys)
-- Se houver tabelas aqui que não estamos deletando, o banco bloqueia a exclusão!
SELECT
    tc.table_schema, 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND ccu.table_name = 'tenants';

-- ================================================================
-- Execute e me mostre o resultado (especialmente a parte 3)
-- ================================================================
