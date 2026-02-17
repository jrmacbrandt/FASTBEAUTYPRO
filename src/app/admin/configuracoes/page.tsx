"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { maskPhone, maskCPF, maskCEP } from '@/lib/masks';
import { processImage } from '@/lib/image-processing';
import ImageUpload from '@/components/ui/ImageUpload';

export const dynamic = 'force-dynamic';

export default function EstablishmentSettingsPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'general' | 'finance' | 'hours' | 'automation' | 'branding' | 'security'>('general');
    const [isSaving, setIsSaving] = useState(false);
    const [tenant, setTenant] = useState<any>(null);
    const [origin, setOrigin] = useState('');
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);

    // Auth State
    const [userEmail, setUserEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isUpdatingAuth, setIsUpdatingAuth] = useState(false);
    const [currentLoginEmail, setCurrentLoginEmail] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setOrigin(window.location.host + '/');
        }
    }, []);

    const { profile, loading: profileLoading } = require('@/hooks/useProfile').useProfile();

    useEffect(() => {
        if (profile?.tenant_id) {
            setTenant(profile.tenant);
            setUserEmail(profile.email || '');
            setCurrentLoginEmail(profile.email || '');
            if (profile.tenant?.logo_url) setLogoPreview(profile.tenant.logo_url);
        }
    }, [profile]);

    const fetchTenant = () => { }; // Replaced by useProfile

    const handleLogoSelect = (file: File, preview: string) => {
        setLogoFile(file);
        setLogoPreview(preview);
    };

    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setIsSaving(true);
        let logoUrl = tenant.logo_url;

        if (logoFile) {
            try {
                const fileName = `logo-${tenant.id}-${Date.now()}.webp`;
                const { error: uploadError } = await supabase.storage
                    .from('logos')
                    .upload(fileName, logoFile, {
                        cacheControl: '3600',
                        upsert: true
                    });

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('logos')
                    .getPublicUrl(fileName);

                logoUrl = publicUrl;
            } catch (error) {
                console.error('Error uploading logo:', error);
                alert('Erro ao fazer upload da logo.');
                setIsSaving(false);
                return;
            }
        }

        const { error } = await supabase
            .from('tenants')
            .update({
                name: tenant.name,
                logo_url: logoUrl,
                slug: tenant.slug,
                phone: tenant.phone?.replace(/\D/g, ''),
                contact_email: tenant.contact_email,
                tax_id: tenant.tax_id?.replace(/\D/g, ''),
                address_zip: tenant.address_zip?.replace(/\D/g, ''),
                address_street: tenant.address_street,
                address_number: tenant.address_number,
                address_complement: tenant.address_complement,
                address_neighborhood: tenant.address_neighborhood,
                address_city: tenant.address_city,
                address_state: tenant.address_state,
                business_hours: tenant.business_hours,
                loyalty_target: tenant.loyalty_target,
                payment_methods: tenant.payment_methods,
                primary_color: tenant.primary_color,
                secondary_color: tenant.secondary_color,
                tertiary_color: tenant.tertiary_color
            })
            .eq('id', tenant.id);

        if (!error && profile?.id) {
            // Sync with profile
            await supabase.from('profiles').update({
                full_name: tenant.owner_name || profile.full_name,
                cpf: tenant.tax_id?.replace(/\D/g, '')
            }).eq('id', profile.id);

            // Notify system of profile update (for sidebar/layout sync)
            window.dispatchEvent(new CustomEvent('profile-updated'));
        }

        if (!error) {
            alert('Configurações salvas com sucesso!');
        } else {
            console.error('Error saving tenant:', error);
            alert('Erro ao salvar: ' + error.message);
        }
        setIsSaving(false);
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
                alert('E-mail alterado com sucesso! Por segurança, você será deslogado. Verifique sua caixa de entrada para confirmar a alteração antes de entrar novamente.');
            } else {
                alert('Senha atualizada com sucesso! Por segurança, você será deslogado.');
            }

            // Deslogar e redirecionar para a página de login
            await supabase.auth.signOut();
            router.push('/login');
        } catch (error: any) {
            alert('Erro ao atualizar dados: ' + error.message);
        } finally {
            setIsUpdatingAuth(false);
        }
    };

    const handleCepLookup = async (cep: string) => {
        const cleanCep = cep.replace(/\D/g, '');
        if (cleanCep.length === 8) {
            try {
                const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
                const data = await res.json();
                if (!data.erro) {
                    setTenant({
                        ...tenant,
                        address_zip: cleanCep,
                        address_street: data.logradouro,
                        address_neighborhood: data.bairro,
                        address_city: data.localidade,
                        address_state: data.uf
                    });
                }
            } catch (err) {
                console.error('CEP lookup failed:', err);
            }
        }
    };

    if (!tenant) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-4">
                <div className="size-12 border-4 border-[#f2b90d]/20 border-t-[#f2b90d] rounded-full animate-spin"></div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Configurando seu Espaço...</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 md:space-y-8 max-w-6xl mx-auto pb-24 animate-in fade-in duration-500 px-2 md:px-0 mt-8">
            <header className="mb-8">
                <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase leading-none">
                    Controles & <span className="text-[#f2b90d]">Ajustes</span>
                </h1>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mt-2 flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-[#f2b90d] animate-pulse"></span>
                    Customização da Unidade & Governança
                </p>
            </header>

            <div className="flex flex-wrap p-1.5 md:p-2 rounded-2xl md:rounded-[2rem] bg-[#121214] border border-white/5 gap-1.5 md:gap-2">
                {[
                    { id: 'general', label: 'Estabelecimento', icon: 'storefront' },
                    { id: 'finance', label: 'Pagamentos', icon: 'payments' },
                    { id: 'hours', label: 'Horários', icon: 'schedule' },
                    { id: 'branding', label: 'Página de Agendamento', icon: 'palette' },
                    { id: 'automation', label: 'Agendamento Direto', icon: 'bolt' },
                    { id: 'security', label: 'Segurança & Acesso', icon: 'lock' }
                ].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-4 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl text-[9px] md:text-[11px] font-black uppercase tracking-widest transition-all italic flex-1 sm:flex-none justify-center ${activeTab === tab.id ? 'bg-[#f2b90d] text-black shadow-lg shadow-[#f2b90d]/20 scale-[1.02]' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                        <span className="material-symbols-outlined text-[16px] md:text-[18px]">{tab.icon}</span>{tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'general' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-[#121214] p-8 md:p-10 rounded-[2.5rem] border border-white/5 space-y-10 relative overflow-hidden group shadow-2xl">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-[#f2b90d]/5 rounded-full blur-[100px] pointer-events-none"></div>

                        <div>
                            <h4 className="text-xl font-black italic uppercase text-white mb-2">Identidade da Unidade</h4>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Dados básicos e identificação fiscal</p>
                        </div>

                        <div className="flex flex-col md:flex-row gap-8 items-start">
                            {/* Logo Upload Section */}
                            <ImageUpload
                                currentImage={logoPreview}
                                onImageSelect={handleLogoSelect}
                                helperText="Toque para alterar"
                                className="w-full max-w-[200px]"
                            />

                            <div className="flex-1 w-full space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[#f2b90d] ml-1 opacity-70">Nome do Proprietário</label>
                                        <input
                                            type="text"
                                            className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 font-bold text-white text-sm focus:border-[#f2b90d]/50 outline-none transition-all"
                                            value={tenant.owner_name || profile?.full_name || ''}
                                            onChange={e => setTenant({ ...tenant, owner_name: e.target.value })}
                                            placeholder="Seu nome completo"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[#f2b90d] ml-1 opacity-70">Nome Fantasia</label>
                                        <input type="text" className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 font-bold text-white text-sm focus:border-[#f2b90d]/50 outline-none transition-all" value={tenant.name} onChange={e => setTenant({ ...tenant, name: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[#f2b90d] ml-1 opacity-70">Link (Slug)</label>
                                        <div className="flex items-center bg-black/40 border border-white/5 rounded-2xl p-4 gap-1 focus-within:border-[#f2b90d]/50 transition-all">
                                            <span className="text-[#f2b90d] font-black opacity-30 text-xs whitespace-nowrap">{origin}</span>
                                            <input type="text" className="flex-1 bg-transparent border-none p-0 font-bold text-white text-sm outline-none" value={tenant.slug} onChange={e => setTenant({ ...tenant, slug: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[#f2b90d] ml-1 opacity-70">CPF / CNPJ</label>
                                        <input
                                            type="text"
                                            className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 font-bold text-white text-sm focus:border-[#f2b90d]/50 outline-none transition-all placeholder:text-white/20"
                                            value={tenant.tax_id || ''}
                                            onChange={e => setTenant({ ...tenant, tax_id: maskCPF(e.target.value) })}
                                            placeholder="000.000.000-00"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[#f2b90d] ml-1 opacity-70">WhatsApp Comercial</label>
                                        <div className="relative">
                                            <span className="material-symbols-outlined absolute left-4 top-4 text-emerald-500/50 text-xl">call</span>
                                            <input
                                                type="tel"
                                                className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 pl-12 font-bold text-white text-sm focus:border-[#f2b90d]/50 outline-none transition-all placeholder:text-white/20"
                                                value={tenant.phone || ''}
                                                onChange={e => setTenant({ ...tenant, phone: maskPhone(e.target.value) })}
                                                placeholder="(00) 00000-0000"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[#f2b90d] ml-1 opacity-70">E-mail de Contato</label>
                                        <div className="relative">
                                            <span className="material-symbols-outlined absolute left-4 top-4 text-emerald-500/50 text-xl">mail</span>
                                            <input type="email" className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 pl-12 font-bold text-white text-sm focus:border-[#f2b90d]/50 outline-none transition-all" value={tenant.contact_email} onChange={e => setTenant({ ...tenant, contact_email: e.target.value })} placeholder="vendas@unidade.com" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#121214] p-8 md:p-10 rounded-[2.5rem] border border-white/5 space-y-10 shadow-2xl">
                        <div>
                            <h4 className="text-xl font-black italic uppercase text-white mb-2">Localização</h4>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Endereço para exibição no mapa e busca</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[#f2b90d] ml-1 opacity-70">CEP</label>
                                <input
                                    type="text"
                                    className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 font-bold text-white text-sm focus:border-[#f2b90d]/50 outline-none transition-all placeholder:text-white/20"
                                    value={tenant.address_zip || ''}
                                    onChange={e => {
                                        const val = maskCEP(e.target.value);
                                        setTenant({ ...tenant, address_zip: val });
                                        if (val.replace(/\D/g, '').length === 8) handleCepLookup(val);
                                    }}
                                    placeholder="00000-000"
                                />
                            </div>
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[#f2b90d] ml-1 opacity-70">Endereço / Logradouro</label>
                                <input type="text" className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 font-bold text-white text-sm focus:border-[#f2b90d]/50 outline-none transition-all shadow-inner" value={tenant.address_street} onChange={e => setTenant({ ...tenant, address_street: e.target.value })} placeholder="Av. Paulista" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[#f2b90d] ml-1 opacity-70">Número</label>
                                <input type="text" className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 font-bold text-white text-sm focus:border-[#f2b90d]/50 outline-none transition-all" value={tenant.address_number} onChange={e => setTenant({ ...tenant, address_number: e.target.value })} placeholder="123" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[#f2b90d] ml-1 opacity-70">Complemento</label>
                                <input type="text" className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 font-bold text-white text-sm focus:border-[#f2b90d]/50 outline-none transition-all" value={tenant.address_complement} onChange={e => setTenant({ ...tenant, address_complement: e.target.value })} placeholder="Apto 10 / Sala 2" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[#f2b90d] ml-1 opacity-70">Bairro</label>
                                <input type="text" className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 font-bold text-white text-sm focus:border-[#f2b90d]/50 outline-none transition-all" value={tenant.address_neighborhood} onChange={e => setTenant({ ...tenant, address_neighborhood: e.target.value })} placeholder="Centro" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[#f2b90d] ml-1 opacity-70">Cidade</label>
                                <input type="text" className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 font-bold text-white text-sm focus:border-[#f2b90d]/50 outline-none transition-all" value={tenant.address_city} onChange={e => setTenant({ ...tenant, address_city: e.target.value })} placeholder="São Paulo" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[#f2b90d] ml-1 opacity-70">UF</label>
                                <input type="text" className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 font-bold text-white text-sm uppercase focus:border-[#f2b90d]/50 outline-none transition-all" maxLength={2} value={tenant.address_state} onChange={e => setTenant({ ...tenant, address_state: e.target.value })} placeholder="SP" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'finance' && (
                <div className="bg-[#121214] p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-white/5 space-y-6 md:space-y-8 animate-in fade-in">
                    <h4 className="text-lg md:text-xl font-black italic uppercase text-white">Configurações Financeiras</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                        {['PIX', 'CARTÃO', 'DINHEIRO', 'DÉBITO'].map(m => {
                            const isActive = tenant.payment_methods?.includes(m);
                            return (
                                <div
                                    key={m}
                                    onClick={() => {
                                        const current = tenant.payment_methods || [];
                                        const updated = current.includes(m)
                                            ? current.filter((i: string) => i !== m)
                                            : [...current, m];
                                        setTenant({ ...tenant, payment_methods: updated });
                                    }}
                                    className={`p-6 rounded-2xl border cursor-pointer transition-all flex items-center justify-between group ${isActive ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-white/5 bg-black/40 hover:bg-white/5'
                                        }`}
                                >
                                    <span className={`text-xs font-black uppercase tracking-widest transition-colors ${isActive ? 'text-emerald-500' : 'text-slate-400 group-hover:text-white'}`}>{m}</span>
                                    <div className={`w-10 h-5 rounded-full relative transition-colors duration-300 ${isActive ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                                        <div className={`absolute top-1 size-3 bg-white rounded-full shadow-lg transition-all duration-300 ${isActive ? 'translate-x-6' : 'translate-x-1'}`}></div>
                                    </div>
                                </div>
                            );
                        })}
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

                            const updateHours = (field: string, value: any) => {
                                setTenant((prev: any) => ({
                                    ...prev,
                                    business_hours: {
                                        ...prev.business_hours,
                                        [dayKey]: { ...currentDay, [field]: value }
                                    }
                                }));
                            };

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
                                            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-[16px] text-slate-500 pointer-events-none">expand_more</span>
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
                                            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-[16px] text-slate-500 pointer-events-none">expand_more</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {activeTab === 'branding' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-[#121214] p-8 md:p-10 rounded-[2.5rem] border border-white/5 space-y-10 relative overflow-hidden group shadow-2xl">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-[#f2b90d]/5 rounded-full blur-[100px] pointer-events-none"></div>

                        <div>
                            <h4 className="text-xl font-black italic uppercase text-white mb-2">Identidade Visual</h4>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Personalize as cores da sua página de agendamento</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[#f2b90d] ml-1 opacity-70">Cor Primária (Destaque)</label>
                                <div className="flex items-center gap-4 bg-black/40 border border-white/5 rounded-2xl p-4">
                                    <input
                                        type="color"
                                        value={tenant.primary_color || '#f2b90d'}
                                        onChange={e => setTenant({ ...tenant, primary_color: e.target.value })}
                                        className="size-10 rounded-lg cursor-pointer bg-transparent border-none appearance-none"
                                    />
                                    <div className="flex-1">
                                        <p className="text-white font-bold uppercase">{tenant.primary_color || '#f2b90d'}</p>
                                        <p className="text-[10px] text-slate-500 uppercase">Usada em botões e destaques</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[#f2b90d] ml-1 opacity-70">Cor Secundária (Fundo)</label>
                                <div className="flex items-center gap-4 bg-black/40 border border-white/5 rounded-2xl p-4">
                                    <input
                                        type="color"
                                        value={tenant.secondary_color || '#09090b'}
                                        onChange={e => setTenant({ ...tenant, secondary_color: e.target.value })}
                                        className="size-10 rounded-lg cursor-pointer bg-transparent border-none appearance-none"
                                    />
                                    <div className="flex-1">
                                        <p className="text-white font-bold uppercase">{tenant.secondary_color || '#09090b'}</p>
                                        <p className="text-[10px] text-slate-500 uppercase">Cor base do fundo</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[#f2b90d] ml-1 opacity-70">Cor Terciária (Degradê)</label>
                                <div className="flex items-center gap-4 bg-black/40 border border-white/5 rounded-2xl p-4">
                                    <input
                                        type="color"
                                        value={tenant.tertiary_color || '#09090b'}
                                        onChange={e => setTenant({ ...tenant, tertiary_color: e.target.value })}
                                        className="size-10 rounded-lg cursor-pointer bg-transparent border-none appearance-none"
                                    />
                                    <div className="flex-1">
                                        <p className="text-white font-bold uppercase">{tenant.tertiary_color || '#09090b'}</p>
                                        <p className="text-[10px] text-slate-500 uppercase">Efeito de luz central no fundo</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Preview Section - Side by Side Desktop & Mobile */}
                        <div className="mt-8 space-y-4">
                            <h5 className="text-[10px] font-black uppercase tracking-widest text-[#f2b90d] opacity-70 ml-1">Pré-visualização (Desktop & Mobile)</h5>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Desktop Version (takes 2 cols) */}
                                <div className="lg:col-span-2 relative aspect-[16/9] rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl flex flex-col group/desktop">
                                    <div className="absolute top-3 left-6 flex gap-1.5 z-20">
                                        <div className="size-2 rounded-full bg-red-500/50"></div>
                                        <div className="size-2 rounded-full bg-amber-500/50"></div>
                                        <div className="size-2 rounded-full bg-emerald-500/50"></div>
                                    </div>

                                    <div
                                        className="absolute inset-0 transition-all duration-700 ease-in-out"
                                        style={{
                                            background: `radial-gradient(circle at center, ${tenant.tertiary_color || '#09090b'}, ${tenant.secondary_color || '#09090b'})`
                                        }}
                                    />
                                    <div
                                        className="absolute inset-0 pointer-events-none transition-all duration-700 ease-in-out opacity-20"
                                        style={{ background: `radial-gradient(circle, ${tenant.primary_color || '#f2b90d'} 0%, transparent 70%)` }}
                                    />

                                    <div className="relative flex-1 flex flex-col p-6 lg:p-10">
                                        {/* Mini Header */}
                                        <div className="flex items-center justify-between mb-8 bg-black/40 backdrop-blur-md p-4 rounded-2xl border border-white/5">
                                            <div className="flex items-center gap-3">
                                                <div className="size-10 rounded-full bg-white/10 overflow-hidden border border-white/20">
                                                    {logoPreview ? <img src={logoPreview} alt="" className="size-full object-cover" /> : <div className="size-full flex items-center justify-center text-[10px] font-black text-white/20">FB</div>}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black italic uppercase text-white tracking-tighter truncate max-w-[150px] leading-none">{tenant.name || 'Sua Loja'}</span>
                                                    <span className="text-[8px] font-black uppercase text-[#f2b90d] tracking-[0.2em] opacity-80">Premium Excellence</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-1.5">
                                                {[1, 2, 3, 4, 5].map(i => (
                                                    <div key={i} className="size-2 rounded-full" style={{ backgroundColor: i === 1 ? (tenant.primary_color || '#f2b90d') : 'rgba(255,255,255,0.1)', boxShadow: i === 1 ? `0 0 10px ${tenant.primary_color || '#f2b90d'}80` : 'none' }} />
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex-1 flex flex-col justify-center items-center text-center space-y-8">
                                            <h6 className="text-4xl lg:text-6xl font-black italic uppercase leading-[0.9] tracking-tighter text-white drop-shadow-2xl">
                                                O QUE VAMOS <br />
                                                <span className="transition-colors duration-500" style={{ color: tenant.primary_color || '#f2b90d' }}>FAZER HOJE?</span>
                                            </h6>
                                            <div className="w-full max-w-sm bg-white/5 backdrop-blur-xl border border-white/10 rounded-[1.8rem] p-6 flex items-center justify-between transition-all">
                                                <div className="text-left">
                                                    <p className="text-sm font-black italic text-white uppercase tracking-tight">Corte Moderno</p>
                                                    <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mt-0.5">Duração: 30 min</p>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <p className="text-2xl font-black italic" style={{ color: tenant.primary_color || '#f2b90d' }}>R$ 50</p>
                                                    <div className="size-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10 shadow-lg"><span className="material-symbols-outlined text-[18px] text-white/20">arrow_forward</span></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-[8px] font-black text-white/40 uppercase tracking-widest">Visualização Desktop</div>
                                </div>

                                {/* Mobile Version (takes 1 col) */}
                                <div className="relative aspect-[9/16] max-w-[280px] mx-auto rounded-[3rem] overflow-hidden border-[6px] border-[#1a1a1e] shadow-2xl flex flex-col group/mobile bg-black">
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-5 bg-[#1a1a1e] rounded-b-2xl z-20"></div>
                                    <div
                                        className="absolute inset-0 transition-all duration-700 ease-in-out"
                                        style={{
                                            background: `radial-gradient(circle at center, ${tenant.tertiary_color || '#09090b'}, ${tenant.secondary_color || '#09090b'})`
                                        }}
                                    />
                                    <div
                                        className="absolute inset-0 pointer-events-none transition-all duration-700 ease-in-out opacity-20"
                                        style={{ background: `radial-gradient(circle, ${tenant.primary_color || '#f2b90d'} 0%, transparent 70%)` }}
                                    />

                                    <div className="relative flex-1 flex flex-col p-5 pt-10">
                                        <div className="flex flex-col items-center gap-3 mb-8 bg-black/40 backdrop-blur-md p-4 rounded-2xl border border-white/5">
                                            <div className="size-12 rounded-full bg-white/10 overflow-hidden border border-white/20">
                                                {logoPreview ? <img src={logoPreview} alt="" className="size-full object-cover" /> : <div className="size-full flex items-center justify-center text-[10px] font-black text-white/20">FB</div>}
                                            </div>
                                            <h6 className="text-xs font-black italic uppercase text-white tracking-tighter text-center leading-none">{tenant.name || 'Sua Loja'}</h6>
                                            <div className="flex gap-1.5">
                                                {[1, 2, 3, 4, 5].map(i => (
                                                    <div key={i} className="size-1.5 rounded-full" style={{ backgroundColor: i === 1 ? (tenant.primary_color || '#f2b90d') : 'rgba(255,255,255,0.1)' }} />
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex-1 flex flex-col justify-center items-center text-center space-y-6">
                                            <h6 className="text-2xl font-black italic uppercase leading-[0.9] tracking-tighter text-white">
                                                O QUE VAMOS <br /><span style={{ color: tenant.primary_color || '#f2b90d' }}>FAZER HOJE?</span>
                                            </h6>
                                            <div className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-[1.2rem] p-4 flex items-center justify-between">
                                                <div className="text-left"><p className="text-[10px] font-black italic text-white uppercase leading-none">Corte Moderno</p></div>
                                                <p className="text-sm font-black italic" style={{ color: tenant.primary_color || '#f2b90d' }}>R$ 50</p>
                                            </div>
                                            <button className="w-full py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl" style={{ backgroundColor: tenant.primary_color || '#f2b90d', color: '#000' }}>Agendar</button>
                                        </div>
                                    </div>
                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-[8px] font-black text-white/40 uppercase tracking-widest whitespace-nowrap">Mobile</div>
                                </div>
                            </div>
                        </div>
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

            {activeTab === 'security' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <form onSubmit={handleUpdateAuth} className="bg-[#121214] p-8 md:p-10 rounded-[2.5rem] border border-white/5 space-y-10 shadow-2xl">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h4 className="text-xl font-black italic uppercase text-white mb-2">Segurança & Acesso</h4>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Gerencie suas credenciais de acesso</p>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <div className="bg-white/5 border border-white/10 px-6 py-4 rounded-2xl min-w-[160px] shadow-inner group/info">
                                    <p className="text-[9px] font-black uppercase text-slate-500 mb-1.5 tracking-tighter opacity-70 group-hover/info:text-[#f2b90d] transition-colors">Login Atual</p>
                                    <p className="text-[11px] font-bold text-[#f2b90d] tracking-tight">{currentLoginEmail}</p>
                                </div>
                                <div className="bg-white/5 border border-white/10 px-6 py-4 rounded-2xl min-w-[140px] shadow-inner group/info relative overflow-hidden">
                                    <p className="text-[9px] font-black uppercase text-slate-500 mb-1.5 tracking-tighter opacity-70 group-hover/info:text-[#f2b90d] transition-colors">Senha Atual</p>
                                    <p className={`text-[11px] font-bold text-[#f2b90d] transition-all ${showCurrentPassword ? 'tracking-normal' : 'tracking-[0.3em]'}`}>
                                        {showCurrentPassword ? 'FBP-PROTEGIDA' : '••••••••'}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                        className="absolute right-3 top-3 text-white/20 hover:text-[#f2b90d] transition-colors"
                                        title={showCurrentPassword ? "Ocultar" : "Visualizar (Apenas indicador)"}
                                    >
                                        <span className="material-symbols-outlined text-[14px]">
                                            {showCurrentPassword ? 'visibility_off' : 'visibility'}
                                        </span>
                                    </button>
                                    {showCurrentPassword && (
                                        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 text-center">
                                            <p className="text-[7px] font-black uppercase text-white leading-tight">
                                                Por segurança, sua senha <br />é criptografada.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[#f2b90d] ml-1 opacity-70">Novo E-mail de Login</label>
                                <input
                                    type="email"
                                    value={userEmail}
                                    onChange={e => setUserEmail(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-white outline-none focus:border-[#f2b90d] transition-all"
                                    placeholder="seu@email.com"
                                />
                            </div>

                            <div className="md:col-start-1 space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[#f2b90d] ml-1 opacity-70">Nova Senha</label>
                                <div className="relative">
                                    <input
                                        type={showNewPassword ? "text" : "password"}
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-white outline-none focus:border-[#f2b90d] transition-all"
                                        placeholder="Min. 6 caracteres"
                                        autoComplete="new-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">
                                            {showNewPassword ? 'visibility_off' : 'visibility'}
                                        </span>
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[#f2b90d] ml-1 opacity-70">Confirmar Nova Senha</label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-white outline-none focus:border-[#f2b90d] transition-all"
                                        placeholder="Repita a nova senha"
                                        autoComplete="new-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">
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
                                className="w-full md:w-auto bg-[#f2b90d] text-black px-12 py-4 rounded-2xl font-black text-xs uppercase italic shadow-lg shadow-[#f2b90d]/10 active:scale-95 transition-all disabled:opacity-50"
                            >
                                {isUpdatingAuth ? 'SINCRONIZANDO...' : 'ATUALIZAR ACESSO'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="flex justify-center pt-6 md:pt-10">
                {activeTab !== 'security' && (
                    <button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-white px-10 md:px-16 py-4 md:py-6 rounded-2xl md:rounded-[1.8rem] text-[13px] md:text-[15px] font-black uppercase tracking-widest italic shadow-xl md:shadow-2xl shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 md:gap-4 disabled:opacity-50">
                        <span className="material-symbols-outlined text-[20px] md:text-[24px]">save</span>{isSaving ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}
                    </button>
                )}
            </div>
        </div>
    );
}
