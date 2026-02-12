-- Upgrade RLS Notificações v5.0 - Master Admin Control
-- Permite que Master Admins gerenciem comunicados globais e de suporte

-- 1. Permitir que Master Admins vejam todas as notificações do tipo 'master_info'
DROP POLICY IF EXISTS "Master Admins can view master_info notifications" ON public.notifications;
CREATE POLICY "Master Admins can view master_info notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'master'
    )
    AND type = 'master_info'
);

-- 2. Permitir que Master Admins excluam notificações do tipo 'master_info'
DROP POLICY IF EXISTS "Master Admins can delete master_info notifications" ON public.notifications;
CREATE POLICY "Master Admins can delete master_info notifications"
ON public.notifications
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'master'
    )
    AND type = 'master_info'
);

-- Nota: Os Owners já possuem permissão de SELECT no tenant_id via a política anterior.
-- Esta política foca no controle do Master Admin sobre o canal master_info.
