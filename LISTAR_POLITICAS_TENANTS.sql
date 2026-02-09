-- Listar todas as políticas da tabela tenants
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'tenants';
