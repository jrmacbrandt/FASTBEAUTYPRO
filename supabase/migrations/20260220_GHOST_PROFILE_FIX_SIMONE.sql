-- ================================================================
-- ⚡ REPARO DE VÍNCULO (SIMONE NAILS) - GHOST PROFILE FIX
-- ================================================================
-- Finalidade: Vincular o perfil owner ao tenant_id correto para
-- permitir que o dashboard carregue os dados da unidade.
-- ================================================================

BEGIN;

-- 1. IDENTIFICAR O TENANT_ID DA SIMONE NAILS
-- E VINCULAR AO PERFIL DO ADMINISTRADOR
WITH target_tenant AS (
    SELECT id FROM tenants 
    WHERE slug = 'simone-nails' OR name ILIKE '%Simone Nails%'
    LIMIT 1
)
UPDATE profiles 
SET 
    tenant_id = (SELECT id FROM target_tenant),
    role = 'owner'
WHERE email = 'jrbrandt@hotmail.com';

-- 2. VERIFICAÇÃO (DEVE RETORNAR O TENANT_ID PREENCHIDO)
SELECT email, role, tenant_id FROM profiles WHERE email = 'jrbrandt@hotmail.com';

COMMIT;
