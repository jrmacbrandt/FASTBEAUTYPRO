-- 🔥 CORREÇÃO SUPREMA RLS: Permite que Admins de Unidade editem suas configurações de fidelidade
-- Sem esta política, os dados parecem salvar no frontend mas não persistem no refresh.

-- 1. Remove qualquer política de update restrita anterior
DROP POLICY IF EXISTS "tenants_update_access" ON public.tenants;

-- 2. Cria a política definitiva de atualização baseada no get_tenant_safe()
CREATE POLICY "tenants_update_owner" ON public.tenants
FOR UPDATE
TO authenticated
USING (
  public.is_master_v5() OR 
  id = public.get_tenant_safe()
)
WITH CHECK (
  public.is_master_v5() OR 
  id = public.get_tenant_safe()
);

-- 3. Garante que as colunas críticas de fidelidade sejam acessíveis
COMMENT ON COLUMN tenants.loyalty_target IS 'Meta de selos configurada pelo admin da unidade';

-- VERIFICAÇÃO:
-- SELECT tablename, policyname, cmd FROM pg_policies WHERE tablename = 'tenants';
