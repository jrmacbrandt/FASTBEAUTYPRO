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
                        <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: theme.textMuted }}>(SEM DESCONTAR TAXAS)</p>
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
        serviceRevenue: 0,
        productRevenue: 0,
        commissions: 0,
        serviceFees: 0,
        productFees: 0,
        totalFees: 0,
        profit: 0
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

            // 1. Fetch Paid Orders (Full Detail)
            const { data: orders } = await supabase
                .from('orders')
                .select('total_value, commission_amount, service_total, product_total, fee_amount_services, fee_amount_products, finalized_at, created_at')
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
            let totalServiceRevenue = 0;
            let totalProductRevenue = 0;
            let totalCommissions = 0;
            let totalServiceFees = 0;
            let totalProductFees = 0;

            const dailyStats: Record<string, { revenue: number, cost: number }> = {};

            // Initialize last 7 days in dailyStats
            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dateKey = date.toLocaleDateString('pt-BR');
                dailyStats[dateKey] = { revenue: 0, cost: 0 };
            }

            // Process Orders Breakdown
            orders?.forEach(order => {
                const sRev = Number(order.service_total) || Number(order.total_value) || 0;
                const pRev = Number(order.product_total) || 0;
                const comm = Number(order.commission_amount) || 0;
                const sFee = Number(order.fee_amount_services) || 0;
                const pFee = Number(order.fee_amount_products) || 0;

                totalServiceRevenue += sRev;
                totalProductRevenue += pRev;
                totalCommissions += comm;
                totalServiceFees += sFee;
                totalProductFees += pFee;

                const d = new Date(order.finalized_at || order.created_at);
                const dateKey = d.toLocaleDateString('pt-BR');
                if (dailyStats[dateKey]) {
                    dailyStats[dateKey].revenue += (sRev + pRev);
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
                    title="Lucro Líquido"
                    value={`R$ ${metrics.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    icon="trending_up"
                    theme={theme}
                    colorIndex={1}
                    subtext={
                        <div className="space-y-1 mt-1">
                            <p className="text-[7px] text-zinc-400">TAXAS OPER. SERVIÇOS: R$ {metrics.serviceFees.toFixed(2)}</p>
                            <p className="text-[7px] text-zinc-400">TAXAS OPER. PRODUTOS: R$ {metrics.productFees.toFixed(2)}</p>
                            <p className="text-[8px] font-black text-rose-500 uppercase tracking-tighter">TOTAL DE TAXAS OPER.: R$ {metrics.totalFees.toFixed(2)}</p>
                        </div>
                    }
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
