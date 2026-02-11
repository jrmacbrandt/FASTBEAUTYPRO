-- ================================================================
-- RELATÓRIO DE SAÚDE DO BANCO DE DADOS (FASTBEAUTY PRO)
-- ================================================================
-- Execute este script no SQL Editor do Supabase para verificar a integridade.

WITH 
    -- 1. Contagem de Tenants Ativos vs Pendentes
    tenant_counts AS (
        SELECT 
            COUNT(*) FILTER (WHERE status = 'active') as active_tenants,
            COUNT(*) FILTER (WHERE status = 'pending_approval') as pending_tenants,
            COUNT(*) as total_tenants
        FROM tenants
    ),
    -- 2. Perfis órfãos (Sem tenant vinculado ou tenant inexistente)
    orphan_profiles AS (
        SELECT COUNT(*) as count 
        FROM profiles 
        WHERE tenant_id IS NOT NULL 
        AND tenant_id NOT IN (SELECT id FROM tenants)
    ),
    -- 3. Serviços órfãos
    orphan_services AS (
        SELECT COUNT(*) as count 
        FROM services 
        WHERE tenant_id NOT IN (SELECT id FROM tenants)
    ),
    -- 4. Produtos órfãos
    orphan_products AS (
        SELECT COUNT(*) as count 
        FROM products 
        WHERE tenant_id NOT IN (SELECT id FROM tenants)
    ),
    -- 5. Agendamentos órfãos
    orphan_appointments AS (
        SELECT COUNT(*) as count 
        FROM appointments 
        WHERE tenant_id NOT IN (SELECT id FROM tenants)
    )

SELECT 
    '=== RESUMO GERAL ===' as Categoria,
    '---' as Detalhe,
    '---' as Qtd
UNION ALL
SELECT 'Tenants', 'Total de Lojas', total_tenants::text FROM tenant_counts
UNION ALL
SELECT 'Tenants', 'Ativos', active_tenants::text FROM tenant_counts
UNION ALL
SELECT 'Tenants', 'Pendentes', pending_tenants::text FROM tenant_counts
UNION ALL
SELECT '=== AUDITORIA DE LIXO (ÓRFÃOS) ===', '---', '---'
UNION ALL
SELECT 'Lixo', 'Perfis sem Loja (Erro)', orphan_profiles.count::text FROM orphan_profiles
UNION ALL
SELECT 'Lixo', 'Svcs sem Loja', orphan_services.count::text FROM orphan_services
UNION ALL
SELECT 'Lixo', 'Prods sem Loja', orphan_products.count::text FROM orphan_products
UNION ALL
SELECT 'Lixo', 'Agend. sem Loja', orphan_appointments.count::text FROM orphan_appointments;

-- Se todas as contagens de "Lixo" forem 0, o banco está PERFEITO.
-- Se houver números positivos em "Lixo", o sistema de Delete Cascade precisa de ajuste.
