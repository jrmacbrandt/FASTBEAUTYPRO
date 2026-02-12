'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { getSegmentedClients } from '@/lib/crm';

export default function CRMDashboard() {
    const [loading, setLoading] = useState(true);
    const [tenant, setTenant] = useState<any>(null);
    const [stats, setStats] = useState({
        totalClients: 0,
        churnRisk: 0,
        vipClients: 0,
        birthdays: 0,
        loyaltyPending: 0
    });
    const [savingLoyalty, setSavingLoyalty] = useState(false);
    const [selectedLoyaltyTarget, setSelectedLoyaltyTarget] = useState<number | null>(null);
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);
    const [clientsList, setClientsList] = useState<any[]>([]);
    const [selectedClients, setSelectedClients] = useState<string[]>([]);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const { data: profile } = await supabase
                .from('profiles')
                .select('tenant_id')
                .eq('id', session.user.id)
                .single();

            const tenantId = profile?.tenant_id || session.user.user_metadata?.tenant_id;

            if (!tenantId) {
                console.error('No tenant_id found for user');
                setLoading(false);
                return;
            }

            // 1. Fetch Tenant Config (Loyalty)
            const { data: tenantData } = await supabase
                .from('tenants')
                .select('id, loyalty_target, name, business_type')
                .eq('id', tenantId)
                .single();

            const currentTarget = tenantData?.loyalty_target || 5;
            if (tenantData) {
                setTenant(tenantData);
                setSelectedLoyaltyTarget(currentTarget);
            }

            // 2. Total Clientes (Real)
            const { count: total } = await supabase
                .from('clients')
                .select('*', { count: 'exact', head: true })
                .eq('tenant_id', tenantId);

            // 3. Churn Risk (Real - uses last_visit)
            const churnClients = await getSegmentedClients(tenantId, { days_inactive: 45 });

            // 4. VIP (Real - uses total_spent > 500)
            const vipClients = await getSegmentedClients(tenantId, { min_spent: 500 });

            // 5. Aniversariantes (Real)
            const currentMonth = new Date().getMonth() + 1;
            const bdayClients = await getSegmentedClients(tenantId, { birth_month: currentMonth });

            // 6. Loyalty Intelligence (REAL DATA calculation)
            // Get all paid appointments for this tenant to count stamps per client
            const { data: appointments } = await supabase
                .from('appointments')
                .select('client_id')
                .eq('tenant_id', tenantId)
                .eq('status', 'paid');

            let loyaltyPendingCount = 0;
            if (appointments && appointments.length > 0) {
                const countsMap: Record<string, number> = {};
                appointments.forEach(ap => {
                    if (ap.client_id) {
                        countsMap[ap.client_id] = (countsMap[ap.client_id] || 0) + 1;
                    }
                });

                // Target logic: if user is at 70% or more of the way to the reward
                const threshold = Math.ceil(currentTarget * 0.7);
                loyaltyPendingCount = Object.values(countsMap).filter(count =>
                    count >= threshold && count < currentTarget
                ).length;
            }

            setStats({
                totalClients: total || 0,
                churnRisk: churnClients.length,
                vipClients: vipClients.length,
                birthdays: bdayClients.length,
                loyaltyPending: loyaltyPendingCount
            });

        } catch (error) {
            console.error('Error fetching CRM stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveLoyalty = async () => {
        if (!tenant || selectedLoyaltyTarget === null) return;

        setSavingLoyalty(true);
        try {
            const { error } = await supabase
                .from('tenants')
                .update({ loyalty_target: selectedLoyaltyTarget })
                .eq('id', tenant.id);

            if (!error) {
                setTenant((prev: any) => ({ ...prev, loyalty_target: selectedLoyaltyTarget }));
                alert('Configurações de fidelidade salvas com sucesso!');
                // Re-fetch to update the pending rewards based on new target
                fetchData();
            } else {
                throw error;
            }
        } catch (err: any) {
            console.error('Save loyalty target failed:', err);
            alert('Erro ao salvar: ' + err.message);
        } finally {
            setSavingLoyalty(false);
        }
    };

    const handleDeleteClients = async () => {
        if (selectedClients.length === 0) return;
        if (!confirm(`Deseja realmente excluir ${selectedClients.length} cliente(s)? Esta ação é irreversível.`)) return;

        setIsDeleting(true);
        try {
            const { error } = await supabase
                .from('clients')
                .delete()
                .in('id', selectedClients);

            if (error) throw error;

            alert('Clientes excluídos com sucesso.');
            setSelectedClients([]);
            fetchData(); // Refresh counts
            if (isClientModalOpen) {
                // Refresh list if modal still open
                const { data } = await supabase
                    .from('clients')
                    .select('*')
                    .eq('tenant_id', tenant.id)
                    .order('name');
                setClientsList(data || []);
            }
        } catch (error: any) {
            console.error('Delete clients failed:', error);
            alert('Erro ao excluir: ' + error.message);
        } finally {
            setIsDeleting(false);
        }
    };

    const openClientManager = async () => {
        setIsClientModalOpen(true);
        if (!tenant) return;

        try {
            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .eq('tenant_id', tenant.id)
                .order('name');

            if (error) throw error;
            setClientsList(data || []);
        } catch (err) {
            console.error('Load clients failed:', err);
        }
    };

    // Correcting the change detection: ensure we check the exact values
    const hasChanges = tenant && Number(selectedLoyaltyTarget) !== Number(tenant.loyalty_target);

    const loyaltyPreviewCircles = useMemo(() => {
        const count = selectedLoyaltyTarget || 5;
        return Array.from({ length: count });
    }, [selectedLoyaltyTarget]);

    if (loading && !tenant) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="size-12 border-4 border-[#f2b90d]/20 border-t-[#f2b90d] rounded-full animate-spin"></div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Sincronizando CRM Real-Time...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-1000 text-slate-100 pb-24">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/10 pb-8 gap-4">
                <div className="relative">
                    <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-12 bg-[#f2b90d] rounded-full blur-sm opacity-50"></div>
                    <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase leading-none">
                        CRM <span className="text-[#f2b90d]">Intelligence</span>
                    </h1>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mt-2 flex items-center gap-2">
                        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Gestão de Relacionamento & Fidelidade v4.0
                    </p>
                </div>
                <button
                    onClick={() => window.location.href = '/admin/crm/nova-campanha'}
                    className="w-full md:w-auto bg-[#f2b90d] hover:bg-[#d9a50b] text-black font-black uppercase text-[10px] tracking-[0.2em] px-8 py-4 rounded-2xl transition-all shadow-2xl hover:shadow-[#f2b90d]/30 active:scale-95 flex items-center justify-center gap-3 group"
                >
                    <span className="material-symbols-outlined text-lg group-hover:rotate-90 transition-transform">add</span>
                    Lançar Nova Campanha
                </button>
            </header>

            {/* KPI CARDS - Premium Refined with Real Data */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <MetricCard
                    title="Base Ativa"
                    value={stats.totalClients}
                    icon="groups"
                    color="text-amber-400"
                    desc="Clientes Reais"
                    onAction={openClientManager}
                    actionLabel="EDITAR"
                />
                <MetricCard
                    title="Risco de Evasão"
                    value={stats.churnRisk}
                    icon="person_cancel"
                    color="text-rose-500"
                    desc="+45 dias sem visita"
                    alert={stats.churnRisk > 0}
                />
                <MetricCard
                    title="Clientes VIP"
                    value={stats.vipClients}
                    icon="auto_awesome"
                    color="text-emerald-400"
                    desc="LTV > R$ 500"
                />
                <MetricCard
                    title="Próximos Prêmios"
                    value={stats.loyaltyPending}
                    icon="rewarded_ads"
                    color="text-cyan-400"
                    desc="> 70% da meta"
                    alert={stats.loyaltyPending > 0}
                />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 md:gap-8">
                {/* FIDELITY CENTER - State of the Art UI */}
                <div className="xl:col-span-5 space-y-6">
                    <div className="bg-[#121214] border border-white/5 rounded-[2.5rem] p-8 md:p-10 relative overflow-hidden group hover:border-[#f2b90d]/20 transition-all shadow-2xl">
                        {/* Background Decoration */}
                        <div className="absolute -top-12 -right-12 size-40 bg-[#f2b90d]/5 rounded-full blur-3xl pointer-events-none group-hover:bg-[#f2b90d]/10 transition-all"></div>

                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-xl font-black italic uppercase text-white mb-1">Cartão Fidelidade</h3>
                                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Configuração de Recompensa</p>
                                </div>
                                <div className="size-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:rotate-12 transition-transform">
                                    <span className="material-symbols-outlined text-[#f2b90d]">loyalty</span>
                                </div>
                            </div>

                            {/* Fidelity Target Selector */}
                            <div className="space-y-4 mb-10">
                                <label className="text-[9px] font-black uppercase tracking-widest text-[#f2b90d] ml-1">Meta de Selos para o Prêmio</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {[5, 8, 10].map((val) => (
                                        <button
                                            key={val}
                                            disabled={loading || !tenant}
                                            onClick={() => setSelectedLoyaltyTarget(Number(val))}
                                            className={`py-5 rounded-[1.5rem] border-2 font-black italic uppercase tracking-tighter text-lg transition-all flex flex-col items-center justify-center gap-1 active:scale-[0.97] disabled:opacity-30 disabled:cursor-not-allowed ${Number(selectedLoyaltyTarget) === Number(val)
                                                ? 'bg-[#f2b90d] border-[#f2b90d] text-black shadow-xl shadow-[#f2b90d]/20 scale-[1.05]'
                                                : 'bg-black/40 border-white/5 text-slate-500 hover:border-white/20 hover:text-white'
                                                }`}
                                        >
                                            <span>{val}</span>
                                            <span className="text-[7px] font-black tracking-[0.2em] opacity-60 uppercase">Selos</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Intelligence Audit Preview */}
                            <div className="bg-black/40 border border-white/5 rounded-3xl p-6 relative overflow-hidden mb-8">
                                <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-4 opacity-70">Visualização do App do Cliente</p>
                                <div className="flex flex-wrap gap-2.5 justify-center py-4">
                                    {loyaltyPreviewCircles.map((_, i) => (
                                        <div
                                            key={i}
                                            className={`size-10 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${i === 0 ? 'bg-[#f2b90d]/20 border-[#f2b90d] text-[#f2b90d] shadow-lg shadow-[#f2b90d]/20 scale-110 ring-4 ring-[#f2b90d]/10' : 'bg-white/5 border-white/10 text-white/5'}`}
                                        >
                                            <span className="material-symbols-outlined text-[18px]">{i === 0 ? 'verified_user' : 'circle'}</span>
                                        </div>
                                    ))}
                                    {/* Reward slot */}
                                    <div className="size-10 rounded-full border-2 border-dashed border-[#f2b90d]/30 flex items-center justify-center bg-[#f2b90d]/5 text-[#f2b90d]/40">
                                        <span className="material-symbols-outlined text-[18px]">redeem</span>
                                    </div>
                                </div>
                                <p className="text-[9px] text-center text-slate-500 mt-4 italic font-medium">Recompensa: 1 {tenant?.business_type === 'barber' ? 'Corte' : 'Serviço'} Grátis</p>
                            </div>

                            {/* Unificado: Botão SALVAR - Sempre Ativo e Visível */}
                            <div className="mt-8">
                                <button
                                    onClick={handleSaveLoyalty}
                                    className="w-full bg-[#f2b90d] hover:bg-[#d9a50b] text-black font-black italic uppercase text-xs tracking-widest py-5 rounded-2xl shadow-2xl shadow-[#f2b90d]/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                                >
                                    <span className="material-symbols-outlined text-lg">{savingLoyalty ? 'sync' : 'save'}</span>
                                    {savingLoyalty ? 'SALVANDO...' : 'SALVAR'}
                                </button>
                            </div>
                        </div>

                        {/* Status Footer */}
                        <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between opacity-60">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-xs text-emerald-500">lock_open</span>
                                <span className="text-[8px] font-black uppercase tracking-widest text-white">Status: Ativo</span>
                            </div>
                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">FastBeauty Loyalty Engine</span>
                        </div>
                    </div>
                </div>

                {/* CAMPAIGN CENTER & ANNOTATIONS */}
                <div className="xl:col-span-7 space-y-6">
                    <div className="bg-[#121214] border border-white/5 rounded-[2.5rem] p-8 md:p-10 h-full flex flex-col shadow-2xl">
                        <div className="flex items-center justify-between mb-10">
                            <div>
                                <h3 className="text-xl font-black italic uppercase text-white mb-1">Central de Engajamento</h3>
                                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Motor de Retenção Ativo</p>
                            </div>
                            <div className="flex gap-2">
                                <div className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[8px] font-black uppercase tracking-widest flex items-center gap-2">
                                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    Filtros Dinâmicos OK
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col items-center justify-center text-center p-10 border-2 border-dashed border-white/5 rounded-[2.5rem] bg-white/[0.01]">
                            <div className="size-20 rounded-[2rem] bg-white/5 flex items-center justify-center mb-6 ring-8 ring-white/[0.02]">
                                <span className="material-symbols-outlined text-4xl text-slate-600">rocket_launch</span>
                            </div>
                            <p className="text-white font-black italic uppercase text-lg tracking-tight mb-2">Pronto para decolar?</p>
                            <p className="text-[10px] text-slate-500 max-w-xs font-bold uppercase tracking-widest leading-relaxed">
                                Use os filtros inteligência acima para selecionar clientes em risco e dispare campanhas personalizadas via WhatsApp.
                            </p>

                            <div className="mt-10 grid grid-cols-2 gap-4 w-full max-w-md">
                                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-left hover:bg-white/[0.08] transition-all cursor-pointer group">
                                    <span className="material-symbols-outlined text-rose-500 text-xl mb-2 group-hover:scale-110 transition-transform">person_remove</span>
                                    <p className="text-[9px] font-black uppercase text-white mb-1">Churn Control</p>
                                    <p className="text-[8px] font-medium text-slate-500">Recupere clientes sumidos</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-left hover:bg-white/[0.08] transition-all cursor-pointer group">
                                    <span className="material-symbols-outlined text-emerald-500 text-xl mb-2 group-hover:scale-110 transition-transform">celebration</span>
                                    <p className="text-[9px] font-black uppercase text-white mb-1">Aniversariantes</p>
                                    <p className="text-[8px] font-medium text-slate-500">Crie mimos especiais</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* MODAL: GESTÃO DE CLIENTES (CIRÚRGICO) */}
            {isClientModalOpen && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-[#121214] border border-white/10 w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-white/5 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-black italic uppercase text-white">Gestão da Base</h3>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Excluir ou Sincronizar Clientes</p>
                            </div>
                            <button
                                onClick={() => setIsClientModalOpen(false)}
                                className="size-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 transition-all"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-6 max-h-[50vh] overflow-y-auto scrollbar-hide">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 mb-4">
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            className="size-5 rounded-lg border-white/10 bg-white/5 checked:bg-[#f2b90d] transition-all"
                                            checked={clientsList.length > 0 && selectedClients.length === clientsList.length}
                                            onChange={(e) => {
                                                if (e.target.checked) setSelectedClients(clientsList.map(c => c.id));
                                                else setSelectedClients([]);
                                            }}
                                        />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-[#f2b90d]">Selecionar Todos ({clientsList.length})</span>
                                    </label>
                                </div>

                                {clientsList.length === 0 ? (
                                    <div className="text-center py-10">
                                        <span className="material-symbols-outlined text-4xl text-slate-700 mb-4 block">person_search</span>
                                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Nenhum cliente cadastrado ainda</p>
                                    </div>
                                ) : (
                                    clientsList.map((client) => (
                                        <div key={client.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all group">
                                            <div className="flex items-center gap-4">
                                                <input
                                                    type="checkbox"
                                                    className="size-5 rounded-lg border-white/10 bg-white/5 checked:bg-[#f2b90d] transition-all"
                                                    checked={selectedClients.includes(client.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) setSelectedClients(prev => [...prev, client.id]);
                                                        else setSelectedClients(prev => prev.filter(uid => uid !== client.id));
                                                    }}
                                                />
                                                <div>
                                                    <p className="text-xs font-black uppercase italic text-white leading-none">{client.name}</p>
                                                    <p className="text-[9px] text-slate-500 font-bold mt-1">{client.phone}</p>
                                                </div>
                                            </div>
                                            <div className="text-right flex flex-col items-end">
                                                <p className="text-[10px] font-black text-[#f2b90d]">R$ {Number(client.total_spent || 0).toFixed(2)}</p>
                                                <p className="text-[7px] text-slate-600 uppercase font-black tracking-tighter">Gasto Total</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="p-8 border-t border-white/5 flex gap-4">
                            <button
                                onClick={() => setIsClientModalOpen(false)}
                                className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 font-black uppercase text-[10px] tracking-widest py-4 rounded-2xl transition-all"
                            >
                                CANCELAR
                            </button>
                            <button
                                onClick={handleDeleteClients}
                                disabled={selectedClients.length === 0 || isDeleting}
                                className="flex-1 bg-rose-500 hover:bg-rose-600 disabled:opacity-30 disabled:grayscale text-white font-black uppercase text-[10px] tracking-widest py-4 rounded-2xl transition-all shadow-xl shadow-rose-500/20 flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-lg">{isDeleting ? 'sync' : 'delete_forever'}</span>
                                {isDeleting ? 'EXCLUINDO...' : `EXCLUIR SELECIONADOS (${selectedClients.length})`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function MetricCard({ title, value, icon, color, desc, alert, onAction, actionLabel }: any) {
    return (
        <div className={`bg-[#121214] border ${alert ? 'border-rose-500/30 bg-rose-500/[0.02]' : 'border-white/5'} p-6 rounded-[2rem] transition-all duration-500 group hover:translate-y-[-4px] hover:border-white/20 shadow-xl overflow-hidden relative`}>
            {/* Decoration */}
            <div className={`absolute -bottom-4 -right-4 size-20 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity ${color.replace('text-', 'bg-')}`}>
                <span className="material-symbols-outlined text-8xl absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">{icon}</span>
            </div>

            <div className="relative z-10 flex flex-col h-full justify-between">
                <div className="flex items-center justify-between mb-4">
                    <span className={`material-symbols-outlined ${color} text-2xl group-hover:scale-110 transition-transform duration-500`}>{icon}</span>
                    {onAction && (
                        <button
                            onClick={(e) => { e.preventDefault(); onAction(); }}
                            className="bg-white/5 hover:bg-[#f2b90d] hover:text-black border border-white/10 text-[8px] font-black uppercase px-3 py-1.5 rounded-full transition-all"
                        >
                            {actionLabel}
                        </button>
                    )}
                </div>
                <div>
                    <h2 className="text-4xl font-black text-white italic tracking-tighter mb-1 transition-all group-hover:text-white/90">
                        {value}
                    </h2>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-white opacity-40 mb-1 group-hover:opacity-60 transition-opacity">{title}</p>
                    <p className={`text-[7px] font-black uppercase tracking-widest ${alert ? 'text-rose-500' : 'text-slate-600'}`}>
                        {desc}
                    </p>
                </div>
            </div>
        </div>
    );
}
