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

    const [voucher, setVoucher] = useState<any>(null);

    // Fetch voucher when selected changes
    useEffect(() => {
        if (selected?.appointment_id && selected?.appointment_id.length > 0) { // Using formatted object structure
            // The formatted object has 'appointment_id', but we need client_id which is not in formatted object.
            // We need to fetch client_id from appointment or pass it down.
            // The query at line 37 fetches appointments!appointment_id.
            // Let's check line 37-43. It fetches profiles(full_name), services(name).
            // It does NOT fetch client_id directly?
            // Actually appointments table usually has client_id.
            // Let's fetch client_id in the main query first to be safe.
        }
    }, [selected]);

    // Changing strategy: calculate logic inside effect based on 'raw' data if needed, or update fetch.
    // Let's just put the state here and I will update the fetchPendingOrders to include client_id.

    const checkLoyaltyVoucher = async (clientId: string) => {
        if (!clientId) return;
        const { data: client } = await supabase.from('clients').select('phone').eq('id', clientId).single();
        if (!client?.phone) return;

        const { data: vouchers } = await supabase
            .from('loyalty_vouchers')
            .select('*')
            .eq('client_phone', client.phone)
            .eq('status', 'active')
            .limit(1);

        setVoucher(vouchers?.[0] || null);
    };

    useEffect(() => {
        if (selected?.client_id) {
            checkLoyaltyVoucher(selected.client_id);
        } else {
            setVoucher(null);
        }
    }, [selected]);

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
            // Fetch ORDERS that are pending (Waiting for Payment)
            const { data, error } = await supabase
                .from('orders')
                .select(`
                    id, 
                    total_value, 
                    commission_amount,
                    status, 
                    finalized_at,
                    appointments!appointment_id (
                        id, 
                        customer_name,
                        scheduled_at, 
                        client_id,
                        profiles(full_name),
                        services(name)
                    )
                `)
                .eq('tenant_id', profile.tenant_id)
                .eq('status', 'pending_payment')
                .order('finalized_at', { ascending: true });

            if (!error && data) {
                // Formatting for UI
                const formatted = data.map((o: any) => ({
                    id: o.id, // Order ID
                    appointment_id: o.appointments?.id,
                    customer_name: o.appointments?.customer_name,
                    barber_name: o.appointments?.profiles?.full_name,
                    service_name: o.appointments?.services?.name,
                    time: o.appointments?.scheduled_at,
                    total_price: o.total_value,
                    commission: o.commission_amount,
                    client_id: o.appointments?.client_id, // Expose client_id for voucher check
                    raw: o
                }));
                setOrders(formatted);
            }
        }
        setLoading(false);
    };

    const handleConfirmPayment = async () => {
        if (!selected) return;

        // 1. Update ORDER to 'paid' (Triggers Stock Deduction)
        const { error: orderError } = await supabase
            .from('orders')
            .update({ status: 'paid' })
            .eq('id', selected.id);

        if (orderError) {
            alert('Erro ao processar pagamento: ' + orderError.message);
            return;
        }

        // 2. Update APPOINTMENT to 'paid' (Close the loop)
        await supabase
            .from('appointments')
            .update({ status: 'paid' })
            .eq('id', selected.appointment_id);

        alert(`Pagamento de R$ ${selected.total_price.toFixed(2)} confirmado!\nEstoque atualizado.`);
        setSelected(null);
        fetchPendingOrders();
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 animate-in fade-in duration-500 pb-10">
            <div className="lg:col-span-2 space-y-4 md:space-y-6">
                <div className="flex items-center justify-between px-2 md:px-0">
                    <h3 className="text-white text-lg md:text-xl font-black italic uppercase">Comandas Pendentes</h3>
                    <span className="bg-[#f2b90d]/10 text-[#f2b90d] text-[9px] md:text-[10px] font-black px-3 py-1 rounded-full border border-[#f2b90d]/20 uppercase">
                        {orders.length} FILA
                    </span>
                </div>

                <div className="grid gap-3 md:gap-4">
                    {loading ? (
                        <div className="text-center py-20 opacity-40">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#f2b90d] mx-auto"></div>
                        </div>
                    ) : orders.length > 0 ? (
                        orders.map(cmd => (
                            <button
                                key={cmd.id}
                                onClick={() => setSelected(cmd)}
                                className={`w-full p-4 md:p-6 rounded-3xl border text-left transition-all flex items-center justify-between group ${selected?.id === cmd.id ? 'bg-[#f2b90d]/5 border-[#f2b90d] shadow-xl scale-[1.01]' : 'bg-[#121214] border-white/5 hover:border-white/20'
                                    }`}
                            >
                                <div className="flex items-center gap-3 md:gap-4 w-full">
                                    <div className={`size-10 md:size-12 rounded-xl flex items-center justify-center transition-colors shrink-0 ${selected?.id === cmd.id ? 'bg-[#f2b90d] text-black' : 'bg-white/5 text-[#f2b90d]'}`}>
                                        <span className="material-symbols-outlined text-[20px] md:text-[24px]">receipt</span>
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="text-white font-bold text-base md:text-lg italic tracking-tight truncate">{cmd.customer_name}</h4>
                                        <p className="text-slate-500 text-[8px] md:text-[10px] font-black uppercase tracking-widest truncate">Prof: {cmd.barber_name}</p>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-[#f2b90d] text-xl md:text-2xl font-black italic tracking-tighter">R$ {(cmd.total_price || 0).toFixed(2)}</p>
                                    <p className="text-slate-500 text-[8px] md:text-[10px] font-black uppercase">
                                        {cmd.time ? new Date(cmd.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                    </p>
                                </div>
                            </button>
                        ))
                    ) : (
                        <div className="py-16 md:py-20 bg-white/5 border border-dashed border-white/10 rounded-3xl md:rounded-[2.5rem] flex flex-col items-center justify-center opacity-40">
                            <span className="material-symbols-outlined text-4xl md:text-6xl mb-4 text-white italic">check_circle</span>
                            <p className="font-black uppercase text-[10px] md:text-xs tracking-[0.4em] text-white">Tudo em dia</p>
                        </div>
                    )}
                </div>
            </div>

            <aside className="w-full">
                {selected ? (
                    <div className="bg-[#121214] border border-[#f2b90d]/30 p-6 md:p-8 rounded-3xl md:rounded-[2.5rem] space-y-6 md:space-y-8 animate-in slide-in-from-bottom-4 shadow-2xl sticky top-4 md:top-10">
                        <div className="text-center">
                            <h3 className="text-white text-xl md:text-2xl font-black italic tracking-tight mb-1 md:mb-2 uppercase">Recebimento</h3>
                            <p className="text-slate-500 text-[9px] md:text-[10px] font-black uppercase tracking-widest italic">{selected.customer_name}</p>
                        </div>

                        <div className="space-y-3 md:space-y-4 max-h-[150px] overflow-y-auto custom-scrollbar pr-2">
                            {/* Ideally fetch items here too, but for speed just showing service */}
                            <div className="flex justify-between items-center text-xs font-bold border-b border-white/5 pb-2">
                                <span className="text-slate-400 italic font-black uppercase tracking-widest text-[9px] truncate mr-4">{selected.service_name} + Extras</span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <p className="text-slate-500 text-[9px] md:text-[10px] font-black uppercase tracking-widest ml-1 italic opacity-60">Escolha o Método</p>
                            <div className="grid grid-cols-2 gap-2">
                                {['PIX', 'CARTÃO', 'DINHEIRO', 'DÉBITO'].map(m => (
                                    <button key={m} className="bg-black/40 border border-white/10 text-white font-black py-3 md:py-4 rounded-xl hover:border-[#f2b90d] hover:text-[#f2b90d] transition-all text-[9px] md:text-[10px] tracking-widest uppercase active:scale-95">
                                        {m}
                                    </button>
                                ))}
                            </div>

                            {/* Loyalty Voucher Alert */}
                            {voucher && (
                                <div className="mt-4 bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl flex items-center justify-between animate-in fade-in">
                                    <div className="flex items-center gap-3">
                                        <span className="material-symbols-outlined text-emerald-500">card_giftcard</span>
                                        <div>
                                            <p className="text-emerald-500 text-[10px] font-black uppercase tracking-widest">Corte Grátis Disponível</p>
                                            <p className="text-emerald-500/60 text-[8px] font-bold">Fidelidade Atingida</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={async () => {
                                            if (!selected) return;
                                            if (confirm('Confirmar uso do Voucher? O total será zerado.')) {
                                                // 1. Update Order Value
                                                await supabase.from('orders').update({ total_value: 0 }).eq('id', selected.id);
                                                // 2. Mark Voucher Used
                                                await supabase.from('loyalty_vouchers').update({ status: 'used', used_at: new Date().toISOString() }).eq('id', voucher.id);
                                                // 3. UI Update
                                                setSelected({ ...selected, total_price: 0 });
                                                setVoucher(null);
                                                alert('Voucher aplicado com sucesso!');
                                            }
                                        }}
                                        className="bg-emerald-500 text-black text-[9px] font-black uppercase tracking-widest px-3 py-2 rounded-lg hover:bg-emerald-400"
                                    >
                                        Aplicar
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="pt-5 md:pt-6 border-t border-white/5">
                            <div className="flex justify-between items-end mb-5 md:mb-6">
                                <span className="text-slate-500 font-bold uppercase text-[9px] md:text-[10px] tracking-widest italic opacity-50">Total</span>
                                <span className="text-[#f2b90d] text-3xl md:text-4xl font-black italic tracking-tighter">R$ {(selected.total_price || 0).toFixed(2)}</span>
                            </div>
                            <button
                                onClick={handleConfirmPayment}
                                className="w-full bg-[#f2b90d] hover:bg-[#d9a50c] text-black font-black py-4 md:py-5 rounded-xl md:rounded-2xl text-base md:text-lg shadow-2xl shadow-[#f2b90d]/20 transition-all flex items-center justify-center gap-2 uppercase italic active:scale-95"
                            >
                                CONFIRMAR
                                <span className="material-symbols-outlined text-xl md:text-2xl">check_circle</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="h-full min-h-[300px] md:min-h-[400px] bg-[#121214]/40 border border-dashed border-white/10 rounded-3xl md:rounded-[2.5rem] flex flex-col items-center justify-center p-6 md:p-8 text-center sticky top-4 md:top-10">
                        <div className="size-16 md:size-20 bg-white/5 rounded-full flex items-center justify-center mb-4 md:mb-6 text-slate-700">
                            <span className="material-symbols-outlined text-4xl md:text-5xl">point_of_sale</span>
                        </div>
                        <p className="text-slate-500 font-bold uppercase text-[10px] md:text-xs tracking-widest leading-relaxed">
                            Selecione uma comanda <br className="hidden md:block" /> para processar
                        </p>
                    </div>
                )}
            </aside>
        </div>
    );
}
