'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/hooks/useProfile';
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
const MetricCard = ({ title, value, subtext, icon, theme, colorIndex = 0 }: any) => {
    const colors = [
        { primary: theme.primary, bg: `${theme.primary}1a` },
        { primary: '#10b981', bg: '#10b9811a' }, // Emerald
        { primary: '#ef4444', bg: '#ef44441a' }, // Red
        { primary: '#3b82f6', bg: '#3b82f61a' }, // Blue
    ];

    const activeColor = colors[colorIndex % colors.length];

    return (
        <div className="rounded-[2.5rem] p-8 md:p-10 relative overflow-hidden group transition-all shadow-2xl"
            style={{ backgroundColor: theme.cardBg }}
        >
            <div className="absolute -top-12 -right-12 size-40 rounded-full blur-3xl pointer-events-none transition-all opacity-20 group-hover:opacity-40"
                style={{ backgroundColor: activeColor.primary }}
            ></div>

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-xl font-black italic uppercase mb-1" style={{ color: theme.text }}>{title}</h3>
                        <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: theme.textMuted }}>Métrica Financeira</p>
                    </div>
                    <div className="size-12 rounded-2xl flex items-center justify-center group-hover:rotate-12 transition-transform"
                        style={{ backgroundColor: activeColor.bg }}
                    >
                        <span className="material-symbols-outlined" style={{ color: activeColor.primary }}>{icon}</span>
                    </div>
                </div>

                <div className="space-y-1">
                    <h4 className="text-4xl font-black italic tracking-tighter" style={{ color: theme.text }}>{value}</h4>
                    {subtext && (
                        <div className="flex items-center gap-2">
                            <span className="size-1.5 rounded-full bg-emerald-500"></span>
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-60" style={{ color: theme.text }}>{subtext}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default function ReportsPage() {
    const { profile, loading: profileLoading, theme, businessType } = useProfile();
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState({
        revenue: 0,
        cost: 0,
        profit: 0,
        margin: 0
    });
    const [chartData, setChartData] = useState<any[]>([]);

    useEffect(() => {
        if (!profileLoading && profile?.tenant_id) {
            fetchFinancialData(profile.tenant_id);
        }
    }, [profileLoading, profile]);

    const fetchFinancialData = async (tenantId: string) => {
        try {
            setLoading(true);

            // Fetch last 30 days
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            thirtyDaysAgo.setHours(0, 0, 0, 0);

            // 1. Fetch Paid Orders (Revenue)
            const { data: orders } = await supabase
                .from('orders')
                .select('total_value, finalized_at, created_at')
                .eq('tenant_id', tenantId)
                .eq('status', 'paid')
                .gte('created_at', thirtyDaysAgo.toISOString());

            // 2. Fetch Stock Transactions (Cost)
            const { data: transactions } = await supabase
                .from('stock_transactions')
                .select(`
                    quantity,
                    created_at,
                    products (
                        cost_price
                    )
                `)
                .eq('tenant_id', tenantId)
                .eq('type', 'OUT')
                .gte('created_at', thirtyDaysAgo.toISOString());

            // --- Calculation Logic ---
            let totalRevenue = 0;
            let totalCost = 0;
            const dailyStats: Record<string, { revenue: number, cost: number }> = {};

            // Initialize last 7 days in dailyStats to ensure chart shows data even with gaps
            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dateKey = date.toLocaleDateString('pt-BR');
                dailyStats[dateKey] = { revenue: 0, cost: 0 };
            }

            // Process Revenue
            orders?.forEach(order => {
                const val = Number(order.total_value) || 0;
                totalRevenue += val;
                const d = new Date(order.finalized_at || order.created_at);
                const dateKey = d.toLocaleDateString('pt-BR');
                if (dailyStats[dateKey]) {
                    dailyStats[dateKey].revenue += val;
                }
            });

            // Process Costs
            transactions?.forEach((tx: any) => {
                const cost = (tx.quantity || 0) * (tx.products?.cost_price || 0);
                totalCost += cost;
                const d = new Date(tx.created_at);
                const dateKey = d.toLocaleDateString('pt-BR');
                if (dailyStats[dateKey]) {
                    dailyStats[dateKey].cost += cost;
                }
            });

            const netProfit = totalRevenue - totalCost;
            const margin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0';

            setMetrics({
                revenue: totalRevenue,
                cost: totalCost,
                profit: netProfit,
                margin: Number(margin)
            });

            const formattedChartData = Object.keys(dailyStats).map(date => ({
                name: date.split('/')[0] + '/' + date.split('/')[1], // Just DD/MM
                Receita: dailyStats[date].revenue,
                Custo: dailyStats[date].cost,
                Lucro: dailyStats[date].revenue - dailyStats[date].cost
            })).sort((a, b) => {
                const [dayA, monthA] = a.name.split('/');
                const [dayB, monthB] = b.name.split('/');
                return Number(monthA + dayA) - Number(monthB + dayB);
            });

            setChartData(formattedChartData);

        } catch (error) {
            console.error('Error fetching reports:', error);
        } finally {
            setLoading(false);
        }
    };

    if (profileLoading || loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <div className="size-12 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: theme.primary, borderTopColor: 'transparent' }}></div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 animate-pulse" style={{ color: theme.textMuted }}>Processando Relatórios Intelligence...</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 space-y-8 pb-24" style={{ color: theme.text }}>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                    title="Receita Bruta"
                    value={`R$ ${metrics.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    icon="payments"
                    theme={theme}
                    colorIndex={0}
                    subtext="Vendas finalizadas"
                />
                <MetricCard
                    title="Custo de Vendas"
                    value={`R$ ${metrics.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    icon="inventory_2"
                    theme={theme}
                    colorIndex={2}
                    subtext="Saída de estoque"
                />
                <MetricCard
                    title="Lucro Líquido"
                    value={`R$ ${metrics.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    icon="trending_up"
                    theme={theme}
                    colorIndex={1}
                    subtext="Faturamento - Custos"
                />
                <MetricCard
                    title="Margem"
                    value={`${metrics.margin}%`}
                    icon="monitoring"
                    theme={theme}
                    colorIndex={3}
                    subtext="Rentabilidade Mensal"
                />
            </div>

            {/* Charts Area */}
            <div className="rounded-[2.5rem] p-8 md:p-10 shadow-2xl overflow-hidden transition-all"
                style={{ backgroundColor: theme.cardBg }}
            >
                <div className="flex items-center justify-between mb-10">
                    <div>
                        <h3 className="text-2xl font-black italic uppercase tracking-tighter" style={{ color: theme.text }}>Performance Diária</h3>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40" style={{ color: theme.textMuted }}>Faturamento vs Custos (Últimos 7 dias)</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="size-3 rounded-full" style={{ backgroundColor: theme.primary }}></span>
                            <span className="text-[9px] font-black uppercase tracking-widest opacity-60" style={{ color: theme.text }}>Receita</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="size-3 rounded-full bg-red-500"></span>
                            <span className="text-[9px] font-black uppercase tracking-widest opacity-60" style={{ color: theme.text }}>Custo</span>
                        </div>
                    </div>
                </div>

                <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
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
