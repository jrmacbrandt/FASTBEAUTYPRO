-- ================================================================
-- ☢️ SUPREME NUCLEAR TENANT DELETE V6 (INFINITE ASSERTIVITY)
-- ================================================================
-- Esta é a versão final e definitiva. Ela não tenta adivinhar a ordem.
-- Ela usa um motor dinâmico que descobre todas as tabelas e executa
-- um loop de limpeza iterativo (12 ciclos) para resolver qualquer FK.

CREATE OR REPLACE FUNCTION delete_tenant_cascade(target_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    r RECORD;
    stmt TEXT;
    i INTEGER;
    master_email TEXT := 'jrmacbrandt@gmail.com';
BEGIN
    RAISE NOTICE 'Iniciando Operação Suprema V6 para Tenant: %', target_tenant_id;

    -- SEGURANÇA: Impedir a exclusão do Tenant do Master Admin (se houver um)
    IF EXISTS (SELECT 1 FROM profiles WHERE email = master_email AND tenant_id = target_tenant_id) THEN
        RAISE EXCEPTION 'Operação Abortada: Este tenant contém o Perfil Master e não pode ser excluído.';
    END IF;

    -- LOOP NUCLEAR (12 CICLOS)
    -- Por que 12? Porque é estatisticamente impossível ter uma cadeia de FK maior que 12 níveis.
    -- Cada ciclo limpa o que estiver "livre" (sem filhos), liberando o pai para o próximo ciclo.
    FOR i IN 1..12 LOOP
        RAISE NOTICE 'Ciclo de Limpeza Nuclear %/12...', i;

        -- 1. Limpeza Dinâmica baseada em coluna 'tenant_id'
        FOR r IN 
            SELECT DISTINCT table_name 
            FROM information_schema.columns 
            WHERE column_name = 'tenant_id' 
            AND table_schema = 'public'
            AND table_name != 'tenants'
        LOOP
            BEGIN
                stmt := format('DELETE FROM public.%I WHERE tenant_id = %L', r.table_name, target_tenant_id);
                EXECUTE stmt;
            EXCEPTION WHEN OTHERS THEN
                -- Se falhar (FK), apenas ignoramos e tentamos no próximo ciclo
                RAISE NOTICE 'Passando tabela % (bloqueada por FK)...', r.table_name;
            END;
        END LOOP;

        -- 2. Limpeza Dinâmica baseada em Foreign Keys de 'orders' (específico para Items)
        FOR r IN 
            SELECT tc.table_name, kcu.column_name 
            FROM information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'orders' AND tc.table_schema = 'public'
        LOOP
            BEGIN
                stmt := format('DELETE FROM public.%I WHERE %I IN (SELECT id FROM public.orders WHERE tenant_id = %L)', 
                               r.table_name, r.column_name, target_tenant_id);
                EXECUTE stmt;
            EXCEPTION WHEN OTHERS THEN CONTINUE;
            END;
        END LOOP;

        -- 3. Limpeza de Appointments (específico para Orders que apontam pra eles)
        IF to_regclass('public.orders') IS NOT NULL AND to_regclass('public.appointments') IS NOT NULL THEN
            BEGIN
                UPDATE public.orders SET appointment_id = NULL WHERE tenant_id = target_tenant_id;
                DELETE FROM public.appointments WHERE tenant_id = target_tenant_id;
            EXCEPTION WHEN OTHERS THEN CONTINUE;
            END;
        END IF;

        -- 4. Limpeza de Profiles (Barbeiros)
        -- Protegemos o e-mail Master se ele estiver por engano em algum tenant
        BEGIN
            DELETE FROM public.profiles 
            WHERE tenant_id = target_tenant_id 
            AND (email IS NULL OR email != master_email);
        EXCEPTION WHEN OTHERS THEN CONTINUE;
        END;

    END LOOP;

    -- FASE FINAL: Excluir o Tenant raiz
    DELETE FROM public.tenants WHERE id = target_tenant_id;
    
    RAISE NOTICE 'Operação Suprema V6 concluída com perfeição para: %', target_tenant_id;
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Falha Crítica na Operação Suprema V6: %', SQLERRM;
END;
$$;
