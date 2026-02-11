"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface ProductFormProps {
    onClose: () => void;
    productToEdit?: any;
}

export default function ProductForm({ onClose, productToEdit }: ProductFormProps) {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        barcode: '',
        cost_price: 0,
        sale_price: 0,
        current_stock: 0, // Only editable on create
        min_threshold: 5,
        unit_type: 'un'
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (productToEdit) {
            setFormData({
                name: productToEdit.name,
                description: productToEdit.description || '',
                barcode: productToEdit.barcode || '',
                cost_price: productToEdit.cost_price,
                sale_price: productToEdit.sale_price,
                current_stock: productToEdit.current_stock,
                min_threshold: productToEdit.min_threshold,
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

            const payload = {
                tenant_id: profile.tenant_id,
                name: formData.name,
                description: formData.description,
                barcode: formData.barcode,
                cost_price: formData.cost_price,
                sale_price: formData.sale_price,
                min_threshold: formData.min_threshold,
                unit_type: formData.unit_type,
                // Only set current_stock if creating new. If editing, stock is managed via transactions.
                ...(productToEdit ? {} : { current_stock: formData.current_stock })
            };

            let error;
            let productId;

            if (productToEdit) {
                const { error: updateError } = await supabase
                    .from('products')
                    .update(payload)
                    .eq('id', productToEdit.id);
                error = updateError;
                productId = productToEdit.id;
            } else {
                const { data: newProd, error: insertError } = await supabase
                    .from('products')
                    .insert(payload)
                    .select()
                    .single();
                error = insertError;
                productId = newProd?.id;

                // Initial Stock Transaction for Audit
                if (!error && formData.current_stock > 0 && productId) {
                    await supabase.from('stock_transactions').insert({
                        tenant_id: profile.tenant_id,
                        product_id: productId,
                        type: 'IN',
                        quantity: formData.current_stock,
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#18181b] border border-white/10 w-full max-w-2xl rounded-3xl p-8 relative shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-black italic uppercase text-white">
                        {productToEdit ? 'Editar Produto' : 'Novo Produto'}
                    </h3>
                    <button onClick={onClose} className="size-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                        <span className="material-symbols-outlined text-zinc-400">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Nome do Produto</label>
                            <input
                                required
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white font-bold focus:border-[#f2b90d] focus:outline-none transition-colors"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Código de Barras</label>
                            <input
                                type="text"
                                value={formData.barcode}
                                onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white font-bold focus:border-[#f2b90d] focus:outline-none transition-colors"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Descrição</label>
                        <textarea
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white font-bold focus:border-[#f2b90d] focus:outline-none transition-colors h-24 resize-none"
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Custo (R$)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.cost_price}
                                onChange={e => setFormData({ ...formData, cost_price: parseFloat(e.target.value) })}
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white font-bold focus:border-[#f2b90d] focus:outline-none transition-colors"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Venda (R$)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.sale_price}
                                onChange={e => setFormData({ ...formData, sale_price: parseFloat(e.target.value) })}
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white font-bold focus:border-[#f2b90d] focus:outline-none transition-colors"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Unidade</label>
                            <select
                                value={formData.unit_type}
                                onChange={e => setFormData({ ...formData, unit_type: e.target.value })}
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white font-bold focus:border-[#f2b90d] focus:outline-none transition-colors"
                            >
                                <option value="un">Unidade (un)</option>
                                <option value="ml">Mililitros (ml)</option>
                                <option value="g">Gramas (g)</option>
                                <option value="l">Litros (l)</option>
                                <option value="kg">Quilos (kg)</option>
                                <option value="kit">Kit</option>
                            </select>
                        </div>
                    </div>

                    {!productToEdit && (
                        <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                            <label className="text-[10px] font-black uppercase text-emerald-500 ml-1 mb-2 block">Estoque Inicial</label>
                            <div className="flex gap-4">
                                <input
                                    type="number"
                                    value={formData.current_stock}
                                    onChange={e => setFormData({ ...formData, current_stock: parseInt(e.target.value) })}
                                    className="w-1/2 bg-black/40 border border-white/10 rounded-xl p-3 text-white font-bold focus:border-emerald-500 focus:outline-none transition-colors"
                                />
                                <div className="space-y-1 w-1/2">
                                    <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Alerta Mínimo</label>
                                    <input
                                        type="number"
                                        value={formData.min_threshold}
                                        onChange={e => setFormData({ ...formData, min_threshold: parseInt(e.target.value) })}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white font-bold focus:border-[#f2b90d] focus:outline-none transition-colors"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {productToEdit && (
                        <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex justify-between items-center px-6">
                            <span className="text-zinc-400 font-bold text-sm">Estoque Atual (Gerenciado via Movimentações)</span>
                            <span className="text-2xl font-black text-white">{formData.current_stock} <span className="text-sm text-zinc-500">{formData.unit_type}</span></span>
                        </div>
                    )}

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={saving}
                            className="bg-[#f2b90d] text-black font-black py-4 px-8 rounded-xl uppercase tracking-widest hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                        >
                            {saving ? 'Salvando...' : 'Salvar Produto'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
