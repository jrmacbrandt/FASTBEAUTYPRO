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
                loyalty_target: tenant.loyalty_target
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
                        <div className="space-y-1.5 md:space-y-2">
                            <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 opacity-60">Meta de Fidelidade (Cortes para ganhar 1)</label>
                            <div className="flex items-center gap-4 bg-black border border-white/5 rounded-xl md:rounded-2xl p-3 md:p-4">
                                <span className="material-symbols-outlined text-[#f2b90d]">military_tech</span>
                                <input
                                    type="number"
                                    min="1"
                                    className="w-full bg-transparent font-bold text-white text-sm md:text-base outline-none"
                                    value={tenant.loyalty_target || 5}
                                    onChange={e => setTenant({ ...tenant, loyalty_target: parseInt(e.target.value) })}
                                />
                                <span className="text-xs text-slate-500 font-bold uppercase">S E L O S</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'finance' && (
                <div className="bg-[#121214] p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-white/5 space-y-6 md:space-y-8 animate-in fade-in">
                    <h4 className="text-lg md:text-xl font-black italic uppercase text-white">Configurações Financeiras</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                        {['PIX', 'CARTÃO', 'DINHEIRO', 'DÉBITO'].map(m => (
                            <div key={m} className="p-6 rounded-2xl border border-white/5 bg-black/40 flex items-center justify-between">
                                <span className="text-xs font-black uppercase tracking-widest text-white">{m}</span>
                                <div className="w-12 h-6 bg-emerald-500/20 border border-emerald-500/30 rounded-full relative">
                                    <div className="absolute right-1 top-1 size-4 bg-emerald-500 rounded-full shadow-lg"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'hours' && (
                <div className="bg-[#121214] p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-white/5 space-y-6 md:space-y-8 animate-in fade-in">
                    <h4 className="text-lg md:text-xl font-black italic uppercase text-white">Horário de Funcionamento</h4>
                    <div className="space-y-4">
                        {['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'].map((day, index) => {
                            const dayKey = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'][index];
                            const currentDay = tenant.business_hours?.[dayKey] || { open: '09:00', close: '19:00', isOpen: true };

                            // Helper function to update hours state locally before saving
                            const updateHours = (field: string, value: any) => {
                                setTenant((prev: any) => ({
                                    ...prev,
                                    business_hours: {
                                        ...prev.business_hours,
                                        [dayKey]: { ...currentDay, [field]: value }
                                    }
                                }));
                            };

                            // Generate time options (06:00 to 23:30 in 30min intervals)
                            const timeOptions = [];
                            for (let h = 6; h <= 23; h++) {
                                for (let m = 0; m < 60; m += 30) {
                                    const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                                    timeOptions.push(time);
                                }
                            }

                            return (
                                <div key={day} className={`flex flex-col md:flex-row items-start md:items-center justify-between p-4 rounded-2xl border ${currentDay.isOpen ? 'border-white/10 bg-black/20' : 'border-white/5 bg-white/[0.02]'} gap-4 transition-all duration-300`}>
                                    <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
                                        <div className="flex items-center gap-3">
                                            <div onClick={() => updateHours('isOpen', !currentDay.isOpen)} className={`w-10 h-6 rounded-full relative cursor-pointer transition-colors ${currentDay.isOpen ? 'bg-[#f2b90d]/20' : 'bg-slate-700/50'}`}>
                                                <div className={`absolute top-1 size-4 rounded-full shadow-md transition-all duration-300 ${currentDay.isOpen ? 'right-1 bg-[#f2b90d]' : 'left-1 bg-slate-500'}`} />
                                            </div>
                                            <span className={`text-[10px] font-black uppercase tracking-widest w-20 transition-colors ${currentDay.isOpen ? 'text-white' : 'text-slate-600'}`}>{day}</span>
                                        </div>
                                        <span className={`text-[9px] font-bold uppercase tracking-widest md:hidden ${currentDay.isOpen ? 'text-emerald-500' : 'text-slate-600'}`}>
                                            {currentDay.isOpen ? 'ABERTO' : 'FECHADO'}
                                        </span>
                                    </div>

                                    <div className={`flex items-center gap-2 w-full md:w-auto justify-end transition-opacity duration-300 ${currentDay.isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-30 pointer-events-none'}`}>
                                        <div className="relative group">
                                            <select
                                                value={currentDay.open}
                                                onChange={(e) => updateHours('open', e.target.value)}
                                                disabled={!currentDay.isOpen}
                                                className="bg-black border border-white/10 rounded-xl pl-3 pr-8 py-2 text-xs font-bold text-white outline-none appearance-none cursor-pointer hover:border-[#f2b90d]/50 focus:border-[#f2b90d] transition-all w-24 text-center disabled:cursor-not-allowed"
                                            >
                                                {timeOptions.map(t => <option key={`open-${t}`} value={t}>{t}</option>)}
                                            </select>
                                            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-[16px] text-slate-500 pointer-events-none group-hover:text-[#f2b90d]">expand_more</span>
                                        </div>
                                        <span className="text-white/20 text-[10px] font-black uppercase">ATÉ</span>
                                        <div className="relative group">
                                            <select
                                                value={currentDay.close}
                                                onChange={(e) => updateHours('close', e.target.value)}
                                                disabled={!currentDay.isOpen}
                                                className="bg-black border border-white/10 rounded-xl pl-3 pr-8 py-2 text-xs font-bold text-white outline-none appearance-none cursor-pointer hover:border-[#f2b90d]/50 focus:border-[#f2b90d] transition-all w-24 text-center disabled:cursor-not-allowed"
                                            >
                                                {timeOptions.map(t => <option key={`close-${t}`} value={t}>{t}</option>)}
                                            </select>
                                            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-[16px] text-slate-500 pointer-events-none group-hover:text-[#f2b90d]">expand_more</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {activeTab === 'automation' && (
                <div className="bg-[#121214] p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-white/5 space-y-6 md:space-y-8 animate-in fade-in text-center">
                    <div className="size-20 bg-[#f2b90d]/10 rounded-3xl flex items-center justify-center text-[#f2b90d] mx-auto mb-4">
                        <span className="material-symbols-outlined text-4xl">bolt</span>
                    </div>
                    <h4 className="text-lg md:text-xl font-black italic uppercase text-white">Agendamento Automático</h4>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest max-w-sm mx-auto">Configure a aprovação imediata para novos agendamentos realizados via link público.</p>
                    <div className="flex justify-center pt-4">
                        <button className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest">Ativado</button>
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
