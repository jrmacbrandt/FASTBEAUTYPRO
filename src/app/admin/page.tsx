"use client";

import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/hooks/useProfile';

export default function OwnerDashboardPage() {
    const { profile, loading: profileLoading, businessType: hookBusinessType, theme } = useProfile();
    const businessType = hookBusinessType || 'barber';

    const [stats, setStats] = React.useState({
        totalDay: 0,
        totalMonth: 0,
        ticketsDay: 0,
        avgTicketDay: 0,
        trends: {
            day: '0%',
            month: '0%',
            tickets: '0%',
            avg: '0%'
        },
        chartData: [] as { name: string, faturamento: number }[]
    });

    const [tenantInfo, setTenantInfo] = React.useState<{ name: string, slug: string } | null>(null);
    const [loadingStats, setLoadingStats] = React.useState(true);
    const [copying, setCopying] = React.useState(false);
    const [pendingCount, setPendingCount] = React.useState(0);

    const fetchPending = async (tid: string) => {
        const { count } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tid)
            .eq('status', 'pending');

        setPendingCount(count || 0);
    };

    const fetchDashboardData = async (tid: string) => {
        setLoadingStats(true);
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
        sixtyDaysAgo.setHours(0, 0, 0, 0);

        const { data: orders, error } = await supabase
            .from('orders')
            .select('total_value, finalized_at, created_at')
            .eq('tenant_id', tid)
            .eq('status', 'paid')
            .gte('finalized_at', sixtyDaysAgo.toISOString());

        if (!error && orders) {
            const now = new Date();
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();

            const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
            const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const lastMonth = lastMonthDate.getMonth();
            const lastYear = lastMonthDate.getFullYear();

            const todayOrders = orders.filter(o => new Date(o.finalized_at || o.created_at) >= today);
            const yesterdayOrders = orders.filter(o => {
                const d = new Date(o.finalized_at || o.created_at);
                return d >= yesterday && d < today;
            });

            const totalDay = todayOrders.reduce((acc, o) => acc + (Number(o.total_value) || 0), 0);
            const totalYesterday = yesterdayOrders.reduce((acc, o) => acc + (Number(o.total_value) || 0), 0);
            const dayTrend = totalYesterday > 0 ? ((totalDay - totalYesterday) / totalYesterday * 100) : 0;

            const monthOrders = orders.filter(o => {
                const d = new Date(o.finalized_at || o.created_at);
                return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            });
            const lastMonthOrders = orders.filter(o => {
                const d = new Date(o.finalized_at || o.created_at);
                return d.getMonth() === lastMonth && d.getFullYear() === lastYear;
            });

            const totalMonth = monthOrders.reduce((acc, o) => acc + (Number(o.total_value) || 0), 0);
            const totalLastMonth = lastMonthOrders.reduce((acc, o) => acc + (Number(o.total_value) || 0), 0);
            const monthTrend = totalLastMonth > 0 ? ((totalMonth - totalLastMonth) / totalLastMonth * 100) : 0;

            const ticketsDay = todayOrders.length;
            const ticketsYesterday = yesterdayOrders.length;
            const ticketTrend = ticketsYesterday > 0 ? ((ticketsDay - ticketsYesterday) / ticketsYesterday * 100) : 0;

            const avgDay = ticketsDay > 0 ? totalDay / ticketsDay : 0;
            const avgYesterday = ticketsYesterday > 0 ? totalYesterday / ticketsYesterday : 0;
            const avgTrend = avgYesterday > 0 ? ((avgDay - avgYesterday) / avgYesterday * 100) : 0;

            const formatTrend = (val: number) => (val >= 0 ? '+' : '') + val.toFixed(1).replace('.', ',') + '%';

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
                totalDay, totalMonth, ticketsDay, avgTicketDay: avgDay,
                trends: {
                    day: formatTrend(dayTrend),
                    month: formatTrend(monthTrend),
                    tickets: formatTrend(ticketTrend),
                    avg: formatTrend(avgTrend)
                },
                chartData: weekData
            });
        }
        setLoadingStats(false);
    };

    React.useEffect(() => {
        if (profile?.tenant_id) {
            setTenantInfo(profile.tenant);
            fetchDashboardData(profile.tenant_id);
            fetchPending(profile.tenant_id);
        }
    }, [profile]);

    React.useEffect(() => {
        const handleUpdate = () => {
            if (profile?.tenant_id) {
                fetchPending(profile.tenant_id);
                fetchDashboardData(profile.tenant_id);
            }
        };
        window.addEventListener('professional-approved', handleUpdate);
        window.addEventListener('order-paid', handleUpdate);
        return () => {
            window.removeEventListener('professional-approved', handleUpdate);
            window.removeEventListener('order-paid', handleUpdate);
        };
    }, [profile]);

    const formatBRL = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

    const getTrendColor = (trend: string) => {
        if (trend.startsWith('+')) return 'text-emerald-500';
        if (trend.startsWith('-')) return 'text-rose-500';
        return 'text-slate-400';
    };

    const kpis = [
        { label: 'Faturamento do Dia', val: formatBRL(stats.totalDay), icon: 'today', trend: stats.trends.day, color: getTrendColor(stats.trends.day) },
        { label: 'Faturamento Mensal', val: formatBRL(stats.totalMonth), icon: 'payments', trend: stats.trends.month, color: getTrendColor(stats.trends.month) },
        { label: 'Tickets Realizados (Hoje)', val: stats.ticketsDay.toString(), icon: 'receipt', trend: stats.trends.tickets, color: getTrendColor(stats.trends.tickets) },
        { label: 'Ticket Médio (Hoje)', val: formatBRL(stats.avgTicketDay), icon: 'analytics', trend: stats.trends.avg, color: getTrendColor(stats.trends.avg) },
    ];

    const handleCopyLink = () => {
        if (!tenantInfo) return;
        const origin = window.location.origin;
        const url = `${origin}/${tenantInfo.slug}`;
        navigator.clipboard.writeText(url);
        setCopying(true);
        setTimeout(() => setCopying(false), 2000);
    };

    if (profileLoading) return <div className="text-center py-20 opacity-40">Carregando painel...</div>;

    return (
        <div className="space-y-4 md:space-y-8 animate-in fade-in duration-500 pb-10">
            {tenantInfo && (
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-6 md:p-8 rounded-[2rem] border transition-all gap-4 mb-4" style={{ backgroundColor: theme.cardBg, borderColor: theme.border }}>
                    <div className="flex items-center gap-4">
                        <div className="size-12 md:size-14 rounded-2xl flex items-center justify-center shadow-lg shrink-0" style={{ backgroundColor: `${theme.primary}1a`, border: `1px solid ${theme.primary}30` }}>
                            <span className="material-symbols-outlined text-2xl md:text-3xl font-bold" style={{ color: theme.primary }}>storefront</span>
                        </div>
                        <div>
                            <h2 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter" style={{ color: theme.text }}>{tenantInfo.name}</h2>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] font-bold uppercase tracking-widest opacity-40 italic" style={{ color: theme.textMuted }}>Link da Unidade:</span>
                                <span className="text-[10px] font-mono font-black border-b border-dashed" style={{ color: theme.primary, borderColor: `${theme.primary}40` }}>/{tenantInfo.slug}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2 w-full md:w-auto">
                        <button
                            onClick={handleCopyLink}
                            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${copying ? 'bg-emerald-500 text-white' : 'hover:scale-105 active:scale-95'}`}
                            style={!copying ? { backgroundColor: `${theme.text}0d`, color: theme.text } : {}}
                        >
                            <span className="material-symbols-outlined text-[16px]">{copying ? 'done' : 'content_copy'}</span>
                            {copying ? 'COPIADO!' : 'COPIAR LINK'}
                        </button>

                        <Link
                            href={`/${tenantInfo.slug}`}
                            target="_blank"
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
                            style={{ backgroundColor: theme.primary, color: businessType === 'salon' ? 'white' : 'black' }}
                        >
                            <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                            ABRIR LOJA
                        </Link>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {kpis.map((kpi, idx) => (
                    <div key={idx} className="border p-4 md:p-6 rounded-3xl md:rounded-[2rem] group transition-all" style={{ backgroundColor: theme.cardBg, borderColor: theme.border }}>
                        <div className="flex justify-between items-start mb-2 md:mb-4">
                            <div className="size-8 md:size-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110" style={{ backgroundColor: `${theme.primary}1a`, color: theme.primary }}>
                                <span className="material-symbols-outlined text-[18px] md:text-[24px]">{kpi.icon}</span>
                            </div>
                            {loadingStats ? (
                                <div className="h-4 w-12 animate-pulse rounded" style={{ backgroundColor: `${theme.text}0d` }}></div>
                            ) : (
                                <span className={`text-[9px] md:text-[10px] font-black ${kpi.color}`}>{kpi.trend}</span>
                            )}
                        </div>
                        <p className="text-[8px] md:text-[9px] font-black uppercase tracking-widest italic opacity-70" style={{ color: theme.textMuted }}>{kpi.label}</p>
                        {loadingStats ? (
                            <div className="h-8 w-24 animate-pulse rounded mt-1" style={{ backgroundColor: `${theme.text}0d` }}></div>
                        ) : (
                            <h4 className="text-xl md:text-2xl font-black mt-0.5 italic tracking-tight" style={{ color: theme.text }}>{kpi.val}</h4>
                        )}
                    </div>
                ))}
            </div>

            <div className="border p-5 md:p-8 rounded-3xl md:rounded-[2.5rem]" style={{ backgroundColor: theme.cardBg, borderColor: theme.border }}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-2 md:gap-4">
                    <div>
                        <h3 className="text-lg md:text-xl font-black italic uppercase tracking-tight" style={{ color: theme.text }}>Evolução do Faturamento</h3>
                        <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest opacity-60" style={{ color: theme.textMuted }}>Comparativo de performance semanal</p>
                    </div>
                </div>
                <div className="h-48 sm:h-64 md:h-80 w-full relative">
                    {loadingStats && (
                        <div className="absolute inset-0 z-10 bg-black/20 backdrop-blur-[2px] flex items-center justify-center rounded-2xl">
                            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2" style={{ borderColor: theme.primary }}></div>
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
                                    <stop offset="5%" stopColor={theme.primary} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={theme.primary} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.chartGrid} />
                            <XAxis dataKey="name" fontSize={9} tickLine={false} axisLine={false} stroke={theme.chartStroke} />
                            <YAxis fontSize={9} tickLine={false} axisLine={false} stroke={theme.chartStroke} tickFormatter={(val) => `R$${val}`} />
                            <Tooltip
                                contentStyle={{ backgroundColor: theme.cardBg, borderRadius: '12px', border: `1px solid ${theme.border}`, boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 'bold', color: theme.text }}
                                itemStyle={{ color: theme.primary }}
                                formatter={(value: any) => [formatBRL(Number(value) || 0), 'Faturamento']}
                            />
                            <Area type="monotone" dataKey="faturamento" stroke={theme.primary} strokeWidth={3} fillOpacity={1} fill="url(#colorFat)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
