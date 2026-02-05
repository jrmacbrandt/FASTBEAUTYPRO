"use client";

import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function ProfessionalCommissionsPage() {
    const data = [
        { name: 'Seg', valor: 150 },
        { name: 'Ter', valor: 280 },
        { name: 'Qua', valor: 220 },
        { name: 'Qui', valor: 450 },
        { name: 'Sex', valor: 580 },
        { name: 'Sáb', valor: 820 },
        { name: 'Dom', valor: 310 },
    ];

    const stats = [
        { label: 'Ganhos Hoje', val: 'R$ 310,00', icon: 'today' },
        { label: 'Este Mês', val: 'R$ 4.250,00', icon: 'calendar_today' },
        { label: 'Serviços (70%)', val: 'R$ 2.975,00', icon: 'content_cut' },
        { label: 'Produtos (30%)', val: 'R$ 1.275,00', icon: 'inventory' },
    ];

    return (
        <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-10">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                {stats.map((stat, idx) => (
                    <div key={idx} className="bg-[#121214] border border-white/5 p-4 md:p-6 rounded-2xl md:rounded-[2rem] group hover:border-[#f2b90d]/30 transition-all shadow-xl">
                        <div className="size-8 md:size-10 bg-[#f2b90d]/10 rounded-lg md:rounded-xl flex items-center justify-center text-[#f2b90d] mb-3 md:mb-4">
                            <span className="material-symbols-outlined text-base md:text-xl">{stat.icon}</span>
                        </div>
                        <p className="text-slate-500 text-[8px] md:text-[10px] font-black uppercase tracking-[0.1em] md:tracking-[0.2em]">{stat.label}</p>
                        <h4 className="text-white text-lg md:text-2xl font-black italic mt-0.5 md:mt-1 tracking-tighter truncate">{stat.val}</h4>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                <div className="lg:col-span-2 bg-[#121214] border border-white/5 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-xl">
                    <div className="flex justify-between items-start mb-6 md:mb-8">
                        <div>
                            <h3 className="text-lg md:text-xl text-white font-black uppercase italic tracking-tight">Evolução Semanal</h3>
                            <p className="text-slate-500 text-[8px] md:text-[10px] font-bold uppercase tracking-widest opacity-60">Ganhos acumulados por dia</p>
                        </div>
                        <div className="bg-[#f2b90d]/10 px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl border border-[#f2b90d]/20 shrink-0">
                            <span className="text-[#f2b90d] font-black text-[9px] md:text-xs uppercase italic">META: 85%</span>
                        </div>
                    </div>

                    <div className="h-48 md:h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data}>
                                <defs>
                                    <linearGradient id="colorComm" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f2b90d" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#f2b90d" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                                <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} stroke="#52525b" />
                                <YAxis fontSize={10} tickLine={false} axisLine={false} stroke="#52525b" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#18181b', borderRadius: '12px', border: 'none', fontSize: '11px', fontWeight: 'bold', color: '#fff' }}
                                    itemStyle={{ color: '#f2b90d' }}
                                />
                                <Area type="monotone" dataKey="valor" stroke="#f2b90d" strokeWidth={3} fillOpacity={1} fill="url(#colorComm)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-[#f2b90d] text-black p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] flex flex-col justify-between relative overflow-hidden shadow-2xl min-h-[220px] md:min-h-[auto]">
                    <span className="material-symbols-outlined absolute -top-4 -right-4 text-[120px] md:text-[180px] opacity-10 rotate-12">trending_up</span>
                    <div className="z-10">
                        <p className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] opacity-60 mb-0.5 md:mb-1">Melhor Performance</p>
                        <h3 className="text-2xl md:text-3xl font-black italic uppercase leading-[0.9] md:leading-none">Recorde de <br className="hidden md:block" />Faturamento</h3>
                    </div>
                    <div className="mt-4 md:mt-8 z-10">
                        <p className="text-4xl md:text-5xl font-black italic tracking-tighter">Sábado</p>
                        <div className="flex items-center gap-1.5 md:gap-2 mt-1 md:mt-2 opacity-70">
                            <span className="material-symbols-outlined text-[12px] md:text-sm">stars</span>
                            <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest">RS 820,00 Gerados</span>
                        </div>
                    </div>
                    <button className="mt-6 md:mt-8 w-full py-3.5 md:py-4 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest border border-black/20 hover:bg-black/10 transition-all bg-black/5 active:scale-95 z-10">
                        VER DETALHES
                    </button>
                </div>
            </div>
        </div>
    );
}
