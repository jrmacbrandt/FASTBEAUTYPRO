-- MIGRATION: ADIDIONAR CAMPOS DE ENDEREÇO E IDENTIFICAÇÃO EM TENANTS
-- Este script adiciona os campos necessários para configurar totalmente os dados da unidade.

BEGIN;

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS address_zip TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS address_street TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS address_number TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS address_complement TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS address_neighborhood TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS address_city TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS address_state TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS tax_id TEXT; -- CPF ou CNPJ da Loja

COMMIT;
