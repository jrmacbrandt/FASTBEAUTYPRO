'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getUserNotifications, markNotificationAsRead, Notification } from '@/lib/notifications';

export function NotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

    useEffect(() => {
        loadNotifications();

        const channel = supabase
            .channel('notifications_bell')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'notifications' },
                () => {
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

    const handleOpen = () => {
        setIsOpen(!isOpen);
    };

    const handleSelectNotification = async (n: Notification) => {
        setSelectedNotification(n);
        setIsOpen(false);
        if (!n.is_read) {
            await markNotificationAsRead(n.id);
            setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, is_read: true } : item));
            setUnreadCount(prev => Math.max(0, prev - 1));
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
                    <div className="p-4 border-b border-white/5 flex justify-between items-center bg-black/20">
                        <h3 className="font-bold text-white text-xs uppercase tracking-widest italic">Comunicados</h3>
                        <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                            <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 text-[10px] font-black uppercase tracking-widest italic opacity-40">
                                Nenhum comunicado.
                            </div>
                        ) : (
                            <div className="divide-y divide-white/5">
                                {notifications.map(n => (
                                    <button
                                        key={n.id}
                                        onClick={() => handleSelectNotification(n)}
                                        className={`w-full p-4 hover:bg-white/5 transition-all text-left flex items-center gap-3 group ${!n.is_read ? 'bg-white/[0.02]' : ''}`}
                                    >
                                        <div className={`size-2 rounded-full shrink-0 ${!n.is_read ? 'bg-[#f2b90d] shadow-[0_0_8px_#f2b90d80]' : 'bg-slate-700'}`} />
                                        <div className="flex-1 min-w-0">
                                            <h4 className={`text-xs truncate transition-colors ${!n.is_read ? 'text-white font-bold' : 'text-slate-500 group-hover:text-slate-300'}`}>
                                                {n.title}
                                            </h4>
                                            <span className="text-[8px] text-slate-600 mt-1 block font-bold uppercase tracking-tighter">
                                                {new Date(n.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <span className="material-symbols-outlined text-slate-700 text-sm group-hover:translate-x-1 transition-transform">chevron_right</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Modal de Leitura */}
            {selectedNotification && (
                <div className="fixed inset-0 z-[200] flex items-start justify-center p-4 pt-24 md:pt-32 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-[#121214] border border-white/10 w-full max-w-lg rounded-[2.5rem] shadow-2xl flex flex-col max-h-[70vh] md:max-h-[80vh] overflow-hidden animate-in fade-in duration-300">
                        <div className="p-8 md:p-10 flex flex-col min-h-0">
                            {/* Header (Fixo) */}
                            <div className="shrink-0">
                                <div className="size-16 bg-[#f2b90d]/10 rounded-2xl flex items-center justify-center text-[#f2b90d] mb-6">
                                    <span className="material-symbols-outlined text-3xl">mark_email_unread</span>
                                </div>

                                <h3 className="text-2xl font-black italic uppercase text-white tracking-tighter mb-2 leading-tight line-clamp-2">
                                    {selectedNotification.title}
                                </h3>
                                <p className="text-[10px] font-black uppercase tracking-widest text-[#f2b90d] mb-8 opacity-60 italic">
                                    Recebido em {new Date(selectedNotification.created_at).toLocaleDateString()} às {new Date(selectedNotification.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>

                            {/* Área de Texto (Rolagem Única) */}
                            <div className="bg-black/40 border border-white/5 rounded-3xl p-6 mb-8 overflow-y-auto overflow-x-hidden custom-scrollbar flex-1 min-h-[100px]">
                                <p className="text-slate-300 leading-relaxed font-medium whitespace-pre-wrap break-words">
                                    {selectedNotification.message}
                                </p>
                            </div>

                            {/* Footer (Fixo) */}
                            <div className="shrink-0">
                                <button
                                    onClick={() => setSelectedNotification(null)}
                                    className="w-full bg-[#f2b90d] hover:bg-[#d9a50c] text-black font-black py-5 rounded-2xl transition-all uppercase italic tracking-widest text-sm shadow-lg active:scale-95"
                                >
                                    FECHAR COMUNICADO
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
