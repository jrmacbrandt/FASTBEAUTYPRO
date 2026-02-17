"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { maskCPF, maskPhone, maskPercent } from '@/lib/masks';
import ImageUpload from '@/components/ui/ImageUpload';

import { Profile, UserStatus } from '@/types';
import { useProfile } from '@/hooks/useProfile';

export default function TeamManagementPage() {
    const { profile: currentUser, businessType: hookBusinessType, theme: colors } = useProfile();
    const businessType = hookBusinessType || 'barber';

    const [barbers, setBarbers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);
    const [editingBarber, setEditingBarber] = useState<Profile | null>(null);

    // Form States
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        cpf: '',
        phone: '',
        service_commission: '' as string | number,
        product_commission: '' as string | number,
        status: UserStatus.ACTIVE
    });
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (editingBarber) {
            setFormData({
                full_name: editingBarber.full_name || '',
                email: editingBarber.email || '',
                cpf: maskCPF(editingBarber.cpf || ''),
                phone: maskPhone(editingBarber.phone || ''),
                service_commission: editingBarber.service_commission?.toString() || '',
                product_commission: editingBarber.product_commission?.toString() || '',
                status: editingBarber.status || UserStatus.ACTIVE
            });
            setAvatarPreview(editingBarber.avatar_url || null);
        } else {
            setFormData({
                full_name: '',
                email: '',
                cpf: '',
                phone: '',
                service_commission: '',
                product_commission: '',
                status: UserStatus.ACTIVE
            });
            setAvatarPreview(null);
        }
        setAvatarFile(null);
    }, [editingBarber, isRegistrationModalOpen]);

    const fetchTeam = async (tid: string) => {
        setLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('tenant_id', tid)
            .neq('role', 'owner')
            .order('created_at', { ascending: false });

        if (!error && data) {
            setBarbers(data);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (currentUser?.tenant_id) {
            fetchTeam(currentUser.tenant_id);
        }
    }, [currentUser]);

    const handleImageSelect = (file: File, preview: string) => {
        setAvatarFile(file);
        setAvatarPreview(preview);
    };

    const handleAction = async (id: string, action: 'suspend' | 'delete') => {
        const previousBarbers = [...barbers];
        if (action === 'delete') {
            if (!confirm('Deseja excluir DEFINITIVAMENTE este profissional? Esta ação não pode ser desfeita.')) return;
            setBarbers(prev => prev.filter(b => b.id !== id));
            try {
                const { error } = await supabase.from('profiles').delete().eq('id', id);
                if (error) throw error;
                if (currentUser?.tenant_id) fetchTeam(currentUser.tenant_id);
            } catch (error: any) {
                setBarbers(previousBarbers);
                alert('Erro ao excluir: ' + error.message);
            }
            return;
        }

        const currentBarber = barbers.find(b => b.id === id);
        if (!currentBarber) return;

        const newStatus = currentBarber.status === UserStatus.ACTIVE ? UserStatus.SUSPENDED : UserStatus.ACTIVE;
        setBarbers(prev => prev.map(b => b.id === id ? { ...b, status: newStatus } : b));

        const { error } = await supabase.from('profiles').update({ status: newStatus }).eq('id', id);

        if (error) {
            setBarbers(previousBarbers);
            alert('Erro ao atualizar status: ' + error.message);
        }
    };

    const handleSave = async () => {
        if (!formData.full_name) return alert('Nome é obrigatório');
        if (!formData.email) return alert('Email é obrigatório');

        setUploading(true);

        try {
            let avatarUrl = editingBarber?.avatar_url;

            if (avatarFile) {
                const fileName = `avatar-${Date.now()}-${Math.random().toString(36).substring(7)}.webp`;
                const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, avatarFile, { cacheControl: '3600', upsert: false });
                if (uploadError) throw uploadError;
                const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
                avatarUrl = publicUrl;
            }

            const profileData = {
                full_name: formData.full_name,
                email: formData.email,
                cpf: formData.cpf.replace(/\D/g, ''),
                phone: formData.phone.replace(/\D/g, ''),
                service_commission: Number(formData.service_commission || 0),
                product_commission: Number(formData.product_commission || 0),
                status: formData.status,
                avatar_url: avatarUrl,
                tenant_id: currentUser?.tenant_id,
                role: 'barber'
            };

            if (editingBarber) {
                const { error } = await supabase.from('profiles').update(profileData).eq('id', editingBarber.id);
                if (error) throw error;
            } else {
                alert("A criação de novos usuários com login requer acesso ao servidor de autenticação. Por favor, use a função de convite.");
                setUploading(false);
                return;
            }

            if (currentUser?.tenant_id) fetchTeam(currentUser.tenant_id);
            setIsRegistrationModalOpen(false);
            setEditingBarber(null);
        } catch (error: any) {
            console.error('Erro ao salvar:', error);
            alert('Erro ao salvar: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-8 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-xl font-black italic uppercase tracking-tighter" style={{ color: colors.text }}>Gestão de Equipe</h1>
                    <p className="text-xs font-bold uppercase tracking-widest" style={{ color: colors.textMuted }}>Gerencie seus profissionais ativos</p>
                </div>
                <button
                    onClick={() => { setEditingBarber(null); setIsRegistrationModalOpen(true); }}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all hover:scale-105 active:scale-95"
                    style={{ backgroundColor: colors.primary, color: businessType === 'salon' ? 'white' : 'black', boxShadow: `0 10px 15px -3px ${colors.primary}33` }}
                >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    Novo Profissional
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {loading ? (
                    <div className="text-center py-20 opacity-40">
                        <span className="material-symbols-outlined text-4xl animate-spin" style={{ color: colors.primary }}>progress_activity</span>
                    </div>
                ) : barbers.length > 0 ? (
                    barbers.map(barber => (
                        <div key={barber.id} className="border p-4 md:p-6 rounded-3xl md:rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6 group transition-all"
                            style={{ backgroundColor: colors.cardBg, borderColor: colors.border }}
                        >
                            <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto">
                                <div className="size-12 md:size-16 rounded-xl md:rounded-2xl flex items-center justify-center border shadow-inner shrink-0 overflow-hidden"
                                    style={{ backgroundColor: `${colors.primary}1a`, color: colors.primary, borderColor: `${colors.primary}20` }}
                                >
                                    {barber.avatar_url ? (
                                        <img src={barber.avatar_url} alt={barber.full_name} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="material-symbols-outlined text-2xl md:text-4xl">person</span>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <h4 className="font-bold text-base md:text-lg truncate" style={{ color: colors.text }}>{barber.full_name}</h4>
                                    <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest truncate" style={{ color: colors.textMuted }}>{barber.email}</p>
                                    <span className={`mt-2 inline-block text-[8px] md:text-[9px] font-black uppercase px-2 md:px-3 py-1 rounded-full border ${barber.status === UserStatus.ACTIVE ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                                        {barber.status}
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-col md:items-end gap-1 md:gap-2 w-full md:w-auto">
                                <div className="flex gap-4 mb-2">
                                    <div className="text-right">
                                        <p className="text-[8px] uppercase font-black" style={{ color: colors.textMuted }}>Serviços</p>
                                        <p className="text-lg font-black" style={{ color: colors.primary }}>{barber.service_commission}%</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[8px] uppercase font-black" style={{ color: colors.textMuted }}>Produtos</p>
                                        <p className="text-lg font-black text-emerald-500">{barber.product_commission || 0}%</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 w-full md:w-auto">
                                    <button onClick={() => setEditingBarber(barber)} className="flex-1 md:flex-none p-2 transition-colors rounded-xl" style={{ backgroundColor: `${colors.text}0d`, color: colors.textMuted }}>
                                        <span className="material-symbols-outlined text-[20px]">edit</span>
                                    </button>
                                    <button onClick={() => handleAction(barber.id, 'suspend')} className={`flex-[2] md:flex-none px-4 py-2 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest ${barber.status === UserStatus.ACTIVE ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                        {barber.status === UserStatus.ACTIVE ? 'SUSPENDER' : 'REATIVAR'}
                                    </button>
                                    <button onClick={() => handleAction(barber.id, 'delete')} className="flex-1 md:flex-none p-2 transition-colors rounded-xl" style={{ backgroundColor: `${colors.text}0d`, color: colors.textMuted }}>
                                        <span className="material-symbols-outlined text-[20px]">delete</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-20 opacity-40">
                        <span className="material-symbols-outlined text-6xl mb-4 italic" style={{ color: colors.textMuted }}>groups</span>
                        <p className="font-black uppercase text-xs tracking-[0.4em]" style={{ color: colors.textMuted }}>Nenhum profissional cadastrado</p>
                    </div>
                )}
            </div>

            {/* Modal de Edição/Criação Simplificado */}
            {(isRegistrationModalOpen || editingBarber) && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="w-full max-w-2xl rounded-[2.5rem] border shadow-2xl overflow-y-auto max-h-[90vh] animate-in zoom-in-95 duration-300"
                        style={{ backgroundColor: colors.cardBg, borderColor: colors.border }}
                    >
                        <div className="p-8 border-b flex justify-between items-center sticky top-0 z-10" style={{ backgroundColor: colors.cardBg, borderColor: `${colors.text}0d` }}>
                            <h3 className="text-xl font-black italic uppercase tracking-tight" style={{ color: colors.text }}>
                                {editingBarber ? 'Editar Profissional' : 'Novo Profissional'}
                            </h3>
                            <button onClick={() => { setIsRegistrationModalOpen(false); setEditingBarber(null); }} className="size-10 flex items-center justify-center rounded-full transition-all" style={{ backgroundColor: `${colors.text}0d`, color: colors.textMuted }}>
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            {/* Avatar Config */}
                            <ImageUpload
                                currentImage={avatarPreview}
                                onImageSelect={handleImageSelect}
                                helperText="Foto de Perfil"
                                bucket="avatars"
                                className="w-full max-w-[200px] mx-auto"
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest italic ml-2" style={{ color: colors.textMuted }}>Nome Completo</label>
                                    <input type="text" className="w-full border rounded-2xl p-4 font-bold outline-none text-xs transition-all" style={{ backgroundColor: `${colors.bg}40`, borderColor: colors.border, color: colors.text }} value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} placeholder="Ex: João da Silva" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest italic ml-2" style={{ color: colors.textMuted }}>Email (Acesso)</label>
                                    <input type="email" className="w-full border rounded-2xl p-4 font-bold outline-none text-xs transition-all" style={{ backgroundColor: `${colors.bg}40`, borderColor: colors.border, color: colors.text }} value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="joao@exemplo.com" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest italic ml-2" style={{ color: colors.textMuted }}>CPF</label>
                                    <input type="text" className="w-full border rounded-2xl p-4 font-bold outline-none text-xs transition-all" style={{ backgroundColor: `${colors.bg}40`, borderColor: colors.border, color: colors.text }} value={formData.cpf} onChange={(e) => setFormData({ ...formData, cpf: maskCPF(e.target.value) })} maxLength={14} placeholder="000.000.000-00" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest italic ml-2" style={{ color: colors.textMuted }}>WhatsApp</label>
                                    <input type="tel" className="w-full border rounded-2xl p-4 font-bold outline-none text-xs transition-all" style={{ backgroundColor: `${colors.bg}40`, borderColor: colors.border, color: colors.text }} value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: maskPhone(e.target.value) })} maxLength={15} placeholder="(00) 00000-0000" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6 pt-4 border-t" style={{ borderColor: `${colors.text}0d` }}>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest italic ml-2" style={{ color: colors.textMuted }}>Comissão Serviços (%)</label>
                                    <input type="text" className="w-full border rounded-2xl p-4 font-bold outline-none text-xs transition-all" style={{ backgroundColor: `${colors.bg}40`, borderColor: colors.border, color: colors.text }} value={formData.service_commission} onChange={(e) => setFormData({ ...formData, service_commission: maskPercent(e.target.value) })} placeholder="0" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest italic ml-2" style={{ color: colors.textMuted }}>Comissão Produtos (%)</label>
                                    <input type="text" className="w-full border rounded-2xl p-4 font-bold outline-none text-xs transition-all" style={{ backgroundColor: `${colors.bg}40`, borderColor: colors.border, color: colors.text }} value={formData.product_commission} onChange={(e) => setFormData({ ...formData, product_commission: maskPercent(e.target.value) })} placeholder="0" />
                                </div>
                            </div>

                            <button onClick={handleSave} disabled={uploading} className="w-full font-black py-5 rounded-2xl text-xs uppercase tracking-widest italic shadow-xl transition-all disabled:opacity-50"
                                style={{ backgroundColor: colors.primary, color: businessType === 'salon' ? 'white' : 'black', boxShadow: `0 10px 20px -5px ${colors.primary}66` }}
                            >
                                {uploading ? 'SALVANDO COM MÍDIA...' : (editingBarber ? 'SALVAR ALTERAÇÕES' : 'CONFIRMAR CADASTRO')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
