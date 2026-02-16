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

            const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single();
            if (!profile?.tenant_id) throw new Error('No tenant found');

            const isSupply = mode === 'supply';
            const table = isSupply ? 'supplies' : 'products';

            const payload = {
                tenant_id: profile.tenant_id,
                name: formData.name,
                description: formData.description,
                barcode: formData.barcode,
                name: formData.name,
                description: formData.description,
                barcode: formData.barcode,
                category: isSupply ? 'supply' : 'sale',
                cost_price: parseFloat(formData.cost_price.replace(',', '.')),
                ...(isSupply ? {} : { sale_price: parseFloat(formData.sale_price.replace(',', '.')) }),
                min_threshold: parseInt(formData.min_threshold || '0'),
                unit_type: formData.unit_type,
                ...(productToEdit ? {} : { current_stock: parseInt(formData.current_stock || '0') })
            };

            let error;
            let productId;

            if (productToEdit) {
                const oldStock = parseInt(productToEdit.current_stock?.toString() || '0');
                const newStock = parseInt(formData.current_stock || '0');

                if (oldStock !== newStock) {
                    const diff = newStock - oldStock;
                    await supabase.from('stock_transactions').insert({
                        tenant_id: profile.tenant_id,
                        [isSupply ? 'supply_id' : 'product_id']: productToEdit.id,
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

                if (!error && parseInt(formData.current_stock || '0') > 0 && productId) {
                    await supabase.from('stock_transactions').insert({
                        tenant_id: profile.tenant_id,
                        [isSupply ? 'supply_id' : 'product_id']: productId,
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
                    <div className="flex justify-between items-center mb-10">
                        <h3 className="text-3xl font-black italic uppercase text-white tracking-tighter">
                            {productToEdit ? 'EDITAR' : 'NOVO'} {mode === 'supply' ? 'INSUMO' : 'PRODUTO'}
                        </h3>
                        <button onClick={onClose} className="size-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                            <span className="material-symbols-outlined text-zinc-400">close</span>
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="grid grid-cols-1 gap-6">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase text-zinc-500 ml-1 tracking-[0.1em]">NOME DO PRODUTO</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-black border border-white/5 rounded-2xl p-4 text-sm font-bold text-white focus:border-[#f2b90d] focus:outline-none transition-all placeholder:text-zinc-800"
                                    placeholder="Ex: Vaselina Premium"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase text-zinc-500 ml-1 tracking-[0.1em]">CÓDIGO DE BARRAS / EAN</label>
                            <input
                                type="text"
                                value={formData.barcode}
                                onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                                className="w-full bg-black border border-white/5 rounded-2xl p-4 text-sm font-bold text-white focus:border-[#f2b90d] focus:outline-none transition-all placeholder:text-zinc-800"
                                placeholder="0000000000000"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase text-zinc-500 ml-1 tracking-[0.1em]">DESCRIÇÃO</label>
                            <textarea
                                value={formData.description}
                                placeholder="Descreva brevemente o item..."
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                className="w-full bg-black border border-white/5 rounded-2xl p-4 text-sm font-bold text-white focus:border-[#f2b90d] focus:outline-none transition-all h-24 resize-none placeholder:text-zinc-800"
                            />
                        </div>

                        <div className={`grid gap-4 ${mode === 'sale' ? 'grid-cols-3' : 'grid-cols-2'}`}>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase text-zinc-500 ml-1 tracking-[0.1em]">CUSTO (R$)</label>
                                <input
                                    type="text"
                                    placeholder="0,00"
                                    value={formData.cost_price}
                                    onChange={e => setFormData({ ...formData, cost_price: maskCurrency(e.target.value) })}
                                    className="w-full bg-black border border-white/5 rounded-2xl p-4 text-sm font-bold text-white focus:border-[#f2b90d] focus:outline-none transition-all"
                                />
                            </div>
                            {mode === 'sale' && (
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase text-zinc-500 ml-1 tracking-[0.1em]">VENDA (R$)</label>
                                    <input
                                        type="text"
                                        placeholder="0,00"
                                        value={formData.sale_price}
                                        onChange={e => setFormData({ ...formData, sale_price: maskCurrency(e.target.value) })}
                                        className="w-full bg-black border border-white/5 rounded-2xl p-4 text-sm font-bold text-white focus:border-[#f2b90d] focus:outline-none transition-all"
                                    />
                                </div>
                            )}
                            <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase text-zinc-500 ml-1 tracking-[0.1em]">UNIDADE</label>
                                <div className="relative">
                                    <select
                                        value={formData.unit_type}
                                        onChange={e => setFormData({ ...formData, unit_type: e.target.value })}
                                        className="w-full bg-black border border-white/5 rounded-2xl p-4 text-sm font-bold text-white focus:border-[#f2b90d] focus:outline-none transition-all appearance-none cursor-pointer pr-10"
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

                        {/* INITIAL STOCK SECTION (MOCKED DESIGN) */}
                        <div className="p-8 rounded-[2.5rem] bg-black border border-white/5 space-y-6">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-emerald-500 text-sm">inventory_2</span>
                                <label className="text-[10px] font-black uppercase text-emerald-500 tracking-[0.15em]">📦 ESTOQUE INICIAL & ALERTA</label>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase text-zinc-500 ml-1 tracking-widest text-center block">ESTOQUE ATUAL (un)</label>
                                    <input
                                        type="text"
                                        placeholder="0"
                                        value={formData.current_stock}
                                        onChange={e => setFormData({ ...formData, current_stock: maskNumber(e.target.value) })}
                                        className="w-full bg-[#121214] border border-white/5 rounded-2xl p-5 text-2xl font-black text-white focus:border-[#10b981] focus:outline-none transition-all text-center"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase text-zinc-500 ml-1 tracking-widest text-center block">ALERTA MÍNIMO</label>
                                    <input
                                        type="text"
                                        placeholder="0"
                                        value={formData.min_threshold}
                                        onChange={e => setFormData({ ...formData, min_threshold: maskNumber(e.target.value) })}
                                        className="w-full bg-[#121214] border border-white/5 rounded-2xl p-5 text-2xl font-black text-white focus:border-[#10b981] focus:outline-none transition-all text-center"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full bg-[#f2b90d] hover:bg-[#ffc82a] text-black font-black py-5 px-16 rounded-2xl uppercase tracking-[0.2em] transition-all disabled:opacity-50 text-xs shadow-xl active:scale-95"
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
