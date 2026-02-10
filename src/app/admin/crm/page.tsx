'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getSegmentedClients } from '@/lib/crm';

export default function CRMDashboard() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalClients: 0,
        churnRisk: 0,
        vipClients: 0,
        birthdays: 0
    });

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Total Clientes
            const { count: total } = await supabase
                .from('clients')
                .select('*', { count: 'exact', head: true })
                .eq('tenant_id', user.user_metadata.tenant_id);

            // 2. Churn Risk (> 45 dias sem visita)
            const churnClients = await getSegmentedClients(user.user_metadata.tenant_id, { days_inactive: 45 });

            // 3. VIP (> R$ 500 gastos)
            const vipClients = await getSegmentedClients(user.user_metadata.tenant_id, { min_spent: 500 });

            // 4. Aniversariantes (Mês Atual) - Placeholder por enquanto
            const currentMonth = new Date().getMonth() + 1;
            const bdayClients = await getSegmentedClients(user.user_metadata.tenant_id, { birth_month: currentMonth });

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

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-700 text-slate-100">
            <header className="flex justify-between items-center border-b border-white/10 pb-6">
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
                    className="bg-[#f2b90d] hover:bg-[#d9a50b] text-black font-black uppercase text-xs tracking-widest px-6 py-3 rounded-lg transition-all shadow-lg hover:shadow-[#f2b90d]/20 active:scale-95"
                >
                    + Nova Campanha
                </button>
            </header>

            {/* KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

            {/* RECENT CAMPAIGNS LIST (Placeholder) */}
            <div className="bg-[#18181b] border border-white/5 rounded-2xl p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#f2b90d]">campaign</span>
                    Campanhas Recentes
                </h3>
                <div className="text-center py-10 text-slate-500 text-sm italic">
                    Nenhuma campanha recente encontrada.
                    <br />
                    Crie sua primeira campanha para reativar clientes!
                </div>
            </div>
        </div>
    );
}

function MetricCard({ title, value, icon, color, alert }: any) {
    return (
        <div className={`bg-[#18181b] border ${alert ? 'border-red-500/30 bg-red-500/5' : 'border-white/5'} p-6 rounded-2xl flex items-center justify-between group hover:border-white/10 transition-all`}>
            <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">{title}</p>
                <h2 className="text-3xl font-black text-white">{value}</h2>
            </div>
            <div className={`size-12 rounded-xl ${alert ? 'bg-red-500/10' : 'bg-white/5'} flex items-center justify-center`}>
                <span className={`material-symbols-outlined ${color} text-2xl`}>{icon}</span>
            </div>
        </div>
    );
}
