'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import {
    AttachMoney,
    TrendingUp,
    TrendingDown,
    Inventory
} from '@mui/icons-material'; // Assuming MUI icons are available or use Lucide
import { AlertCircle, DollarSign, TrendingUp as LucideTrendingUp, Package } from 'lucide-react';

// Card Component
const MetricCard = ({ title, value, subtext, icon: Icon, color }: any) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-zinc-100 flex items-start justify-between">
        <div>
            <p className="text-sm font-medium text-zinc-500">{title}</p>
            <h3 className="text-2xl font-bold text-zinc-900 mt-2">{value}</h3>
            {subtext && <p className={`text-xs mt-1 ${color === 'red' ? 'text-red-500' : 'text-emerald-600'}`}>{subtext}</p>}
        </div>
        <div className={`p-3 rounded-lg ${color === 'amber' ? 'bg-amber-100 text-amber-600' : color === 'red' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
            <Icon size={24} />
        </div>
    </div>
);

export default function ReportsPage() {
    const supabase = createClientComponentClient();
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState({
        revenue: 0,
        cost: 0,
        profit: 0,
        margin: 0
    });
    const [chartData, setChartData] = useState<any[]>([]);

    useEffect(() => {
        fetchFinancialData();
    }, []);

    const fetchFinancialData = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase
                .from('profiles')
                .select('tenant_id')
                .eq('id', user.id)
                .single();

            if (!profile?.tenant_id) return;

            // 1. Fetch Completed Orders (Revenue)
            const { data: orders } = await supabase
                .from('orders')
                .select('total_value, finalized_at')
                .eq('tenant_id', profile.tenant_id)
                .eq('status', 'completed');

            // 2. Fetch Stock Transactions (Cost) - approximated by current cost_price
            // We need to join with products to get cost_price.
            // Since Supabase JS join syntax can be tricky for deep aggregations, we'll fetch separately for MVP.
            const { data: transactions } = await supabase
                .from('stock_transactions')
                .select(`
                    quantity,
                    created_at,
                    products (
                        cost_price
                    )
                `)
                .eq('tenant_id', profile.tenant_id)
                .eq('type', 'OUT');

            // --- Calculation Logic ---

            let totalRevenue = 0;
            let totalCost = 0;
            const dailyStats: Record<string, { revenue: number, cost: number }> = {};

            // Process Revenue
            orders?.forEach(order => {
                totalRevenue += order.total_value || 0;

                // Chart Formatting (YYYY-MM-DD)
                const date = new Date(order.finalized_at).toLocaleDateString('pt-BR');
                if (!dailyStats[date]) dailyStats[date] = { revenue: 0, cost: 0 };
                dailyStats[date].revenue += order.total_value || 0;
            });

            // Process Costs
            transactions?.forEach((tx: any) => {
                const cost = (tx.quantity || 0) * (tx.products?.cost_price || 0);
                totalCost += cost;

                const date = new Date(tx.created_at).toLocaleDateString('pt-BR');
                if (!dailyStats[date]) dailyStats[date] = { revenue: 0, cost: 0 };
                dailyStats[date].cost += cost;
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
                name: date,
                Receita: dailyStats[date].revenue,
                Custo: dailyStats[date].cost,
                Lucro: dailyStats[date].revenue - dailyStats[date].cost
            })).sort((a, b) => {
                // Simple sort by string date (DD/MM/YYYY) - might need better parsing for strict chronological
                return new Date(a.name.split('/').reverse().join('-')).getTime() - new Date(b.name.split('/').reverse().join('-')).getTime();
            });

            setChartData(formattedChartData.slice(-7)); // Last 7 days

        } catch (error) {
            console.error('Error fetching reports:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-zinc-500">Calculando métricas...</div>;

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-zinc-900">Relatórios Financeiros</h1>
                <span className="text-sm text-zinc-500 bg-zinc-100 px-3 py-1 rounded-full">
                    Últimos 30 dias (Simulado)
                </span>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <MetricCard
                    title="Receita Bruta"
                    value={`R$ ${metrics.revenue.toFixed(2)}`}
                    icon={DollarSign}
                    color="emerald"
                    subtext="Vendas finalizadas"
                />
                <MetricCard
                    title="Custo de Produtos"
                    value={`R$ ${metrics.cost.toFixed(2)}`}
                    icon={Package}
                    color="red"
                    subtext="Baseado no preço de custo atual"
                />
                <MetricCard
                    title="Lucro Líquido"
                    value={`R$ ${metrics.profit.toFixed(2)}`}
                    icon={LucideTrendingUp}
                    color="emerald"
                    subtext="Receita - Custos"
                />
                <MetricCard
                    title="Margem de Lucro"
                    value={`${metrics.margin}%`}
                    icon={AlertCircle}
                    color="amber"
                    subtext="Performance Geral"
                />
            </div>

            {/* Charts Area */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-zinc-100 h-[400px]">
                <h3 className="text-lg font-semibold text-zinc-800 mb-6">Performance Diária</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value}`} />
                        <Tooltip
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend />
                        <Bar dataKey="Receita" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Custo" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
