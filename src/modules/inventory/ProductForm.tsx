"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { maskCurrency, maskNumber } from '@/lib/masks';

interface ProductFormProps {
    onClose: () => void;
    productToEdit?: any;
    mode: 'sale' | 'supply';
}

export default function ProductForm({ onClose, productToEdit, mode }: ProductFormProps) {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        barcode: '',
        cost_price: '',
        sale_price: '',
        current_stock: '',
        min_threshold: '',
        unit_type: 'un'
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (productToEdit) {
            setFormData({
                name: productToEdit.name,
                description: productToEdit.description || '',
                barcode: productToEdit.barcode || '',
                cost_price: productToEdit.cost_price?.toFixed(2).replace('.', ',') || '',
                sale_price: productToEdit.sale_price?.toFixed(2).replace('.', ',') || '',
                current_stock: productToEdit.current_stock?.toString() || '',
                min_threshold: productToEdit.min_threshold?.toString() || '',
                unit_type: productToEdit.unit_type
            });
        }
    }, [productToEdit]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const user = (await supabase.auth.getUser()).data.user;
            if (!user) throw new Error('Not authenticated');

            // Get Tenant ID (Assuming standard profile setup)
            const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single();
            if (!profile?.tenant_id) throw new Error('No tenant found');

            const isSupply = mode === 'supply';
            const table = isSupply ? 'supplies' : 'products';

            const payload = {
                tenant_id: profile.tenant_id,
                name: formData.name,
                description: formData.description,
                barcode: formData.barcode,
                cost_price: parseFloat(formData.cost_price.replace(',', '.')),
                ...(isSupply ? {} : { sale_price: parseFloat(formData.sale_price.replace(',', '.')) }),
                min_threshold: parseInt(formData.min_threshold || '0'),
                unit_type: formData.unit_type,
                ...(productToEdit ? {} : { current_stock: parseInt(formData.current_stock || '0') })
            };

            let error;
            let productId;

            if (productToEdit) {
                // Auditoria de Acerto de Estoque: Se a quantidade mudou, registramos a movimentação
                const oldStock = parseInt(productToEdit.current_stock?.toString() || '0');
                const newStock = parseInt(formData.current_stock || '0');

                if (oldStock !== newStock) {
                    const diff = newStock - oldStock;
                    await supabase.from('stock_transactions').insert({
                        tenant_id: profile.tenant_id,
                        product_id: productToEdit.id,
                        type: diff > 0 ? 'IN' : 'OUT',
                        quantity: Math.abs(diff),
                        reason: `Acerto manual via Admin (De ${oldStock} para ${newStock})`,
                        created_by: user.id
                    });
                }

                const { error: updateError } = await supabase
                    .from(table)
                    .update(payload)
                    .eq('id', productToEdit.id);
                error = updateError;
                productId = productToEdit.id;
            } else {
                const { data: newProd, error: insertError } = await supabase
                    .from(table)
                    .insert(payload)
                    .select()
                    .single();
                error = insertError;
                productId = newProd?.id;

                // Initial Stock Transaction for Audit
                if (!error && parseInt(formData.current_stock || '0') > 0 && productId) {
                    await supabase.from('stock_transactions').insert({
                        tenant_id: profile.tenant_id,
                        product_id: productId,
                        type: 'IN',
                        quantity: parseInt(formData.current_stock || '0'),
                        reason: 'Estoque Inicial',
                        created_by: user.id
                    });
                }
            }

            if (error) throw error;
            onClose();
        } catch (err: any) {
            alert('Erro ao salvar: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center bg-black/80 backdrop-blur-sm overflow-y-auto pt-10 md:pt-20 pb-24 px-4">
            <div className="bg-[#18181b] border border-white/10 w-full max-w-2xl rounded-[2.5rem] shadow-2xl relative animate-in zoom-in-95 duration-300">
                <div className="p-8 md:p-10">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-2xl font-black italic uppercase text-white tracking-tighter">
                            {productToEdit ? 'Editar' : 'Novo'} {mode === 'supply' ? 'Insumo' : 'Produto'}
                        </h3>
                        <button onClick={onClose} className="size-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                            <span className="material-symbols-outlined text-zinc-400">close</span>
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Nome do Produto</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white focus:border-[#f2b90d] focus:outline-none transition-all placeholder:text-white/10"
                                    placeholder="Ex: Vaselina Premium"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Código de Barras</label>
                                <input
                                    type="text"
                                    value={formData.barcode}
                                    onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white focus:border-[#f2b90d] focus:outline-none transition-all placeholder:text-white/10"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Descrição</label>
                            <textarea
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white focus:border-[#f2b90d] focus:outline-none transition-all h-28 resize-none"
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Custo (R$)</label>
                                <input
                                    type="text"
                                    placeholder="0,00"
                                    value={formData.cost_price}
                                    onChange={e => setFormData({ ...formData, cost_price: maskCurrency(e.target.value) })}
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white focus:border-[#f2b90d] focus:outline-none transition-all"
                                />
                            </div>
                            {mode === 'sale' && (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Venda (R$)</label>
                                    <input
                                        type="text"
                                        placeholder="0,00"
                                        value={formData.sale_price}
                                        onChange={e => setFormData({ ...formData, sale_price: maskCurrency(e.target.value) })}
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white focus:border-[#f2b90d] focus:outline-none transition-all"
                                    />
                                </div>
                            )}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Unidade</label>
                                <div className="relative">
                                    <select
                                        value={formData.unit_type}
                                        onChange={e => setFormData({ ...formData, unit_type: e.target.value })}
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white focus:border-[#f2b90d] focus:outline-none transition-all appearance-none cursor-pointer pr-10"
                                    >
                                        <option value="un">Unid. (un)</option>
                                        <option value="ml">Milit. (ml)</option>
                                        <option value="g">Gram. (g)</option>
                                        <option value="l">Litr. (l)</option>
                                        <option value="kg">Quilo (kg)</option>
                                        <option value="kit">Kit</option>
                                    </select>
                                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none text-xl">
                                        expand_more
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className={`p-6 rounded-[2rem] border transition-all ${productToEdit ? 'bg-amber-500/5 border-amber-500/10' : 'bg-emerald-500/5 border-emerald-500/10'}`}>
                            <label className={`text-[11px] font-black uppercase ml-1 mb-4 block tracking-tighter ${productToEdit ? 'text-amber-500' : 'text-emerald-500'}`}>
                                {productToEdit ? '🛡️ CONTROLE & ACERTO DE ESTOQUE' : '📦 ESTOQUE INICIAL & ALERTA'}
                            </label>

                            <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Estoque Atual ({formData.unit_type})</label>
                                    <input
                                        type="text"
                                        placeholder="0"
                                        value={formData.current_stock}
                                        onChange={e => setFormData({ ...formData, current_stock: maskNumber(e.target.value) })}
                                        className="w-full bg-black/60 border border-white/5 rounded-2xl p-4 text-lg font-black text-white focus:border-[#f2b90d] focus:outline-none transition-all text-center"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Alerta Mínimo</label>
                                    <input
                                        type="text"
                                        placeholder="0"
                                        value={formData.min_threshold}
                                        onChange={e => setFormData({ ...formData, min_threshold: maskNumber(e.target.value) })}
                                        className="w-full bg-black/60 border border-white/5 rounded-2xl p-4 text-lg font-black text-white focus:border-[#f2b90d] focus:outline-none transition-all text-center"
                                    />
                                </div>
                            </div>

                            {productToEdit && (
                                <div className="mt-5 bg-white/5 border border-white/5 p-4 rounded-xl">
                                    <p className="text-[10px] font-black text-white uppercase tracking-widest text-center italic opacity-90 leading-relaxed">
                                        * Edições manuais geram uma movimentação <br />automática de acerto no histórico
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-center pt-2">
                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full bg-[#f2b90d] text-black font-black py-4 px-16 rounded-2xl uppercase tracking-widest transition-all disabled:opacity-50 text-sm"
                            >
                                {saving ? 'SALVANDO...' : 'SALVAR PRODUTO'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
