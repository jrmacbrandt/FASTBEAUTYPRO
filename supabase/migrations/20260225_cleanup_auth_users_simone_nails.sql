-- =========================================================================
-- 🛡️ [BLINDADO] LIMPEZA ABSOLUTA DE SUPERFICIE DE AUTENTICAÇÃO
-- =========================================================================
-- Alvo: "Simone Nails"
-- ID do Inquilino: 97e69b01-eeef-4d80-960a-f4467b90f505
-- Propósito: O Reset limpou o perfil público dos barbeiros, mas os 
-- emails de login ficaram "tatuados" no cofre global (auth.users).
-- Este comando apaga EXATAMENTE os usuários cujos perfis foram deletados.
-- O "Owner" (que ainda tem perfil) fica intacto.
-- =========================================================================

DELETE FROM auth.users
WHERE raw_user_meta_data->>'tenant_id' = '97e69b01-eeef-4d80-960a-f4467b90f505'
AND id NOT IN (SELECT id FROM public.profiles);

-- Ao final deste comando, qualquer e-mail da equipe antiga na Simone Nails
-- estará livre para ser cadastrado novamente.
