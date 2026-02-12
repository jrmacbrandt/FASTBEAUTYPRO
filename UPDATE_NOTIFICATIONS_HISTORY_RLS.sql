-- Upgrade RLS Notificações v4.1 - Histórico e Exclusão Admin
-- Adiciona permissões para Administradores gerenciarem notificações do seu tenant

-- 1. Permitir que Admins visualizem o histórico do tenant
DROP POLICY IF EXISTS "Admins can view tenant notifications" ON public.notifications;
CREATE POLICY "Admins can view tenant notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('owner', 'master') 
        AND profiles.tenant_id = notifications.tenant_id
    )
);

-- 2. Permitir que Admins excluam notificações do tenant
DROP POLICY IF EXISTS "Admins can delete tenant notifications" ON public.notifications;
CREATE POLICY "Admins can delete tenant notifications"
ON public.notifications
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('owner', 'master') 
        AND profiles.tenant_id = notifications.tenant_id
    )
);
