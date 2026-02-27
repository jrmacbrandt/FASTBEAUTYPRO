"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/hooks/useProfile';

export default function AdminDashboardPage() {
    const { profile, loading: profileLoading, theme: colors } = useProfile();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        todayRevenue: 0,
        monthlyRevenue: 0,
        monthlyGoal: profile?.tenant?.monthly_goal || 10000,
        todayAppointments: { realized: 0, total: 0 },
        idleHours: 0,
        lowStockItems: [] as any[],
        retention: { new: 0, recurring: 0 },
        loyaltyPoints: 0
    });

    useEffect(() => {
        if (profile?.tenant_id) {
            fetchDashboardStats();

            // Real-time subscriptions for immediate updates
            const channels = [
                supabase.channel('dashboard_orders')
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `tenant_id=eq.${profile.tenant_id}` }, () => fetchDashboardStats())
                    .subscribe(),
                supabase.channel('dashboard_appointments')
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments', filter: `tenant_id=eq.${profile.tenant_id}` }, () => fetchDashboardStats())
                    .subscribe(),
                supabase.channel('dashboard_products')
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'products', filter: `tenant_id=eq.${profile.tenant_id}` }, () => fetchDashboardStats())
                    .subscribe()
            ];

            return () => {
                channels.forEach(ch => supabase.removeChannel(ch));
            };
        }
    }, [profile]);

    const fetchDashboardStats = async () => {
        if (!profile?.tenant_id) return;
        setLoading(true);

        const now = new Date();
        const localDateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        try {
            const [
                { data: todayOrders },
                { data: monthlyOrders },
                { data: todayApps },
                { data: lowStockProducts },
                { data: lowStockSupplies },
                { data: clientStats },
                { data: loyaltyData }
            ] = await Promise.all([
                // Today Revenue - Using simple string match for reliability
                supabase.from('orders').select('total_value').eq('status', 'paid').like('finalized_at', `${localDateStr}%`).eq('tenant_id', profile.tenant_id),
                // Monthly Revenue
                supabase.from('orders').select('total_value').eq('status', 'paid').gte('finalized_at', firstDayOfMonth).eq('tenant_id', profile.tenant_id),
                // Today Appointments - Using simple string match for reliability
                supabase.from('appointments').select('status, scheduled_at').like('scheduled_at', `${localDateStr}%`).eq('tenant_id', profile.tenant_id),
                // Low Stock Sale Products
                supabase.from('products').select('*').lte('current_stock', 'min_threshold').eq('active', true).eq('tenant_id', profile.tenant_id),
                // Low Stock Supplies
                supabase.from('supplies').select('*').lte('current_stock', 'min_threshold').eq('tenant_id', profile.tenant_id),
                // Client Retention
                supabase.from('clients').select('total_visits').eq('tenant_id', profile.tenant_id),
                // Loyalty Points Balance
                supabase.from('client_loyalty').select('stamps_count').eq('tenant_id', profile.tenant_id)
            ]);

            const todayRev = todayOrders?.reduce((acc, curr) => acc + (Number(curr.total_value) || 0), 0) || 0;
            const monthRev = monthlyOrders?.reduce((acc, curr) => acc + (Number(curr.total_value) || 0), 0) || 0;
            
            // Filter appointments to only count ACTIVE ones (paid, scheduled or confirmed)
            // Exclude 'absent' and 'cancelled' from the denominator
            const validApps = todayApps?.filter(a => ['paid', 'scheduled', 'confirmed'].includes(a.status)) || [];
            const appsTotal = validApps.length;
            const appsRealized = validApps.filter(a => a.status === 'paid').length;

            // Simple Idle Calculation: Standard 10h workday - (Average 45min per appointment)
            const workDayMinutes = 600; // 10 hours
            const busyMinutes = appsTotal * 45;
            const idleHrs = Math.max(0, (workDayMinutes - busyMinutes) / 60);

            const newClients = clientStats?.filter(c => (c.total_visits || 0) <= 1).length || 0;
            const recurringClients = clientStats?.filter(c => (c.total_visits || 0) > 1).length || 0;

            const totalStamps = loyaltyData?.reduce((acc, curr) => acc + (curr.stamps_count || 0), 0) || 0;

            setStats({
                todayRevenue: todayRev,
                monthlyRevenue: monthRev,
                monthlyGoal: profile?.tenant?.monthly_goal || 10000,
                todayAppointments: { realized: appsRealized, total: appsTotal },
                idleHours: idleHrs,
                lowStockItems: [...(lowStockProducts || []), ...(lowStockSupplies || [])],
                retention: { new: newClients, recurring: recurringClients },
                loyaltyPoints: totalStamps
            });
        } catch (err) {
            console.error('Error fetching dashboard stats:', err);
        } finally {
            setLoading(false);
        }
    };

    if (profileLoading) return null;

    const goalProgress = Math.min(100, (stats.monthlyRevenue / stats.monthlyGoal) * 100);

    return (
        <div className="space-y-6 md:space-y-10 animate-in fade-in duration-500 pb-20">
            {/* Cabecalho Dinamico */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter text-white">
                        Dashboard <span style={{ color: colors.primary }}>Principal</span>
                    </h2>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-2">
                        Visão Geral do Negócio • {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                    </p>
                </div>
            </div>

            {/* Grid Principal */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* 1. Card de Faturamento */}
                <div className="p-8 rounded-[2.5rem] border border-white/5 bg-[#121214] flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined text-8xl" style={{ color: colors.primary }}>monetization_on</span>
                    </div>
                    <div className="relative z-10">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Receita de Hoje</p>
                        <h3 className="text-4xl font-black text-white italic tracking-tighter mb-6">
                            R$ {stats.todayRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </h3>
                    </div>
                    <div className="space-y-3 relative z-10">
                        <div className="flex justify-between items-end">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Meta Mensal</span>
                            <span className="text-[10px] font-black text-white italic">{goalProgress.toFixed(1)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-primary transition-all duration-1000 ease-out" 
                                style={{ width: `${goalProgress}%`, backgroundColor: colors.primary }}
                            />
                        </div>
                        <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">
                            Falta R$ {(stats.monthlyGoal - stats.monthlyRevenue).toLocaleString('pt-BR', { minimumFractionDigits: 0 })} para atingir R$ {stats.monthlyGoal.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                        </p>
                    </div>
                </div>

                {/* 2. Card de Fluxo */}
                <div className="p-8 rounded-[2.5rem] border border-white/5 bg-[#121214] flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined text-8xl" style={{ color: colors.primary }}>history_toggle_off</span>
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Fluxo de Hoje</p>
                        <h3 className="text-4xl font-black text-white italic tracking-tighter mb-2">
                            {stats.todayAppointments.realized}/{stats.todayAppointments.total}
                        </h3>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest italic">Atendimentos Concluídos</p>
                    </div>
                    <div className="mt-8 pt-6 border-t border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center" style={{ color: colors.primary }}>
                                <span className="material-symbols-outlined">schedule</span>
                            </div>
                            <div>
                                <h4 className="text-xl font-black text-white italic tracking-tight">{stats.idleHours.toFixed(1)}h</h4>
                                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Tempo Ocioso Estimado</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Card de Retenção */}
                <div className="p-8 rounded-[2.5rem] border border-white/5 bg-[#121214] flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined text-8xl" style={{ color: colors.primary }}>groups</span>
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Fidelização</p>
                        <div className="flex gap-4 items-end mb-1">
                            <h3 className="text-4xl font-black text-emerald-500 italic tracking-tighter">{stats.retention.recurring}</h3>
                            <span className="text-xl font-black text-slate-500 italic pb-1">/ {stats.retention.new + stats.retention.recurring}</span>
                        </div>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest italic">Clientes Recorrentes na Base</p>
                    </div>
                    <div className="mt-8 pt-6 border-t border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="size-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                <span className="material-symbols-outlined">stars</span>
                            </div>
                            <div>
                                <h4 className="text-xl font-black text-white italic tracking-tight">{stats.loyaltyPoints}</h4>
                                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Selo(s) em Circulação</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 4. Alerta de Estoque (Condicional) */}
                <div className={`p-8 rounded-[2.5rem] border flex flex-col justify-between relative overflow-hidden group transition-all duration-500 ${stats.lowStockItems.length > 0 ? 'bg-rose-500/5 border-rose-500/20' : 'bg-[#121214] border-white/5 opacity-50'}`}>
                    {stats.lowStockItems.length > 0 && (
                        <div className="absolute -top-2 -right-2 p-6 opacity-20 animate-pulse">
                            <span className="material-symbols-outlined text-9xl text-rose-500">warning</span>
                        </div>
                    )}
                    
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Estoque Crítico</p>
                        <h3 className={`text-4xl font-black italic tracking-tighter ${stats.lowStockItems.length > 0 ? 'text-rose-500' : 'text-white'}`}>
                            {stats.lowStockItems.length}
                        </h3>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest italic">Itens abaixo do mínimo</p>
                    </div>

                    <div className="mt-8 pt-6 border-t border-white/5">
                        {stats.lowStockItems.length > 0 ? (
                            <div className="flex flex-col gap-2">
                                {stats.lowStockItems.slice(0, 2).map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-[10px] font-bold uppercase tracking-tight text-rose-400">
                                        <span className="truncate w-32">{item.name}</span>
                                        <span>{item.current_stock} un</span>
                                    </div>
                                ))}
                                {stats.lowStockItems.length > 2 && (
                                    <span className="text-[8px] font-black text-rose-500/50 uppercase tracking-widest">+{stats.lowStockItems.length - 2} outros itens</span>
                                )}
                            </div>
                        ) : (
                            <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">check_circle</span> Estoque Saudável
                            </p>
                        )}
                    </div>
                </div>

            </div>

            {/* Footer de Auditoria */}
            <div className="pt-10 border-t border-white/5 text-center">
                <p className="text-[8px] font-black uppercase tracking-[0.5em] text-white/10 italic">BarberFlow Pro Intelligence • Dashboard v1.0</p>
            </div>
        </div>
    );
}
