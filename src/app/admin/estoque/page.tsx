"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export default function InventoryManagementPage() {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingProduct, setEditingProduct] = useState<any>(null);

    useEffect(() => {
        fetchInventory();
    }, []);

    const fetchInventory = async () => {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data: profile } = await supabase
            .from('profiles')
            .select('tenant_id')
            .eq('id', session.user.id)
            .single();

        if (profile?.tenant_id) {
            const { data, error } = await supabase
                .from('inventory')
                .select('*')
                .eq('tenant_id', profile.tenant_id);

            if (!error && data) {
                setProducts(data);
            }
        }
        setLoading(false);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const { error } = await supabase
            .from('inventory')
            .update({
                name: editingProduct.name,
                price: editingProduct.price,
                current_stock: editingProduct.current_stock,
                min_stock: editingProduct.min_stock,
            })
            .eq('id', editingProduct.id);

        if (!error) {
            setEditingProduct(null);
            fetchInventory();
        }
    };

    return (
        <div className="space-y-8 relative animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h3 className="text-white text-xl font-black italic uppercase">Lista de Produtos</h3>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Gerencie seus itens de revenda</p>
                </div>
                <button className="bg-[#f2b90d] text-black px-8 py-3 rounded-xl font-black text-sm shadow-xl shadow-[#f2b90d]/20 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all">
                    <span className="material-symbols-outlined">add_box</span>
                    ADICIONAR PRODUTO
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {loading ? (
                    <div className="col-span-full text-center py-20 opacity-40">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#f2b90d] mx-auto"></div>
                    </div>
                ) : products.map(p => (
                    <div key={p.id} className="bg-[#121214] rounded-[2rem] border border-white/5 overflow-hidden group hover:border-[#f2b90d]/20 transition-all shadow-xl">
                        <div className="relative aspect-square overflow-hidden bg-black">
                            <img alt="Produto" src={p.image_url || 'https://picsum.photos/200/200'} className="w-full h-full object-cover grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500 scale-110 group-hover:scale-100" />
                            {p.current_stock <= p.min_stock && (
                                <div className="absolute top-4 right-4 bg-red-500 text-white text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-lg">
                                    ESTOQUE CRÍTICO
                                </div>
                            )}
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex justify-between items-start">
                                <h4 className="text-white font-bold text-lg leading-tight">{p.name}</h4>
                                <span className="text-[#f2b90d] font-black text-lg">R$ {p.price}</span>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter">
                                    <span className="text-slate-500">Nível do Inventário</span>
                                    <span className={p.current_stock <= p.min_stock ? 'text-red-400' : 'text-emerald-400'}>{p.current_stock} / {p.min_stock * 3}</span>
                                </div>
                                <div className="w-full bg-black h-1 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-1000 ${p.current_stock <= p.min_stock ? 'bg-red-500' : 'bg-[#f2b90d]'}`}
                                        style={{ width: `${Math.min((p.current_stock / (p.min_stock * 3)) * 100, 100)}%` }}
                                    ></div>
                                </div>
                            </div>

                            <div className="pt-2">
                                <button
                                    onClick={() => setEditingProduct({ ...p })}
                                    className="w-full bg-[#f2b90d]/10 hover:bg-[#f2b90d] text-[#f2b90d] hover:text-black font-black py-4 rounded-2xl text-[10px] tracking-widest uppercase transition-all flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-[18px]">edit</span>
                                    EDITAR PRODUTO
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {editingProduct && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-[#121214] w-full max-w-xl rounded-[3rem] border border-white/5 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-white/5 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="size-12 bg-[#f2b90d]/10 rounded-2xl flex items-center justify-center text-[#f2b90d]">
                                    <span className="material-symbols-outlined">inventory_2</span>
                                </div>
                                <h3 className="text-xl text-white font-black italic uppercase tracking-tight">Editar Produto</h3>
                            </div>
                            <button onClick={() => setEditingProduct(null)} className="size-10 flex items-center justify-center rounded-full hover:bg-white/5 text-slate-400 transition-all">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest italic ml-2">Nome do Produto</label>
                                <input type="text" value={editingProduct.name} onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })} className="w-full bg-black border border-white/5 rounded-2xl p-4 font-bold text-white focus:border-[#f2b90d]/50 outline-none" required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest italic ml-2">Preço (R$)</label>
                                    <input type="number" value={editingProduct.price} onChange={e => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) })} className="w-full bg-black border border-white/5 rounded-2xl p-4 font-bold text-white focus:border-[#f2b90d]/50 outline-none" required />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest italic ml-2">Estoque Atual</label>
                                    <input type="number" value={editingProduct.current_stock} onChange={e => setEditingProduct({ ...editingProduct, current_stock: parseInt(e.target.value) })} className="w-full bg-black border border-white/5 rounded-2xl p-4 font-bold text-white focus:border-[#f2b90d]/50 outline-none" required />
                                </div>
                            </div>
                            <div className="pt-4 flex gap-4">
                                <button type="button" onClick={() => setEditingProduct(null)} className="flex-1 bg-white/5 text-slate-400 font-black py-5 rounded-2xl text-[12px] uppercase">CANCELAR</button>
                                <button type="submit" className="flex-1 bg-[#f2b90d] text-black font-black py-5 rounded-2xl text-[12px] uppercase shadow-lg shadow-[#f2b90d]/20">SALVAR</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
