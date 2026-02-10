-- ================================================================
-- SOLUÇÃO NUCLEAR: FUNÇÃO DE EXCLUSÃO EM CASCATA (RPC)
-- ================================================================
-- Esta função deleta TUDO relacionado a um tenant, burlando RLS
-- e garantindo a ordem correta para evitar erros de Foreign Key.

CREATE OR REPLACE FUNCTION delete_tenant_cascade(target_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Roda como admin (bypassa RLS)
AS $$
BEGIN
    -- 1. Deletar dependências profundas (filhos dos filhos)
    -- Adicione aqui qualquer tabela que possa bloquear
    -- Ex: order_items, notifications, reviews, etc (se existirem)
    
    -- Se houver tabela order_items:
    -- DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE tenant_id = target_tenant_id);

    -- 2. Deletar tabelas principais vinculadas ao tenant
    DELETE FROM appointments WHERE tenant_id = target_tenant_id;
    DELETE FROM orders WHERE tenant_id = target_tenant_id;
    DELETE FROM products WHERE tenant_id = target_tenant_id;
    DELETE FROM services WHERE tenant_id = target_tenant_id;
    DELETE FROM inventory WHERE tenant_id = target_tenant_id;
    DELETE FROM coupons WHERE tenant_id = target_tenant_id;
    
    -- 3. Deletar perfis (Admin/Barbers)
    -- CUIDADO: Profiles geralmente deletam em cascade do auth.users
    -- Mas aqui vamos limpar a tabela profiles
    DELETE FROM profiles WHERE tenant_id = target_tenant_id;

    -- 4. Finalmente, deletar o tenant
    DELETE FROM tenants WHERE id = target_tenant_id;
END;
$$;
