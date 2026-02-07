-- ============================================
-- FASTBEAUTYPRO: ATIVAR TRIGGER PARA SEMPRE
-- Execute este script para garantir que a trigger sempre dispare
-- ============================================

-- Alterar a trigger para ALWAYS (sempre executar)
ALTER TABLE auth.users ENABLE ALWAYS TRIGGER on_auth_user_created;

-- Verificar se a alteração foi aplicada
SELECT 
    trg.tgname AS trigger_name,
    CASE trg.tgenabled
        WHEN 'O' THEN 'Origin (normal)'
        WHEN 'D' THEN 'Disabled'
        WHEN 'R' THEN 'Replica'
        WHEN 'A' THEN 'ALWAYS ✓'
    END AS status,
    ns.nspname || '.' || rel.relname AS table_name,
    proc.proname AS function_name
FROM pg_trigger trg
JOIN pg_class rel ON trg.tgrelid = rel.oid
JOIN pg_namespace ns ON rel.relnamespace = ns.oid
JOIN pg_proc proc ON trg.tgfoid = proc.oid
WHERE trg.tgname = 'on_auth_user_created';
