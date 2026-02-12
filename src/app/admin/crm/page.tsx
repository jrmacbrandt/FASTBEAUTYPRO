'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getSegmentedClients } from '@/lib/crm';

export default function CRMDashboard() {
    const [loading, setLoading] = useState(true);
    const [tenant, setTenant] = useState<any>(null);
    const [stats, setStats] = useState({
        totalClients: 0,
        churnRisk: 0,
        vipClients: 0,
        birthdays: 0
    });
    const [savingLoyalty, setSavingLoyalty] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const tenantId = user.user_metadata.tenant_id;

            // 0. Fetch Tenant Config (Loyalty)
            const { data: tenantData } = await supabase
                .from('tenants')
                .select('id, loyalty_target, name')
                .eq('id', tenantId)
                .single();

            if (tenantData) setTenant(tenantData);

            // 1. Total Clientes
            const { count: total } = await supabase
                .from('clients')
                .select('*', { count: 'exact', head: true })
                .eq('tenant_id', tenantId);

            // 2. Churn Risk (> 45 dias sem visita)
            const churnClients = await getSegmentedClients(tenantId, { days_inactive: 45 });

            // 3. VIP (> R$ 500 gastos)
            const vipClients = await getSegmentedClients(tenantId, { min_spent: 500 });

            // 4. Aniversariantes (Mês Atual)
            const currentMonth = new Date().getMonth() + 1;
            const bdayClients = await getSegmentedClients(tenantId, { birth_month: currentMonth });

            setStats({
                totalClients: total || 0,
                churnRisk: churnClients.length,
                vipClients: vipClients.length,
                birthdays: bdayClients.length
            });

        } catch (error) {
            console.error('Error fetching CRM stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateLoyaltyTarget = async (target: number) => {
        if (!tenant) return;
        setSavingLoyalty(true);

        const { error } = await supabase
            .from('tenants')
            .update({ loyalty_target: target })
            .eq('id', tenant.id);

        if (!error) {
            setTenant((prev: any) => ({ ...prev, loyalty_target: target }));
        } else {
            alert('Erro ao atualizar meta: ' + error.message);
        }
        setSavingLoyalty(false);
    };

    return (
        <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-700 text-slate-100 pb-24">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/10 pb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-black italic tracking-tighter text-white">
                        CRM <span className="text-[#f2b90d]">INTELLIGENCE</span>
                    </h1>
                    <p className="text-sm text-slate-400 font-medium tracking-wide">
                        GESTÃO DE RELACIONAMENTO & RETENÇÃO
                    </p>
                </div>
                <button
                    onClick={() => window.location.href = '/admin/crm/nova-campanha'}
                    className="w-full md:w-auto bg-[#f2b90d] hover:bg-[#d9a50b] text-black font-black uppercase text-xs tracking-widest px-6 py-3 rounded-lg transition-all shadow-lg hover:shadow-[#f2b90d]/20 active:scale-95 flex items-center justify-center gap-2"
                >
                    <span className="material-symbols-outlined text-lg">add</span>
                    Nova Campanha
                </button>
            </header>

            {/* KPI CARDS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <MetricCard
                    title="BASE TOTAL"
                    value={stats.totalClients}
                    icon="groups"
                    color="text-blue-400"
                />
                <MetricCard
                    title="EM RISCO (45d+)"
                    value={stats.churnRisk}
                    icon="person_alert"
                    color="text-red-400"
                    alert={stats.churnRisk > 0}
                />
                <MetricCard
                    title="CLIENTES VIP"
                    value={stats.vipClients}
                    icon="diamond"
                    color="text-emerald-400"
                />
                <MetricCard
                    title="ANIVERSARIANTES"
                    value={stats.birthdays}
                    icon="cake"
                    color="text-purple-400"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* LOYALTY CONFIGURATION */}
                <div className="lg:col-span-1 bg-[#18181b] border border-white/5 rounded-2xl p-6 md:p-8 flex flex-col justify-between relative overflow-hidden group hover:border-[#f2b90d]/30 transition-all">
                    <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
                        <span className="material-symbols-outlined text-9xl text-[#f2b90d]">loyalty</span>
                    </div>

                    <div className="relative z-10">
                        <h3 className="text-lg font-black italic uppercase text-white mb-2 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#f2b90d]">verified</span>
                            Meta de Fidelidade
                        </h3>
                        <p className="text-xs text-slate-400 mb-6 font-medium">Defina quantos serviços o cliente precisa realizar para ganhar uma recompensa.</p>

                        <div className="grid grid-cols-3 gap-3">
                            {[5, 8, 10].map((val) => (
                                <button
                                    key={val}
                                    disabled={savingLoyalty}
                                    onClick={() => updateLoyaltyTarget(val)}
                                    className={`p-4 rounded-xl border font-black uppercase tracking-widest text-xs transition-all flex flex-col items-center gap-1 active:scale-95 disabled:opacity-50 ${tenant?.loyalty_target === val
                                        ? 'bg-[#f2b90d] border-[#f2b90d] text-black shadow-lg shadow-[#f2b90d]/20 scale-105'
                                        : 'bg-black/40 border-white/10 text-slate-500 hover:border-white/30 hover:text-white'
                                        }`}
                                >
                                    <span className="text-2xl">{val}</span>
                                    <span className="text-[8px] opacity-60">SELOS</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-white/5 relative z-10">
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                            <span className="material-symbols-outlined text-base">info</span>
                            <span>A alteração reflete imediatamente no Cartão Digital do cliente.</span>
                        </div>
                    </div>
                </div>

                {/* RECENT CAMPAIGNS LIST */}
                <div className="lg:col-span-2 bg-[#18181b] border border-white/5 rounded-2xl p-6 md:p-8">
                    <h3 className="text-lg font-black italic uppercase text-white mb-6 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#f2b90d]">campaign</span>
                        Campanhas Recentes
                    </h3>
                    <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-sm border-2 border-dashed border-white/5 rounded-xl bg-white/[0.02]">
                        <span className="material-symbols-outlined text-4xl opacity-20 mb-3">inbox</span>
                        <p className="font-bold uppercase tracking-widest opacity-50">Nenhuma campanha encontrada</p>
                        <p className="text-xs opacity-30 mt-1">Crie sua primeira campanha para reativar clientes!</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function MetricCard({ title, value, icon, color, alert }: any) {
    return (
        <div className={`bg-[#18181b] border ${alert ? 'border-red-500/30 bg-red-500/5' : 'border-white/5'} p-5 md:p-6 rounded-2xl flex items-center justify-between group hover:border-white/10 transition-all`}>
            <div>
                <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 truncate">{title}</p>
                <h2 className={`text-2xl md:text-3xl font-black text-white ${alert ? 'text-red-400' : ''}`}>{value}</h2>
            </div>
            <div className={`size-10 md:size-12 rounded-xl ${alert ? 'bg-red-500/10' : 'bg-white/5'} flex items-center justify-center`}>
                <span className={`material-symbols-outlined ${color} text-xl md:text-2xl`}>{icon}</span>
            </div>
        </div>
    );
}
