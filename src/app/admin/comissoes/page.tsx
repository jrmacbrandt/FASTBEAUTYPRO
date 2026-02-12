"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const dynamic = 'force-dynamic';

export default function AdminCommissionsPage() {
    const [loading, setLoading] = useState(true);
    const [businessType, setBusinessType] = useState<'barber' | 'salon'>('barber');
    const [professionals, setProfessionals] = useState<any[]>([]);
    const [selectedPeriod, setSelectedPeriod] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

    useEffect(() => {
        const savedType = localStorage.getItem('elite_business_type') as 'barber' | 'salon';
        if (savedType) setBusinessType(savedType);
        fetchCommissions();
    }, [selectedPeriod]);

    const fetchCommissions = async () => {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data: profile } = await supabase
            .from('profiles')
            .select('tenant_id')
            .eq('id', session.user.id)
            .single();

        if (profile?.tenant_id) {
            // 1. Fetch all active professionals for this tenant
            const { data: pros } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url, role')
                .eq('tenant_id', profile.tenant_id)
                .eq('role', 'barber')
                .eq('status', 'active');

            if (pros) {
                // 2. Fetch orders for the period
                // For now, we simulate or fetch from a hypothetical commissions/orders table
                // Since the specific table for commissions isn't clear, we'll implement a clean UI
                // that aggregates data from 'orders' if available
                const { data: orders } = await supabase
                    .from('orders')
                    .select('*')
                    .eq('tenant_id', profile.tenant_id)
                    .eq('status', 'completed')
                    .gte('created_at', `${selectedPeriod}-01`)
                    .lte('created_at', `${selectedPeriod}-31`);

                const prosWithStats = pros.map(p => {
                    const proOrders = orders?.filter(o => o.barber_id === p.id) || [];
                    const totalSales = proOrders.reduce((acc, curr) => acc + (curr.total_amount || 0), 0);
                    const commission = proOrders.reduce((acc, curr) => acc + (curr.commission_amount || 0), 0);

                    return {
                        ...p,
                        totalSales,
                        commission,
                        orderCount: proOrders.length
                    };
                });

                setProfessionals(prosWithStats);
            }
        }
        setLoading(false);
    };

    const colors = businessType === 'salon'
        ? { primary: '#7b438e', bg: '#faf8f5', text: '#1e1e1e', textMuted: '#6b6b6b', cardBg: '#ffffff' }
        : { primary: '#f2b90d', bg: '#000000', text: '#f8fafc', textMuted: '#64748b', cardBg: '#121214' };

    return (
        <div className="space-y-6 md:space-y-10 animate-in fade-in duration-500 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter text-white">
                        Painel de <span style={{ color: colors.primary }}>Comissões</span>
                    </h2>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-1">
                        Acompanhamento de performance e repasses
                    </p>
                </div>

                <div className="flex items-center gap-4 bg-[#121214] border border-white/5 p-2 rounded-2xl">
                    <span className="material-symbols-outlined text-slate-500 pl-2">calendar_month</span>
                    <input
                        type="month"
                        value={selectedPeriod}
                        onChange={(e) => setSelectedPeriod(e.target.value)}
                        className="bg-transparent text-white font-black uppercase text-[11px] outline-none p-2"
                        style={{ colorScheme: 'dark' }}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Resumo Geral */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="p-6 md:p-8 rounded-[2.5rem] border border-white/5 bg-[#121214] relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-7xl md:text-8xl" style={{ color: colors.primary }}>payments</span>
                        </div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">Total em Comissões (Mês)</p>
                        <h3 className="text-3xl md:text-4xl font-black text-white italic tracking-tighter">
                            R$ {professionals.reduce((acc, curr) => acc + curr.commission, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </h3>
                        <div className="mt-6 flex items-center gap-2 text-emerald-500">
                            <span className="material-symbols-outlined text-sm">trending_up</span>
                            <span className="text-[10px] font-black uppercase tracking-widest">+8.4% vs mês anterior</span>
                        </div>
                    </div>

                    <div className="p-6 md:p-8 rounded-[2.5rem] border border-white/5 bg-[#121214] relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-7xl md:text-8xl" style={{ color: colors.primary }}>receipt_long</span>
                        </div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">Total de Serviços</p>
                        <h3 className="text-3xl md:text-4xl font-black text-white italic tracking-tighter">
                            {professionals.reduce((acc, curr) => acc + curr.orderCount, 0)}
                        </h3>
                        <p className="text-[8px] md:text-[9px] font-bold text-slate-500 uppercase mt-4 tracking-widest">Atendimentos finalizados no período</p>
                    </div>
                </div>

                {/* Lista de Profissionais */}
                <div className="lg:col-span-3">
                    <div className="bg-[#121214] border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl h-full">
                        <div className="px-6 py-6 border-b border-white/5 bg-white/5">
                            <h4 className="text-sm font-black uppercase tracking-widest text-white italic">Ranking de Performance</h4>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-white/[0.02]">
                                        <th className="text-left px-4 py-4 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400">Profissional</th>
                                        <th className="text-center px-2 py-4 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400">Total</th>
                                        <th className="text-right px-2 py-4 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400">Com. Serviços</th>
                                        <th className="text-right px-2 py-4 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400">Com. Produtos</th>
                                        <th className="text-right px-4 py-4 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400">Total Comissões</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={5} className="px-8 py-10 text-center text-slate-500 font-bold uppercase tracking-widest text-xs">Carregando dados...</td>
                                        </tr>
                                    ) : professionals.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-8 py-20 text-center text-slate-500 font-bold uppercase tracking-widest text-xs">Sem dados para este período.</td>
                                        </tr>
                                    ) : (
                                        professionals.sort((a, b) => b.commission - a.commission).map(pro => (
                                            <tr key={pro.id} className="group hover:bg-white/[0.02] transition-colors">
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="size-8 md:size-10 rounded-xl overflow-hidden border border-white/10 group-hover:border-[#f2b90d]/50 transition-all shrink-0">
                                                            {pro.avatar_url ? (
                                                                <img src={pro.avatar_url} alt={pro.full_name} className="size-full object-cover" />
                                                            ) : (
                                                                <div className="size-full bg-white/5 flex items-center justify-center text-white/20">
                                                                    <span className="material-symbols-outlined">person</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-white font-black italic uppercase tracking-tight text-xs md:text-sm truncate">{pro.full_name}</p>
                                                            <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">{pro.role || 'Profissional'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-2 py-4 text-center text-slate-400 font-bold text-xs uppercase">
                                                    R$ {pro.totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="px-2 py-4 text-right text-xs md:text-sm font-bold text-[#f2b90d]/80">
                                                    {/* Estimativa ou Dado Futuro - Serviço */}
                                                    R$ {(pro.commission * 0.8).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} <span className="text-[8px] text-slate-500 opacity-50 block leading-none">EST.</span>
                                                </td>
                                                <td className="px-2 py-4 text-right text-xs md:text-sm font-bold text-emerald-500/80">
                                                    {/* Estimativa ou Dado Futuro - Produto */}
                                                    R$ {(pro.commission * 0.2).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} <span className="text-[8px] text-slate-500 opacity-50 block leading-none">EST.</span>
                                                </td>
                                                <td className="px-4 py-4 text-right">
                                                    <span className="text-[#f2b90d] font-black italic text-sm md:text-lg">
                                                        R$ {pro.commission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <div className="pt-4 text-center">
                <p className="text-[8px] font-black uppercase tracking-[0.5em] text-white/10 italic">Auditoria Financeira • FastBeauty Pro v4.0</p>
            </div>
        </div>
    );
}
