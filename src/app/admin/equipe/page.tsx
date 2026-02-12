"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface Profile {
    id: string;
    full_name: string;
    email?: string;
    role: string;
    status: string;
    commission_rate: number;
}

export default function TeamManagementPage() {
    const [barbers, setBarbers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'team' | 'pending'>('team');
    const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);
    const [editingBarber, setEditingBarber] = useState<Profile | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            if (params.get('tab') === 'pending') {
                setActiveTab('pending');
            }
        }
        fetchTeam();
    }, []);

    const fetchTeam = async () => {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Fetch current user's profile to get tenant_id
        const { data: currentUser } = await supabase
            .from('profiles')
            .select('tenant_id')
            .eq('id', session.user.id)
            .single();

        if (currentUser?.tenant_id) {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('tenant_id', currentUser.tenant_id);

            if (!error && data) {
                // Filter out owners to prevent them from appearing in the team list
                setBarbers(data.filter(p => p.role !== 'owner'));
            }
        }
        setLoading(false);
    };

    const handleAction = async (id: string, action: 'approve' | 'suspend' | 'delete') => {
        const previousBarbers = [...barbers];
        const currentBarber = barbers.find(b => b.id === id);
        if (!currentBarber) return;

        if (action === 'delete') {
            if (!confirm('Deseja excluir DEFINITIVAMENTE este profissional? Esta ação não pode ser desfeita.')) return;

            setBarbers(prev => prev.filter(b => b.id !== id));

            try {
                const { data: { session } } = await supabase.auth.getSession();
                const response = await fetch('/api/admin/delete-professional', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session?.access_token}`
                    },
                    body: JSON.stringify({ professionalId: id })
                });

                const result = await response.json();
                if (!response.ok) throw new Error(result.error);

                fetchTeam();
                window.dispatchEvent(new Event('professional-approved'));
                window.dispatchEvent(new Event('team-updated'));
            } catch (error: any) {
                setBarbers(previousBarbers);
                alert('Erro ao excluir: ' + error.message);
            }
            return;
        }

        const newStatus = action === 'approve' ? 'active' : (currentBarber.status === 'active' ? 'suspended' : 'active');

        // Apply optimistic update locally
        setBarbers(prev => prev.map(b => b.id === id ? { ...b, status: newStatus } : b));

        const { error } = await supabase
            .from('profiles')
            .update({ status: newStatus })
            .eq('id', id);

        if (error) {
            // Revert on error
            setBarbers(previousBarbers);
            alert('Erro ao atualizar status: ' + error.message);
        } else {
            // Dispatch event for sidebar/dashboard update
            window.dispatchEvent(new Event('professional-approved'));
            window.dispatchEvent(new Event('team-updated'));
        }
    };

    const pendingCount = barbers.filter(b => b.status === 'pending').length;
    const filteredBarbers = barbers.filter(b => activeTab === 'team' ? b.status !== 'pending' : b.status === 'pending');

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex p-1.5 rounded-2xl bg-black/50 border border-white/5">
                    <button
                        onClick={() => setActiveTab('team')}
                        className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all italic ${activeTab === 'team' ? 'bg-[#f2b90d] text-black shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        ATIVOS
                    </button>
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all italic flex items-center gap-2 ${activeTab === 'pending' ? 'bg-[#f2b90d] text-black shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        SOLICITAÇÕES {pendingCount > 0 && <span className="bg-red-500 text-white size-5 flex items-center justify-center rounded-full text-[9px] font-bold">{pendingCount}</span>}
                    </button>
                </div>
                <button
                    onClick={() => setIsRegistrationModalOpen(true)}
                    className="bg-[#f2b90d] text-black px-8 py-4 rounded-xl font-black text-xs shadow-lg shadow-[#f2b90d]/20 uppercase italic tracking-tight active:scale-95 transition-all"
                >
                    CADASTRAR PROFISSIONAL
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {loading ? (
                    <div className="text-center py-20 opacity-40">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#f2b90d] mx-auto mb-4"></div>
                        <p className="font-black uppercase text-xs tracking-[0.4em]">Carregando equipe...</p>
                    </div>
                ) : filteredBarbers.length > 0 ? (
                    filteredBarbers.map(barber => (
                        <div key={barber.id} className="bg-[#121214] border border-white/5 p-4 md:p-6 rounded-3xl md:rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6 group hover:border-[#f2b90d]/20 transition-all">
                            <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto">
                                <div className="size-12 md:size-16 rounded-xl md:rounded-2xl bg-[#f2b90d]/10 flex items-center justify-center text-[#f2b90d] border border-[#f2b90d]/20 shadow-inner shrink-0">
                                    <span className="material-symbols-outlined text-2xl md:text-4xl">person_pin</span>
                                </div>
                                <div className="min-w-0">
                                    <h4 className="font-bold text-base md:text-lg text-white truncate">{barber.full_name}</h4>
                                    <p className="text-slate-500 text-[8px] md:text-[10px] font-black uppercase tracking-widest truncate">{barber.email || 'Email não disponível'}</p>
                                    <div className="flex gap-2 mt-2">
                                        <span className="bg-white/5 text-slate-400 text-[8px] md:text-[9px] font-black uppercase px-2 md:px-3 py-1 rounded-full border border-white/5">
                                            {barber.role}
                                        </span>
                                        <span className={`text-[8px] md:text-[9px] font-black uppercase px-2 md:px-3 py-1 rounded-full border ${barber.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                            'bg-red-500/10 text-red-500 border-red-500/20'
                                            }`}>
                                            {barber.status}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col md:items-end gap-1 md:gap-2 w-full md:w-auto">
                                <div className="flex md:flex-col justify-between items-end mb-1 md:mb-2 w-full md:w-auto">
                                    <p className="text-slate-500 text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] italic">Comissão</p>
                                    <p className="text-[#f2b90d] text-2xl md:text-3xl font-black italic tracking-tighter">{barber.commission_rate}%</p>
                                </div>
                                <div className="flex gap-2 w-full md:w-auto">
                                    {barber.status === 'pending' ? (
                                        <>
                                            <button onClick={() => handleAction(barber.id, 'approve')} className="flex-1 md:flex-none bg-emerald-500 text-white px-4 md:px-6 py-2 rounded-xl text-[9px] md:text-[10px] font-black uppercase shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">APROVAR</button>
                                            <button onClick={() => handleAction(barber.id, 'delete')} className="flex-1 md:md:flex-none bg-red-500/10 text-red-500 px-4 md:px-6 py-2 rounded-xl text-[9px] md:text-[10px] font-black uppercase active:scale-95 transition-all">REJEITAR</button>
                                        </>
                                    ) : (
                                        <div className="flex items-center gap-2 w-full md:w-auto">
                                            <button
                                                onClick={() => setEditingBarber(barber)}
                                                className="flex-1 md:flex-none p-2 text-slate-400 hover:text-[#f2b90d] transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-[20px]">edit</span>
                                            </button>
                                            <button onClick={() => handleAction(barber.id, 'suspend')} className={`flex-[2] md:flex-none px-4 py-2 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest ${barber.status === 'active' ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'} active:scale-95 transition-all`}>
                                                {barber.status === 'active' ? 'SUSPENDER' : 'REATIVAR'}
                                            </button>
                                            <button onClick={() => handleAction(barber.id, 'delete')} className="flex-1 md:flex-none p-2 text-slate-400 hover:text-red-500 transition-colors"><span className="material-symbols-outlined text-[20px]">delete</span></button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-20 opacity-40">
                        <span className="material-symbols-outlined text-6xl mb-4 italic">groups</span>
                        <p className="font-black uppercase text-xs tracking-[0.4em]">Nenhum registro encontrado</p>
                    </div>
                )}
            </div>

            {/* Modal de Cadastro/Edição */}
            {(isRegistrationModalOpen || editingBarber) && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-[#121214] w-full max-w-xl rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-white/5 flex justify-between items-center">
                            <h3 className="text-xl text-white font-black italic uppercase italic tracking-tight">
                                {editingBarber ? 'Editar Profissional' : 'Novo Profissional'}
                            </h3>
                            <button onClick={() => { setIsRegistrationModalOpen(false); setEditingBarber(null); }} className="size-10 flex items-center justify-center rounded-full hover:bg-white/5 text-slate-400">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest italic ml-2">Nome Completo</label>
                                <input type="text" className="w-full bg-black border border-white/5 rounded-2xl p-4 font-bold text-white outline-none focus:border-[#f2b90d]/50" defaultValue={editingBarber?.full_name} placeholder="Ex: João da Silva" />
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest italic ml-2">Comissão (%)</label>
                                    <input type="number" className="w-full bg-black border border-white/5 rounded-2xl p-4 font-bold text-white outline-none focus:border-[#f2b90d]/50" defaultValue={editingBarber?.commission_rate || 50} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest italic ml-2">Status</label>
                                    <select className="w-full bg-black border border-white/5 rounded-2xl p-4 font-bold text-white outline-none focus:border-[#f2b90d]/50">
                                        <option value="active">ATIVO</option>
                                        <option value="suspended">SUSPENSO</option>
                                    </select>
                                </div>
                            </div>
                            <button className="w-full bg-[#f2b90d] text-black font-black py-5 rounded-2xl text-xs uppercase tracking-widest italic shadow-xl shadow-[#f2b90d]/20 active:scale-95 transition-all">
                                {editingBarber ? 'SALVAR ALTERAÇÕES' : 'CONFIRMAR CADASTRO'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
