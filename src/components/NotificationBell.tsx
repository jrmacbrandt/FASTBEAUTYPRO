'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getUserNotifications, markNotificationAsRead, Notification } from '@/lib/notifications';

export function NotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        loadNotifications();

        // Subscribe to real-time changes
        const channel = supabase
            .channel('notifications_bell')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'notifications' },
                (payload) => {
                    const newNotif = payload.new as Notification;
                    // Check if it's for me (RLS handles fetch, but RT needs filter in client or specialized channel)
                    // Simplified: just reload for MVP
                    loadNotifications();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const loadNotifications = async () => {
        const list = await getUserNotifications();
        setNotifications(list);
        setUnreadCount(list.filter(n => !n.is_read).length);
    };

    const handleOpen = async () => {
        setIsOpen(!isOpen);
        if (!isOpen && unreadCount > 0) {
            // Mark all visible as read (could be optimized)
            // For now, just mark the unread ones
            const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
            if (unreadIds.length > 0) {
                // Parallel update
                await Promise.all(unreadIds.map(id => markNotificationAsRead(id)));
                setUnreadCount(0);
                // Update local state to read
                setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            }
        }
    };

    return (
        <div className="relative">
            <button
                onClick={handleOpen}
                className="relative p-2 text-slate-400 hover:text-white transition-colors"
            >
                <span className="material-symbols-outlined">notifications</span>
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 size-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-[#18181b] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-4 border-b border-white/5 flex justify-between items-center">
                        <h3 className="font-bold text-white text-sm">Notificações</h3>
                        {unreadCount === 0 && <span className="text-[10px] text-slate-500 uppercase">Todas lidas</span>}
                    </div>
                    <div className="max-h-[400px] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 text-xs">
                                Nenhuma notificação.
                            </div>
                        ) : (
                            <div className="divide-y divide-white/5">
                                {notifications.map(n => (
                                    <div key={n.id} className={`p-4 hover:bg-white/5 transition-colors ${!n.is_read ? 'bg-white/[0.02]' : ''}`}>
                                        <div className="flex gap-3">
                                            <div className={`mt-1 size-2 rounded-full shrink-0 ${n.type === 'master_info' ? 'bg-[#f2b90d]' :
                                                    n.priority === 'high' ? 'bg-red-500' : 'bg-slate-500'
                                                }`} />
                                            <div>
                                                <h4 className={`text-sm text-white ${!n.is_read ? 'font-bold' : 'font-medium'}`}>
                                                    {n.title}
                                                </h4>
                                                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                                    {n.message}
                                                </p>
                                                <span className="text-[10px] text-slate-600 mt-2 block">
                                                    {new Date(n.created_at).toLocaleDateString()} às {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
