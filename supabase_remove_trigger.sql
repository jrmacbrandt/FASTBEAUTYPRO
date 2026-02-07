-- ============================================
-- FASTBEAUTYPRO: DESATIVAR TRIGGER REDUNDANTE
-- O código agora cria o profile/tenant diretamente.
-- A trigger está causando conflito (23505 - duplicate key)
-- ============================================

-- 1. Remover a trigger que está causando conflito
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Verificar que foi removida
SELECT 
    'TRIGGER REMOVIDA COM SUCESSO' AS status,
    COUNT(*) AS triggers_restantes
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

-- 3. A função pode ficar, mas a trigger não deve mais disparar
-- Isso permite que o código do frontend controle a criação de profiles/tenants
