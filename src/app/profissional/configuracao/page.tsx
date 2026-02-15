"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function ProfessionalSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [schedule, setSchedule] = useState<any>({});
    const [profileId, setProfileId] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isUpdatingAuth, setIsUpdatingAuth] = useState(false);
    const [currentLoginEmail, setCurrentLoginEmail] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);

    const daysOfWeek = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
    const dayKeys = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            setProfileId(session.user.id);
            setUserEmail(session.user.email || '');
            setCurrentLoginEmail(session.user.email || '');

            const { data: profile, error } = await supabase
                .from('profiles')
                .select('work_hours')
                .eq('id', session.user.id)
                .single();

            if (error) {
                console.error('Error fetching profile:', error);
                return;
            }

            if (profile?.work_hours) {
                setSchedule(profile.work_hours);
            } else {
                // Default schedule
                const defaultSchedule: any = {};
                dayKeys.forEach(key => {
                    defaultSchedule[key] = { open: '09:00', close: '19:00', isOpen: true };
                });
                setSchedule(defaultSchedule);
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!profileId) return;
        setSaving(true);

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ work_hours: schedule })
                .eq('id', profileId);

            if (error) throw error;
            alert('Horários atualizados com sucesso!');
        } catch (error: any) {
            alert('Erro ao salvar horários: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsUpdatingAuth(true);

        try {
            if (newPassword && newPassword !== confirmPassword) {
                throw new Error('As senhas não coincidem.');
            }

            const updates: any = {};
            // Auditoria: Apenas enviar e-mail se ele realmente foi alterado
            if (userEmail && userEmail !== currentLoginEmail) {
                updates.email = userEmail;
            }
            if (newPassword) updates.password = newPassword;

            if (Object.keys(updates).length === 0) {
                throw new Error('Nenhuma alteração detectada.');
            }

            const { error: authError } = await supabase.auth.updateUser(updates);
            if (authError) throw authError;

            // Auditoria: Sincronizar e-mail na tabela profiles se alterado
            if (updates.email) {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    await supabase
                        .from('profiles')
                        .update({ email: updates.email })
                        .eq('id', user.id);
                }
                alert('E-mail alterado! Verifique sua caixa de entrada para confirmar a alteração.');
            } else {
                alert('Senha atualizada com sucesso!');
            }

            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            alert('Erro ao atualizar dados: ' + error.message);
        } finally {
            setIsUpdatingAuth(false);
        }
    };

    const updateDay = (dayKey: string, field: string, value: any) => {
        setSchedule((prev: any) => {
            const currentDay = prev[dayKey] || { open: '09:00', close: '19:00', isOpen: true };
            return {
                ...prev,
                [dayKey]: { ...currentDay, [field]: value }
            };
        });
    };

    // Generate time options
    const timeOptions: string[] = [];
    for (let h = 6; h <= 23; h++) {
        for (let m = 0; m < 60; m += 30) {
            const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
            timeOptions.push(time);
        }
    }

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Carregando configurações...</div>;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-20 px-4 md:px-0">
            <div className="bg-[#121214] p-6 md:p-10 rounded-[2.5rem] border border-white/5 shadow-2xl">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 md:mb-10">
                    <div>
                        <h3 className="text-xl text-white font-black italic uppercase tracking-tight leading-none mb-1">Disponibilidade</h3>
                        <p className="text-slate-500 text-[9px] md:text-[10px] font-bold uppercase tracking-widest italic opacity-60">Seu horário de atendimento</p>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full sm:w-auto bg-[#f2b90d] text-black px-8 py-3.5 rounded-xl font-black text-xs uppercase italic shadow-lg shadow-[#f2b90d]/20 active:scale-95 transition-all disabled:opacity-50"
                    >
                        {saving ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}
                    </button>
                </div>

                <div className="space-y-3">
                    {daysOfWeek.map((day, index) => {
                        const dayKey = dayKeys[index];
                        const currentDay = schedule[dayKey] || { open: '09:00', close: '19:00', isOpen: true };

                        return (
                            <div key={dayKey} className={`flex flex-col md:flex-row items-start md:items-center justify-between p-4 rounded-2xl border ${currentDay.isOpen ? 'border-white/10 bg-black/20' : 'border-white/5 bg-white/[0.02]'} gap-4 transition-all duration-300`}>
                                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
                                    <div className="flex items-center gap-3">
                                        <div onClick={() => updateDay(dayKey, 'isOpen', !currentDay.isOpen)} className={`w-10 h-6 rounded-full relative cursor-pointer transition-colors ${currentDay.isOpen ? 'bg-[#f2b90d]/20' : 'bg-slate-700/50'}`}>
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
                                            onChange={(e) => updateDay(dayKey, 'open', e.target.value)}
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
                                            onChange={(e) => updateDay(dayKey, 'close', e.target.value)}
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

            {/* SEGURANÇA & ACESSO */}
            <div className="bg-[#121214] p-6 md:p-10 rounded-[2.5rem] border border-white/5 shadow-2xl">
                <form onSubmit={handleUpdateAuth} className="space-y-8 md:space-y-10">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h3 className="text-xl text-white font-black italic uppercase tracking-tight leading-none mb-1">Segurança & Acesso</h3>
                            <p className="text-slate-500 text-[9px] md:text-[10px] font-bold uppercase tracking-widest italic opacity-60">Gerencie suas credenciais</p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <div className="bg-white/5 border border-white/10 px-5 py-3 rounded-2xl min-w-[140px] group/info">
                                <p className="text-[8px] font-black uppercase text-slate-500 mb-1 group-hover/info:text-[#f2b90d] transition-colors">Login Atual</p>
                                <p className="text-[10px] font-bold text-[#f2b90d]">{currentLoginEmail}</p>
                            </div>
                            <div className="bg-white/5 border border-white/10 px-5 py-3 rounded-2xl min-w-[120px] group/info relative overflow-hidden">
                                <p className="text-[8px] font-black uppercase text-slate-500 mb-1 group-hover/info:text-[#f2b90d] transition-colors">Senha Atual</p>
                                <p className={`text-[11px] font-bold text-[#f2b90d] transition-all ${showCurrentPassword ? 'tracking-normal' : 'tracking-[0.2em]'}`}>
                                    {showCurrentPassword ? 'FBP-PROTEGIDA' : '••••••••'}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                    className="absolute right-2 top-2 text-white/20 hover:text-[#f2b90d] transition-colors"
                                    title={showCurrentPassword ? "Ocultar" : "Visualizar (Apenas indicador)"}
                                >
                                    <span className="material-symbols-outlined text-[12px]">
                                        {showCurrentPassword ? 'visibility_off' : 'visibility'}
                                    </span>
                                </button>
                                {showCurrentPassword && (
                                    <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 text-center">
                                        <p className="text-[6px] font-black uppercase text-white leading-tight">
                                            Criptografia <br />Ativa
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[#f2b90d] ml-1 opacity-70">Novo E-mail</label>
                            <input
                                type="email"
                                value={userEmail}
                                onChange={e => setUserEmail(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3.5 text-xs font-bold text-white outline-none focus:border-[#f2b90d] transition-all"
                                placeholder="seu@email.com"
                            />
                        </div>

                        <div className="md:col-start-1 space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[#f2b90d] ml-1 opacity-70">Nova Senha</label>
                            <div className="relative">
                                <input
                                    type={showNewPassword ? "text" : "password"}
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3.5 text-xs font-bold text-white outline-none focus:border-[#f2b90d] transition-all"
                                    placeholder="Min. 6 caracteres"
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[18px]">
                                        {showNewPassword ? 'visibility_off' : 'visibility'}
                                    </span>
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[#f2b90d] ml-1 opacity-70">Confirmar Nova Senha</label>
                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3.5 text-xs font-bold text-white outline-none focus:border-[#f2b90d] transition-all"
                                    placeholder="Repita a nova senha"
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[18px]">
                                        {showConfirmPassword ? 'visibility_off' : 'visibility'}
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-white/5">
                        <button
                            type="submit"
                            disabled={isUpdatingAuth}
                            className="w-full sm:w-auto bg-[#f2b90d] text-black px-12 py-3.5 rounded-xl font-black text-xs uppercase italic shadow-lg shadow-[#f2b90d]/20 active:scale-95 transition-all disabled:opacity-50"
                        >
                            {isUpdatingAuth ? 'SINCRONIZANDO...' : 'ATUALIZAR ACESSO'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
