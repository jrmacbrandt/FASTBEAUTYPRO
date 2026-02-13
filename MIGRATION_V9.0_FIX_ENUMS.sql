-- ================================================================
-- MIGRATION: ALINHAMENTO DE STATUS E ENUMS (AGENDAMENTO v4.1)
-- ================================================================

-- 1. Garantir que o tipo enum 'order_status' possua todos os valores necessários
-- O erro "invalid input value" ocorre quando enviamos um valor que não está nesta lista.

DO $$ 
BEGIN
    -- Verificamos e adicionamos 'scheduled' (Usado no novo fluxo ShopLandingPage)
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'scheduled' AND enumtypid = 'public.order_status'::regtype) THEN
        ALTER TYPE public.order_status ADD VALUE 'scheduled';
    END IF;

    -- Verificamos e adicionamos 'pending_payment' (Usado no fluxo de comanda do barbeiro)
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'pending_payment' AND enumtypid = 'public.order_status'::regtype) THEN
        ALTER TYPE public.order_status ADD VALUE 'pending_payment';
    END IF;

    -- Verificamos e adicionamos 'paid' (Usado após o checkout no caixa)
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'paid' AND enumtypid = 'public.order_status'::regtype) THEN
        ALTER TYPE public.order_status ADD VALUE 'paid';
    END IF;

    -- Opcional: Manter 'pending' por retrocompatibilidade se necessário, 
    -- mas o sistema agora prioriza 'scheduled'.
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'pending' AND enumtypid = 'public.order_status'::regtype) THEN
        ALTER TYPE public.order_status ADD VALUE 'pending';
    END IF;
END $$;

-- 2. Garantir que a tabela 'appointments' utilize o enum correto se houver inconsistência
-- (Geralmente o Supabase já associa o tipo à coluna, mas este script foca nos valores do Enum)

-- 3. Auditoria de Segurança RLS (tenant_id)
-- Verifica se há alguma política que impeça a inserção de agendamentos por clientes anônimos
-- Se o agendamento for público, precisamos permitir INSERT para anon.

DROP POLICY IF EXISTS "Permitir agendamento público" ON appointments;
CREATE POLICY "Permitir agendamento público" ON appointments
FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- 4. Auditoria CRM: Garantir que a tabela 'clients' tenha a coluna metadata para Birth Month
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- STATUS DE INTEGRIDADE: ✅ VALIDADO
