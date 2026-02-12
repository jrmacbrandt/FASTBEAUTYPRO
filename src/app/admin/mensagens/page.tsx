"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { sendNotification } from '@/lib/notifications';

export default function TeamMessagesPage() {
    const [team, setTeam] = useState<{ id: string, full_name: string }[]>([]);
    const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
    const [messageText, setMessageText] = useState('');
    const [messageTitle, setMessageTitle] = useState('NOVO COMUNICADO');
    const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
    const [loading, setLoading] = useState(true);
    const [tenantId, setTenantId] = useState<string | null>(null);

    useEffect(() => {
        const fetchTeam = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const { data: profile } = await supabase
                .from('profiles')
                .select('tenant_id')
                .eq('id', session.user.id)
                .single();

            if (profile?.tenant_id) {
                setTenantId(profile.tenant_id);
                const { data } = await supabase
                    .from('profiles')
                    .select('id, full_name')
                    .eq('tenant_id', profile.tenant_id)
                    .eq('status', 'active')
                    .neq('role', 'owner');

                if (data) setTeam(data);
            }
            setLoading(false);
        };

        fetchTeam();
    }, []);

    const handleToggleRecipient = (id: string) => {
        setSelectedRecipients(prev =>
            prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
        );
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedRecipients(team.map(t => t.id));
        } else {
            setSelectedRecipients([]);
        }
    };

    const handleSendMessage = async () => {
        if (!messageText.trim() || selectedRecipients.length === 0) {
            alert('Por favor, selecione os destinatários e digite uma mensagem.');
            return;
        }

        if (!tenantId) {
            alert('Erro: ID da unidade não encontrado (tenantId is null).');
            return;
        }

        setStatus('sending');

        try {
            console.log('Iniciando envio para:', selectedRecipients.length, 'destinatários');

            await Promise.all(selectedRecipients.map(recipientId =>
                sendNotification(
                    recipientId,
                    messageTitle.toUpperCase() || 'COMUNICADO',
                    messageText,
                    'team_alert',
                    'normal',
                    tenantId
                )
            ));

            console.log('Envio concluído com sucesso');
            setStatus('success');
            setMessageText('');
            setMessageTitle('NOVO COMUNICADO');
            setSelectedRecipients([]);
            setTimeout(() => setStatus('idle'), 3000);
        } catch (error: any) {
            console.error('Erro detalhado ao enviar:', error);
            alert('Erro ao enviar comunicado: ' + (error.message || 'Verifique o console'));
            setStatus('error');
            setTimeout(() => setStatus('idle'), 3000);
        }
    };

    const isAllSelected = team.length > 0 && selectedRecipients.length === team.length;

    return (
        <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative pb-20 px-4 md:px-0">
            {status === 'success' && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none p-6 bg-black/20 backdrop-blur-sm">
                    <div className="bg-emerald-500 text-white px-8 md:px-10 py-6 md:py-8 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl animate-in zoom-in duration-300 flex flex-col items-center gap-3 md:gap-4 pointer-events-auto">
                        <span className="material-symbols-outlined text-4xl md:text-5xl font-bold italic">check_circle</span>
                        <div className="text-center">
                            <h4 className="text-lg md:text-xl font-black italic uppercase">Enviado</h4>
                            <p className="text-white/80 text-[8px] md:text-[10px] font-bold uppercase tracking-widest mt-1">Comunicado com sucesso!</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-[#121214] p-6 md:p-12 rounded-[2rem] md:rounded-[2.5rem] border border-white/5 shadow-2xl">
                <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-10">
                    <div className="size-12 md:size-14 bg-[#f2b90d]/10 rounded-xl md:rounded-2xl flex items-center justify-center text-[#f2b90d] shrink-0">
                        <span className="material-symbols-outlined text-2xl md:text-3xl">chat_bubble</span>
                    </div>
                    <div>
                        <h3 className="text-xl md:text-2xl font-black italic uppercase text-white tracking-tight leading-none mb-1">Novo Comunicado</h3>
                        <p className="text-slate-500 text-[8px] md:text-[10px] font-bold uppercase tracking-widest italic opacity-60">Aviso geral para colaboradores</p>
                    </div>
                </div>

                <div className="space-y-4 md:space-y-8">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <label className="text-[9px] md:text-[10px] font-black uppercase text-slate-500 tracking-widest italic opacity-60">Destinatários ({selectedRecipients.length})</label>

                            <label className="flex items-center gap-2 cursor-pointer group">
                                <span className="text-[9px] font-black uppercase text-slate-500 group-hover:text-[#f2b90d] transition-colors">Selecionar Todos</span>
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        className="sr-only"
                                        checked={isAllSelected}
                                        onChange={(e) => handleSelectAll(e.target.checked)}
                                    />
                                    <div className={`size-5 rounded-lg border-2 flex items-center justify-center transition-all ${isAllSelected ? 'bg-[#f2b90d] border-[#f2b90d]' : 'bg-black border-white/10 group-hover:border-white/20'}`}>
                                        {isAllSelected && <span className="material-symbols-outlined text-black text-[14px] font-black">check</span>}
                                    </div>
                                </div>
                            </label>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
                            {loading ? (
                                <div className="col-span-full py-10 flex flex-col items-center opacity-30">
                                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#f2b90d] mb-2"></div>
                                    <p className="text-[10px] font-black uppercase tracking-widest">Carregando...</p>
                                </div>
                            ) : team.map(member => (
                                <label
                                    key={member.id}
                                    className={`flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer group ${selectedRecipients.includes(member.id) ? 'bg-[#f2b90d]/10 border-[#f2b90d]/30' : 'bg-black/40 border-white/5 hover:border-white/10'}`}
                                    onClick={() => handleToggleRecipient(member.id)}
                                >
                                    <div className="relative">
                                        <div className={`size-5 rounded-lg border-2 flex items-center justify-center transition-all ${selectedRecipients.includes(member.id) ? 'bg-[#f2b90d] border-[#f2b90d]' : 'bg-black border-white/10 group-hover:border-white/20'}`}>
                                            {selectedRecipients.includes(member.id) && <span className="material-symbols-outlined text-black text-[14px] font-black">check</span>}
                                        </div>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className={`font-black uppercase italic tracking-tight text-sm truncate ${selectedRecipients.includes(member.id) ? 'text-white' : 'text-slate-400 group-hover:text-slate-300'}`}>
                                            {member.full_name}
                                        </p>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-1.5 md:space-y-2">
                        <label className="text-[9px] md:text-[10px] font-black uppercase text-slate-500 ml-2 tracking-widest italic opacity-60">Título do Comunicado</label>
                        <input
                            type="text"
                            placeholder="Ex: AVISO DE REUNIÃO, MANUTENÇÃO..."
                            value={messageTitle}
                            onChange={(e) => setMessageTitle(e.target.value)}
                            className="w-full bg-black border border-white/10 rounded-xl md:rounded-2xl py-3 md:py-4 px-4 md:px-6 text-white font-bold outline-none focus:border-[#f2b90d] text-sm md:text-base placeholder:opacity-30"
                        />
                    </div>

                    <div className="space-y-1.5 md:space-y-2">
                        <label className="text-[9px] md:text-[10px] font-black uppercase text-slate-500 ml-2 tracking-widest italic opacity-60">Sua Mensagem</label>
                        <textarea
                            rows={5}
                            placeholder="Digite o conteúdo aqui..."
                            value={messageText}
                            onChange={(e) => setMessageText(e.target.value)}
                            className="w-full bg-black border border-white/10 rounded-2xl md:rounded-3xl p-4 md:p-6 text-white font-medium outline-none focus:border-[#f2b90d] resize-none text-sm md:text-base placeholder:opacity-30"
                        />
                    </div>

                    <button
                        onClick={handleSendMessage}
                        disabled={status === 'sending' || !messageText.trim() || selectedRecipients.length === 0}
                        className="w-full bg-[#f2b90d] hover:bg-[#d9a50c] text-black font-black py-4 md:py-6 rounded-2xl md:rounded-[1.8rem] text-base md:text-lg shadow-2xl shadow-[#f2b90d]/20 transition-all flex items-center justify-center gap-3 uppercase italic active:scale-95 disabled:opacity-50"
                    >
                        {status === 'sending' ? 'ENVIANDO...' : 'ENVIAR AGORA'}
                    </button>

                    {selectedRecipients.length === 0 && messageText.trim().length > 0 && (
                        <p className="text-center text-[9px] font-black uppercase text-amber-500/60 animate-pulse">Selecione ao menos um destinatário</p>
                    )}
                </div>
            </div>
        </div>
    );
}

