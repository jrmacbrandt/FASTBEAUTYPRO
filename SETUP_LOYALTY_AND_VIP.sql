-- ================================================================
-- SETUP FINAL v3.1: CORREÇÃO DE SCHEMA, FIDELIDADE E VIP
-- ================================================================

-- 1. Adiciona a coluna faltante na tabela tenants se ela não existir
-- Isso evita o erro "column status_pagamento does not exist"
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS status_pagamento TEXT DEFAULT 'PENDENTE';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS business_type TEXT DEFAULT 'barber'; -- Para diferenciar Barbearia/Salão

-- 2. Agora o comando de correção de texto funcionará sem erro
UPDATE tenants SET status_pagamento = 'PENDENTE' WHERE status_pagamento = 'PENDENT';

-- 3. Tabela de Clube de Assinatura (VIP) - Estrutura Atômica
CREATE TABLE IF NOT EXISTS client_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  client_phone TEXT NOT NULL,
  benefits JSONB NOT NULL, -- Ex: {"corte": 4, "unha": 2}
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'ATIVO'
);

-- 4. Tabela de Fidelidade (5+1)
CREATE TABLE IF NOT EXISTS client_loyalty (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  client_phone TEXT NOT NULL,
  service_id UUID REFERENCES services(id),
  stamps_count INT DEFAULT 0,
  last_stamp_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Habilitar RLS e criar políticas de isolamento para Multi-tenancy
ALTER TABLE client_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_loyalty ENABLE ROW LEVEL SECURITY;

-- Remove políticas antigas se existirem para evitar duplicidade/erro
DROP POLICY IF EXISTS "Tenant isolation" ON client_subscriptions;
CREATE POLICY "Tenant isolation" ON client_subscriptions FOR ALL USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Tenant isolation loyalty" ON client_loyalty;
CREATE POLICY "Tenant isolation loyalty" ON client_loyalty FOR ALL USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- ================================================================
-- FIM DO SCRIPT v3.1
-- ================================================================
