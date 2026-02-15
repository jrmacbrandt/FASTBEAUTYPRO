"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { processImage } from '@/lib/image-processing';
import { maskCurrency, maskNumber } from '@/lib/masks';

export const dynamic = 'force-dynamic';

export default function ServicesPage() {
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
        const loadInitialData = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const { data: profile } = await supabase
                .from('profiles')
                .select('tenant_id')
                .eq('id', session.user.id)
                .single();

            if (profile?.tenant_id) {
                setTenantId(profile.tenant_id);
                fetchServices(profile.tenant_id);
            }
        };

        loadInitialData();
    }, []);

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
            price: service.price.toString().replace('.', ','),
            duration_minutes: service.duration_minutes.toString(),
            image_url: service.image_url || ''
        });
        setImagePreview(service.image_url || null);
        setImageFile(null);
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancel = () => {
        setShowForm(false);
        setEditingService(null);
        setNewService({ name: '', price: '', duration_minutes: '', image_url: '' });
        setImageFile(null);
        setImagePreview(null);
    };

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                // Resize to 400x400 and convert to WebP
                const processedBlob = await processImage(file, 400, 400, 0.8);
                const processedFile = new File([processedBlob], 'service.webp', { type: 'image/webp' });

                setImageFile(processedFile);
                setImagePreview(URL.createObjectURL(processedBlob));
            } catch (error) {
                console.error('Error processing image:', error);
                alert('Erro ao processar imagem. Tente novamente.');
            }
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tenantId) return;

        setIsSaving(true);
        let imageUrl = editingService?.image_url || '';

        try {
            if (imageFile) {
                const fileName = `service-${Date.now()}-${Math.random().toString(36).substring(7)}.webp`;
                const { error: uploadError } = await supabase.storage
                    .from('services')
                    .upload(fileName, imageFile, {
                        cacheControl: '3600',
                        upsert: false
                    });

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('services')
                    .getPublicUrl(fileName);

                imageUrl = publicUrl;
            }

            const serviceData = {
                tenant_id: tenantId,
                name: newService.name,
                price: parseFloat(newService.price.replace(',', '.')),
                duration_minutes: parseInt(newService.duration_minutes || '0'),
                active: true,
                image_url: imageUrl
            };

            let result;
            if (editingService) {
                result = await supabase
                    .from('services')
                    .update(serviceData)
                    .eq('id', editingService.id);
            } else {
                result = await supabase
                    .from('services')
                    .insert(serviceData);
            }

            if (!result.error) {
                handleCancel();
                fetchServices(tenantId);
            } else {
                throw result.error;
            }
        } catch (error: any) {
            alert('Erro ao salvar serviço: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const toggleStatus = async (id: string, currentStatus: boolean) => {
        const { error } = await supabase
            .from('services')
            .update({ active: !currentStatus })
            .eq('id', id);

        if (!error && tenantId) {
            fetchServices(tenantId);
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

    return (
        <div className="space-y-6 md:space-y-10 animate-in fade-in duration-500 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter text-white">
                        Gestão de <span className="text-[#f2b90d]">Serviços</span>
                    </h2>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-1">
                        Configure seu catálogo de atendimento
                    </p>
                </div>

                <button
                    onClick={() => { if (showForm) handleCancel(); else setShowForm(true); }}
                    className="flex items-center gap-3 bg-[#f2b90d] text-black px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:scale-105 active:scale-95 transition-all shadow-xl shadow-[#f2b90d]/20"
                >
                    <span className="material-symbols-outlined">{showForm ? 'close' : 'add'}</span>
                    {showForm ? 'FECHAR FORMULÁRIO' : 'NOVO SERVIÇO'}
                </button>
            </div>

            {showForm && (
                <div className="bg-[#121214] border border-[#f2b90d]/20 p-8 md:p-12 rounded-[2.5rem] animate-in slide-in-from-top-4 duration-500 shadow-2xl relative">
                    <h3 className="text-white font-black italic uppercase tracking-tighter mb-8 flex items-center gap-3">
                        <span className="material-symbols-outlined text-[#f2b90d]">{editingService ? 'edit_note' : 'add_circle'}</span>
                        {editingService ? `Editando: ${editingService.name}` : 'Cadastrar Novo Serviço'}
                    </h3>
                    <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Image Upload */}
                        <div className="md:col-span-3 flex flex-col items-center gap-4 py-4 border-b border-white/5 mb-4">
                            <div className="relative group cursor-pointer">
                                <div className="size-32 rounded-2xl border-2 border-dashed border-[#f2b90d]/30 flex items-center justify-center overflow-hidden bg-[#f2b90d]/5">
                                    {imagePreview ? (
                                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="flex flex-col items-center gap-2 text-[#f2b90d]/50">
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
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Nome do Serviço</label>
                            <input
                                required
                                type="text"
                                placeholder="ex: Corte Degradê"
                                className="w-full bg-black border border-white/5 rounded-2xl p-4 font-bold text-white focus:border-[#f2b90d]/50 outline-none transition-all shadow-inner"
                                value={newService.name}
                                onChange={e => setNewService({ ...newService, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Preço (R$)</label>
                            <input
                                required
                                type="text"
                                placeholder="0,00"
                                className="w-full bg-black border border-white/5 rounded-2xl p-4 font-bold text-white focus:border-[#f2b90d]/50 outline-none transition-all shadow-inner placeholder:text-white/20"
                                value={newService.price}
                                onChange={e => setNewService({ ...newService, price: maskCurrency(e.target.value) })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Tempo (minutos)</label>
                            <input
                                required
                                type="text"
                                placeholder="0"
                                className="w-full bg-black border border-white/5 rounded-2xl p-4 font-bold text-white focus:border-[#f2b90d]/50 outline-none transition-all shadow-inner placeholder:text-white/20"
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

            <div className="bg-[#121214] border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-white/5">
                                <th className="text-left px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Serviço</th>
                                <th className="text-left px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Preço</th>
                                <th className="text-left px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Duração</th>
                                <th className="text-right px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="px-8 py-10 text-center text-slate-500 font-bold uppercase tracking-widest text-xs">
                                        Carregando lista...
                                    </td>
                                </tr>
                            ) : services.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-8 py-20 text-center">
                                        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Nenhum serviço cadastrado.</p>
                                    </td>
                                </tr>
                            ) : (
                                services.map(service => (
                                    <tr key={service.id} className="group hover:bg-white/[0.02] transition-colors">
                                        <td className="px-8 py-6 flex items-center gap-4">
                                            <div className="size-10 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden shrink-0">
                                                {service.image_url ? (
                                                    <img src={service.image_url} alt={service.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="material-symbols-outlined text-slate-600 text-[18px]">content_cut</span>
                                                )}
                                            </div>
                                            <span className="text-white font-black italic uppercase tracking-tight">{service.name}</span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="text-[#f2b90d] font-black italic">R$ {service.price?.toFixed(2).replace('.', ',')}</span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2 text-slate-400">
                                                <span className="material-symbols-outlined text-[16px]">schedule</span>
                                                <span className="font-bold text-xs uppercase tracking-widest">{service.duration_minutes} min</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex items-center justify-end gap-3">
                                                <button
                                                    onClick={() => handleEdit(service)}
                                                    className="size-10 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-[#f2b90d] hover:border-[#f2b90d]/30 transition-all flex items-center justify-center group/btn"
                                                    title="Editar serviço"
                                                >
                                                    <span className="material-symbols-outlined text-[20px] group-hover/btn:rotate-90 transition-transform duration-500">settings</span>
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(service.id, service.name)}
                                                    className="size-10 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-red-500 hover:border-red-500/30 transition-all flex items-center justify-center group/btn"
                                                    title="Excluir serviço"
                                                >
                                                    <span className="material-symbols-outlined text-[20px] group-hover/btn:scale-110 transition-transform">delete</span>
                                                </button>
                                                <button
                                                    onClick={() => toggleStatus(service.id, service.active)}
                                                    className={`px-4 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all ${service.active ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20 opacity-50'}`}
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
                <p className="text-[8px] font-black uppercase tracking-[0.5em] text-white/10 italic">Gerenciamento de Ativos • FastBeauty Pro v4.0</p>
            </div>
        </div>
    );
}
