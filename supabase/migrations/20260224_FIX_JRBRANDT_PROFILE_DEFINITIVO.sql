-- ================================================================
-- ⚡ REPARO DEFINITIVO DE PERFIL E VÍNCULO (JRBRANDT@HOTMAIL.COM)
-- ================================================================
-- Finalidade: Inserir ou atualizar o perfil owner para garantir
-- que o dashboard administrativo carregue com sucesso,
-- resolvendo o erro "Parece que você ainda não tem um perfil".
-- BLINDAGEM: Garante que o registro seja criado se não existir.
-- ================================================================

BEGIN;

DO $$ 
DECLARE 
    v_user_id UUID;
    v_tenant_id UUID;
BEGIN
    -- 1. Obter o ID do usuário na tabela auth.users
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'jrbrandt@hotmail.com' LIMIT 1;
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário jrbrandt@hotmail.com não encontrado em auth.users. Ele precisa se cadastrar primeiro (auth sign up falhou).';
    END IF;

    -- 2. Obter o ID do tenant "Simone Nails"
    SELECT id INTO v_tenant_id FROM tenants 
    WHERE slug = 'simone-nails' OR name ILIKE '%Simone Nails%' 
    LIMIT 1;

    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Estabelecimento Simone Nails não encontrado na tabela tenants.';
    END IF;

    -- 3. UPSERT real no perfil (Cria se não existir, atualiza se existir)
    IF EXISTS (SELECT 1 FROM profiles WHERE id = v_user_id) THEN
        UPDATE profiles 
        SET 
            tenant_id = v_tenant_id,
            role = 'owner',
            status = 'active',
            email = 'jrbrandt@hotmail.com'
        WHERE id = v_user_id;
    ELSE
        INSERT INTO profiles (id, tenant_id, role, status, email, full_name, created_at, updated_at)
        VALUES (v_user_id, v_tenant_id, 'owner', 'active', 'jrbrandt@hotmail.com', 'JR Brandt', NOW(), NOW());
    END IF;

    RAISE NOTICE 'Perfil de jrbrandt@hotmail.com atualizado e vinculado com sucesso à Simone Nails.';
END $$;

-- 4. VALIDAÇÃO FINAl
SELECT p.id, p.email, p.role, p.status, t.name as tenant_name 
FROM profiles p
LEFT JOIN tenants t ON p.tenant_id = t.id
WHERE p.email = 'jrbrandt@hotmail.com';

COMMIT;
