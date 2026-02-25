-- =========================================================================
-- 🛡️ [BLINDADO] LIMPEZA DEFINITIVA DE CONTAS ÓRFÃS (AUTH.USERS)
-- =========================================================================
-- Propósito: O erro "A user with this email address has already been registered"
-- ocorre porque o email ficou preso na tabela Oculta de Autenticação do Supabase.
-- Como o perfil do barbeiro já havia sido deletado ontem, a nova RPC atualizada
-- não conseguiu encontrá-lo para deletar a senha hoje.
-- 
-- Este script FORÇA a exclusão de QUALQUER usuário de login do sistema inteiro
-- que não possua mais um perfil atrelado, varrendo o lixo definitivamente.
-- =========================================================================

DELETE FROM auth.users 
WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.users.id
);

-- Após Rodar (Run) no SQL Editor, o email (jrmacbrandt@yahoo.com) e qualquer
-- outro email de barbeiro deletado estará 100% livre.
