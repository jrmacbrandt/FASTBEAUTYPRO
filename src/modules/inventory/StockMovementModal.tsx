"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface StockMovementModalProps {
    onClose: () => void;
    product: any;
}

export default function StockMovementModal({ onClose, product }: StockMovementModalProps) {
    const [type, setType] = useState<'IN' | 'OUT'>('IN');
    const [quantity, setQuantity] = useState(1);
    const [reason, setReason] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const user = (await supabase.auth.getUser()).data.user;
            if (!user) throw new Error('Not authenticated');

            const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single();
            if (!profile?.tenant_id) throw new Error('No tenant found');

            // Insert Transaction (Trigger will update Stock)
            const { error } = await supabase.from('stock_transactions').insert({
                tenant_id: profile.tenant_id,
                product_id: product.id,
                type: type,
                quantity: quantity,
                reason: reason || (type === 'IN' ? 'Entrada Manual' : 'Saída Manual'),
                created_by: user.id
            });

            if (error) throw error;
            onClose();
        } catch (err: any) {
            alert('Erro ao movimentar: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className={`bg-[#18181b] border border-white/10 w-full max-w-md rounded-3xl p-8 relative shadow-2xl animate-in zoom-in-95 duration-200 border-t-4 ${type === 'IN' ? 'border-t-emerald-500' : 'border-t-red-500'}`}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black italic uppercase text-white">
                        Movimentação de Estoque
                    </h3>
                    <button onClick={onClose} className="size-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                        <span className="material-symbols-outlined text-zinc-400">close</span>
                    </button>
                </div>

                <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/5">
                    <p className="text-[10px] font-black uppercase text-zinc-500">Produto</p>
                    <p className="text-white font-bold text-lg">{product.name}</p>
                    <p className="text-zinc-400 text-sm">Atual: {product.current_stock} {product.unit_type}</p>
                </div>

                <div className="flex bg-black/40 p-1 rounded-xl mb-6">
                    <button
                        onClick={() => setType('IN')}
                        className={`flex-1 py-3 rounded-lg font-black uppercase text-xs transition-all ${type === 'IN' ? 'bg-emerald-500 text-black shadow-lg' : 'text-zinc-500 hover:text-white'}`}
                    >
                        Entrada (+)
                    </button>
                    <button
                        onClick={() => setType('OUT')}
                        className={`flex-1 py-3 rounded-lg font-black uppercase text-xs transition-all ${type === 'OUT' ? 'bg-red-500 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}
                    >
                        Saída (-)
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Quantidade</label>
                        <input
                            required
                            type="number"
                            min="1"
                            value={quantity}
                            onChange={e => setQuantity(parseInt(e.target.value))}
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white font-bold focus:border-white/30 focus:outline-none transition-colors text-2xl text-center"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Motivo / Obs</label>
                        <input
                            type="text"
                            placeholder={type === 'IN' ? "Ex: Compra NF 123" : "Ex: Quebra, Uso Interno"}
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white font-bold focus:border-white/30 focus:outline-none transition-colors"
                        />
                    </div>

                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            disabled={saving}
                            className={`w-full font-black py-4 rounded-xl uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 ${type === 'IN' ? 'bg-emerald-500 text-black' : 'bg-red-500 text-white'}`}
                        >
                            {saving ? 'Processando...' : (type === 'IN' ? 'Confirmar Entrada' : 'Confirmar Saída')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
