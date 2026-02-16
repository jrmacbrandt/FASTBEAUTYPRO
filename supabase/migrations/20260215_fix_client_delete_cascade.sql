-- Migração para corrigir a exclusão de clientes (Cascade Delete)
-- Esta migração garante que ao excluir um cliente, todos os seus agendamentos e registros vinculados sejam removidos automaticamente.

-- 1. Ajustar a tabela de agendamentos (appointments)
ALTER TABLE public.appointments 
DROP CONSTRAINT IF EXISTS appointments_client_id_fkey;

ALTER TABLE public.appointments 
ADD CONSTRAINT appointments_client_id_fkey 
FOREIGN KEY (client_id) 
REFERENCES public.clients(id) 
ON DELETE CASCADE;

-- 2. Verificar se existe a tabela de cartões fidelidade e ajustar (se houver)
DO $$ 
BEGIN 
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'loyalty_cards') THEN
        ALTER TABLE public.loyalty_cards 
        DROP CONSTRAINT IF EXISTS loyalty_cards_client_id_fkey;
        
        ALTER TABLE public.loyalty_cards 
        ADD CONSTRAINT loyalty_cards_client_id_fkey 
        FOREIGN KEY (client_id) 
        REFERENCES public.clients(id) 
        ON DELETE CASCADE;
    END IF;
END $$;

-- 3. Caso existam registros de notificações ou envios vinculados diretamente ao cliente
DO $$ 
BEGIN 
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'campaign_items') THEN
        ALTER TABLE public.campaign_items 
        DROP CONSTRAINT IF EXISTS campaign_items_client_id_fkey;
        
        ALTER TABLE public.campaign_items 
        ADD CONSTRAINT campaign_items_client_id_fkey 
        FOREIGN KEY (client_id) 
        REFERENCES public.clients(id) 
        ON DELETE CASCADE;
    END IF;
END $$;
