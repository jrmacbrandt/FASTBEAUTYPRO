-- MIGRATION V4.5: CRM ENGAGEMENT & LAST CONTACT
-- Adiciona rastreio de último contato para evitar spam e melhorar gestão

ALTER TABLE IF EXISTS clients 
ADD COLUMN IF NOT EXISTS last_contact_at TIMESTAMP WITH TIME ZONE;

-- Comentário para documentação do campo
COMMENT ON COLUMN clients.last_contact_at IS 'Data do último disparo de WhatsApp feito pelo sistema para este cliente.';
