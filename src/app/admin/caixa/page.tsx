"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/hooks/useProfile';

export default function CashierCheckoutPage() {
    const { profile, loading: profileLoading, theme: colors } = useProfile();
    const [orders, setOrders] = useState<any[]>([]);
    const [selected, setSelected] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [voucher, setVoucher] = useState<any>(null);
    const [paymentMethod, setPaymentMethod] = useState<string>('DINHEIRO');
    const [tenantFees, setTenantFees] = useState<any>({ pix: 0, cash: 0, credit: 4.99, debit: 1.99 });

    const fetchPendingOrders = async (tid: string) => {
        setLoading(true);
        const { data, error } = await supabase
            .from('orders')
            .select(`
                id, 
                total_value, 
                service_total,
                product_total,
                commission_amount,
                status, 
                finalized_at,
                appointments!appointment_id (
                    id, 
                    customer_name,
                    customer_whatsapp,
                    scheduled_at, 
                    client_id,
                    profiles(full_name),
                    services(name)
                )
            `)
            .eq('tenant_id', tid)
            .eq('status', 'pending_payment')
            .order('finalized_at', { ascending: true });

        if (!error && data) {
            const formatted = data.map((o: any) => ({
                id: o.id,
                appointment_id: o.appointments?.id,
                customer_name: o.appointments?.customer_name,
                barber_name: o.appointments?.profiles?.full_name,
                service_name: o.appointments?.services?.name,
                time: o.appointments?.scheduled_at,
                total_price: o.total_value,
                commission: o.commission_amount,
                client_id: o.appointments?.client_id,
                client_phone: o.appointments?.customer_whatsapp,
                raw: o
            }));
            setOrders(formatted);
        }
        setLoading(false);
    };

    const checkLoyaltyVoucher = async (clientId: string) => {
        if (!clientId) return;
        const { data: client } = await supabase.from('clients').select('phone').eq('id', clientId).single();
        if (!client?.phone || !profile?.tenant_id) return;

        // Check stamps via LoyaltyService
        try {
            const { LoyaltyService } = await import('@/lib/loyalty');
            const hasReward = await LoyaltyService.checkReward(profile.tenant_id, client.phone);

            if (hasReward) {
                setVoucher({ type: 'loyalty_reward', phone: client.phone }); // Minimal object for UI
            } else {
                setVoucher(null);
            }
        } catch (err) {
            console.error('Error checking loyalty reward:', err);
            setVoucher(null);
        }
    };

    useEffect(() => {
        if (profile?.tenant_id) {
            fetchPendingOrders(profile.tenant_id);
            fetchTenantFees(profile.tenant_id);
        }
    }, [profile]);

    const fetchTenantFees = async (tid: string) => {
        const { data } = await supabase.from('tenants').select('fee_percent_pix, fee_percent_cash, fee_percent_credit, fee_percent_debit').eq('id', tid).single();
        if (data) {
            setTenantFees({
                pix: Number(data.fee_percent_pix) || 0,
                cash: Number(data.fee_percent_cash) || 0,
                credit: Number(data.fee_percent_credit) || 4.99,
                debit: Number(data.fee_percent_debit) || 1.99
            });
        }
    };

    useEffect(() => {
        if (selected?.client_id) {
            checkLoyaltyVoucher(selected.client_id);
        } else {
            setVoucher(null);
        }
    }, [selected]);

    const handleConfirmPayment = async () => {
        if (!selected || !profile?.tenant_id) return;

        const feeKey = paymentMethod === 'PIX' ? 'pix' : paymentMethod === 'CARTÃO' ? 'credit' : paymentMethod === 'DÉBITO' ? 'debit' : 'cash';
        const feeRate = (tenantFees[feeKey] || 0) / 100;

        const serviceTotal = Number(selected.raw.service_total) || Number(selected.total_price) || 0;
        const productTotal = Number(selected.raw.product_total) || 0;

        const feeAmountServices = serviceTotal * feeRate;
        const feeAmountProducts = productTotal * feeRate;

        // ── Transação atômica: pagamento + CRM + fidelidade em uma única chamada ──
        const { data: rpcResult, error: rpcError } = await supabase.rpc('process_payment_and_loyalty', {
            p_order_id: selected.id,
            p_appointment_id: selected.appointment_id,
            p_tenant_id: profile.tenant_id,
            p_payment_method: paymentMethod,
            p_fee_services: feeAmountServices,
            p_fee_products: feeAmountProducts,
        });

        if (rpcError || !rpcResult?.success) {
            const msg = rpcError?.message || rpcResult?.error || 'Erro desconhecido';
            alert('Erro ao processar pagamento: ' + msg);
            return;
        }

        // Notificar recompensa de fidelidade se conquistada
        if (rpcResult.reward_granted) {
            alert(`🎉 PARABÉNS! ${selected.customer_name} completou o cartão fidelidade!\nPrêmio liberado.`);
        }

        // --- Stock Depletion Integration ---
        const cartItems = selected.raw.items || [];
        const productsInCart = cartItems.filter((i: any) => i.type === 'product');

        if (productsInCart.length > 0) {
            for (const item of productsInCart) {
                try {
                    // 1. Get current stock safely
                    const { data: pData } = await supabase
                        .from('products')
                        .select('current_stock')
                        .eq('id', item.id)
                        .single();

                    const newStock = Math.max(0, (pData?.current_stock || 0) - item.qty);

                    // 2. Update stock
                    await supabase
                        .from('products')
                        .update({ current_stock: newStock })
                        .eq('id', item.id);

                    // 3. Log transaction
                    await supabase
                        .from('stock_transactions')
                        .insert({
                            tenant_id: profile.tenant_id,
                            product_id: item.id,
                            type: 'OUT',
                            quantity: item.qty,
                            reason: `Venda Comanda #${selected.id}`,
                            created_by: profile.id
                        });
                } catch (sError) {
                    console.error('Error depleting stock for item:', item.id, sError);
                }
            }
        }
        // ------------------------------------

        alert(`Pagamento de R$ ${selected.total_price.toFixed(2)} confirmado!\nEstoque atualizado.`);
        setSelected(null);
        if (profile?.tenant_id) fetchPendingOrders(profile.tenant_id);
    };

    if (profileLoading) return <div className="text-center py-20 opacity-40">Carregando caixa...</div>;

    const isSalon = profile?.tenant?.business_type === 'salon';

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 animate-in fade-in duration-500 pb-10">
            <div className="lg:col-span-2 space-y-4 md:space-y-6">
                <div className="flex items-center justify-between px-2 md:px-0">
                    <h3 className="text-lg md:text-xl font-black italic uppercase" style={{ color: colors.text }}>Comandas Pendentes</h3>
                    <span className="text-[9px] md:text-[10px] font-black px-3 py-1 rounded-full border uppercase"
                        style={{ backgroundColor: `${colors.primary}1a`, color: colors.primary, borderColor: `${colors.primary}33` }}>
                        {orders.length} FILA
                    </span>
                </div>

                <div className="grid gap-3 md:gap-4">
                    {loading ? (
                        <div className="text-center py-20 opacity-40">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 mx-auto" style={{ borderColor: colors.primary }}></div>
                        </div>
                    ) : orders.length > 0 ? (
                        orders.map(cmd => (
                            <button
                                key={cmd.id}
                                onClick={() => setSelected(cmd)}
                                className={`w-full p-4 md:p-6 rounded-3xl border text-left transition-all flex items-center justify-between group ${selected?.id === cmd.id ? 'shadow-xl scale-[1.01]' : 'hover:border-white/20'}`}
                                style={{
                                    backgroundColor: selected?.id === cmd.id ? `${colors.primary}1a` : colors.cardBg,
                                    borderColor: selected?.id === cmd.id ? colors.primary : colors.border
                                }}
                            >
                                <div className="flex items-center gap-3 md:gap-4 w-full">
                                    <div className="size-10 md:size-12 rounded-xl flex items-center justify-center transition-colors shrink-0"
                                        style={{ backgroundColor: selected?.id === cmd.id ? colors.primary : `${colors.primary}1a`, color: selected?.id === cmd.id ? (isSalon ? 'white' : 'black') : colors.primary }}>
                                        <span className="material-symbols-outlined text-[20px] md:text-[24px]">receipt</span>
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="font-bold text-base md:text-lg italic tracking-tight truncate" style={{ color: colors.text }}>{cmd.customer_name}</h4>
                                        <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest truncate" style={{ color: colors.textMuted }}>Prof: {cmd.barber_name}</p>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-xl md:text-2xl font-black italic tracking-tighter" style={{ color: colors.primary }}>R$ {(cmd.total_price || 0).toFixed(2)}</p>
                                    <p className="text-[8px] md:text-[10px] font-black uppercase" style={{ color: colors.textMuted }}>
                                        {cmd.time ? new Date(cmd.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                    </p>
                                </div>
                            </button>
                        ))
                    ) : (
                        <div className="py-16 md:py-20 border border-dashed rounded-3xl md:rounded-[2.5rem] flex flex-col items-center justify-center opacity-40" style={{ backgroundColor: `${colors.text}08`, borderColor: colors.border }}>
                            <span className="material-symbols-outlined text-4xl md:text-6xl mb-4 italic" style={{ color: colors.text }}>check_circle</span>
                            <p className="font-black uppercase text-[10px] md:text-xs tracking-[0.4em]" style={{ color: colors.text }}>Tudo em dia</p>
                        </div>
                    )}
                </div>
            </div>

            <aside className="w-full">
                {selected ? (
                    <div className="border p-6 md:p-8 rounded-3xl md:rounded-[2.5rem] space-y-6 md:space-y-8 animate-in slide-in-from-bottom-4 shadow-2xl sticky top-4 md:top-10"
                        style={{ backgroundColor: colors.cardBg, borderColor: `${colors.primary}4d` }}>
                        <div className="text-center">
                            <h3 className="text-xl md:text-2xl font-black italic tracking-tight mb-1 md:mb-2 uppercase" style={{ color: colors.text }}>Recebimento</h3>
                            <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest italic" style={{ color: colors.textMuted }}>{selected.customer_name}</p>
                        </div>

                        <div className="space-y-3 md:space-y-4 max-h-[150px] overflow-y-auto custom-scrollbar pr-2">
                            <div className="flex justify-between items-center text-xs font-bold border-b pb-2" style={{ borderColor: colors.border }}>
                                <span className="italic font-black uppercase tracking-widest text-[9px] truncate mr-4" style={{ color: colors.textMuted }}>{selected.service_name} + Extras</span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest ml-1 italic opacity-60" style={{ color: colors.textMuted }}>Escolha o Método</p>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { label: 'PIX', val: 'PIX' },
                                    { label: 'CRÉDITO', val: 'CARTÃO' },
                                    { label: 'DINHEIRO', val: 'DINHEIRO' },
                                    { label: 'DÉBITO', val: 'DÉBITO' }
                                ].map(m => (
                                    <button
                                        key={m.val}
                                        onClick={() => setPaymentMethod(m.val)}
                                        className={`border font-black py-3 md:py-4 rounded-xl transition-all text-[9px] md:text-[10px] tracking-widest uppercase active:scale-95 ${paymentMethod === m.val ? 'bg-primary text-black' : 'bg-black/40 text-white'}`}
                                        style={{
                                            borderColor: paymentMethod === m.val ? colors.primary : colors.border,
                                            backgroundColor: paymentMethod === m.val ? colors.primary : `${colors.text}0d`,
                                            color: paymentMethod === m.val ? (isSalon ? 'white' : 'black') : colors.text
                                        }}
                                    >
                                        {m.label}
                                    </button>
                                ))}
                            </div>

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
                                            if (!selected || !profile?.tenant_id) return;
                                            if (confirm('Confirmar uso do cartão fidelidade? O total será zerado e o cartão será reiniciado.')) {
                                                try {
                                                    const { LoyaltyService } = await import('@/lib/loyalty');
                                                    const success = await LoyaltyService.redeemReward(profile.tenant_id, selected.client_phone);

                                                    if (success) {
                                                        await supabase.from('orders').update({ total_value: 0 }).eq('id', selected.id);
                                                        setSelected({ ...selected, total_price: 0 });
                                                        setVoucher(null);
                                                        alert('Cortesia aplicada e cartão reiniciado!');
                                                    } else {
                                                        alert('Erro ao resgatar recompensa. Verifique o saldo de selos.');
                                                    }
                                                } catch (err) {
                                                    console.error('Redeem Error:', err);
                                                }
                                            }
                                        }}
                                        className="bg-emerald-500 text-black text-[9px] font-black uppercase tracking-widest px-3 py-2 rounded-lg hover:bg-emerald-400"
                                    >
                                        Aplicar
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="pt-5 md:pt-6 border-t" style={{ borderColor: colors.border }}>
                            <div className="flex justify-between items-end mb-5 md:mb-6">
                                <span className="font-bold uppercase text-[9px] md:text-[10px] tracking-widest italic opacity-50" style={{ color: colors.textMuted }}>Total</span>
                                <span className="text-3xl md:text-4xl font-black italic tracking-tighter" style={{ color: colors.primary }}>R$ {(selected.total_price || 0).toFixed(2)}</span>
                            </div>
                            <button
                                onClick={handleConfirmPayment}
                                className="w-full font-black py-4 md:py-5 rounded-xl md:rounded-2xl text-base md:text-lg shadow-2xl transition-all flex items-center justify-center gap-2 uppercase italic active:scale-95"
                                style={{ backgroundColor: colors.primary, color: isSalon ? 'white' : 'black', boxShadow: `0 10px 20px -5px ${colors.primary}33` }}
                            >
                                CONFIRMAR
                                <span className="material-symbols-outlined text-xl md:text-2xl">check_circle</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="h-full min-h-[300px] md:min-h-[400px] border border-dashed rounded-3xl md:rounded-[2.5rem] flex flex-col items-center justify-center p-6 md:p-8 text-center sticky top-4 md:top-10"
                        style={{ backgroundColor: `${colors.text}08`, borderColor: colors.border }}>
                        <div className="size-16 md:size-20 rounded-full flex items-center justify-center mb-4 md:mb-6" style={{ backgroundColor: `${colors.text}0d`, color: colors.textMuted }}>
                            <span className="material-symbols-outlined text-4xl md:text-5xl">point_of_sale</span>
                        </div>
                        <p className="font-bold uppercase text-[10px] md:text-xs tracking-widest leading-relaxed" style={{ color: colors.textMuted }}>
                            Selecione uma comanda <br className="hidden md:block" /> para processar
                        </p>
                    </div>
                )}
            </aside>
        </div>
    );
}
