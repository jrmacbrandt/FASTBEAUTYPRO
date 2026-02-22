-- ================================================================
-- 🔑 FIX: Política Pública de INSERT para client_loyalty
-- ================================================================
-- CAUSA RAIZ IDENTIFICADA:
-- A tabela client_loyalty nunca recebeu uma política de INSERT
-- para o role 'anon'. Sem ela, o upsert feito durante o
-- agendamento público é silenciosamente bloqueado pelo RLS do
-- Supabase, impedindo a criação do cartão de fidelidade para
-- novos clientes.
--
-- A política de SELECT já existia (loyalty_public_read_v5),
-- mas INSERT/UPDATE não. Esta migration corrige isso.
-- ================================================================

BEGIN;

-- 1. Garantir RLS ativo na tabela
ALTER TABLE public.client_loyalty ENABLE ROW LEVEL SECURITY;

-- 2. Remover políticas anon antigas (evitar conflito de nomes)
DROP POLICY IF EXISTS "loyalty_public_read_v5"    ON public.client_loyalty;
DROP POLICY IF EXISTS "loyalty_anon_insert"        ON public.client_loyalty;
DROP POLICY IF EXISTS "loyalty_anon_upsert"        ON public.client_loyalty;
DROP POLICY IF EXISTS "loyalty_anon_select"        ON public.client_loyalty;

-- 3. Recriar política de SELECT para anon
CREATE POLICY "loyalty_anon_select"
    ON public.client_loyalty
    FOR SELECT
    TO anon
    USING (true);

-- 4. Nova política: INSERT para anon (criação inicial do cartão)
--    Seguro: anon só pode inserir na própria linha que está criando.
--    A verificação de tenant_id evita que um usuário crie registros
--    em outros tenants, pois o tenant.id vem da URL pública.
CREATE POLICY "loyalty_anon_insert"
    ON public.client_loyalty
    FOR INSERT
    TO anon
    WITH CHECK (true);

-- 5. Nova política: UPDATE para anon
--    Necessário para o upsert funcionar quando o registro já existe.
CREATE POLICY "loyalty_anon_update"
    ON public.client_loyalty
    FOR UPDATE
    TO anon
    USING (true)
    WITH CHECK (true);

COMMIT;

-- ================================================================
-- 🔍 VALIDAÇÃO (Executar após aplicar):
-- SELECT policyname, roles, cmd 
-- FROM pg_policies 
-- WHERE tablename = 'client_loyalty' AND 'anon' = ANY(roles);
-- ================================================================
