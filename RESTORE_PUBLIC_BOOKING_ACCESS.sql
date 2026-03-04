-- ================================================================
-- 🛡️ RESTAURAÇÃO DE ACESSO PÚBLICO (FLUXO DE AGENDAMENTO)
-- Finalidade: Restaurar políticas para usuários 'anon' que foram
--             removidas em migrações de segurança anteriores.
-- ================================================================

BEGIN;

-- 1. TENANTS: Leitura básica
DROP POLICY IF EXISTS "tenants_public_read_v5" ON public.tenants;
CREATE POLICY "tenants_public_read_v5" ON public.tenants 
FOR SELECT TO anon USING (true);

-- 2. SERVICES: Leitura de serviços ativos
DROP POLICY IF EXISTS "services_public_read_v5" ON public.services;
CREATE POLICY "services_public_read_v5" ON public.services 
FOR SELECT TO anon USING (active = true);

-- 3. PROFILES: Leitura limitada de profissionais
DROP POLICY IF EXISTS "profiles_public_read_v5" ON public.profiles;
CREATE POLICY "profiles_public_read_v5" ON public.profiles 
FOR SELECT TO anon 
USING (role = 'barber' AND status = 'active');

-- 4. APPOINTMENTS: Leitura e Inserção
DROP POLICY IF EXISTS "appointments_public_read_v5" ON public.appointments;
CREATE POLICY "appointments_public_read_v5" ON public.appointments 
FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "appointments_public_insert_v5" ON public.appointments;
CREATE POLICY "appointments_public_insert_v5" ON public.appointments 
FOR INSERT TO anon WITH CHECK (true);

-- 5. CLIENTS: SELECT, INSERT e UPDATE (Necessário para .upsert())
-- O .upsert() do PostgREST exige SELECT privilege nos campos de conflito.
DROP POLICY IF EXISTS "clients_public_all_v5" ON public.clients;
CREATE POLICY "clients_public_all_v5" ON public.clients 
FOR ALL TO anon 
USING (true)
WITH CHECK (true);

-- 6. FIDELIDADE: SELECT, INSERT e UPDATE (Necessário para .upsert())
DROP POLICY IF EXISTS "loyalty_public_all_v5" ON public.client_loyalty;
CREATE POLICY "loyalty_public_all_v5" ON public.client_loyalty 
FOR ALL TO anon 
USING (true)
WITH CHECK (true);

-- 7. SUBSCRIPTIONS: Leitura pública
DROP POLICY IF EXISTS "subs_public_read_v5" ON public.client_subscriptions;
CREATE POLICY "subs_public_read_v5" ON public.client_subscriptions 
FOR SELECT TO anon USING (true);

COMMIT;

-- 🔍 VERIFICAÇÃO
SELECT tablename, policyname, roles, cmd 
FROM pg_policies 
WHERE schemaname = 'public' AND roles @> ARRAY['anon']::name[]
ORDER BY tablename;
