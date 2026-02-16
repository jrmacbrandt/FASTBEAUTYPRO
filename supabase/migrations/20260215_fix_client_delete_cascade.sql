-- Migração para corrigir a exclusão de clientes (Cascade Delete) - Versão Corrigida
-- Esta migração garante que ao excluir um cliente, seus agendamentos vinculados sejam removidos automaticamente.

-- 1. Ajustar a tabela de agendamentos (appointments)
-- Confirmamos que esta é a tabela que gera o erro de Foreign Key
ALTER TABLE public.appointments 
DROP CONSTRAINT IF EXISTS appointments_client_id_fkey;

ALTER TABLE public.appointments 
ADD CONSTRAINT appointments_client_id_fkey 
FOREIGN KEY (client_id) 
REFERENCES public.clients(id) 
ON DELETE CASCADE;

-- Nota: Outras tabelas como 'client_loyalty' e 'campaign_items' utilizam 
-- o telefone (client_phone) como identificador denormalizado, 
-- portanto não possuem a coluna client_id nem a restrição de FK.
