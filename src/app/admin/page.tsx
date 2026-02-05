"use client";

import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function OwnerDashboardPage() {
    const data = [
        { name: 'Seg', faturamento: 400 },
        { name: 'Ter', faturamento: 600 },
        { name: 'Qua', faturamento: 550 },
        { name: 'Qui', faturamento: 900 },
        { name: 'Sex', faturamento: 1200 },
        { name: 'Sáb', faturamento: 1500 },
        { name: 'Dom', faturamento: 800 },
    ];

    const kpis = [
        { label: 'Faturamento do Dia', val: 'R$ 1.850', icon: 'today', trend: '+15,2%', color: 'text-emerald-500' },
        { label: 'Faturamento Mensal', val: 'R$ 24.500', icon: 'payments', trend: '+12,5%', color: 'text-emerald-500' },
        { label: 'Tickets Realizados', val: '24', icon: 'receipt', trend: '+4,2%', color: 'text-[#f2b90d]' },
        { label: 'Ticket Médio', val: 'R$ 77,20', icon: 'analytics', trend: '+5,2%', color: 'text-[#f2b90d]' },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {kpis.map((kpi, idx) => (
                    <div key={idx} className="bg-[#121214] border border-white/5 p-6 rounded-[2rem] group hover:border-[#f2b90d]/20 transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div className="size-10 bg-[#f2b90d]/10 rounded-xl flex items-center justify-center text-[#f2b90d] transition-transform group-hover:scale-110">
                                <span className="material-symbols-outlined">{kpi.icon}</span>
                            </div>
                            <span className={`text-[10px] font-black ${kpi.color}`}>{kpi.trend}</span>
                        </div>
                        <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest italic">{kpi.label}</p>
                        <h4 className="text-2xl text-white font-black mt-1 italic tracking-tight">{kpi.val}</h4>
                    </div>
                ))}
            </div>

            <div className="bg-[#121214] border border-white/5 p-8 rounded-[2.5rem]">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h3 className="text-xl text-white font-black italic uppercase tracking-tight">Evolução do Faturamento</h3>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Comparativo de performance semanal</p>
                    </div>
                </div>
                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorFat" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f2b90d" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#f2b90d" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                            <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} stroke="#52525b" />
                            <YAxis fontSize={11} tickLine={false} axisLine={false} stroke="#52525b" />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#18181b', borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold', color: '#fff' }}
                                itemStyle={{ color: '#f2b90d' }}
                            />
                            <Area type="monotone" dataKey="faturamento" stroke="#f2b90d" strokeWidth={4} fillOpacity={1} fill="url(#colorFat)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
