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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 md:gap-6 pb-10">
                {loading ? (
                    <div className="col-span-full text-center py-20 opacity-40">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#f2b90d] mx-auto"></div>
                    </div>
                ) : products.map(p => (
                    <div key={p.id} className="bg-[#121214] rounded-3xl md:rounded-[2rem] border border-white/5 overflow-hidden group hover:border-[#f2b90d]/20 transition-all shadow-xl">
                        <div className="relative aspect-video sm:aspect-square overflow-hidden bg-black">
                            <img alt="Produto" src={p.image_url || 'https://picsum.photos/200/200'} className="w-full h-full object-cover grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500 scale-110 group-hover:scale-100" />
                            {p.current_stock <= p.min_stock && (
                                <div className="absolute top-3 right-3 bg-red-500 text-white text-[9px] font-black uppercase px-2.5 py-1 rounded-full shadow-lg">
                                    CRÍTICO
                                </div>
                            )}
                        </div>
                        <div className="p-4 md:p-6 space-y-3 md:space-y-4">
                            <div className="flex justify-between items-start">
                                <h4 className="text-white font-bold text-base md:text-lg leading-tight truncate mr-2">{p.name}</h4>
                                <span className="text-[#f2b90d] font-black text-base md:text-lg shrink-0">RS {p.price}</span>
                            </div>

                            <div className="space-y-1.5 md:space-y-2">
                                <div className="flex justify-between text-[9px] md:text-[10px] font-black uppercase tracking-tighter">
                                    <span className="text-slate-500">Nível</span>
                                    <span className={p.current_stock <= p.min_stock ? 'text-red-400' : 'text-emerald-400'}>{p.current_stock} / {p.min_stock * 3}</span>
                                </div>
                                <div className="w-full bg-black h-1 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-1000 ${p.current_stock <= p.min_stock ? 'bg-red-500' : 'bg-[#f2b90d]'}`}
                                        style={{ width: `${Math.min((p.current_stock / (p.min_stock * 3)) * 100, 100)}%` }}
                                    ></div>
                                </div>
                            </div>

                            <div className="pt-1 md:pt-2">
                                <button
                                    onClick={() => setEditingProduct({ ...p })}
                                    className="w-full bg-[#f2b90d]/10 hover:bg-[#f2b90d] text-[#f2b90d] hover:text-black font-black py-3 md:py-4 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] tracking-widest uppercase transition-all flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-[18px]">edit</span>
                                    EDITAR
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {editingProduct && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto">
                    <div className="bg-[#121214] w-full max-w-xl rounded-[2.5rem] md:rounded-[3rem] border border-white/5 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 my-auto">
                        <div className="p-6 md:p-8 border-b border-white/5 flex justify-between items-center">
                            <div className="flex items-center gap-3 md:gap-4">
                                <div className="size-10 md:size-12 bg-[#f2b90d]/10 rounded-xl md:rounded-2xl flex items-center justify-center text-[#f2b90d]">
                                    <span className="material-symbols-outlined text-xl md:text-2xl">inventory_2</span>
                                </div>
                                <h3 className="text-lg md:text-xl text-white font-black italic uppercase tracking-tight">Editar Produto</h3>
                            </div>
                            <button onClick={() => setEditingProduct(null)} className="size-10 flex items-center justify-center rounded-full hover:bg-white/5 text-slate-400 transition-all">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 md:p-8 space-y-4 md:space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <div className="space-y-1.5 md:space-y-2">
                                <label className="text-[9px] md:text-[10px] font-black uppercase text-slate-500 tracking-widest italic ml-2">Nome</label>
                                <input type="text" value={editingProduct.name} onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })} className="w-full bg-black border border-white/5 rounded-xl md:rounded-2xl p-3 md:p-4 font-bold text-white text-sm md:text-base focus:border-[#f2b90d]/50 outline-none" required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5 md:space-y-2">
                                    <label className="text-[9px] md:text-[10px] font-black uppercase text-slate-500 tracking-widest italic ml-2">Preço (R$)</label>
                                    <input type="number" step="0.01" value={editingProduct.price} onChange={e => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) })} className="w-full bg-black border border-white/5 rounded-xl md:rounded-2xl p-3 md:p-4 font-bold text-white text-sm md:text-base focus:border-[#f2b90d]/50 outline-none" required />
                                </div>
                                <div className="space-y-1.5 md:space-y-2">
                                    <label className="text-[9px] md:text-[10px] font-black uppercase text-slate-500 tracking-widest italic ml-2">Estoque</label>
                                    <input type="number" value={editingProduct.current_stock} onChange={e => setEditingProduct({ ...editingProduct, current_stock: parseInt(e.target.value) })} className="w-full bg-black border border-white/5 rounded-xl md:rounded-2xl p-3 md:p-4 font-bold text-white text-sm md:text-base focus:border-[#f2b90d]/50 outline-none" required />
                                </div>
                            </div>
                            <div className="pt-2 md:pt-4 flex gap-3 md:gap-4">
                                <button type="button" onClick={() => setEditingProduct(null)} className="flex-1 bg-white/5 text-slate-400 font-black py-4 md:py-5 rounded-xl md:rounded-2xl text-[10px] md:text-[12px] uppercase active:scale-95 transition-all">CANCELAR</button>
                                <button type="submit" className="flex-1 bg-[#f2b90d] text-black font-black py-4 md:py-5 rounded-xl md:rounded-2xl text-[10px] md:text-[12px] uppercase shadow-lg shadow-[#f2b90d]/20 active:scale-95 transition-all">SALVAR</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
