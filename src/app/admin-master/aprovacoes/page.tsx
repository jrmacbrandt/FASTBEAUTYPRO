'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function MasterAprovacoesPage() {
    const [loading, setLoading] = useState(true);
    const [pendingTenants, setPendingTenants] = useState<any[]>([]);

    const fetchPending = async () => {
        setLoading(true);
        // Fetch tenants with pending_approval status
        // We also need profile info, but tenants <-> profiles is 1:N. 
        // We'll fetch tenants and then maybe get the owner? 
        // Or fetch profiles where role=owner and tenant.status=pending?
        // Let's query tenants directly first.

        const { data, error } = await supabase
            .from('tenants')
            .select(`
                id, name, slug, status, created_at,
                profiles:profiles(full_name, email, phone, cpf)
            `)
            .eq('status', 'pending_approval')
            .order('created_at', { ascending: false });

        if (error) console.error(error);
        else setPendingTenants(data || []);

        setLoading(false);
    };

    useEffect(() => {
        fetchPending();
    }, []);

    const handleApprove = async (tenantId: string) => {
        if (!confirm('Tem certeza que deseja aprovar este estabelecimento vitaliciamente?')) return;

        const { error } = await supabase
            .from('tenants')
            .update({
                status: 'active',
                subscription_plan: 'unlimited',
                trial_ends_at: null // or set far future
            })
            .eq('id', tenantId);

        if (error) {
            alert('Erro ao aprovar: ' + error.message);
        } else {
            alert('Estabelecimento aprovado com sucesso!');
            fetchPending();
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700 text-slate-100">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-black italic tracking-tighter text-white">
                        APROVAÇÕES <span className="text-[#f2b90d]">PENDENTES</span>
                    </h1>
                    <p className="text-sm text-slate-400">Libere o acesso de novos administradores à plataforma.</p>
                </div>
                <button onClick={fetchPending} className="text-xs uppercase font-bold text-[#f2b90d] hover:text-white transition-colors flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">refresh</span>
                    Atualizar Lista
                </button>
            </header>

            {loading ? (
                <div className="flex justify-center py-20">
                    <span className="material-symbols-outlined text-4xl animate-spin text-[#f2b90d]">progress_activity</span>
                </div>
            ) : pendingTenants.length === 0 ? (
                <div className="bg-[#18181b] border border-white/5 rounded-2xl p-10 text-center">
                    <span className="material-symbols-outlined text-4xl text-emerald-500 mb-4">check_circle</span>
                    <h3 className="text-xl font-bold text-white">Tudo em dia!</h3>
                    <p className="text-slate-500">Nenhuma solicitação pendente no momento.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pendingTenants.map(tenant => {
                        const owner = tenant.profiles?.[0]; // Assuming first profile returned is owner (not perfect but OK for MVP if filtered correctly)
                        // Note: profiles query on tenants is list.

                        return (
                            <div key={tenant.id} className="bg-[#18181b] border border-white/5 rounded-2xl p-6 flex flex-col gap-4 hover:border-[#f2b90d]/30 transition-all shadow-lg">
                                <div className="flex justify-between items-start">
                                    <div className="size-10 rounded-full bg-white/5 flex items-center justify-center text-white/40 font-bold uppercase">
                                        {tenant.name.substring(0, 2)}
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded bg-amber-500/10 text-amber-500">
                                        Aguardando
                                    </span>
                                </div>

                                <div>
                                    <h3 className="text-lg font-black text-white leading-tight">{tenant.name}</h3>
                                    <p className="text-xs text-slate-500 font-mono mt-1 opacity-70">{tenant.slug}</p>
                                </div>

                                {owner && (
                                    <div className="text-xs text-slate-400 space-y-1 bg-black/20 p-3 rounded-lg border border-white/5">
                                        <p><strong className="text-slate-300">Responsável:</strong> {owner.full_name}</p>
                                        <p><strong className="text-slate-300">Email:</strong> {owner.email}</p>
                                        <p><strong className="text-slate-300">CPF:</strong> {owner.cpf}</p>
                                        <p><strong className="text-slate-300">Solicitado:</strong> {new Date(tenant.created_at).toLocaleDateString()}</p>
                                    </div>
                                )}

                                <div className="mt-auto pt-4 flex gap-3">
                                    <button
                                        onClick={() => handleApprove(tenant.id)}
                                        className="flex-1 bg-[#f2b90d] hover:bg-[#d9a50b] text-black font-black uppercase tracking-widest text-[10px] py-3 rounded-xl transition-all shadow-lg hover:shadow-[#f2b90d]/20 active:scale-95"
                                    >
                                        APROVAR ACESSO
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
