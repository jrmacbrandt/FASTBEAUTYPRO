"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export default function CashierCheckoutPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [selected, setSelected] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPendingOrders();
    }, []);

    const fetchPendingOrders = async () => {
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
                .from('appointments')
                .select('*, profiles(full_name), services(name)')
                .eq('tenant_id', profile.tenant_id)
                .eq('status', 'completed') // In this context, 'completed' might mean finished by barber but unpaid
                .order('appointment_time', { ascending: true });

            if (!error && data) {
                setOrders(data);
            }
        }
        setLoading(false);
    };

    const handleConfirmPayment = async () => {
        if (!selected) return;

        const { error } = await supabase
            .from('appointments')
            .update({ status: 'paid' }) // New status for paid appointments
            .eq('id', selected.id);

        if (!error) {
            alert(`Pagamento de R$ ${selected.total_price},00 confirmado!`);
            setSelected(null);
            fetchPendingOrders();
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
            <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-white text-xl font-black italic uppercase">Comandas Pendentes</h3>
                    <span className="bg-[#f2b90d]/10 text-[#f2b90d] text-[10px] font-black px-3 py-1 rounded-full border border-[#f2b90d]/20 uppercase">
                        {orders.length} AGUARDANDO
                    </span>
                </div>

                <div className="grid gap-4">
                    {loading ? (
                        <div className="text-center py-20 opacity-40">
                            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#f2b90d] mx-auto"></div>
                        </div>
                    ) : orders.length > 0 ? (
                        orders.map(cmd => (
                            <button
                                key={cmd.id}
                                onClick={() => setSelected(cmd)}
                                className={`w-full p-6 rounded-3xl border text-left transition-all flex items-center justify-between group ${selected?.id === cmd.id ? 'bg-[#f2b90d]/5 border-[#f2b90d] shadow-xl scale-[1.02]' : 'bg-[#121214] border-white/5 hover:border-white/20'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`size-12 rounded-xl flex items-center justify-center transition-colors ${selected?.id === cmd.id ? 'bg-[#f2b90d] text-black' : 'bg-white/5 text-[#f2b90d]'}`}>
                                        <span className="material-symbols-outlined">receipt</span>
                                    </div>
                                    <div>
                                        <h4 className="text-white font-bold text-lg italic tracking-tight">{cmd.customer_name}</h4>
                                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Profissional: {cmd.profiles?.full_name}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[#f2b90d] text-2xl font-black italic tracking-tighter">R$ {(cmd.total_price || 0).toFixed(2)}</p>
                                    <p className="text-slate-500 text-[10px] font-black uppercase">{cmd.appointment_time.split('T')[1].substring(0, 5)}</p>
                                </div>
                            </button>
                        ))
                    ) : (
                        <div className="py-20 bg-white/5 border border-dashed border-white/10 rounded-[2.5rem] flex flex-col items-center justify-center opacity-40">
                            <span className="material-symbols-outlined text-6xl mb-4 text-white">check_circle</span>
                            <p className="font-black uppercase text-xs tracking-[0.4em] text-white">Tudo limpo no momento</p>
                        </div>
                    )}
                </div>
            </div>

            <aside>
                {selected ? (
                    <div className="bg-[#121214] border border-[#f2b90d]/30 p-8 rounded-[2.5rem] space-y-8 animate-in slide-in-from-bottom-4 shadow-2xl sticky top-10">
                        <div className="text-center">
                            <h3 className="text-white text-2xl font-black italic tracking-tight mb-2 uppercase">Resumo da Comanda</h3>
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest italic">Cliente: {selected.customer_name}</p>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-sm font-bold border-b border-white/5 pb-2">
                                <span className="text-slate-400 italic font-black uppercase tracking-widest text-[10px]">{selected.services?.name}</span>
                                <span className="text-[#f2b90d]/60 text-[10px] font-black uppercase">Pronto</span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest ml-1 italic">Método de Recebimento</p>
                            <div className="grid grid-cols-2 gap-2">
                                {['PIX', 'CARTÃO', 'DINHEIRO', 'DÉBITO'].map(m => (
                                    <button key={m} className="bg-black/40 border border-white/10 text-white font-black py-4 rounded-xl hover:border-[#f2b90d] hover:text-[#f2b90d] transition-all text-[10px] tracking-widest uppercase">
                                        {m}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="pt-6 border-t border-white/5">
                            <div className="flex justify-between items-end mb-6">
                                <span className="text-slate-500 font-bold uppercase text-[10px] tracking-widest italic">Valor Final</span>
                                <span className="text-[#f2b90d] text-4xl font-black italic tracking-tighter">R$ {(selected.total_price || 0).toFixed(2)}</span>
                            </div>
                            <button
                                onClick={handleConfirmPayment}
                                className="w-full bg-[#f2b90d] hover:bg-[#d9a50c] text-black font-black py-6 rounded-2xl text-lg shadow-2xl shadow-[#f2b90d]/20 transition-all flex items-center justify-center gap-2 uppercase italic tracking-tight active:scale-95"
                            >
                                CONFIRMAR PAGAMENTO
                                <span className="material-symbols-outlined">check_circle</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="h-full min-h-[400px] bg-[#121214]/40 border border-dashed border-white/10 rounded-[2.5rem] flex flex-col items-center justify-center p-8 text-center sticky top-10">
                        <div className="size-20 bg-white/5 rounded-full flex items-center justify-center mb-6 text-slate-700">
                            <span className="material-symbols-outlined text-5xl">point_of_sale</span>
                        </div>
                        <p className="text-slate-500 font-bold uppercase text-xs tracking-widest leading-relaxed">
                            Selecione uma comanda ao lado <br /> para processar o recebimento
                        </p>
                    </div>
                )}
            </aside>
        </div>
    );
}
