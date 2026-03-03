-- ================================================================
-- MUDANÇA: ADICIONAR FLAG DE TROCA DE SENHA OBRIGATÓRIA (v1.0)
-- ================================================================

-- 1. Adicionar coluna na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS require_password_change BOOLEAN DEFAULT FALSE;

-- 2. Atualizar todos os profissionais atuais para NÃO precisarem trocar 
-- (para não quebrar quem já usa o sistema)
-- Apenas NOVOS profissionais terão isso como TRUE via API.
UPDATE public.profiles SET require_password_change = FALSE;

-- 3. Comentário para documentação
COMMENT ON COLUMN public.profiles.require_password_change IS 'Indica se o usuário deve obrigatoriamente trocar a senha no próximo login.';
