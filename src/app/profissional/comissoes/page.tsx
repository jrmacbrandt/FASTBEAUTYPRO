"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ProfessionalCommissionsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        today: 0,
        month: 0,
        serviceComm: 0,
        productComm: 0,
        servicePct: 0,
        productPct: 0
    });
    const [chartData, setChartData] = useState<any[]>([]);
    const [bestDay, setBestDay] = useState({ day: '-', value: 0 });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            // 1. Get Commission Rates
            const { data: profile } = await supabase
                .from('profiles')
                .select('service_commission, product_commission')
                .eq('id', session.user.id)
                .single();

            const serviceRate = (profile?.service_commission || 50) / 100;
            const productRate = (profile?.product_commission || 10) / 100;

            // 2. Fetch Completed Orders for Current Month
            const now = new Date();
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

            const { data: orders } = await supabase
                .from('orders')
                .select(`
                    id,
                    created_at,
                    commission_amount,
                    total_value,
                    items,
                    appointments (
                        services ( price )
                    )
                `)
                .eq('barber_id', session.user.id)
                .eq('status', 'completed')
                .gte('created_at', firstDay)
                .lte('created_at', lastDay);

            if (!orders) {
                setLoading(false);
                return;
            }

            // 3. Process Data
            let todayTotal = 0;
            let monthTotal = 0;
            let serviceCommTotal = 0; // Estimated
            let productCommTotal = 0; // Estimated

            const todayStr = new Date().toISOString().slice(0, 10);
            const dailyMap: Record<number, number> = {};

            orders.forEach(order => {
                const orderDate = order.created_at.slice(0, 10);
                const comm = order.commission_amount || 0;

                // Today
                if (orderDate === todayStr) {
                    todayTotal += comm;
                }

                // Month Total
                monthTotal += comm;

                // Split Calculation (Estimate based on rates if stored separately not available)
                const servicePrice = order.appointments?.services?.price || 0;
                const theoryServiceComm = servicePrice * serviceRate;
                const theoryProductComm = comm - theoryServiceComm; // Remainder is product

                // Accumulate
                if (theoryServiceComm > 0) serviceCommTotal += theoryServiceComm;
                if (theoryProductComm > 0) productCommTotal += theoryProductComm;

                // Chart Data (Group by Day of Month)
                const dayOfMonth = new Date(order.created_at).getDate();
                dailyMap[dayOfMonth] = (dailyMap[dayOfMonth] || 0) + comm;
            });

            // Prepare Chart Data & Find Best Day
            const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            const newChartData = [];
            let maxDayVal = 0;
            let maxDayDate = null;

            for (let i = 1; i <= daysInMonth; i++) {
                const val = dailyMap[i] || 0;
                const date = new Date(now.getFullYear(), now.getMonth(), i);

                // Only push if day <= today to avoid empty future line flatlining?
                // Or show full month. Let's show full month structure but maybe null for future if desired.
                // Keeping it simple: 0 for days without sales.
                newChartData.push({
                    name: format(date, 'dd'),
                    valor: val,
                    fullDate: date
                });

                if (val > maxDayVal) {
                    maxDayVal = val;
                    maxDayDate = date;
                }
            }

            // Calculate Percentages
            const totalSplit = serviceCommTotal + productCommTotal;
            const servicePct = totalSplit > 0 ? Math.round((serviceCommTotal / totalSplit) * 100) : 0;
            const productPct = totalSplit > 0 ? Math.round((productCommTotal / totalSplit) * 100) : 0;

            setStats({
                today: todayTotal,
                month: monthTotal,
                serviceComm: serviceCommTotal,
                productComm: productCommTotal,
                servicePct,
                productPct
            });

            setChartData(newChartData);

            let bestDayStr = 'Sem dados';
            if (maxDayDate) {
                const dayName = format(maxDayDate, 'EEEE', { locale: ptBR });
                bestDayStr = dayName.charAt(0).toUpperCase() + dayName.slice(1);
            }

            setBestDay({
                day: bestDayStr,
                value: maxDayVal
            });

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

    if (loading) return <div className="p-8 text-center text-slate-500 text-xs font-bold uppercase tracking-widest">Carregando comissões...</div>;

    // Compact Stats Cards
    const statCards = [
        { label: 'Ganhos Hoje', val: formatCurrency(stats.today), icon: 'today' },
        { label: 'Este Mês', val: formatCurrency(stats.month), icon: 'calendar_today' },
        { label: `Serviços (${stats.servicePct}%)`, val: formatCurrency(stats.serviceComm), icon: 'content_cut' },
        { label: `Produtos (${stats.productPct}%)`, val: formatCurrency(stats.productComm), icon: 'inventory' },
    ];

    return (
        <div className="space-y-4 md:space-y-6 animate-in fade-in duration-500 pb-20">
            {/* 1. Stat Cards (More compact) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                {statCards.map((stat, idx) => (
                    <div key={idx} className="bg-[#121214] border border-white/5 p-4 rounded-2xl md:rounded-[1.5rem] group hover:border-[#f2b90d]/30 transition-all shadow-lg flex flex-col justify-between h-28 md:h-32">
                        <div className="flex justify-between items-start">
                            <div className="size-8 bg-[#f2b90d]/10 rounded-lg flex items-center justify-center text-[#f2b90d]">
                                <span className="material-symbols-outlined text-base">{stat.icon}</span>
                            </div>
                        </div>
                        <div>
                            <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest opacity-80 mb-1">{stat.label}</p>
                            <h4 className="text-white text-lg md:text-xl font-black italic tracking-tighter truncate">{stat.val}</h4>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                {/* 2. Chart Area */}
                <div className="lg:col-span-2 bg-[#121214] border border-white/5 p-5 md:p-6 rounded-[2rem] shadow-xl">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-base md:text-lg text-white font-black uppercase italic tracking-tight">Evolução Mensal</h3>
                            <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest opacity-60">Ganhos diários</p>
                        </div>
                    </div>

                    <div className="h-48 md:h-56 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorComm" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f2b90d" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#f2b90d" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                                <XAxis dataKey="name" fontSize={9} tickLine={false} axisLine={false} stroke="#52525b" interval={1} />
                                <YAxis fontSize={9} tickLine={false} axisLine={false} stroke="#52525b" width={30} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#18181b', borderRadius: '12px', border: 'none', fontSize: '11px', fontWeight: 'bold', color: '#fff' }}
                                    itemStyle={{ color: '#f2b90d' }}
                                    formatter={(value: number) => [formatCurrency(value), 'Comissão']}
                                    labelFormatter={(label) => `Dia ${label}`}
                                />
                                <Area type="monotone" dataKey="valor" stroke="#f2b90d" strokeWidth={2} fillOpacity={1} fill="url(#colorComm)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 3. Best Performance Card */}
                <div className="bg-[#f2b90d] text-black p-5 md:p-6 rounded-[2rem] flex flex-col justify-between relative overflow-hidden shadow-2xl min-h-[200px]">
                    <span className="material-symbols-outlined absolute -top-4 -right-4 text-[120px] md:text-[160px] opacity-10 rotate-12">trending_up</span>
                    <div className="z-10">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60 mb-1">Melhor Performance</p>
                        <h3 className="text-xl md:text-2xl font-black italic uppercase leading-none">Recorde de<br />Faturamento</h3>
                    </div>
                    <div className="mt-4 md:mt-6 z-10 flex-1 flex flex-col justify-center">
                        <p className="text-3xl md:text-4xl font-black italic tracking-tighter capitalize">{bestDay.day}</p>
                        <div className="flex items-center gap-1.5 mt-1 opacity-70">
                            <span className="material-symbols-outlined text-xs">stars</span>
                            <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest">{formatCurrency(bestDay.value)} Gerados</span>
                        </div>
                    </div>
                    <button
                        onClick={() => router.push('/profissional/historico')}
                        className="mt-4 w-full py-3 rounded-xl font-black text-[10px] uppercase tracking-widest border border-black/20 hover:bg-black/10 transition-all bg-black/5 active:scale-95 z-10"
                    >
                        VER DETALHES
                    </button>
                </div>
            </div>
        </div>
    );
}
