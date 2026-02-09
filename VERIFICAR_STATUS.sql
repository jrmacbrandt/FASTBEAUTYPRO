-- Verificar se o PAUSE realmente funcionou no banco
-- Execute este comando para ver o status atual da unidade

SELECT 
    id,
    name,
    active,
    created_at
FROM tenants
ORDER BY created_at DESC
LIMIT 10;

-- Se a unidade que você pausou estiver com active = TRUE,
-- significa que o UPDATE não funcionou (problema de RLS)

-- Se estiver com active = FALSE,
-- significa que o UPDATE funcionou mas a UI não atualizou
