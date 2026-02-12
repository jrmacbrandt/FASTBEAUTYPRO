-- ================================================================
-- CORREÇÃO DE SEGURANÇA: PERMISSÕES DE SERVIÇOS (RLS)
-- ================================================================
-- Este script libera para que os Donos possam cadastrar seus próprios 
-- serviços, o que estava sendo bloqueado por uma política anterior 
-- que permitia acesso apenas ao Master Admin.

-- 1. Remover políticas restritivas antigas (se existirem)
DROP POLICY IF EXISTS "master_full_access_services" ON public.services;
DROP POLICY IF EXISTS "owners_manage_own_services" ON public.services;
DROP POLICY IF EXISTS "services_owner_manage" ON public.services;

-- 2. Garantir que a função de auxílio existe e é estável
-- Ela retorna o tenant_id do usuário logado
CREATE OR REPLACE FUNCTION public.get_auth_tenant_id()
RETURNS uuid 
LANGUAGE sql 
SECURITY DEFINER
STABLE
AS $$ 
    SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1; 
$$;

-- 3. POLÍTICA: Acesso Total para Master Admin
-- O Master continua podendo ver e gerenciar tudo
CREATE POLICY "master_manage_all_services" ON public.services
FOR ALL
TO authenticated
USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'master' );

-- 4. POLÍTICA: Donos gerenciam apenas seus próprios serviços
-- Permite SELECT, INSERT, UPDATE e DELETE
CREATE POLICY "owners_manage_own_services" ON public.services
FOR ALL
TO authenticated
USING ( 
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner' 
    AND tenant_id = public.get_auth_tenant_id()
)
WITH CHECK ( 
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner' 
    AND tenant_id = public.get_auth_tenant_id()
);

-- 5. POLÍTICA: Leitura Pública (para o cliente ver no agendamento)
-- Permite que qualquer pessoa veja os serviços ativos de uma loja
CREATE POLICY "public_read_services" ON public.services
FOR SELECT
TO anon, authenticated
USING ( active = true );

-- 6. POLÍTICA: Barbeiros veem os serviços da sua loja
CREATE POLICY "professionals_read_services" ON public.services
FOR SELECT
TO authenticated
USING ( tenant_id = public.get_auth_tenant_id() );

-- ================================================================
-- SCRIPT FINALIZADO
-- Copie e cole no SQL Editor do Supabase e clique em RUN.
-- ================================================================
