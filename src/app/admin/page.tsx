"use client";

import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function OwnerDashboardPage() {
    const [businessType, setBusinessType] = React.useState<'barber' | 'salon'>('barber');

    React.useEffect(() => {
        const savedType = localStorage.getItem('elite_business_type') as 'barber' | 'salon';
        if (savedType) setBusinessType(savedType);
    }, []);

    const colors = businessType === 'salon'
        ? { primary: '#7b438e', bg: '#faf8f5', text: '#1e1e1e', textMuted: '#6b6b6b', cardBg: '#ffffff', chartGrid: '#e2e8f0', chartStroke: '#94a3b8' }
        : { primary: '#f2b90d', bg: '#000000', text: '#f8fafc', textMuted: '#64748b', cardBg: '#121214', chartGrid: '#27272a', chartStroke: '#52525b' };

    const [stats, setStats] = React.useState({
        totalDay: 0,
        totalMonth: 0,
        ticketsDay: 0,
        avgTicketDay: 0,
        chartData: [] as { name: string, faturamento: number }[]
    });
    const [loadingStats, setLoadingStats] = React.useState(true);

    const fetchDashboardData = async () => {
        setLoadingStats(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data: profile } = await supabase
            .from('profiles')
            .select('tenant_id')
            .eq('id', session.user.id)
            .single();

        if (profile?.tenant_id) {
            // Pegamos dados dos últimos 30 dias para garantir o faturamento mensal e o gráfico semanal
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            thirtyDaysAgo.setHours(0, 0, 0, 0);

            const { data: orders, error } = await supabase
                .from('orders')
                .select('total_value, finalized_at, created_at')
                .eq('tenant_id', profile.tenant_id)
                .eq('status', 'paid')
                .gte('finalized_at', thirtyDaysAgo.toISOString());

            if (!error && orders) {
                const now = new Date();
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();

                // Faturamento do Dia
                const todayOrders = orders.filter(o => new Date(o.finalized_at || o.created_at) >= today);
                const totalDay = todayOrders.reduce((acc, o) => acc + (Number(o.total_value) || 0), 0);
                const ticketsDay = todayOrders.length;
                const avgTicketDay = ticketsDay > 0 ? totalDay / ticketsDay : 0;

                // Faturamento Mensal (Mês Atual)
                const monthOrders = orders.filter(o => {
                    const d = new Date(o.finalized_at || o.created_at);
                    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                });
                const totalMonth = monthOrders.reduce((acc, o) => acc + (Number(o.total_value) || 0), 0);

                // Gráfico 7 dias
                const daysMap = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
                const weekData = [];
                for (let i = 6; i >= 0; i--) {
                    const targetDate = new Date();
                    targetDate.setDate(targetDate.getDate() - i);
                    targetDate.setHours(0, 0, 0, 0);

                    const dayRev = orders
                        .filter(o => {
                            const d = new Date(o.finalized_at || o.created_at);
                            d.setHours(0, 0, 0, 0);
                            return d.getTime() === targetDate.getTime();
                        })
                        .reduce((acc, o) => acc + (Number(o.total_value) || 0), 0);

                    weekData.push({
                        name: daysMap[targetDate.getDay()],
                        faturamento: dayRev
                    });
                }

                setStats({
                    totalDay,
                    totalMonth,
                    ticketsDay,
                    avgTicketDay,
                    chartData: weekData
                });
            }
        }
        setLoadingStats(false);
    };

    const [pendingCount, setPendingCount] = React.useState(0);

    const fetchPending = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data: userProfile } = await supabase
            .from('profiles')
            .select('tenant_id')
            .eq('id', session.user.id)
            .single();

        if (userProfile?.tenant_id) {
            const { count } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('tenant_id', userProfile.tenant_id)
                .eq('status', 'pending');

            setPendingCount(count || 0);
        }
    };

    React.useEffect(() => {
        fetchPending();
        fetchDashboardData();
        // Listen for updates from other components
        const handleUpdate = () => {
            fetchPending();
            fetchDashboardData();
        };
        window.addEventListener('professional-approved', handleUpdate);
        window.addEventListener('order-paid', handleUpdate); // Evento customizado para quando uma comanda é paga
        return () => {
            window.removeEventListener('professional-approved', handleUpdate);
            window.removeEventListener('order-paid', handleUpdate);
        };
    }, []);

    const formatBRL = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

    const kpis = [
        { label: 'Faturamento do Dia', val: formatBRL(stats.totalDay), icon: 'today', trend: '+15,2%', color: 'text-emerald-500' },
        { label: 'Faturamento Mensal', val: formatBRL(stats.totalMonth), icon: 'payments', trend: '+12,5%', color: 'text-emerald-500' },
        { label: 'Tickets Realizados (Hoje)', val: stats.ticketsDay.toString(), icon: 'receipt', trend: '+4,2%', color: businessType === 'salon' ? 'text-[#7b438e]' : 'text-[#f2b90d]' },
        { label: 'Ticket Médio (Hoje)', val: formatBRL(stats.avgTicketDay), icon: 'analytics', trend: '+5,2%', color: businessType === 'salon' ? 'text-[#7b438e]' : 'text-[#f2b90d]' },
    ];

    return (
        <div className="space-y-4 md:space-y-8 animate-in fade-in duration-500 pb-10">
            {pendingCount > 0 && (
                <div className="border rounded-[2rem] p-6 flex flex-col md:flex-row items-center justify-between shadow-xl backdrop-blur-sm relative overflow-hidden group gap-4 relative" style={{ backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` }}>
                    <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: colors.primary }}></div>
                    <div className="flex items-center gap-6 relative z-10 w-full md:w-auto">
                        <div className="size-12 md:size-16 rounded-full flex items-center justify-center animate-pulse shrink-0" style={{ backgroundColor: `${colors.primary}20` }}>
                            <span className="material-symbols-outlined text-2xl md:text-3xl" style={{ color: colors.primary }}>priority_high</span>
                        </div>
                        <div>
                            <h3 className="text-xl md:text-2xl font-black italic uppercase tracking-tight" style={{ color: colors.text }}>Atenção Necessária</h3>
                            <p className="font-bold text-xs md:text-sm mt-1" style={{ color: colors.primary }}>Existem {pendingCount} profissionais aguardando aprovação.</p>
                        </div>
                    </div>
                    <Link href="/admin/equipe?tab=pending" className="w-full md:w-auto px-8 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2" style={{ backgroundColor: colors.primary, color: businessType === 'salon' ? 'white' : 'black' }}>
                        Ver Solicitações
                        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </Link>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {kpis.map((kpi, idx) => (
                    <div key={idx} className="border p-4 md:p-6 rounded-3xl md:rounded-[2rem] group transition-all" style={{ backgroundColor: colors.cardBg, borderColor: `${colors.text}0d` }}>
                        <div className="flex justify-between items-start mb-2 md:mb-4">
                            <div className="size-8 md:size-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110" style={{ backgroundColor: `${colors.primary}1a`, color: colors.primary }}>
                                <span className="material-symbols-outlined text-[18px] md:text-[24px]">{kpi.icon}</span>
                            </div>
                            {loadingStats ? (
                                <div className="h-4 w-12 bg-white/5 animate-pulse rounded"></div>
                            ) : (
                                <span className={`text-[9px] md:text-[10px] font-black ${kpi.color}`}>{kpi.trend}</span>
                            )}
                        </div>
                        <p className="text-[8px] md:text-[9px] font-black uppercase tracking-widest italic opacity-70" style={{ color: colors.textMuted }}>{kpi.label}</p>
                        {loadingStats ? (
                            <div className="h-8 w-24 bg-white/5 animate-pulse rounded mt-1"></div>
                        ) : (
                            <h4 className="text-xl md:text-2xl font-black mt-0.5 italic tracking-tight" style={{ color: colors.text }}>{kpi.val}</h4>
                        )}
                    </div>
                ))}
            </div>

            <div className="border p-5 md:p-8 rounded-3xl md:rounded-[2.5rem]" style={{ backgroundColor: colors.cardBg, borderColor: `${colors.text}0d` }}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-2 md:gap-4">
                    <div>
                        <h3 className="text-lg md:text-xl font-black italic uppercase tracking-tight" style={{ color: colors.text }}>Evolução do Faturamento</h3>
                        <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest opacity-60" style={{ color: colors.textMuted }}>Comparativo de performance semanal</p>
                    </div>
                </div>
                <div className="h-48 sm:h-64 md:h-80 w-full relative">
                    {loadingStats && (
                        <div className="absolute inset-0 z-10 bg-black/20 backdrop-blur-[2px] flex items-center justify-center rounded-2xl">
                            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2" style={{ borderColor: colors.primary }}></div>
                        </div>
                    )}
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={stats.chartData.length > 0 ? stats.chartData : [
                            { name: 'Dom', faturamento: 0 },
                            { name: 'Seg', faturamento: 0 },
                            { name: 'Ter', faturamento: 0 },
                            { name: 'Qua', faturamento: 0 },
                            { name: 'Qui', faturamento: 0 },
                            { name: 'Sex', faturamento: 0 },
                            { name: 'Sáb', faturamento: 0 },
                        ]}>
                            <defs>
                                <linearGradient id="colorFat" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={colors.primary} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={colors.primary} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.chartGrid} />
                            <XAxis dataKey="name" fontSize={9} tickLine={false} axisLine={false} stroke={colors.chartStroke} />
                            <YAxis fontSize={9} tickLine={false} axisLine={false} stroke={colors.chartStroke} tickFormatter={(val) => `R$${val}`} />
                            <Tooltip
                                contentStyle={{ backgroundColor: colors.cardBg, borderRadius: '12px', border: `1px solid ${colors.text}1a`, boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 'bold', color: colors.text }}
                                itemStyle={{ color: colors.primary }}
                                formatter={(value: number) => [formatBRL(value), 'Faturamento']}
                            />
                            <Area type="monotone" dataKey="faturamento" stroke={colors.primary} strokeWidth={3} fillOpacity={1} fill="url(#colorFat)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
