-- ============================================
-- VERIFICAR BUSINESS_TYPE E ESTRUTURA DA TABELA TENANTS
-- ============================================

-- 1. Ver a estrutura da tabela tenants
SELECT 
    column_name,
    data_type,
    udt_name,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'tenants'
ORDER BY ordinal_position;

-- 2. Ver se business_type é enum ou text
SELECT 
    t.typname AS enum_name,
    e.enumlabel AS value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname = 'business_type'
ORDER BY e.enumsortorder;

-- 3. Ver um exemplo de tenant existente
SELECT * FROM public.tenants LIMIT 1;
