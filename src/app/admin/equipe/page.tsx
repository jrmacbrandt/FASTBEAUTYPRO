"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { processImage } from '@/lib/image-processing';
import { maskCPF, maskPhone, maskPercent } from '@/lib/masks';

import { Profile, UserStatus } from '@/types';
import { useProfile } from '@/hooks/useProfile';

export default function TeamManagementPage() {
    const [barbers, setBarbers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'team' | 'pending'>('team');
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

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            if (params.get('tab') === 'pending') {
                setActiveTab('pending');
            }
        }
    }, []);

    const { profile: currentUser, loading: profileLoading } = useProfile();

    const fetchTeam = async (tid: string) => {
        setLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('tenant_id', tid);

        if (!error && data) {
            setBarbers(data.filter((p: any) => p.role !== 'owner'));
        }
        setLoading(false);
    };

    useEffect(() => {
        if (currentUser?.tenant_id) {
            fetchTeam(currentUser.tenant_id);
        }
    }, [currentUser]);

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                // Audit: Verify and process image (Resize + WebP)
                const processedBlob = await processImage(file, 400, 400, 0.8);
                const processedFile = new File([processedBlob], 'avatar.webp', { type: 'image/webp' });

                setAvatarFile(processedFile);
                setAvatarPreview(URL.createObjectURL(processedBlob));
            } catch (error) {
                console.error('Erro ao processar imagem:', error);
                alert('Erro ao processar a imagem. Tente novamente.');
            }
        }
    };

    const handleAction = async (id: string, action: 'approve' | 'suspend' | 'delete') => {
        const previousBarbers = [...barbers];
        const currentBarber = barbers.find(b => b.id === id);
        if (!currentBarber) return;

        if (action === 'delete') {
            if (!confirm('Deseja excluir DEFINITIVAMENTE este profissional? Esta ação não pode ser desfeita.')) return;

            setBarbers(prev => prev.filter(b => b.id !== id));

            try {
                const { data: { session } } = await supabase.auth.getSession();
                const response = await fetch('/api/admin/delete-professional', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session?.access_token}`
                    },
                    body: JSON.stringify({ professionalId: id })
                });

                const result = await response.json();
                if (!response.ok) throw new Error(result.error);

                if (currentUser?.tenant_id) fetchTeam(currentUser.tenant_id);
                window.dispatchEvent(new Event('professional-approved'));
                window.dispatchEvent(new Event('team-updated'));
            } catch (error: any) {
                setBarbers(previousBarbers);
                alert('Erro ao excluir: ' + error.message);
            }
            return;
        }

        const newStatus = action === 'approve' ? UserStatus.ACTIVE : (currentBarber.status === UserStatus.ACTIVE ? UserStatus.SUSPENDED : UserStatus.ACTIVE);

        // Apply optimistic update locally
        setBarbers(prev => prev.map(b => b.id === id ? { ...b, status: newStatus } : b));

        const { error } = await supabase
            .from('profiles')
            .update({ status: newStatus })
            .eq('id', id);

        if (error) {
            // Revert on error
            setBarbers(previousBarbers);
            alert('Erro ao atualizar status: ' + error.message);
        } else {
            // Dispatch event for sidebar/dashboard update
            window.dispatchEvent(new Event('professional-approved'));
            window.dispatchEvent(new Event('team-updated'));
        }
    };

    const handleSave = async () => {
        if (!formData.full_name) return alert('Nome é obrigatório');
        if (!formData.email) return alert('Email é obrigatório');

        setUploading(true);

        try {
            let avatarUrl = editingBarber?.avatar_url;

            // Audit: Upload to Storage (not DB)
            if (avatarFile) {
                const fileName = `avatar-${Date.now()}-${Math.random().toString(36).substring(7)}.webp`;
                const { error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(fileName, avatarFile, {
                        cacheControl: '3600',
                        upsert: false
                    });

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('avatars')
                    .getPublicUrl(fileName);

                avatarUrl = publicUrl;
            }

            if (editingBarber) {
                const { error } = await supabase
                    .from('profiles')
                    .update({
                        full_name: formData.full_name,
                        email: formData.email, // Updating email generally requires auth update too, but keeping in profile for display/contact
                        cpf: formData.cpf.replace(/\D/g, ''),
                        phone: formData.phone.replace(/\D/g, ''),
                        service_commission: Number(formData.service_commission || 0),
                        product_commission: Number(formData.product_commission || 0),
                        status: formData.status,
                        avatar_url: avatarUrl
                    })
                    .eq('id', editingBarber.id);

                if (error) throw error;

                if (currentUser?.tenant_id) fetchTeam(currentUser.tenant_id);
                window.dispatchEvent(new Event('team-updated'));
            } else {
                // Only allow edits or approvals here as per previous logic, but if opened for new:
                alert('Para novos profissionais, solicite que realizem o cadastro pelo link da loja ou aguarde a aprovação.');
                setIsRegistrationModalOpen(false);
            }
        } catch (error: any) {
            console.error('Erro ao salvar:', error);
            alert('Erro ao salvar: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const pendingCount = barbers.filter(b => b.status === UserStatus.PENDING).length;
    const filteredBarbers = barbers.filter(b => activeTab === 'team' ? b.status !== UserStatus.PENDING : b.status === UserStatus.PENDING);

    return (
        <div className="space-y-8 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex p-1.5 rounded-2xl bg-black/50 border border-white/5">
                    <button
                        onClick={() => setActiveTab('team')}
                        className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all italic ${activeTab === 'team' ? 'bg-[#f2b90d] text-black shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        ATIVOS
                    </button>
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all italic flex items-center gap-2 ${activeTab === 'pending' ? 'bg-[#f2b90d] text-black shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        SOLICITAÇÕES {pendingCount > 0 && <span className="bg-red-500 text-white size-5 flex items-center justify-center rounded-full text-[9px] font-bold">{pendingCount}</span>}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {loading ? (
                    <div className="text-center py-20 opacity-40">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#f2b90d] mx-auto mb-4"></div>
                        <p className="font-black uppercase text-xs tracking-[0.4em]">Carregando equipe...</p>
                    </div>
                ) : filteredBarbers.length > 0 ? (
                    filteredBarbers.map(barber => (
                        <div key={barber.id} className="bg-[#121214] border border-white/5 p-4 md:p-6 rounded-3xl md:rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6 group hover:border-[#f2b90d]/20 transition-all">
                            <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto">
                                <div className="size-12 md:size-16 rounded-xl md:rounded-2xl bg-[#f2b90d]/10 flex items-center justify-center text-[#f2b90d] border border-[#f2b90d]/20 shadow-inner shrink-0 overflow-hidden relative">
                                    {barber.avatar_url ? (
                                        <img src={barber.avatar_url} alt={barber.full_name} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="material-symbols-outlined text-2xl md:text-4xl">person_pin</span>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <h4 className="font-bold text-base md:text-lg text-white truncate">{barber.full_name}</h4>
                                    <p className="text-slate-500 text-[8px] md:text-[10px] font-black uppercase tracking-widest truncate">{barber.email || 'Email não disponível'}</p>
                                    <div className="flex gap-2 mt-2">
                                        <span className="bg-white/5 text-slate-400 text-[8px] md:text-[9px] font-black uppercase px-2 md:px-3 py-1 rounded-full border border-white/5">
                                            {barber.role}
                                        </span>
                                        <span className={`text-[8px] md:text-[9px] font-black uppercase px-2 md:px-3 py-1 rounded-full border ${barber.status === UserStatus.ACTIVE ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                            'bg-red-500/10 text-red-500 border-red-500/20'
                                            }`}>
                                            {barber.status}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col md:items-end gap-1 md:gap-2 w-full md:w-auto">
                                <div className="flex md:flex-col gap-4 md:gap-2 justify-end items-end mb-2 w-full md:w-auto">
                                    <div className="flex flex-col items-end">
                                        <p className="text-slate-500 text-[8px] font-black uppercase tracking-[0.2em] italic mb-0.5">Serviços</p>
                                        <p className="text-[#f2b90d] text-xl md:text-2xl font-black italic tracking-tighter leading-none">{barber.service_commission}%</p>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <p className="text-slate-500 text-[8px] font-black uppercase tracking-[0.2em] italic mb-0.5">Produtos</p>
                                        <p className="text-emerald-500 text-xl md:text-2xl font-black italic tracking-tighter leading-none">{barber.product_commission || 0}%</p>
                                    </div>
                                </div>
                                <div className="flex gap-2 w-full md:w-auto">
                                    {barber.status === UserStatus.PENDING ? (
                                        <>
                                            <button onClick={() => handleAction(barber.id, 'approve')} className="flex-1 md:flex-none bg-emerald-500 text-white px-4 md:px-6 py-2 rounded-xl text-[9px] md:text-[10px] font-black uppercase shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">APROVAR</button>
                                            <button onClick={() => handleAction(barber.id, 'delete')} className="flex-1 md:md:flex-none bg-red-500/10 text-red-500 px-4 md:px-6 py-2 rounded-xl text-[9px] md:text-[10px] font-black uppercase active:scale-95 transition-all">REJEITAR</button>
                                        </>
                                    ) : (
                                        <div className="flex items-center gap-2 w-full md:w-auto">
                                            <button
                                                onClick={() => setEditingBarber(barber)}
                                                className="flex-1 md:flex-none p-2 text-slate-400 hover:text-[#f2b90d] transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-[20px]">edit</span>
                                            </button>
                                            <button onClick={() => handleAction(barber.id, 'suspend')} className={`flex-[2] md:flex-none px-4 py-2 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest ${barber.status === UserStatus.ACTIVE ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'} active:scale-95 transition-all`}>
                                                {barber.status === UserStatus.ACTIVE ? 'SUSPENDER' : 'REATIVAR'}
                                            </button>
                                            <button onClick={() => handleAction(barber.id, 'delete')} className="flex-1 md:flex-none p-2 text-slate-400 hover:text-red-500 transition-colors"><span className="material-symbols-outlined text-[20px]">delete</span></button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-20 opacity-40">
                        <span className="material-symbols-outlined text-6xl mb-4 italic">groups</span>
                        <p className="font-black uppercase text-xs tracking-[0.4em]">Nenhum registro encontrado</p>
                    </div>
                )}
            </div>

            {/* Modal de Edição */}
            {(isRegistrationModalOpen || editingBarber) && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-[#121214] w-full max-w-2xl rounded-[2.5rem] border border-white/5 shadow-2xl overflow-y-auto max-h-[90vh] animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-white/5 flex justify-between items-center sticky top-0 bg-[#121214] z-10">
                            <h3 className="text-xl text-white font-black italic uppercase italic tracking-tight">
                                {editingBarber ? 'Editar Profissional' : 'Novo Profissional'}
                            </h3>
                            <button onClick={() => { setIsRegistrationModalOpen(false); setEditingBarber(null); }} className="size-10 flex items-center justify-center rounded-full hover:bg-white/5 text-slate-400">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            {/* Avatar Config */}
                            <div className="flex flex-col items-center gap-4 py-4">
                                <div className="relative group cursor-pointer">
                                    <div className="size-24 rounded-full border-2 border-dashed border-[#f2b90d]/30 flex items-center justify-center overflow-hidden bg-[#f2b90d]/5">
                                        {avatarPreview ? (
                                            <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="material-symbols-outlined text-[#f2b90d] text-4xl">add_a_photo</span>
                                        )}
                                    </div>
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-[10px] font-black text-white uppercase">Alterar</span>
                                    </div>
                                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={handleImageChange} />
                                </div>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Foto de Perfil</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest italic ml-2">Nome Completo</label>
                                    <input
                                        type="text"
                                        className="w-full bg-black border border-white/5 rounded-2xl p-4 font-bold text-white outline-none focus:border-[#f2b90d]/50 text-xs"
                                        value={formData.full_name}
                                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                        placeholder="Ex: João da Silva"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest italic ml-2">Email (Acesso)</label>
                                    <input
                                        type="email"
                                        className="w-full bg-black border border-white/5 rounded-2xl p-4 font-bold text-white outline-none focus:border-[#f2b90d]/50 text-xs"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="joao@exemplo.com"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest italic ml-2">CPF</label>
                                    <input
                                        type="text"
                                        className="w-full bg-black border border-white/5 rounded-2xl p-4 font-bold text-white outline-none focus:border-[#f2b90d]/50 text-xs placeholder:text-white/20"
                                        value={formData.cpf}
                                        onChange={(e) => setFormData({ ...formData, cpf: maskCPF(e.target.value) })}
                                        maxLength={14}
                                        placeholder="000.000.000-00"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest italic ml-2">WhatsApp</label>
                                    <input
                                        type="tel"
                                        className="w-full bg-black border border-white/5 rounded-2xl p-4 font-bold text-white outline-none focus:border-[#f2b90d]/50 text-xs placeholder:text-white/20"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: maskPhone(e.target.value) })}
                                        maxLength={15}
                                        placeholder="(00) 00000-0000"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6 pt-4 border-t border-white/5">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest italic ml-2">Comissão Serviços (%)</label>
                                    <input
                                        type="text"
                                        className="w-full bg-black border border-white/5 rounded-2xl p-4 font-bold text-white outline-none focus:border-[#f2b90d]/50 text-xs placeholder:text-white/20"
                                        value={formData.service_commission}
                                        onChange={(e) => setFormData({ ...formData, service_commission: maskPercent(e.target.value) })}
                                        placeholder="0"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest italic ml-2">Comissão Produtos (%)</label>
                                    <input
                                        type="text"
                                        className="w-full bg-black border border-white/5 rounded-2xl p-4 font-bold text-white outline-none focus:border-[#f2b90d]/50 text-xs placeholder:text-white/20"
                                        value={formData.product_commission}
                                        onChange={(e) => setFormData({ ...formData, product_commission: maskPercent(e.target.value) })}
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleSave}
                                disabled={uploading}
                                className="w-full bg-[#f2b90d] text-black font-black py-5 rounded-2xl text-xs uppercase tracking-widest italic shadow-xl shadow-[#f2b90d]/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
