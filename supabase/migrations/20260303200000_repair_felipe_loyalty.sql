-- ================================================================
-- REPARO DE DADOS: FELIPE (ESTRELA DE FIDELIDADE)
-- Instruções: Execute estes comandos no SQL Editor do Supabase
-- ================================================================

-- 1. Variáveis auxiliares (Defina os dados reais se necessário)
DO $$
DECLARE
    v_tenant_id UUID := '3776c693-4ef9-42d5-b7ff-8c3d1a6d4588'; -- Simone Coiffeur
    v_felipe_phone TEXT := '21982872653';
    v_appointment_id UUID := 'a9f31655-9dbe-45d8-868a-725fffc512e5';
    v_client_id UUID;
BEGIN
    -- 2. Localizar ou Criar o Cliente
    SELECT id INTO v_client_id 
    FROM public.clients 
    WHERE tenant_id = v_tenant_id AND phone = v_felipe_phone;

    IF v_client_id IS NULL THEN
        INSERT INTO public.clients (tenant_id, name, phone, total_spent, total_visits, origin_source)
        VALUES (v_tenant_id, 'Felipe', v_felipe_phone, 0, 1, 'Manual Repair')
        RETURNING id INTO v_client_id;
        RAISE NOTICE 'Cliente Felipe criado com ID: %', v_client_id;
    ELSE
        UPDATE public.clients 
        SET total_visits = COALESCE(total_visits, 0) + 1
        WHERE id = v_client_id;
        RAISE NOTICE 'Visita incrementada para o cliente ID: %', v_client_id;
    END IF;

    -- 3. Vincular o Agendamento ao Cliente
    UPDATE public.appointments 
    SET client_id = v_client_id 
    WHERE id = v_appointment_id;
    RAISE NOTICE 'Agendamento vinculado ao cliente.';

    -- 4. Garantir Registro na Tabela de Fidelidade (client_loyalty)
    -- O CRM calcula estrelas as vezes pelo total_visits e as vezes pelo client_loyalty
    INSERT INTO public.client_loyalty (tenant_id, client_id, client_phone, stamps_count, last_stamp_at)
    VALUES (v_tenant_id, v_client_id, v_felipe_phone, 1, NOW())
    ON CONFLICT (tenant_id, client_phone) 
    DO UPDATE SET 
        stamps_count = public.client_loyalty.stamps_count + 1,
        last_stamp_at = NOW();
    
    RAISE NOTICE 'Selo de fidelidade adicionado com sucesso.';
END $$;
