"use client";

import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function OwnerDashboardPage() {
    const [businessType, setBusinessType] = React.useState<'barber' | 'salon'>('barber');

    React.useEffect(() => {
        const savedType = localStorage.getItem('elite_business_type') as 'barber' | 'salon';
        if (savedType) setBusinessType(savedType);
    }, []);

    const colors = businessType === 'salon'
        ? { primary: '#7b438e', bg: '#faf8f5', text: '#1e1e1e', textMuted: '#6b6b6b', cardBg: '#ffffff', chartGrid: '#e2e8f0', chartStroke: '#94a3b8' }
        : { primary: '#f2b90d', bg: '#000000', text: '#f8fafc', textMuted: '#64748b', cardBg: '#121214', chartGrid: '#27272a', chartStroke: '#52525b' };

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
        { label: 'Tickets Realizados', val: '24', icon: 'receipt', trend: '+4,2%', color: businessType === 'salon' ? 'text-[#7b438e]' : 'text-[#f2b90d]' },
        { label: 'Ticket Médio', val: 'R$ 77,20', icon: 'analytics', trend: '+5,2%', color: businessType === 'salon' ? 'text-[#7b438e]' : 'text-[#f2b90d]' },
    ];

    return (
        <div className="space-y-4 md:space-y-8 animate-in fade-in duration-500 pb-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {kpis.map((kpi, idx) => (
                    <div key={idx} className="border p-4 md:p-6 rounded-3xl md:rounded-[2rem] group transition-all" style={{ backgroundColor: colors.cardBg, borderColor: `${colors.text}0d` }}>
                        <div className="flex justify-between items-start mb-2 md:mb-4">
                            <div className="size-8 md:size-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110" style={{ backgroundColor: `${colors.primary}1a`, color: colors.primary }}>
                                <span className="material-symbols-outlined text-[18px] md:text-[24px]">{kpi.icon}</span>
                            </div>
                            <span className={`text-[9px] md:text-[10px] font-black ${kpi.color}`}>{kpi.trend}</span>
                        </div>
                        <p className="text-[8px] md:text-[9px] font-black uppercase tracking-widest italic opacity-70" style={{ color: colors.textMuted }}>{kpi.label}</p>
                        <h4 className="text-xl md:text-2xl font-black mt-0.5 italic tracking-tight" style={{ color: colors.text }}>{kpi.val}</h4>
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
                <div className="h-48 sm:h-64 md:h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorFat" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={colors.primary} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={colors.primary} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.chartGrid} />
                            <XAxis dataKey="name" fontSize={9} tickLine={false} axisLine={false} stroke={colors.chartStroke} />
                            <YAxis fontSize={9} tickLine={false} axisLine={false} stroke={colors.chartStroke} />
                            <Tooltip
                                contentStyle={{ backgroundColor: colors.cardBg, borderRadius: '12px', border: `1px solid ${colors.text}1a`, boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 'bold', color: colors.text }}
                                itemStyle={{ color: colors.primary }}
                            />
                            <Area type="monotone" dataKey="faturamento" stroke={colors.primary} strokeWidth={3} fillOpacity={1} fill="url(#colorFat)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
