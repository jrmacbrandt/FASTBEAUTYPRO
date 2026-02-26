'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Cell
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// Premium Metric Card Component
const MetricCard = ({ title, value, subtext, icon, theme, colorIndex = 0, headerLabel = "(SEM DESCONTAR TAXAS)" }: any) => {
    const colors = [
        { primary: '#f2b90d', bg: '#f2b90d20' },
        { primary: '#10b981', bg: '#10b98120' },
        { primary: '#3b82f6', bg: '#3b82f620' },
        { primary: '#f43f5e', bg: '#f43f5e20' }
    ];
    const activeColor = colors[colorIndex % colors.length];

    return (
        <div className="rounded-3xl md:rounded-[2.5rem] p-6 md:p-10 relative overflow-hidden group transition-all shadow-2xl"
            style={{ backgroundColor: theme.cardBg }}>
            <div className="absolute top-0 right-0 w-32 h-32 blur-[80px] opacity-20 pointer-events-none"
                style={{ backgroundColor: activeColor.primary }}
            ></div>

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-6 md:mb-8">
                    <div>
                        <h3 className="text-lg md:text-xl font-black italic uppercase mb-1" style={{ color: theme.text }}>{title}</h3>
                        <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest opacity-60" style={{ color: theme.text }}>{headerLabel}</p>
                    </div>
                    <div className="size-10 md:size-12 rounded-xl md:rounded-2xl flex items-center justify-center group-hover:rotate-12 transition-transform"
                        style={{ backgroundColor: activeColor.bg }}
                    >
                        <span className="material-symbols-outlined text-[20px] md:text-[24px]" style={{ color: activeColor.primary }}>{icon}</span>
                    </div>
                </div>

                <div className="space-y-1">
                    <h4 className="text-2xl md:text-4xl font-black italic tracking-tighter" style={{ color: theme.text }}>{value}</h4>
                    {subtext && (
                        <div className="flex flex-col space-y-1">
                            {subtext}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default function ReportsPage() {
    const [profile, setProfile] = useState<any>(null);
    const [theme, setTheme] = useState<any>({
        primary: '#EAB308',
        cardBg: '#121212',
        text: '#FFFFFF',
        textMuted: '#A1A1AA',
        border: '#27272A',
        chartGrid: '#27272A',
        sidebarBg: '#09090b'
    });
    const [debug, setDebug] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState({
        serviceRevenue: 0,
        productRevenue: 0,
        commissions: 0,
        serviceFees: 0,
        productFees: 0,
        totalFees: 0,
        profit: 0
    });
    const [chartData, setChartData] = useState<any[]>([]);
    const [historicalData, setHistoricalData] = useState<any[]>([]);

    useEffect(() => {
        const initReports = async () => {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const { data: profileData } = await supabase
                .from('profiles')
                .select('*, tenant:tenants(*)')
                .eq('id', session.user.id)
                .single();

            if (profileData) {
                setProfile(profileData);
                fetchFinancialData(profileData.tenant_id);
                fetchHistoricalData(profileData.tenant_id);
            }
        };
        initReports();
    }, []);

    const fetchHistoricalData = async (tenantId: string) => {
        const { data, error } = await supabase
            .from('tenant_monthly_summaries')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('reference_month', { ascending: false });

        if (!error && data) {
            setHistoricalData(data);
        }
    };

    const fetchFinancialData = async (tid: string) => {
        if (!tid) return;
        try {
            setLoading(true);

            // 🛡️ [DIAGNÓSTICO AGRESSIVO] - Escaneamento amplo de dados
            const { data: orders, error: ordersError } = await supabase
                .from('orders')
                .select('*')
                .eq('tenant_id', tid)
                .order('created_at', { ascending: true });

            if (ordersError) {
                console.error('[Relatórios-Audit] Erro SQL Pedidos:', ordersError);
            }

            // Diagnostic logic
            const diag = {
                total: orders?.length || 0,
                statusCounts: {} as Record<string, number>
            };
            orders?.forEach(o => diag.statusCounts[o.status] = (diag.statusCounts[o.status] || 0) + 1);
            setDebug(diag);

            const filteredOrders = orders?.filter(o => o.status === 'paid' || o.status === 'pago') || [];

            // 2. Fetch Stock Transactions (Cost) - Últimos 30 dias para performance
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            thirtyDaysAgo.setHours(0, 0, 0, 0);

            const { data: transactions } = await supabase
                .from('stock_transactions')
                .select(`
                    quantity,
                    created_at,
                    products (
                        cost_price
                    )
                `)
                .eq('tenant_id', tid)
                .eq('type', 'OUT')
                .gte('created_at', thirtyDaysAgo.toISOString());

            // --- Calculation Engine ---
            let totalServiceRevenue = 0;
            let totalProductRevenue = 0;
            let totalCommissions = 0;
            let totalServiceFees = 0;
            let totalProductFees = 0;

            const dailyStats: Record<string, { revenue: number, cost: number }> = {};
            const now = new Date();

            // Inicializar últimos 30 dias no dailyStats
            for (let i = 29; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                dailyStats[d.toLocaleDateString('pt-BR')] = { revenue: 0, cost: 0 };
            }

            // Processamento unificado de Pedidos
            filteredOrders.forEach(order => {
                const d = new Date(order.finalized_at || order.created_at);
                const dStr = d.toLocaleDateString('pt-BR');

                // Só processamos para o dashboard se estiver nos últimos 30 dias (local)
                const isWithin30Days = d >= thirtyDaysAgo;

                const sRev = Number(order.service_total) || Number(order.total_value) || 0;
                const pRev = Number(order.product_total) || 0;
                const comm = Number(order.commission_amount) || 0;
                const sFee = Number(order.fee_amount_services) || 0;
                const pFee = Number(order.fee_amount_products) || 0;

                if (isWithin30Days) {
                    totalServiceRevenue += sRev;
                    totalProductRevenue += pRev;
                    totalCommissions += comm;
                    totalServiceFees += sFee;
                    totalProductFees += pFee;

                    if (dailyStats[dStr]) {
                        dailyStats[dStr].revenue += (sRev + pRev);
                    }
                }
            });

            // Processamento de Custos (Transactions)
            transactions?.forEach((t: any) => {
                const cost = (Number(t.quantity) || 0) * (Number(t.products?.cost_price) || 0);
                const d = new Date(t.created_at);
                const dStr = d.toLocaleDateString('pt-BR');
                if (dailyStats[dStr]) {
                    dailyStats[dStr].cost += cost;
                }
            });

            const totalFees = totalServiceFees + totalProductFees;
            const netProfit = (totalServiceRevenue + totalProductRevenue) - totalCommissions - totalFees;

            setMetrics({
                serviceRevenue: totalServiceRevenue,
                productRevenue: totalProductRevenue,
                commissions: totalCommissions,
                serviceFees: totalServiceFees,
                productFees: totalProductFees,
                totalFees: totalFees,
                profit: netProfit
            });

            // Chart Data Formatting (Últimos 30 dias filtrados para os 7 dias visíveis por padrão no componente ou exibição total)
            const formattedChartData = Object.keys(dailyStats).map(date => ({
                name: date.split('/')[0] + '/' + date.split('/')[1], // Apenas DD/MM
                Receita: dailyStats[date].revenue,
                Custo: dailyStats[date].cost,
                Lucro: dailyStats[date].revenue - dailyStats[date].cost
            })).sort((a, b) => {
                const [dayA, monthA] = a.name.split('/');
                const [dayB, monthB] = b.name.split('/');
                return Number(monthA + dayA) - Number(monthB + dayB);
            });

            // Mostramos apenas os últimos 15 dias no gráfico para não poluir
            setChartData(formattedChartData.slice(-15));

        } catch (error) {
            console.error('[Relatórios-Audit] Erro fatal:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!profile || loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <div className="size-12 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: theme.primary, borderTopColor: 'transparent' }}></div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 animate-pulse" style={{ color: theme.textMuted }}>Processando Relatórios Intelligence...</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 space-y-8 pb-24" style={{ color: theme.text }}>
            {debug && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-lg text-[10px] font-mono text-emerald-400 flex gap-4 overflow-x-auto">
                    <span>Diagnostic: {debug.total} orders scanned</span>
                    <span>Stats: {JSON.stringify(debug.statusCounts)}</span>
                    <span className="opacity-50">TID: {profile?.tenant_id}</span>
                </div>
            )}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center pb-8 gap-4">
                <div className="relative">
                    <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-12 rounded-full blur-sm opacity-50" style={{ backgroundColor: theme.primary }}></div>
                    <h1 className="text-4xl font-black italic tracking-tighter uppercase leading-none" style={{ color: theme.text }}>
                        Relatórios <span style={{ color: theme.primary }}>Intelligence</span>
                    </h1>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] mt-2 flex items-center gap-2" style={{ color: theme.textMuted }}>
                        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Monitoramento em Tempo Real - DADOS REAIS
                    </p>
                </div>
            </header>

            {/* Metrics Grid */}
            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                    title="Receita Bruta Serviços"
                    value={`R$ ${metrics.serviceRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    icon="payments"
                    theme={theme}
                    colorIndex={0}
                />
                <MetricCard
                    title="Receita Bruta Vendas"
                    value={`R$ ${metrics.productRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    icon="inventory_2"
                    theme={theme}
                    colorIndex={2}
                />
                <MetricCard
                    title="Comissões Pagas"
                    value={`R$ ${metrics.commissions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    icon="handshake"
                    theme={theme}
                    colorIndex={3}
                />
                <MetricCard
                    title="Lucro Líquido Real"
                    value={`R$ ${metrics.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    icon="trending_up"
                    theme={theme}
                    colorIndex={1}
                    headerLabel="Resultado Final"
                    subtext={
                        <div className="space-y-1.5 mt-3 border-t border-white/5 pt-3">
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight flex justify-between"><span>TAXAS DE SERVIÇOS:</span> <span className="text-rose-500 font-black">- R$ {metrics.serviceFees.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight flex justify-between"><span>TAXAS DE PRODUTOS:</span> <span className="text-rose-500 font-black">- R$ {metrics.productFees.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p>
                        </div>
                    }
                />
            </div>

            {/* Historical Summaries Area */}
            {historicalData.length > 0 && (
                <div className="rounded-3xl md:rounded-[2.5rem] p-6 md:p-10 shadow-2xl overflow-hidden transition-all mt-8"
                    style={{ backgroundColor: theme.cardBg }}
                >
                    <div className="flex items-center justify-between mb-8 md:mb-10">
                        <div>
                            <h3 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter" style={{ color: theme.text }}>Histórico Consolidado (Arquivo Mestre)</h3>
                            <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] opacity-40" style={{ color: theme.textMuted }}>Resultados mensais (+90 dias)</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {historicalData.map(month => (
                            <div key={month.id} className="border border-white/5 p-4 rounded-2xl md:rounded-[2rem] flex flex-col sm:flex-row items-center justify-between gap-4 bg-black/20">
                                <div className="flex items-center gap-4 w-full">
                                    <div className="size-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${theme.primary}1a`, color: theme.primary }}>
                                        <span className="material-symbols-outlined">calendar_month</span>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-lg text-white capitalize">{new Date(month.reference_month).toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</h4>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{month.total_appointments} ATENDIMENTOS</p>
                                    </div>
                                </div>
                                <div className="flex w-full sm:w-auto items-center sm:items-end justify-between sm:flex-col border-t sm:border-t-0 border-white/5 pt-3 sm:pt-0">
                                    <p className="text-[8px] font-black uppercase tracking-widest italic opacity-40 text-slate-500 mb-1">Lucro Líquido</p>
                                    <p className="text-xl md:text-2xl font-black italic tracking-tighter text-emerald-500">
                                        R$ {Number(month.net_profit || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Charts Area */}
            <div className="rounded-3xl md:rounded-[2.5rem] p-6 md:p-10 shadow-2xl overflow-hidden transition-all mt-8"
                style={{ backgroundColor: theme.cardBg }}
            >
                <div className="flex items-center justify-between mb-8 md:mb-10">
                    <div>
                        <h3 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter" style={{ color: theme.text }}>Performance Diária</h3>
                        <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] opacity-40" style={{ color: theme.textMuted }}>Faturamento vs Custos (Últimos 30 dias)</p>
                    </div>
                    <div className="flex items-center gap-2 md:gap-4">
                        <div className="flex items-center gap-1 md:gap-2">
                            <span className="size-2 md:size-3 rounded-full" style={{ backgroundColor: theme.primary }}></span>
                            <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest opacity-60" style={{ color: theme.text }}>Receita</span>
                        </div>
                        <div className="flex items-center gap-1 md:gap-2">
                            <span className="size-2 md:size-3 rounded-full bg-red-500"></span>
                            <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest opacity-60" style={{ color: theme.text }}>Custo</span>
                        </div>
                    </div>
                </div>

                <div className="h-[300px] md:h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.chartGrid} opacity={0.3} />
                            <XAxis
                                dataKey="name"
                                stroke={theme.textMuted}
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                tick={{ fontWeight: 800, fill: theme.textMuted }}
                                dy={10}
                            />
                            <YAxis
                                stroke={theme.textMuted}
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `R$${value}`}
                                tick={{ fontWeight: 800, fill: theme.textMuted }}
                            />
                            <Tooltip
                                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                                contentStyle={{
                                    backgroundColor: theme.sidebarBg,
                                    border: `1px solid ${theme.border}`,
                                    borderRadius: '1.5rem',
                                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                                    padding: '1.5rem'
                                }}
                                itemStyle={{ fontWeight: 900, textTransform: 'uppercase', fontSize: '10px' }}
                                labelStyle={{ fontWeight: 900, color: theme.text, marginBottom: '0.5rem', textTransform: 'uppercase', fontSize: '12px' }}
                            />
                            <Bar dataKey="Receita" fill={theme.primary} radius={[6, 6, 0, 0]} barSize={24} />
                            <Bar dataKey="Custo" fill="#ef4444" radius={[6, 6, 0, 0]} barSize={24} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
