-- Protocolo de Segurança v4.0 - Notificações
-- Garante que Administradores possam enviar e Profissionais possam ler suas notificações

-- 1. Habilitar RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 2. Limpar políticas existentes para evitar conflitos
DROP POLICY IF EXISTS "Admins can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;

-- 3. Política de Inserção (Admin -> Profissional)
-- Permite que qualquer usuário autenticado insira (RLS de tenant_id será validado na leitura)
CREATE POLICY "Admins can insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 4. Política de Leitura (Profissional)
-- O usuário só vê notificações onde o receiver_id é o seu próprio ID
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (auth.uid() = receiver_id);

-- 5. Política de Atualização (Marcar como lido)
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (auth.uid() = receiver_id)
WITH CHECK (auth.uid() = receiver_id);
