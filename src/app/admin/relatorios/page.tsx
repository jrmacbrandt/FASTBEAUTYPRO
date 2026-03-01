'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/hooks/useProfile';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Cell
} from 'recharts';

// Premium Metric Card with Gross/Net Distinction
const IntelligenceCard = ({ title, gross, net, icon, color, subtext, theme }: any) => {
    return (
        <div className="rounded-[2.5rem] p-8 md:p-10 relative overflow-hidden group transition-all shadow-2xl border border-white/5"
            style={{ backgroundColor: theme.cardBg }}>
            <div className="absolute top-0 right-0 w-32 h-32 blur-[80px] opacity-10 pointer-events-none"
                style={{ backgroundColor: color }}
            ></div>

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-[0.2em] opacity-40 mb-1" style={{ color: theme.text }}>{title}</h3>
                        <div className="size-1 w-8 rounded-full" style={{ backgroundColor: color }}></div>
                    </div>
                    <div className="size-12 rounded-2xl flex items-center justify-center bg-white/5 group-hover:scale-110 transition-transform duration-500">
                        <span className="material-symbols-outlined text-2xl" style={{ color: color }}>{icon}</span>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-[#64748b] mb-1">Receita Líquida</p>
                        <h4 className="text-3xl md:text-4xl font-black italic tracking-tighter text-white">
                            R$ {net.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h4>
                    </div>

                    <div className="pt-4 border-t border-white/5 flex justify-between items-end">
                        <div>
                            <p className="text-[8px] font-black uppercase tracking-[0.15em] text-[#64748b] mb-0.5">Valor Bruto</p>
                            <p className="text-xs font-bold text-slate-400">R$ {gross.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                        {subtext && (
                            <div className="text-right">
                                {subtext}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function ReportsIntelligencePage() {
    const { profile, theme: colors, businessType } = useProfile();
    const [loading, setLoading] = useState(true);
    const [filterDays, setFilterDays] = useState(30);

    const [metrics, setMetrics] = useState({
        serviceGross: 0,
        serviceNet: 0,
        productGross: 0,
        productNet: 0,
        commissionsGross: 0,
        commissionsNet: 0,
        totalFees: 0,
        cogs: 0,
        profit: 0
    });

    const [chartData, setChartData] = useState<any[]>([]);

    useEffect(() => {
        if (profile?.tenant_id) {
            fetchIntelligenceData();

            // Real-time synchronization for orders
            const channel = supabase.channel('reports_intelligence_sync')
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'orders',
                    filter: `tenant_id=eq.${profile.tenant_id}`
                }, () => fetchIntelligenceData())
                .subscribe();

            return () => { supabase.removeChannel(channel); };
        }
    }, [profile, filterDays]);

    const fetchIntelligenceData = async () => {
        if (!profile?.tenant_id) return;
        setLoading(true);

        try {
            const now = new Date();
            const startDate = new Date();
            startDate.setDate(now.getDate() - filterDays);
            startDate.setHours(0, 0, 0, 0);

            // 1. Fetch Orders (Revenue, Fees, Commissions)
            const { data: orders } = await supabase
                .from('orders')
                .select('*')
                .eq('tenant_id', profile.tenant_id)
                .eq('status', 'paid')
                .gte('finalized_at', startDate.toISOString())
                .order('finalized_at', { ascending: true });

            // 2. Fetch Stock Movements (COGS)
            const { data: transactions } = await supabase
                .from('stock_transactions')
                .select('quantity, type, created_at, products(cost_price)')
                .eq('tenant_id', profile.tenant_id)
                .eq('type', 'OUT')
                .gte('created_at', startDate.toISOString());

            // --- Calculation Engine ---
            let sGross = 0, sNet = 0;
            let pGross = 0, pNet = 0;
            let cGross = 0, cNet = 0;
            let totalFees = 0;
            let totalCOGS = 0;

            const dailyMap: Record<string, { revenue: number, cost: number }> = {};

            // Initialize daily map
            for (let i = filterDays; i >= 0; i--) {
                const date = new Date();
                date.setDate(now.getDate() - i);
                dailyMap[date.toLocaleDateString('pt-BR')] = { revenue: 0, cost: 0 };
            }

            orders?.forEach(order => {
                const day = new Date(order.finalized_at).toLocaleDateString('pt-BR');

                const osGross = Number(order.service_total) || Number(order.total_value) || 0;
                const opGross = Number(order.product_total) || 0;
                const osFees = Number(order.fee_amount_services) || 0;
                const opFees = Number(order.fee_amount_products) || 0;
                const oCommGross = Number(order.commission_amount) || 0;

                const oTotalGross = osGross + opGross;
                const oTotalNet = oTotalGross - (osFees + opFees);

                // Comm Net calculation (Professional shares transaction fees proportionally)
                const oCommNet = oTotalGross > 0 ? (oCommGross * (oTotalNet / oTotalGross)) : 0;

                sGross += osGross;
                sNet += (osGross - osFees);
                pGross += opGross;
                pNet += (opGross - opFees);
                cGross += oCommGross;
                cNet += oCommNet;
                totalFees += (osFees + opFees);

                if (dailyMap[day]) {
                    dailyMap[day].revenue += oTotalNet;
                }
            });

            transactions?.forEach((t: any) => {
                const day = new Date(t.created_at).toLocaleDateString('pt-BR');
                const cost = (Number(t.quantity) || 0) * (Number(t.products?.cost_price) || 0);
                totalCOGS += cost;

                if (dailyMap[day]) {
                    dailyMap[day].cost += cost;
                }
            });

            const netProfit = (sNet + pNet) - cGross - totalCOGS; // Using Commissions Gross for conservative business profit

            setMetrics({
                serviceGross: sGross,
                serviceNet: sNet,
                productGross: pGross,
                productNet: pNet,
                commissionsGross: cGross,
                commissionsNet: cNet,
                totalFees,
                cogs: totalCOGS,
                profit: netProfit
            });

            // Format Chart Data
            const formatted = Object.keys(dailyMap).map(date => ({
                date: date.split('/')[0] + '/' + date.split('/')[1],
                Receita: dailyMap[date].revenue,
                Custo: dailyMap[date].cost,
                Lucro: dailyMap[date].revenue - dailyMap[date].cost
            }));

            setChartData(formatted);

        } catch (error) {
            console.error('Error in Intelligence Engine:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading && !metrics.profit) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
                <div className="size-16 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: colors.primary }}></div>
                <p className="text-[10px] font-black uppercase tracking-[0.5em] opacity-40 animate-pulse" style={{ color: colors.text }}>Sincronizando Inteligência de Dados...</p>
            </div>
        );
    }

    const theme = {
        cardBg: '#121214',
        text: '#F8FAFC',
        textMuted: '#64748B',
        primary: colors.primary
    };

    return (
        <div className="p-4 md:p-8 space-y-12 pb-24">
            {/* Intelligence Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="relative">
                    <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-1.5 h-16 rounded-full blur-[2px]" style={{ backgroundColor: theme.primary }}></div>
                    <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase leading-none">
                        Intelligence <span style={{ color: theme.primary }}>Reports</span>
                    </h1>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] mt-3 flex items-center gap-3" style={{ color: theme.textMuted }}>
                        <span className="size-2 rounded-full animate-pulse bg-emerald-500 shadow-[0_0_10px_#10b981]"></span>
                        Ativo • Atualizando em Tempo Real
                    </p>
                </div>

                <div className="flex p-1.5 rounded-2xl bg-black/40 border border-white/5 backdrop-blur-xl">
                    {[7, 30, 90].map(days => (
                        <button
                            key={days}
                            onClick={() => setFilterDays(days)}
                            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterDays === days ? 'bg-white text-black italic scale-105 shadow-xl' : 'text-zinc-500 hover:text-white'}`}
                        >
                            {days} Dias
                        </button>
                    ))}
                </div>
            </header>

            {/* Performance Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                <IntelligenceCard
                    title="Receita Serviços"
                    gross={metrics.serviceGross}
                    net={metrics.serviceNet}
                    icon="payments"
                    color="#f2b90d"
                    theme={theme}
                />
                <IntelligenceCard
                    title="Receita Vendas"
                    gross={metrics.productGross}
                    net={metrics.productNet}
                    icon="inventory_2"
                    color="#3b82f6"
                    theme={theme}
                />
                <IntelligenceCard
                    title="Comissões Pagas"
                    gross={metrics.commissionsGross}
                    net={metrics.commissionsNet}
                    icon="handshake"
                    color="#f43f5e"
                    theme={theme}
                    subtext={
                        <p className="text-[7.5px] font-black uppercase tracking-widest text-rose-500/60 leading-tight">
                            Share Líquido<br />Auditado
                        </p>
                    }
                />
                <IntelligenceCard
                    title="Lucro Líquido Real"
                    gross={metrics.serviceNet + metrics.productNet}
                    net={metrics.profit}
                    icon="trending_up"
                    color="#10b981"
                    theme={theme}
                    subtext={
                        <div className="text-right">
                            <p className="text-[8px] font-black uppercase text-zinc-500">Taxas: -R$ {metrics.totalFees.toLocaleString('pt-BR')}</p>
                            <p className="text-[8px] font-black uppercase text-zinc-500">CMV: -R$ {metrics.cogs.toLocaleString('pt-BR')}</p>
                        </div>
                    }
                />
            </div>

            {/* Detailed Analytics Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Performance Flow Chart */}
                <div className="lg:col-span-2 rounded-[3rem] p-8 md:p-10 border border-white/5 shadow-2xl overflow-hidden relative"
                    style={{ backgroundColor: theme.cardBg }}>
                    <div className="absolute top-0 right-0 p-10 opacity-[0.02] pointer-events-none">
                        <span className="material-symbols-outlined text-[15rem]">insights</span>
                    </div>

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
                        <div>
                            <h3 className="text-2xl font-black italic uppercase tracking-tighter">Fluxo de Performance</h3>
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40 mt-1">Comparativo Receita Líquida vs Custos Reais</p>
                        </div>
                        <div className="flex gap-6">
                            <div className="flex items-center gap-2">
                                <span className="size-3 rounded-full shadow-[0_0_8px_#f2b90d]" style={{ backgroundColor: theme.primary }}></span>
                                <span className="text-[9px] font-black uppercase tracking-widest opacity-50">Receita</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="size-3 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e]"></span>
                                <span className="text-[9px] font-black uppercase tracking-widest opacity-50">Custos</span>
                            </div>
                        </div>
                    </div>

                    <div className="h-[350px] md:h-[450px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={theme.primary} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={theme.primary} stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" opacity={0.5} />
                                <XAxis
                                    dataKey="date"
                                    stroke="#52525b"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fontWeight: 800 }}
                                    dy={15}
                                />
                                <YAxis
                                    stroke="#52525b"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fontWeight: 800 }}
                                    tickFormatter={(v) => `R$${v}`}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#09090b',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '1.5rem',
                                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
                                    }}
                                    itemStyle={{ fontWeight: 900, textTransform: 'uppercase', fontSize: '10px' }}
                                    labelStyle={{ fontWeight: 900, color: theme.primary, marginBottom: '0.5rem', fontSize: '12px' }}
                                />
                                <Area type="monotone" dataKey="Receita" stroke={theme.primary} strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" />
                                <Area type="monotone" dataKey="Custo" stroke="#f43f5e" strokeWidth={4} fillOpacity={1} fill="url(#colorCost)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Composition Column */}
                <div className="space-y-8">
                    {/* Tax Summary */}
                    <div className="rounded-[2.5rem] p-8 border border-white/5 bg-black/40 relative overflow-hidden h-full flex flex-col justify-between">
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="size-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-orange-500 text-xl">account_balance_wallet</span>
                                </div>
                                <h4 className="text-sm font-black uppercase tracking-widest">Resumo de Taxas Financeiras</h4>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                                    <span className="text-[10px] font-black uppercase text-zinc-500">Total Taxas Card/Pix</span>
                                    <span className="font-black text-rose-500 text-lg">R$ {metrics.totalFees.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between items-center bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                                    <span className="text-[10px] font-black uppercase text-zinc-500">Total CMV (Produtos)</span>
                                    <span className="font-black text-white text-lg">R$ {metrics.cogs.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-emerald-500/20 to-transparent p-6 rounded-3xl border border-emerald-500/20 mt-8">
                            <p className="text-[10px] font-black uppercase text-emerald-500 tracking-widest mb-1">Margem Líquida Real</p>
                            <h5 className="text-3xl font-black italic tracking-tighter text-white">
                                {metrics.serviceGross + metrics.productGross > 0
                                    ? ((metrics.profit / (metrics.serviceGross + metrics.productGross)) * 100).toFixed(1)
                                    : '0'}%
                            </h5>
                            <p className="text-[9px] font-bold text-zinc-500 mt-2 italic uppercase">Resultado após todas as deduções</p>
                        </div>
                    </div>
                </div>
            </div>

            <footer className="pt-12 border-t border-white/5 text-center">
                <p className="text-[9px] font-black uppercase tracking-[0.5em] opacity-20 italic">FastBeauty Pro • Intelligence Auditor v4.5 • [DADOS CRIPTOGRAFADOS E REAIS]</p>
            </footer>
        </div>
    );
}
