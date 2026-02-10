-- ================================================================
-- MIGRATION V4.0: CRM, CAMPANHAS E COMUNICAÇÃO
-- ================================================================

-- 1. TABELA DE CLIENTES (CRM BASE)
-- Centraliza dados e permite campos dinâmicos via JSONB
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    birth_date DATE,
    metadata JSONB DEFAULT '{}'::jsonb, -- Armazena fórmulas, preferências, notas
    origin_source TEXT, -- "Instagram", "Google", "Indicação"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    last_visit TIMESTAMP WITH TIME ZONE,
    total_spent NUMERIC DEFAULT 0,
    UNIQUE(tenant_id, phone) -- Evita duplicidade dentro da mesma loja
);

-- RLS Clientes
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation clients" ON clients;
CREATE POLICY "Tenant isolation clients" ON clients 
    FOR ALL 
    USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));


-- 2. ATUALIZAÇÃO DE AGENDAMENTOS (RASTREIO)
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS origin_source TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS utm_source TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS utm_campaign TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id); -- Link opcional futuro


-- 3. MOTOR DE CAMPANHAS (WHATSAPP SETUP)
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- "Aniversariantes Março"
    filters JSONB NOT NULL, -- {"days_inactive": 45} ou {"min_spent": 500}
    message_template TEXT, -- "Olá {name}, saudades! Volte e ganhe 10%."
    status TEXT DEFAULT 'DRAFT', -- DRAFT, PROCESSED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS Campanhas
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation campaigns" ON campaigns;
CREATE POLICY "Tenant isolation campaigns" ON campaigns 
    FOR ALL 
    USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));


-- 4. ITENS DA CAMPANHA (LOG DE DISPARO)
CREATE TABLE IF NOT EXISTS campaign_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    client_name TEXT,
    client_phone TEXT,
    generated_url TEXT, -- Link wa.me pronto
    status TEXT DEFAULT 'PENDING', -- PENDING, SENT
    sent_at TIMESTAMP WITH TIME ZONE
);

-- RLS Itens de Campanha
ALTER TABLE campaign_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation campaign_items" ON campaign_items;
CREATE POLICY "Tenant isolation campaign_items" ON campaign_items 
    FOR ALL 
    USING (campaign_id IN (SELECT id FROM campaigns WHERE tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())));


-- 5. NOTIFICAÇÕES (FLUXO UNIDIRECIONAL)
-- Master -> Admin OU Admin -> Equipe
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- Null se for msg do Sistema Global
    receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info', -- master_info, team_alert
    priority TEXT DEFAULT 'normal', -- high, normal
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS Notificações
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own notifications" ON notifications;
CREATE POLICY "Users see own notifications" ON notifications 
    FOR SELECT 
    USING (receiver_id = auth.uid());

-- Política de Inserção: Autenticado pode inserir? 
-- Regra: Apenas via Server Actions seguras, mas o padrão Postgres permite Insert se o RLS não bloquear. 
-- Vamos restringir no Backend. O RLS abaixo permite insert se for para alguém do mesmo Tenant (Admin -> Equipe)
DROP POLICY IF EXISTS "Admin sends to team" ON notifications;
CREATE POLICY "Admin sends to team" ON notifications 
    FOR INSERT 
    WITH CHECK (
        tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()) OR tenant_id IS NULL -- Permitir NULL apenas se for super-admin (validado via role depois)
    );
