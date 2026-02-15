"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { processImage } from '@/lib/image-processing';
import { maskCurrency, maskNumber } from '@/lib/masks';

import { useProfile } from '@/hooks/useProfile';

export default function ServicesPage() {
    const { profile, loading: profileLoading, theme: colors, businessType } = useProfile();
    const [services, setServices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingService, setEditingService] = useState<any>(null);

    const [newService, setNewService] = useState({
        name: '',
        price: '',
        duration_minutes: '',
        image_url: ''
    });

    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const [tenantId, setTenantId] = useState<string | null>(null);

    useEffect(() => {
        if (profile?.tenant_id) {
            setTenantId(profile.tenant_id);
            fetchServices(profile.tenant_id);
        }
    }, [profile]);

    const fetchServices = async (tid: string) => {
        setLoading(true);
        const { data } = await supabase
            .from('services')
            .select('*')
            .eq('tenant_id', tid)
            .order('name');

        if (data) setServices(data);
        setLoading(false);
    };

    const handleEdit = (service: any) => {
        setEditingService(service);
        setNewService({
            name: service.name,
            price: service.price?.toString().replace('.', ',') || '',
            duration_minutes: service.duration_minutes?.toString() || '',
            image_url: service.image_url || ''
        });
        setImagePreview(service.image_url || null);
        setImageFile(null);
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancel = () => {
        setEditingService(null);
        setNewService({ name: '', price: '', duration_minutes: '', image_url: '' });
        setImageFile(null);
        setImagePreview(null);
        setShowForm(false);
    };

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tenantId) return;

        setIsSaving(true);
        try {
            let finalImageUrl = newService.image_url;

            if (imageFile) {
                const processed = await processImage(imageFile, 400, 400, 0.8);
                const reader = new FileReader();
                reader.readAsDataURL(processed);
                await new Promise(resolve => {
                    reader.onloadend = () => {
                        finalImageUrl = reader.result as string;
                        resolve(null);
                    };
                });
            }

            const payload = {
                tenant_id: tenantId,
                name: newService.name,
                price: parseFloat(newService.price.replace(',', '.')),
                duration_minutes: parseInt(newService.duration_minutes),
                image_url: finalImageUrl,
                active: true
            };

            if (editingService) {
                const { error } = await supabase
                    .from('services')
                    .update(payload)
                    .eq('id', editingService.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('services')
                    .insert([payload]);
                if (error) throw error;
            }

            fetchServices(tenantId);
            handleCancel();
        } catch (err: any) {
            alert('Erro ao salvar: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const toggleStatus = async (id: string, currentStatus: boolean) => {
        const { error } = await supabase
            .from('services')
            .update({ active: !currentStatus })
            .eq('id', id);

        if (!error && profile?.tenant_id) {
            fetchServices(profile.tenant_id);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`Tem certeza que deseja EXCLUIR permanentemente o serviço "${name}"?`)) {
            return;
        }

        const { error } = await supabase
            .from('services')
            .delete()
            .eq('id', id);

        if (!error && tenantId) {
            fetchServices(tenantId);
        } else if (error) {
            alert('Erro ao excluir serviço: ' + error.message);
        }
    };

    if (profileLoading) return null;

    return (
        <div className="space-y-6 md:space-y-10 animate-in fade-in duration-500 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter" style={{ color: colors.text }}>
                        Gestão de <span style={{ color: colors.primary }}>Serviços</span>
                    </h2>
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] mt-1" style={{ color: colors.textMuted }}>
                        Configure seu catálogo de atendimento
                    </p>
                </div>

                <button
                    onClick={() => { if (showForm) handleCancel(); else setShowForm(true); }}
                    className="flex items-center gap-3 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:scale-105 active:scale-95 transition-all shadow-xl"
                    style={{ backgroundColor: colors.primary, color: businessType === 'salon' ? 'white' : 'black', boxShadow: `0 10px 20px -5px ${colors.primary}33` }}
                >
                    <span className="material-symbols-outlined">{showForm ? 'close' : 'add'}</span>
                    {showForm ? 'FECHAR FORMULÁRIO' : 'NOVO SERVIÇO'}
                </button>
            </div>

            {showForm && (
                <div className="border p-8 md:p-12 rounded-[2.5rem] animate-in slide-in-from-top-4 duration-500 shadow-2xl relative"
                    style={{ backgroundColor: colors.cardBg, borderColor: `${colors.primary}33` }}>
                    <h3 className="font-black italic uppercase tracking-tighter mb-8 flex items-center gap-3" style={{ color: colors.text }}>
                        <span className="material-symbols-outlined" style={{ color: colors.primary }}>{editingService ? 'edit_note' : 'add_circle'}</span>
                        {editingService ? `Editando: ${editingService.name}` : 'Cadastrar Novo Serviço'}
                    </h3>
                    <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Image Upload */}
                        <div className="md:col-span-3 flex flex-col items-center gap-4 py-4 border-b mb-4" style={{ borderColor: colors.border }}>
                            <div className="relative group cursor-pointer">
                                <div className="size-32 rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden"
                                    style={{ borderColor: `${colors.primary}4d`, backgroundColor: `${colors.primary}0d` }}>
                                    {imagePreview ? (
                                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="flex flex-col items-center gap-2" style={{ color: `${colors.primary}80` }}>
                                            <span className="material-symbols-outlined text-4xl">add_photo_alternate</span>
                                            <span className="text-[9px] font-black uppercase">Foto do Serviço</span>
                                        </div>
                                    )}
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-[10px] font-black text-white uppercase">Alterar</span>
                                </div>
                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={handleImageChange} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest ml-1" style={{ color: colors.textMuted }}>Nome do Serviço</label>
                            <input
                                required
                                type="text"
                                placeholder="ex: Corte Degradê"
                                className="w-full rounded-2xl p-4 font-bold outline-none transition-all shadow-inner"
                                style={{ backgroundColor: `${colors.text}0d`, border: `1px solid ${colors.border}`, color: colors.text }}
                                value={newService.name}
                                onChange={e => setNewService({ ...newService, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest ml-1" style={{ color: colors.textMuted }}>Preço (R$)</label>
                            <input
                                required
                                type="text"
                                placeholder="0,00"
                                className="w-full rounded-2xl p-4 font-bold outline-none transition-all shadow-inner"
                                style={{ backgroundColor: `${colors.text}0d`, border: `1px solid ${colors.border}`, color: colors.text }}
                                value={newService.price}
                                onChange={e => setNewService({ ...newService, price: maskCurrency(e.target.value) })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest ml-1" style={{ color: colors.textMuted }}>Tempo (minutos)</label>
                            <input
                                required
                                type="text"
                                placeholder="0"
                                className="w-full rounded-2xl p-4 font-bold outline-none transition-all shadow-inner"
                                style={{ backgroundColor: `${colors.text}0d`, border: `1px solid ${colors.border}`, color: colors.text }}
                                value={newService.duration_minutes}
                                onChange={e => setNewService({ ...newService, duration_minutes: maskNumber(e.target.value) })}
                            />
                        </div>
                        <div className="md:col-span-3 pt-4 flex gap-4">
                            <button
                                type="submit"
                                disabled={isSaving}
                                className={`flex-1 ${editingService ? 'bg-amber-500' : 'bg-emerald-500'} text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:opacity-90 transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-lg`}
                            >
                                <span className="material-symbols-outlined">{editingService ? 'sync' : 'save'}</span>
                                {isSaving ? 'SALVANDO COM FOTO...' : editingService ? 'ATUALIZAR SERVIÇO' : 'CADASTRAR SERVIÇO'}
                            </button>
                            {editingService && (
                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    className="px-8 bg-white/5 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all border border-white/5"
                                >
                                    CANCELAR
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            )}

            <div className="border rounded-[3rem] overflow-hidden shadow-2xl" style={{ backgroundColor: colors.cardBg, borderColor: colors.border }}>
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr style={{ backgroundColor: `${colors.text}08` }}>
                                <th className="text-left px-8 py-6 text-[10px] font-black uppercase tracking-widest" style={{ color: colors.textMuted }}>Serviço</th>
                                <th className="text-left px-8 py-6 text-[10px] font-black uppercase tracking-widest" style={{ color: colors.textMuted }}>Preço</th>
                                <th className="text-left px-8 py-6 text-[10px] font-black uppercase tracking-widest" style={{ color: colors.textMuted }}>Duração</th>
                                <th className="text-right px-8 py-6 text-[10px] font-black uppercase tracking-widest" style={{ color: colors.textMuted }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor: colors.border }}>
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="px-8 py-10 text-center font-bold uppercase tracking-widest text-xs" style={{ color: colors.textMuted }}>
                                        Carregando lista...
                                    </td>
                                </tr>
                            ) : services.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-8 py-20 text-center">
                                        <p className="font-bold uppercase tracking-widest text-xs" style={{ color: colors.textMuted }}>Nenhum serviço cadastrado.</p>
                                    </td>
                                </tr>
                            ) : (
                                services.map(service => (
                                    <tr key={service.id} className="group transition-colors" style={{ backgroundColor: 'transparent' }}>
                                        <td className="px-8 py-6 flex items-center gap-4">
                                            <div className="size-10 rounded-lg flex items-center justify-center overflow-hidden shrink-0" style={{ backgroundColor: `${colors.text}0d` }}>
                                                {service.image_url ? (
                                                    <img src={service.image_url} alt={service.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="material-symbols-outlined text-[18px]" style={{ color: colors.textMuted }}>content_cut</span>
                                                )}
                                            </div>
                                            <span className="font-black italic uppercase tracking-tight" style={{ color: colors.text }}>{service.name}</span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="font-black italic" style={{ color: colors.primary }}>R$ {service.price?.toFixed(2).replace('.', ',')}</span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2" style={{ color: colors.textMuted }}>
                                                <span className="material-symbols-outlined text-[16px]">schedule</span>
                                                <span className="font-bold text-xs uppercase tracking-widest">{service.duration_minutes} min</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex items-center justify-end gap-3">
                                                <button
                                                    onClick={() => handleEdit(service)}
                                                    className="size-10 rounded-xl border transition-all flex items-center justify-center group/btn"
                                                    style={{ backgroundColor: `${colors.text}08`, borderColor: colors.border, color: colors.textMuted }}
                                                    title="Editar serviço"
                                                >
                                                    <span className="material-symbols-outlined text-[20px] group-hover/btn:rotate-90 transition-transform duration-500" style={{ color: colors.textMuted }}>settings</span>
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(service.id, service.name)}
                                                    className="size-10 rounded-xl border transition-all flex items-center justify-center group/btn"
                                                    style={{ backgroundColor: `${colors.text}08`, borderColor: colors.border, color: colors.textMuted }}
                                                    title="Excluir serviço"
                                                >
                                                    <span className="material-symbols-outlined text-[20px] group-hover/btn:scale-110 transition-transform">delete</span>
                                                </button>
                                                <button
                                                    onClick={() => toggleStatus(service.id, service.active)}
                                                    className={`px-4 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all border ${service.active ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20 opacity-50'}`}
                                                >
                                                    {service.active ? 'ATIVO' : 'PAUSADO'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="pt-4 text-center">
                <p className="text-[8px] font-black uppercase tracking-[0.5em] italic opacity-20" style={{ color: colors.text }}>Gerenciamento de Ativos • FastBeauty Pro v4.0</p>
            </div>
        </div>
    );
}
