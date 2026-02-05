"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export default function MasterDashboardPage() {
    const [tenants, setTenants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTenants();
    }, []);

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
                    <div key={i} className="bg-[#121214] p-8 rounded-[2rem] border border-white/5 relative group hover:border-[#f2b90d]/40 transition-all shadow-xl">
                        <span className="material-symbols-outlined absolute top-8 right-8 text-[#f2b90d]/10 text-6xl group-hover:text-[#f2b90d]/20 transition-all">{m.icon}</span>
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1 italic">{m.label}</p>
                        <h4 className="text-white text-4xl font-black italic tracking-tighter mb-4">{m.val}</h4>
                    </div>
                ))}
            </div>

            <div className="bg-[#121214] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                <div className="p-10 border-b border-white/5 flex justify-between items-center">
                    <h3 className="text-white text-2xl font-black italic tracking-tight uppercase">Inquilinos na Plataforma</h3>
                </div>
                <div className="p-8">
                    {loading ? (
                        <div className="text-center py-20 opacity-40">
                            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#f2b90d] mx-auto"></div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="text-slate-500 text-[10px] font-black uppercase tracking-widest italic border-b border-white/5">
                                        <th className="pb-4 px-4">Nome</th>
                                        <th className="pb-4 px-4">Slug</th>
                                        <th className="pb-4 px-4">Status</th>
                                        <th className="pb-4 px-4">Criado em</th>
                                    </tr>
                                </thead>
                                <tbody className="text-white font-bold text-sm">
                                    {tenants.map(t => (
                                        <tr key={t.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                            <td className="py-4 px-4 italic">{t.name}</td>
                                            <td className="py-4 px-4 text-[#f2b90d] font-black">/{t.slug}</td>
                                            <td className="py-4 px-4">
                                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${t.active ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                                                    {t.active ? 'ATIVO' : 'INATIVO'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 text-slate-500">{new Date(t.created_at).toLocaleDateString()}</td>
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
