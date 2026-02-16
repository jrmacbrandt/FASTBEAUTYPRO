-- ADICIONA COLUNA DE PREÇO AO AGENDAMENTO
-- Motivo: Permitir que o admin edite o valor do serviço/agendamento (descontos, acréscimos)
-- sem alterar o preço base do serviço original.

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS price DECIMAL(10,2);

-- Migra dados existentes: Copia o preço do serviço original para o agendamento
UPDATE appointments 
SET price = (
    SELECT s.price 
    FROM services s 
    WHERE s.id = appointments.service_id
)
WHERE price IS NULL AND service_id IS NOT NULL;

-- Garante que a coluna não seja nula futuramente (opcional, mas recomendado se todo agendamento tem valor)
-- ALTER TABLE appointments ALTER COLUMN price SET NOT NULL;
