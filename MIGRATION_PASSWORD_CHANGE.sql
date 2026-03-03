-- ================================================================
-- MUDANÇA: ADICIONAR FLAG DE TROCA DE SENHA OBRIGATÓRIA (v2.0 - TOTAL)
-- ================================================================

-- 1. Adicionar coluna na tabela profiles caso não exista
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS require_password_change BOOLEAN DEFAULT FALSE;

-- 2. ATENÇÃO: Marcar como TRUE para TODOS os profissionais (barber)
-- Isso garante que mesmo os antigos sejam obrigados a trocar a senha 
-- no próximo acesso, pois não podemos verificar a senha via SQL (hash).
UPDATE public.profiles 
SET require_password_change = TRUE 
WHERE role = 'barber';

-- 3. Comentário para documentação
COMMENT ON COLUMN public.profiles.require_password_change IS 'Indica se o usuário deve obrigatoriamente trocar a senha no próximo login.';

-- 4. Audit Query (Execute separadamente para conferência)
-- SELECT id, email, role, require_password_change FROM public.profiles WHERE role = 'barber';
