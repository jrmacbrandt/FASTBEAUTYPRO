-- Ativa o Supabase Realtime para a tabela appointments
-- Execute este SQL no Supabase SQL Editor

-- 1. Adiciona a tabela à publicação do Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;

-- 2. Verifica se foi adicionada (deve retornar 'appointments')
SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
