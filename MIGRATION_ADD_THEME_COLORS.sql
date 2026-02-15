-- Adiciona colunas de customização de cores na tabela tenants
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#f2b90d';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '#09090b';

-- Comentários para documentação
COMMENT ON COLUMN tenants.primary_color IS 'Cor primária para a página pública de agendamento (Brand Color)';
COMMENT ON COLUMN tenants.secondary_color IS 'Cor de fundo/secundária para a página de agendamento';
