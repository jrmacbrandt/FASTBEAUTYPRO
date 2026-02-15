-- Adiciona coluna de cor terciária (degradê) na tabela tenants
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS tertiary_color TEXT DEFAULT '#09090b';

-- Comentários para documentação
COMMENT ON COLUMN tenants.tertiary_color IS 'Cor terciária para efeito de degradê no fundo da página de agendamento';
