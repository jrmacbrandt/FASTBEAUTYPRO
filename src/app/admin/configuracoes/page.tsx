"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export default function EstablishmentSettingsPage() {
    const [activeTab, setActiveTab] = useState<'general' | 'finance' | 'hours' | 'automation'>('general');
    const [isSaving, setIsSaving] = useState(false);
    const [tenant, setTenant] = useState<any>(null);

    useEffect(() => {
        fetchTenant();
    }, []);

    const fetchTenant = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data: profile } = await supabase
            .from('profiles')
            .select('tenant_id')
            .eq('id', session.user.id)
            .single();

        if (profile?.tenant_id) {
            const { data } = await supabase
                .from('tenants')
                .select('*')
                .eq('id', profile.tenant_id)
                .single();

            if (data) setTenant(data);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        const { error } = await supabase
            .from('tenants')
            .update({
                name: tenant.name,
                slug: tenant.slug,
                business_hours: tenant.business_hours,
                // other fields...
            })
            .eq('id', tenant.id);

        if (!error) {
            alert('Configurações salvas!');
        } else {
            alert('Erro ao salvar: ' + error.message);
        }
        setIsSaving(false);
    };

    if (!tenant) return <div className="p-8 text-center text-slate-500">Carregando configurações...</div>;

    return (
        <div className="space-y-8 max-w-6xl mx-auto pb-20 animate-in fade-in duration-500">
            <div className="flex flex-wrap p-2 rounded-[2rem] bg-[#121214] border border-white/5 gap-2">
                {[{ id: 'general', label: 'Estabelecimento', icon: 'storefront' }, { id: 'finance', label: 'Pagamentos/Taxas', icon: 'payments' }, { id: 'hours', label: 'Horários', icon: 'schedule' }, { id: 'automation', label: 'Agendamento Direto', icon: 'bolt' }].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all italic ${activeTab === tab.id ? 'bg-[#f2b90d] text-black shadow-lg shadow-[#f2b90d]/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                        <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>{tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'general' && (
                <div className="bg-[#121214] p-10 rounded-[3rem] border border-white/5 space-y-8 animate-in fade-in">
                    <h4 className="text-xl font-black italic uppercase text-white">Dados do Estabelecimento</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Nome da Unidade</label>
                            <input type="text" className="w-full bg-black border border-white/5 rounded-2xl p-4 font-bold text-white focus:border-[#f2b90d]/50 outline-none" value={tenant.name} onChange={e => setTenant({ ...tenant, name: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Link de Agendamento</label>
                            <div className="relative">
                                <span className="absolute left-4 top-4 text-[#f2b90d] font-black opacity-40">fastbeauty.pro/</span>
                                <input type="text" className="w-full bg-black border border-white/5 rounded-2xl p-4 pl-[125px] font-bold text-white focus:border-[#f2b90d]/50 outline-none" value={tenant.slug} onChange={e => setTenant({ ...tenant, slug: e.target.value })} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-center pt-10">
                <button onClick={handleSave} disabled={isSaving} className="bg-emerald-500 hover:bg-emerald-600 text-white px-16 py-6 rounded-[1.8rem] text-[15px] font-black uppercase tracking-widest italic shadow-2xl shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-4 disabled:opacity-50">
                    <span className="material-symbols-outlined text-[24px]">save</span>{isSaving ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}
                </button>
            </div>
        </div>
    );
}
