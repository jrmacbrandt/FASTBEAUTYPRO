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
    const [historyLoading, setHistoryLoading] = useState(true);
    const [tenantId, setTenantId] = useState<string | null>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [view, setView] = useState<'history' | 'create'>('history');
    const [selectedHistoryItems, setSelectedHistoryItems] = useState<string[]>([]);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

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
                await fetchHistory(profile.tenant_id);
            }
            setLoading(false);
            setHistoryLoading(false);
        };

        fetchTeam();
    }, []);

    const fetchHistory = async (tId: string) => {
        const { data, error } = await supabase
            .from('notifications')
            .select(`
                id,
                title,
                message,
                created_at,
                receiver_profile:profiles!receiver_id (full_name)
            `)
            .eq('tenant_id', tId)
            .eq('type', 'team_alert')
            .order('created_at', { ascending: false });

        if (!error && data) setHistory(data);
    };

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
            if (tenantId) await fetchHistory(tenantId);
            setTimeout(() => setStatus('idle'), 3000);
        } catch (error: any) {
            console.error('Erro detalhado ao enviar:', error);
            alert('Erro ao enviar comunicado: ' + (error.message || 'Verifique o console'));
            setStatus('error');
            setTimeout(() => setStatus('idle'), 3000);
        }
    };

    const handleDeleteMessage = async (id: string) => {
        if (!confirm('Deseja excluir permanentemente este comunicado? O destinatário não terá mais acesso a ele.')) return;

        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', id);

        if (!error) {
            setHistory(prev => prev.filter(item => item.id !== id));
            setSelectedHistoryItems(prev => prev.filter(i => i !== id));
        } else {
            alert('Erro ao excluir mensagem: ' + error.message);
        }
    };

    const handleBulkDelete = async () => {
        if (!selectedHistoryItems.length) return;
        if (!confirm(`Deseja excluir permanentemente os ${selectedHistoryItems.length} comunicados selecionados?`)) return;

        const { error } = await supabase
            .from('notifications')
            .delete()
            .in('id', selectedHistoryItems);

        if (!error) {
            setHistory(prev => prev.filter(item => !selectedHistoryItems.includes(item.id)));
            setSelectedHistoryItems([]);
        } else {
            alert('Erro ao excluir em massa: ' + error.message);
        }
    };

    const toggleHistoryItemSelection = (id: string) => {
        setSelectedHistoryItems(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleSelectAllHistory = (checked: boolean) => {
        if (checked) {
            setSelectedHistoryItems(history.map(item => item.id));
        } else {
            setSelectedHistoryItems([]);
        }
    };

    const isAllSelected = team.length > 0 && selectedRecipients.length === team.length;

    // Agrupamento do histórico por data
    const groupedHistory = history.reduce((acc: any, item: any) => {
        const date = new Date(item.created_at).toLocaleDateString('pt-BR');
        if (!acc[date]) acc[date] = [];
        acc[date].push(item);
        return acc;
    }, {});

    const sortedDates = Object.keys(groupedHistory).sort((a, b) => {
        const dateA = a.split('/').reverse().join('');
        const dateB = b.split('/').reverse().join('');
        return dateB.localeCompare(dateA);
    });

    return (
        <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative pb-20 px-4 md:px-0">
            {status === 'success' && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none p-6 bg-black/20 backdrop-blur-sm">
                    <div className="bg-emerald-500 text-white px-6 md:px-10 py-6 md:py-8 rounded-3xl md:rounded-[2.5rem] shadow-2xl animate-in zoom-in duration-300 flex flex-col items-center gap-3 md:gap-4 pointer-events-auto">
                        <span className="material-symbols-outlined text-3xl md:text-5xl font-bold italic">check_circle</span>
                        <div className="text-center">
                            <h4 className="text-lg md:text-xl font-black italic uppercase">Enviado</h4>
                            <p className="text-white/80 text-[8px] md:text-[10px] font-bold uppercase tracking-widest mt-1">Comunicado com sucesso!</p>
                        </div>
                    </div>
                </div>
            )}

            {view === 'create' ? (
                <div className="bg-[#121214] p-6 md:p-12 rounded-3xl md:rounded-[2.5rem] border border-white/5 shadow-2xl animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="flex items-center justify-between mb-6 md:mb-10">
                        <div className="flex items-center gap-3 md:gap-4">
                            <div className="size-12 md:size-14 bg-[#f2b90d]/10 rounded-xl md:rounded-2xl flex items-center justify-center text-[#f2b90d] shrink-0">
                                <span className="material-symbols-outlined text-2xl md:text-3xl">chat_bubble</span>
                            </div>
                            <div>
                                <h3 className="text-xl md:text-2xl font-black italic uppercase text-white tracking-tight leading-none mb-1">Novo Comunicado</h3>
                                <p className="text-slate-500 text-[8px] md:text-[10px] font-bold uppercase tracking-widest italic opacity-60">Aviso geral para colaboradores</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setView('history')}
                            className="bg-white/5 hover:bg-white/10 text-white/60 hover:text-white px-4 py-2 rounded-xl border border-white/5 flex items-center gap-2 text-[10px] font-black uppercase transition-all"
                        >
                            <span className="material-symbols-outlined text-sm">arrow_back</span>
                            Voltar
                        </button>
                    </div>

                    <div className="space-y-4 md:space-y-8">
                        {/* Destinatários */}
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
            ) : (
                <div className="bg-[#121214] p-6 md:p-12 rounded-3xl md:rounded-[2.5rem] border border-white/5 shadow-2xl animate-in fade-in slide-in-from-left-4 duration-300">
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 md:mb-12 gap-6">
                        <div className="flex items-center gap-3 md:gap-4">
                            <div className="size-12 md:size-14 bg-amber-500/10 rounded-xl md:rounded-2xl flex items-center justify-center text-amber-500 shrink-0">
                                <span className="material-symbols-outlined text-2xl md:text-3xl">history</span>
                            </div>
                            <div>
                                <h3 className="text-xl md:text-2xl font-black italic uppercase text-white tracking-tight leading-none mb-1">Histórico</h3>
                                <p className="text-slate-500 text-[8px] md:text-[10px] font-bold uppercase tracking-widest italic opacity-60">Mensagens enviadas anteriormente</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {selectedHistoryItems.length > 0 && (
                                <button
                                    onClick={handleBulkDelete}
                                    className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white px-5 py-3 rounded-xl border border-red-500/20 flex items-center gap-2 text-[10px] font-black uppercase transition-all shadow-lg active:scale-95"
                                >
                                    <span className="material-symbols-outlined text-sm">delete_sweep</span>
                                    Excluir ({selectedHistoryItems.length})
                                </button>
                            )}
                            {selectedDate && (
                                <button
                                    onClick={() => setSelectedDate(null)}
                                    className="bg-white/5 hover:bg-white/10 text-white/60 hover:text-white px-4 py-3 rounded-xl border border-white/5 flex items-center gap-2 text-[10px] font-black uppercase transition-all"
                                >
                                    <span className="material-symbols-outlined text-sm">arrow_back</span>
                                    Ver Todas as Datas
                                </button>
                            )}
                            <button
                                onClick={() => setView('create')}
                                className="bg-[#f2b90d] hover:bg-[#d9a50c] text-black px-6 py-3 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase transition-all shadow-xl active:scale-95"
                            >
                                <span className="material-symbols-outlined text-sm">add_circle</span>
                                Novo Comunicado
                            </button>
                        </div>
                    </div>

                    {!selectedDate && history.length > 0 && (
                        <div className="flex items-center justify-end mb-6 px-2">
                            {/* Selector hidden in summary view to avoid confusion */}
                        </div>
                    )}

                    {selectedDate && (
                        <div className="flex items-center justify-between mb-8 px-2">
                            <h4 className="text-lg md:text-xl font-black italic uppercase text-amber-500">
                                Mensagens de {selectedDate}
                            </h4>
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <span className="text-[9px] font-black uppercase text-slate-500 group-hover:text-amber-500 transition-colors">Selecionar Tudo</span>
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        className="sr-only"
                                        checked={groupedHistory[selectedDate]?.every((item: any) => selectedHistoryItems.includes(item.id))}
                                        onChange={(e) => {
                                            const dayIds = groupedHistory[selectedDate].map((i: any) => i.id);
                                            if (e.target.checked) {
                                                setSelectedHistoryItems(prev => Array.from(new Set([...prev, ...dayIds])));
                                            } else {
                                                setSelectedHistoryItems(prev => prev.filter(id => !dayIds.includes(id)));
                                            }
                                        }}
                                    />
                                    <div className={`size-5 rounded-lg border-2 flex items-center justify-center transition-all ${groupedHistory[selectedDate]?.every((item: any) => selectedHistoryItems.includes(item.id)) ? 'bg-amber-500 border-amber-500' : 'bg-black border-white/10 group-hover:border-white/20'}`}>
                                        {groupedHistory[selectedDate]?.every((item: any) => selectedHistoryItems.includes(item.id)) && <span className="material-symbols-outlined text-black text-[14px] font-black">check</span>}
                                    </div>
                                </div>
                            </label>
                        </div>
                    )}

                    <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                        {historyLoading ? (
                            <div className="py-24 flex flex-col items-center opacity-30">
                                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-amber-500 mb-4"></div>
                                <p className="text-[10px] font-black uppercase tracking-widest">Carregando histórico...</p>
                            </div>
                        ) : history.length === 0 ? (
                            <div className="py-24 text-center border-2 border-dashed border-white/5 rounded-[3rem] opacity-20">
                                <span className="material-symbols-outlined text-6xl mb-4 text-slate-500">inventory_2</span>
                                <p className="text-[12px] font-black uppercase tracking-widest">Nenhum comunicado enviado</p>
                            </div>
                        ) : !selectedDate ? (
                            /* Visualização de Lista de Datas */
                            <div className="grid grid-cols-1 gap-3">
                                {sortedDates.map(date => {
                                    const count = groupedHistory[date].length;
                                    const selectedCount = groupedHistory[date].filter((i: any) => selectedHistoryItems.includes(i.id)).length;

                                    return (
                                        <div
                                            key={date}
                                            onClick={() => setSelectedDate(date)}
                                            className={`bg-black/40 border p-6 md:p-8 rounded-3xl group transition-all cursor-pointer flex items-center justify-between ${selectedCount > 0 ? 'border-amber-500/40 bg-amber-500/5' : 'border-white/5 hover:border-white/10'}`}
                                        >
                                            <div className="flex items-center gap-4 md:gap-6">
                                                <div className="size-12 md:size-14 bg-white/5 rounded-2xl flex items-center justify-center group-hover:bg-amber-500/10 group-hover:text-amber-500 transition-all">
                                                    <span className="material-symbols-outlined">calendar_today</span>
                                                </div>
                                                <div>
                                                    <h4 className="text-lg md:text-xl font-black text-white italic uppercase">{date}</h4>
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{count} {count === 1 ? 'Mensagem enviada' : 'Mensagens enviadas'}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                {selectedCount > 0 && (
                                                    <div className="bg-amber-500 text-black px-3 py-1 rounded-full text-[10px] font-black uppercase italic">
                                                        {selectedCount} selecionada{selectedCount > 1 ? 's' : ''}
                                                    </div>
                                                )}
                                                <span className="material-symbols-outlined text-slate-600 group-hover:text-amber-500 group-hover:translate-x-1 transition-all">chevron_right</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            /* Visualização das Mensagens do Dia Selecionado */
                            groupedHistory[selectedDate].map((item: any) => (
                                <div
                                    key={item.id}
                                    className={`bg-black/40 border p-5 md:p-8 rounded-3xl group transition-all relative ${selectedHistoryItems.includes(item.id) ? 'border-amber-500/40 bg-amber-500/5' : 'border-white/5 hover:border-white/10'}`}
                                >
                                    <div className="flex gap-4 md:gap-6">
                                        <div className="pt-1">
                                            <div
                                                onClick={() => toggleHistoryItemSelection(item.id)}
                                                className={`size-6 rounded-lg border-2 flex items-center justify-center transition-all cursor-pointer ${selectedHistoryItems.includes(item.id) ? 'bg-amber-500 border-amber-500' : 'bg-white/5 border-white/10 hover:border-white/20'}`}
                                            >
                                                {selectedHistoryItems.includes(item.id) && <span className="material-symbols-outlined text-black text-sm font-black">check</span>}
                                            </div>
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-3 mb-3">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-[#f2b90d] italic">Para: {item.receiver_profile?.full_name || 'Profissional'}</span>
                                                <span className="size-1 bg-slate-700 rounded-full" />
                                                <span className="text-[9px] font-bold text-slate-500 uppercase">{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                            <h4 className="text-base md:text-lg font-black text-white italic uppercase truncate mb-2">{item.title}</h4>
                                            <p className="text-sm text-slate-400 font-medium line-clamp-3 leading-relaxed opacity-70 italic whitespace-pre-wrap">{item.message}</p>
                                        </div>

                                        <div className="flex items-center">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteMessage(item.id);
                                                }}
                                                className="size-12 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-2xl flex items-center justify-center transition-all opacity-40 group-hover:opacity-100 shadow-xl active:scale-90"
                                                title="Excluir permanentemente"
                                            >
                                                <span className="material-symbols-outlined text-2xl">delete</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

