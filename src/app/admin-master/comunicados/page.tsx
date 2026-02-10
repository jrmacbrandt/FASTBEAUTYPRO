'use client';

import { useState } from 'react';
import { sendNotification } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';

export default function MasterComunicadosPage() {
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [targetType, setTargetType] = useState('all'); // all, specific_tenant

    // Simplificação: Enviar para TODOS os Admins (MVP)
    // Para escalar, precisaríamos de uma query "Get all admins" ou enviar para um canal PubSub
    // Como o notification system é BD-based, vamos iterar ou criar um registro "global" (tenant_id null).
    // O sistema atual suporta tenant_id null como global?
    // Verificando migration: "tenant_id UUID REFERENCES tenants(id)". Se for NULL, ok.
    // Mas a receiver_id é required.
    // Estratégia v4.0: Loop em todos os admins.

    const handleSend = async () => {
        setLoading(true);
        try {
            // 1. Buscar todos os admins
            const { data: admins, error: usersError } = await supabase
                .from('profiles')
                .select('id')
                .in('role', ['admin', 'admin-master']);

            if (usersError) throw usersError;

            if (!admins || admins.length === 0) {
                alert('Nenhum admin encontrado.');
                return;
            }

            // 2. Enviar notificação para cada um
            const promises = admins.map(admin =>
                sendNotification(
                    admin.id,
                    title,
                    message,
                    'master_info',
                    'high',
                    undefined // Global (sem tenant específico na origem, ou null)
                )
            );

            await Promise.all(promises);

            alert(`Comunicado enviado para ${admins.length} administradores.`);
            setTitle('');
            setMessage('');

        } catch (error: any) {
            console.error('Error sending global notification:', error);
            alert('Erro ao enviar: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8 text-slate-100 animate-in fade-in duration-700">
            <header>
                <h1 className="text-3xl font-black italic tracking-tighter text-white">
                    CENTRAL DE <span className="text-[#f2b90d]">COMUNICADOS</span>
                </h1>
                <p className="text-sm text-slate-400">Envie notificações importantes para todos os inquilinos da plataforma.</p>
            </header>

            <div className="bg-[#18181b] border border-white/5 rounded-2xl p-8 space-y-6">

                <div className="space-y-2">
                    <label className="text-xs uppercase font-bold text-slate-500">Título do Comunicado</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Ex: Manutenção Programada ou Nova Funcionalidade"
                        className="w-full bg-black/20 border border-white/10 rounded-lg p-4 text-white focus:border-[#f2b90d] outline-none transition-all"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-xs uppercase font-bold text-slate-500">Mensagem</label>
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={5}
                        placeholder="Digite a mensagem que aparecerá no painel de todos os administradores..."
                        className="w-full bg-black/20 border border-white/10 rounded-lg p-4 text-white focus:border-[#f2b90d] outline-none transition-all"
                    />
                </div>

                <div className="pt-6 border-t border-white/5 flex justify-end">
                    <button
                        onClick={handleSend}
                        disabled={loading || !title || !message}
                        className="bg-[#f2b90d] hover:bg-[#d9a50b] text-black font-black uppercase tracking-widest px-8 py-4 rounded-xl transition-all shadow-lg hover:shadow-[#f2b90d]/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Enviando...' : 'ENVIAR COMUNICADO GLOBAL'}
                    </button>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg flex gap-3 items-start">
                    <span className="material-symbols-outlined text-blue-400">info</span>
                    <div>
                        <h4 className="text-xs font-bold text-blue-400 uppercase">Como funciona?</h4>
                        <p className="text-xs text-slate-400 mt-1">
                            Ao enviar, todos os usuários com permissão 'admin' ou 'admin-master' receberão um alerta no sino de notificações do painel.
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
}
