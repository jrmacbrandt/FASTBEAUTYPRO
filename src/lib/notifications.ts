import { supabase } from './supabase';

export interface Notification {
    id: string;
    tenant_id?: string;
    receiver_id: string;
    title: string;
    message: string;
    type: 'master_info' | 'team_alert' | 'system_alert';
    priority: 'high' | 'normal';
    is_read: boolean;
    created_at: string;
}

/**
 * Envia uma notificação (Master -> Admin ou Admin -> Equipe).
 */
export async function sendNotification(
    receiverId: string,
    title: string,
    message: string,
    type: Notification['type'] = 'team_alert',
    priority: Notification['priority'] = 'normal',
    tenantId?: string // Opcional se for Master -> Global
) {
    const { error } = await supabase
        .from('notifications')
        .insert({
            receiver_id: receiverId,
            tenant_id: tenantId,
            title,
            message,
            type,
            priority,
            is_read: false
        });

    if (error) {
        console.error('Error sending notification:', error);
        throw error;
    }

    return { success: true };
}

/**
 * Busca notificações do usuário logado.
 */
export async function getUserNotifications() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('receiver_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error('Error fetching notifications:', error);
        return [];
    }

    return data as Notification[];
}

/**
 * Marca notificação como lida.
 */
export async function markNotificationAsRead(notificationId: string) {
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

    if (error) console.error('Error marking as read:', error);
}
