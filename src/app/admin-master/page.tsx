"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export default function MasterDashboardPage() {
    const [tenants, setTenants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [businessType, setBusinessType] = useState<'barber' | 'salon'>('barber');

    useEffect(() => {
        const savedType = localStorage.getItem('elite_business_type') as 'barber' | 'salon';
        if (savedType) setBusinessType(savedType);
        fetchTenants();
    }, []);

    const colors = businessType === 'salon'
        ? { primary: '#7b438e', bg: '#faf8f5', text: '#1e1e1e', textMuted: '#6b6b6b', cardBg: '#ffffff', tableBorder: '#7b438e1a' }
        : { primary: '#f2b90d', bg: '#000000', text: '#f8fafc', textMuted: '#64748b', cardBg: '#121214', tableBorder: '#ffffff0d' };

    const fetchTenants = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('tenants')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) {
            setTenants(data);
        }
        setLoading(false);
    };

    const metrics = [
        { label: 'Unidades Ativas', val: tenants.length.toString(), trend: '+12%', icon: 'storefront' },
        { label: 'Status Sistema', val: '99.9%', trend: 'Optimum', icon: 'check_circle' }
    ];

    return (
        <div className="space-y-12 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {metrics.map((m, i) => (
                    <div key={i} className="p-8 rounded-[2rem] border relative group transition-all shadow-xl" style={{ backgroundColor: colors.cardBg, borderColor: `${colors.text}0d` }}>
                        <span className="material-symbols-outlined absolute top-8 right-8 text-6xl opacity-10 group-hover:opacity-20 transition-all" style={{ color: colors.primary }}>{m.icon}</span>
                        <p className="text-[10px] font-black uppercase tracking-widest mb-1 italic" style={{ color: colors.textMuted }}>{m.label}</p>
                        <h4 className="text-4xl font-black italic tracking-tighter mb-4" style={{ color: colors.text }}>{m.val}</h4>
                    </div>
                ))}
            </div>

            <div className="rounded-[2.5rem] border overflow-hidden shadow-2xl" style={{ backgroundColor: colors.cardBg, borderColor: `${colors.text}0d` }}>
                <div className="p-10 border-b flex justify-between items-center" style={{ borderColor: `${colors.text}0d` }}>
                    <h3 className="text-2xl font-black italic tracking-tight uppercase" style={{ color: colors.text }}>Inquilinos na Plataforma</h3>
                </div>
                <div className="p-8">
                    {loading ? (
                        <div className="text-center py-20 opacity-40">
                            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 mx-auto" style={{ borderColor: colors.primary }}></div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="text-[10px] font-black uppercase tracking-widest italic border-b" style={{ color: colors.textMuted, borderColor: `${colors.text}0d` }}>
                                        <th className="pb-4 px-4">Nome</th>
                                        <th className="pb-4 px-4">Slug</th>
                                        <th className="pb-4 px-4">Status</th>
                                        <th className="pb-4 px-4">Criado em</th>
                                    </tr>
                                </thead>
                                <tbody className="font-bold text-sm" style={{ color: colors.text }}>
                                    {tenants.map(t => (
                                        <tr key={t.id} className="border-b transition-colors" style={{ borderColor: `${colors.text}0d` }}>
                                            <td className="py-4 px-4 italic">{t.name}</td>
                                            <td className="py-4 px-4 font-black" style={{ color: colors.primary }}>/{t.slug}</td>
                                            <td className="py-4 px-4">
                                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${t.active ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                                                    {t.active ? 'ATIVO' : 'INATIVO'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4" style={{ color: colors.textMuted }}>{new Date(t.created_at).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
