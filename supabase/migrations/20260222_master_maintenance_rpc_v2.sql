-- Atualiza a função Segura para Master ativar/desativar Manutenção
CREATE OR REPLACE FUNCTION public.master_toggle_maintenance(
    target_tenant_id UUID,
    enable_maintenance BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Roda como superusuário do banco
AS $$
BEGIN
    -- Verifica se quem chama é realmente um Master (via auth.uid ou email)
    IF NOT EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = auth.uid() 
        AND email = 'jrmacbrandt@gmail.com'
    ) THEN
        RAISE EXCEPTION 'Acesso negado: Apenas Master Admins podem usar esta função.';
    END IF;

    -- Executa a alteração
    UPDATE public.tenants
    SET maintenance_mode = enable_maintenance
    WHERE id = target_tenant_id;

    RETURN jsonb_build_object(
        'success', true, 
        'tenant_id', target_tenant_id, 
        'maintenance_mode', enable_maintenance
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
