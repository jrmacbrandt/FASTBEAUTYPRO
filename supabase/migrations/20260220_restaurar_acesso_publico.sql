-- ================================================================
-- 🛡️ RESTAURAÇÃO DE ACESSO PÚBLICO (FLUXO DE AGENDAMENTO)
-- ================================================================
-- Finalidade: Permitir que clientes não autenticados (anon) 
-- possam visualizar lojas, serviços, profissionais e realizar 
-- agendamentos, mantendo a integridade do sistema v5.0.
-- ================================================================

BEGIN;

-- 1. TENANTS: Leitura pública para resolução de slug e exibição básica
-- Importante para o ShopLandingPage carregar os dados da loja
CREATE POLICY "tenants_public_read_v5" ON public.tenants 
FOR SELECT TO anon USING (true);

-- 2. SERVICES: Leitura pública de serviços ativos
-- Permite que o cliente veja o catálogo de serviços
CREATE POLICY "services_public_read_v5" ON public.services 
FOR SELECT TO anon USING (active = true);

-- 3. PROFILES: Leitura pública apenas de profissionais ativos (barber)
-- Protege dados sensíveis de outros perfis (admin/owner)
CREATE POLICY "profiles_public_read_v5" ON public.profiles 
FOR SELECT TO anon 
USING (role = 'barber' AND status = 'active');

-- 4. APPOINTMENTS: Leitura e Inserção pública
-- SELECT: Necessário para o componente de calendário verificar disponibilidade
-- INSERT: Necessário para o cliente salvar o novo agendamento
CREATE POLICY "appointments_public_read_v5" ON public.appointments 
FOR SELECT TO anon USING (true);

CREATE POLICY "appointments_public_insert_v5" ON public.appointments 
FOR INSERT TO anon WITH CHECK (true);

-- 5. CLIENTS: Upsert público (CRM de Autocaptura)
-- O fluxo de agendamento usa .upsert() na tabela clients
CREATE POLICY "clients_public_insert_v5" ON public.clients 
FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "clients_public_update_v5" ON public.clients 
FOR UPDATE TO anon USING (true);

-- 6. FIDELIDADE E VIP: Leitura de distintivos (Badges)
-- Usado pelo VerificationBadge para identificar clientes recorrentes/VIPs
CREATE POLICY "loyalty_public_read_v5" ON public.client_loyalty 
FOR SELECT TO anon USING (true);

CREATE POLICY "subs_public_read_v5" ON public.client_subscriptions 
FOR SELECT TO anon USING (true);

COMMIT;

-- 🔍 VALIDAÇÃO
-- O comando abaixo deve listar as novas políticas 'public_..._v5' vinculadas ao role 'anon'
-- SELECT tablename, policyname, roles, cmd FROM pg_policies WHERE policyname LIKE '%public%v5%';
