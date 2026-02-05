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
        <div className="space-y-6 md:space-y-8 max-w-6xl mx-auto pb-20 animate-in fade-in duration-500 px-2 md:px-0">
            <div className="flex flex-wrap p-1.5 md:p-2 rounded-2xl md:rounded-[2rem] bg-[#121214] border border-white/5 gap-1.5 md:gap-2">
                {[{ id: 'general', label: 'Estabelecimento', icon: 'storefront' }, { id: 'finance', label: 'Pagamentos', icon: 'payments' }, { id: 'hours', label: 'Horários', icon: 'schedule' }, { id: 'automation', label: 'Agendamento Direto', icon: 'bolt' }].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-xl md:rounded-2xl text-[9px] md:text-[11px] font-black uppercase tracking-widest transition-all italic flex-1 sm:flex-none justify-center ${activeTab === tab.id ? 'bg-[#f2b90d] text-black shadow-lg shadow-[#f2b90d]/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                        <span className="material-symbols-outlined text-[16px] md:text-[18px]">{tab.icon}</span>{tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'general' && (
                <div className="bg-[#121214] p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-white/5 space-y-6 md:space-y-8 animate-in fade-in">
                    <h4 className="text-lg md:text-xl font-black italic uppercase text-white">Dados da Unidade</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                        <div className="space-y-1.5 md:space-y-2">
                            <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 opacity-60">Nome</label>
                            <input type="text" className="w-full bg-black border border-white/5 rounded-xl md:rounded-2xl p-3 md:p-4 font-bold text-white text-sm md:text-base focus:border-[#f2b90d]/50 outline-none" value={tenant.name} onChange={e => setTenant({ ...tenant, name: e.target.value })} />
                        </div>
                        <div className="space-y-1.5 md:space-y-2">
                            <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 opacity-60">Link</label>
                            <div className="relative">
                                <span className="absolute left-4 top-3.5 md:top-4 text-[#f2b90d] font-black opacity-40 text-[10px] md:text-xs">fastbeauty.pro/</span>
                                <input type="text" className="w-full bg-black border border-white/5 rounded-xl md:rounded-2xl p-3 md:p-4 pl-[95px] md:pl-[125px] font-bold text-white text-sm md:text-base focus:border-[#f2b90d]/50 outline-none" value={tenant.slug} onChange={e => setTenant({ ...tenant, slug: e.target.value })} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-center pt-6 md:pt-10">
                <button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-white px-10 md:px-16 py-4 md:py-6 rounded-2xl md:rounded-[1.8rem] text-[13px] md:text-[15px] font-black uppercase tracking-widest italic shadow-xl md:shadow-2xl shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 md:gap-4 disabled:opacity-50">
                    <span className="material-symbols-outlined text-[20px] md:text-[24px]">save</span>{isSaving ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}
                </button>
            </div>
        </div>
    );
}
