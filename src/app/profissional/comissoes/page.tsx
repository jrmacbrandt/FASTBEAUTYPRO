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
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, idx) => (
                    <div key={idx} className="bg-[#121214] border border-white/5 p-6 rounded-[2rem] group hover:border-[#f2b90d]/30 transition-all shadow-xl">
                        <div className="size-10 bg-[#f2b90d]/10 rounded-xl flex items-center justify-center text-[#f2b90d] mb-4">
                            <span className="material-symbols-outlined text-xl">{stat.icon}</span>
                        </div>
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">{stat.label}</p>
                        <h4 className="text-white text-2xl font-black italic mt-1 tracking-tighter">{stat.val}</h4>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-[#121214] border border-white/5 p-8 rounded-[2.5rem]">
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <h3 className="text-white text-xl font-black uppercase italic tracking-tight">Evolução Semanal</h3>
                            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Seus ganhos acumulados por dia</p>
                        </div>
                        <div className="bg-[#f2b90d]/10 px-4 py-2 rounded-xl border border-[#f2b90d]/20">
                            <span className="text-[#f2b90d] font-black text-xs uppercase italic">Meta: 85% Atingida</span>
                        </div>
                    </div>

                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data}>
                                <defs>
                                    <linearGradient id="colorComm" x1="0" y1="0" x2="0" y2="1">
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
                                <Area type="monotone" dataKey="valor" stroke="#f2b90d" strokeWidth={4} fillOpacity={1} fill="url(#colorComm)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-[#f2b90d] text-black p-8 rounded-[2.5rem] flex flex-col justify-between relative overflow-hidden shadow-2xl">
                    <span className="material-symbols-outlined absolute -top-4 -right-4 text-[180px] opacity-10 rotate-12">trending_up</span>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-70 mb-1">Dia de Ouro</p>
                        <h3 className="text-3xl font-black italic uppercase leading-none">Melhor <br />Faturamento</h3>
                    </div>
                    <div className="mt-8">
                        <p className="text-5xl font-black italic tracking-tighter">Sábado</p>
                        <div className="flex items-center gap-2 mt-2 opacity-80">
                            <span className="material-symbols-outlined text-sm">stars</span>
                            <span className="text-xs font-bold uppercase tracking-widest">R$ 820,00 Gerados</span>
                        </div>
                    </div>
                    <button className="mt-8 w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest border border-black/20 hover:bg-black/10 transition-all bg-black/5">
                        VER DETALHES DO DIA
                    </button>
                </div>
            </div>
        </div>
    );
}
