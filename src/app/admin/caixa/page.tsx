"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/hooks/useProfile';

export default function CashierCheckoutPage() {
    const { profile, loading: profileLoading, theme: colors } = useProfile();
    const [orders, setOrders] = useState<any[]>([]);
    const [historyOrders, setHistoryOrders] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
    const [selected, setSelected] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [voucher, setVoucher] = useState<any>(null);
    const [paymentMethod, setPaymentMethod] = useState<string>('DINHEIRO');
    const [tenantFees, setTenantFees] = useState<any>({ pix: 0, cash: 0, credit: 4.99, debit: 1.99 });
    const [rewardServiceName, setRewardServiceName] = useState<string | null>(null);

    // States for adding items
    const [availableServices, setAvailableServices] = useState<any[]>([]);
    const [availableProducts, setAvailableProducts] = useState<any[]>([]);
    const [showAddItem, setShowAddItem] = useState(false);
    const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);
    // 🛡️ [BLINDADO] Prevenção de duplo clique em devoluções
    const [isReturningOrder, setIsReturningOrder] = useState(false);
    const [inclusionTab, setInclusionTab] = useState<'services' | 'products'>('services');
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);

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
                items,
                appointments:appointment_id (
                    id, 
                    customer_name,
                    customer_whatsapp,
                    scheduled_at, 
                    client_id,
                    barber_id,
                    profiles!appointments_barber_id_fkey(full_name, service_commission, product_commission),
                    services(id, name, price)
                )
            `)
            .eq('tenant_id', tid)
            .eq('status', 'pending_payment')
            .order('finalized_at', { ascending: true });

        if (error) {
            console.error('[Caixa] Erro ao buscar comandas pendentes:', error);
        }

        if (!error && data) {
            const formatted = data.map((o: any) => ({
                id: o.id,
                appointment_id: o.appointments?.id,
                customer_name: o.appointments?.customer_name || 'Sem nome',
                barber_name: o.appointments?.profiles?.full_name || 'Agendamento Externo',
                service_name: o.appointments?.services?.name || 'Serviços Diversos',
                time: o.appointments?.scheduled_at || o.finalized_at,
                total_price: o.total_value,
                commission: o.commission_amount,
                client_id: o.appointments?.client_id,
                client_phone: o.appointments?.customer_whatsapp,
                barber_id: o.appointments?.barber_id,
                barber_commission: {
                    service: o.appointments?.profiles?.service_commission || 50,
                    product: o.appointments?.profiles?.product_commission || 10
                },
                raw: o
            }));
            setOrders(formatted);

            // 🛡️ [BLINDADO] Realtime Sync: Maintain the currently selected item fresh
            setSelected((prevSelected: any) => {
                if (!prevSelected) return prevSelected;
                const freshData = formatted.find(o => o.id === prevSelected.id);
                return freshData ? freshData : prevSelected;
            });
        }
        setLoading(false);
    };

    // 🛡️ [BLINDADO] - Histórico de Comandas (90 Dias Max LGPD)
    const fetchHistoryOrders = async (tid: string) => {
        setLoading(true);
        const now = new Date();
        const tzOffsetMs = now.getTimezoneOffset() * 60000;
        const ninetyDaysAgo = new Date(now.getTime() - tzOffsetMs);
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        const { data, error } = await supabase
            .from('orders')
            .select(`
                id, 
                total_value, 
                status, 
                finalized_at,
                payment_method,
                appointments:appointment_id (
                    customer_name,
                    profiles(full_name),
                    services(name)
                )
            `)
            .eq('tenant_id', tid)
            .eq('status', 'paid')
            .gte('finalized_at', ninetyDaysAgo.toISOString())
            .order('finalized_at', { ascending: false });

        if (!error && data) {
            const formatted = data.map((o: any) => ({
                id: o.id,
                customer_name: o.appointments?.customer_name,
                barber_name: o.appointments?.profiles?.full_name,
                service_name: o.appointments?.services?.name,
                time: o.finalized_at,
                total_price: o.total_value,
                payment_method: o.payment_method
            }));
            setHistoryOrders(formatted);
        }
        setLoading(false);
    };

    const checkLoyaltyVoucher = async (clientId: string) => {
        if (!clientId || !profile?.tenant_id) return;

        try {
            const { data: client } = await supabase.from('clients').select('phone').eq('id', clientId).single();
            if (!client?.phone) return;

            const { LoyaltyService } = await import('@/lib/loyalty');
            const result = await LoyaltyService.checkReward(profile.tenant_id, client.phone);

            if (result.reward_granted) {
                setVoucher({ type: 'loyalty_reward', phone: client.phone });

                // Fetch Reward Name
                const { data: tenantData } = await supabase
                    .from('tenants')
                    .select('loyalty_reward_service_id')
                    .eq('id', profile.tenant_id)
                    .single();

                if (tenantData?.loyalty_reward_service_id) {
                    const { data: rewardData } = await supabase
                        .from('loyalty_rewards_services')
                        .select('name')
                        .eq('id', tenantData.loyalty_reward_service_id)
                        .maybeSingle();
                    setRewardServiceName(rewardData?.name || 'Corte Grátis');
                } else {
                    setRewardServiceName('Corte Grátis');
                }
            } else {
                setVoucher(null);
                setRewardServiceName(null);
            }
        } catch (err) {
            console.error('Error checking loyalty reward:', err);
            setVoucher(null);
            setRewardServiceName(null);
        }
    };

    const tenantIdRef = React.useRef(profile?.tenant_id);
    const activeTabRef = React.useRef(activeTab);

    useEffect(() => {
        tenantIdRef.current = profile?.tenant_id;
        activeTabRef.current = activeTab;

        if (profile?.tenant_id) {
            if (activeTab === 'pending') fetchPendingOrders(profile.tenant_id);
            if (activeTab === 'history') fetchHistoryOrders(profile.tenant_id);
        }
    }, [profile, activeTab]);

    useEffect(() => {
        if (profile?.tenant_id) {
            fetchCatalog(profile.tenant_id);
            fetchTenantFees(profile.tenant_id);
        }
    }, [profile?.tenant_id]);

    useEffect(() => {
        if (selected && availableServices.length === 0 && profile?.tenant_id) {
            fetchCatalog(profile.tenant_id);
        }

        if (selected?.client_id) {
            checkLoyaltyVoucher(selected.client_id);
        } else {
            setVoucher(null);
            setRewardServiceName(null);
        }
    }, [selected]);

    useEffect(() => {
        let channel: ReturnType<typeof supabase.channel> | null = null;
        let pollInterval: ReturnType<typeof setInterval> | null = null;

        const setupRealtime = () => {
            const currentTenant = tenantIdRef.current;
            if (!currentTenant) return;

            channel = supabase
                .channel(`caixa-orders-${currentTenant}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'orders',
                        filter: `tenant_id=eq.${currentTenant}`
                    },
                    (payload) => {
                        const tab = activeTabRef.current;
                        const tid = tenantIdRef.current;
                        if (tid) {
                            if (tab === 'pending') fetchPendingOrders(tid);
                            if (tab === 'history') fetchHistoryOrders(tid);
                        }
                    }
                )
                .subscribe();

            pollInterval = setInterval(() => {
                const tab = activeTabRef.current;
                const tid = tenantIdRef.current;
                if (tid) {
                    if (tab === 'pending') fetchPendingOrders(tid);
                    if (tab === 'history') fetchHistoryOrders(tid);
                }
            }, 15000);
        };

        if (profile?.tenant_id) {
            setupRealtime();
        }

        return () => {
            if (channel) supabase.removeChannel(channel);
            if (pollInterval) clearInterval(pollInterval);
        };
    }, [profile?.tenant_id]);

    const fetchCatalog = async (tid: string) => {
        if (!tid) return;
        try {
            const [servRes, prodRes] = await Promise.all([
                supabase.from('services').select('*').eq('tenant_id', tid).order('name'),
                supabase.from('products').select('*').eq('tenant_id', tid).gt('current_stock', 0).order('name')
            ]);

            if (servRes.data) setAvailableServices(servRes.data);
            if (prodRes.data) setAvailableProducts(prodRes.data);
        } catch (err) {
            console.error('[Caixa] Erro critico no fetchCatalog:', err);
        }
    };

    const handleRemoveItem = async (idx: number) => {
        if (!selected || isUpdatingOrder) return;
        if (!confirm('Deseja remover este item da fatura?')) return;
        setIsUpdatingOrder(true);

        const currentItems = [...(selected.raw.items || [])];
        const newItems = currentItems.filter((_, i) => i !== idx);

        const mainServiceId = selected.raw.appointments?.service_id || selected.raw.appointments?.services?.id;
        const mainService = availableServices.find(s => s.id === mainServiceId);
        const mainServicePrice = mainService ? Number(mainService.price) : Number(selected.raw.appointments?.services?.price || 0);

        let newServiceTotal = mainServicePrice;
        let newProductTotal = 0;

        newItems.forEach((i: any) => {
            const itemVal = Number(i.price) * (i.qty || 1);
            if (i.type === 'service') newServiceTotal += itemVal;
            else newProductTotal += itemVal;
        });

        const newTotalValue = newServiceTotal + newProductTotal;
        const sRate = Number(selected.barber_commission.service) / 100;
        const pRate = Number(selected.barber_commission.product) / 100;
        const newCommission = (newServiceTotal * sRate) + (newProductTotal * pRate);

        const updatePayload = {
            items: newItems,
            service_total: newServiceTotal,
            product_total: newProductTotal,
            total_value: newTotalValue,
            commission_amount: newCommission
        };

        setSelected({
            ...selected,
            total_price: newTotalValue,
            commission: newCommission,
            raw: { ...selected.raw, ...updatePayload }
        });

        await supabase.from('orders').update(updatePayload).eq('id', selected.id);
        setIsUpdatingOrder(false);
    };

    const handleUpdateQty = async (idx: number, delta: number) => {
        if (!selected || isUpdatingOrder) return;

        const currentItems = [...(selected.raw.items || [])];
        const item = currentItems[idx];
        if (item.type !== 'product') return;

        const newQty = Math.max(1, (item.qty || 1) + delta);
        if (newQty === item.qty) return;

        currentItems[idx] = { ...item, qty: newQty };

        const mainServiceId = selected.raw.appointments?.service_id || selected.raw.appointments?.services?.id;
        const mainService = availableServices.find(s => s.id === mainServiceId);
        const mainServicePrice = mainService ? Number(mainService.price) : Number(selected.raw.appointments?.services?.price || 0);

        let newServiceTotal = mainServicePrice;
        let newProductTotal = 0;

        currentItems.forEach((i: any) => {
            const itemVal = Number(i.price) * (i.qty || 1);
            if (i.type === 'service') newServiceTotal += itemVal;
            else newProductTotal += itemVal;
        });

        const newTotalValue = newServiceTotal + newProductTotal;
        const sRate = Number(selected.barber_commission?.service || 50) / 100;
        const pRate = Number(selected.barber_commission?.product || 10) / 100;
        const newCommission = (newServiceTotal * sRate) + (newProductTotal * pRate);

        const updatePayload = {
            items: currentItems,
            service_total: newServiceTotal,
            product_total: newProductTotal,
            total_value: newTotalValue,
            commission_amount: newCommission
        };

        setSelected({
            ...selected,
            total_price: newTotalValue,
            commission: newCommission,
            raw: { ...selected.raw, ...updatePayload }
        });

        await supabase.from('orders').update(updatePayload).eq('id', selected.id);
    };

    const handleUpdateMainService = async (serviceId: string) => {
        if (!selected || !selected.raw.appointments || isUpdatingOrder) return;
        setIsUpdatingOrder(true);

        const service = availableServices.find(s => s.id === serviceId);
        if (!service) {
            setIsUpdatingOrder(false);
            return;
        }

        const mainServicePrice = Number(service.price);
        const currentItems = selected.raw.items || [];

        let newServiceTotal = mainServicePrice;
        let newProductTotal = 0;

        currentItems.forEach((i: any) => {
            const itemVal = Number(i.price) * (i.qty || 1);
            if (i.type === 'service') newServiceTotal += itemVal;
            else newProductTotal += itemVal;
        });

        const newTotalValue = newServiceTotal + newProductTotal;
        const sRate = Number(selected.barber_commission.service) / 100;
        const pRate = Number(selected.barber_commission.product) / 100;
        const newCommission = (newServiceTotal * sRate) + (newProductTotal * pRate);

        try {
            const updatedSelected = {
                ...selected,
                service_name: service.name,
                total_price: newTotalValue,
                commission: newCommission,
                raw: {
                    ...selected.raw,
                    service_total: newServiceTotal,
                    total_value: newTotalValue,
                    commission_amount: newCommission,
                    appointments: {
                        ...selected.raw.appointments,
                        service_id: serviceId,
                        services: { ...service }
                    }
                }
            };
            setSelected(updatedSelected);

            await supabase.from('appointments').update({ service_id: serviceId }).eq('id', selected.appointment_id);
            await supabase.from('orders').update({
                service_total: newServiceTotal,
                total_value: newTotalValue,
                commission_amount: newCommission
            }).eq('id', selected.id);
        } catch (err: any) {
            console.error('Error syncing main service:', err);
        } finally {
            setIsUpdatingOrder(false);
        }
    };

    const fetchTenantFees = async (tid: string) => {
        const { data } = await supabase.from('tenants').select('fee_percent_pix, fee_percent_cash, fee_percent_credit, fee_percent_debit, payment_methods').eq('id', tid).single();
        if (data) {
            setTenantFees({
                pix: Number(data.fee_percent_pix) || 0,
                cash: Number(data.fee_percent_cash) || 0,
                credit: Number(data.fee_percent_credit) || 4.99,
                debit: Number(data.fee_percent_debit) || 1.99,
                payment_methods: data.payment_methods || ['PIX', 'CARTÃO', 'DINHEIRO', 'DÉBITO']
            });
        }
    };

    const handleReturnOrder = async () => {
        if (!selected || isReturningOrder) return;
        if (!confirm('Devolver esta comanda para a fila do profissional?')) return;
        setIsReturningOrder(true);
        try {
            const { data, error } = await supabase.rpc('return_order_to_professional', {
                p_order_id: selected.id,
                p_appointment_id: selected.appointment_id || null
            });
            if (!error && data?.success) {
                setSelected(null);
                if (profile?.tenant_id) fetchPendingOrders(profile.tenant_id);
            }
        } catch (err) {
            console.error('Return Error:', err);
        } finally {
            setIsReturningOrder(false);
        }
    };

    const handleConfirmPayment = async () => {
        if (!selected || !profile?.tenant_id || isProcessingPayment) return;
        setIsProcessingPayment(true);

        const feeKey = paymentMethod === 'PIX' ? 'pix' : paymentMethod === 'CARTÃO' ? 'credit' : paymentMethod === 'DÉBITO' ? 'debit' : 'cash';
        const feeRate = (tenantFees[feeKey] || 0) / 100;

        const serviceTotal = Number(selected.raw.service_total) || Number(selected.total_price) || 0;
        const productTotal = Number(selected.raw.product_total) || 0;

        const feeAmountServices = serviceTotal * feeRate;
        const feeAmountProducts = productTotal * feeRate;

        const cartItems = selected.raw.items || [];
        const productsInCart = cartItems.filter((i: any) => i.type === 'product');

        const { data: rpcResult, error: rpcError } = await supabase.rpc('process_checkout_v2', {
            p_order_id: selected.id,
            p_appointment_id: selected.appointment_id,
            p_tenant_id: profile.tenant_id,
            p_payment_method: paymentMethod,
            p_fee_services: feeAmountServices,
            p_fee_products: feeAmountProducts,
            p_products_json: productsInCart.map((p: any) => ({ id: p.id, qty: p.qty })),
            p_created_by: profile.id
        });

        if (rpcError || !rpcResult?.success) {
            alert('Erro ao processar pagamento.');
            setIsProcessingPayment(false);
            return;
        }

        if (rpcResult.reward_granted) {
            alert(`🎉 PARABÉNS! ${selected.customer_name} completou o cartão fidelidade!`);
        }

        setSelected(null);
        if (profile?.tenant_id) fetchPendingOrders(profile.tenant_id);

        // 🔔 [REAL-TIME] Force Sidebar badge update immediately
        window.dispatchEvent(new CustomEvent('checkout-completed'));

        setIsProcessingPayment(false);
    };

    const toggleSelectItem = (id: string) => {
        setSelectedItems(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const addSelectedToCart = async () => {
        if (!selected || selectedItems.length === 0 || isUpdatingOrder) return;
        setIsUpdatingOrder(true);

        const itemsToAdd: any[] = [];
        selectedItems.forEach(id => {
            if (inclusionTab === 'services') {
                const s = availableServices.find(x => x.id === id);
                if (s) itemsToAdd.push({ ...s, type: 'service', qty: 1 });
            } else {
                const p = availableProducts.find(x => x.id === id);
                if (p) itemsToAdd.push({ ...p, price: p.sale_price, type: 'product', qty: 1 });
            }
        });

        const currentItems = [...(selected.raw.items || [])];
        itemsToAdd.forEach(item => {
            const existing = currentItems.find(i => i.id === item.id);
            if (existing) {
                existing.qty = (existing.qty || 1) + 1;
            } else {
                currentItems.push(item);
            }
        });

        const mainServiceId = selected.raw.appointments?.service_id || selected.raw.appointments?.services?.id;
        const mainService = availableServices.find(s => s.id === mainServiceId);
        const mainServicePrice = mainService ? Number(mainService.price) : Number(selected.raw.appointments?.services?.price || 0);

        let newServiceTotal = mainServicePrice;
        let newProductTotal = 0;

        currentItems.forEach((i: any) => {
            const itemVal = Number(i.price) * (i.qty || 1);
            if (i.type === 'service') newServiceTotal += itemVal;
            else newProductTotal += itemVal;
        });

        const newTotalValue = newServiceTotal + newProductTotal;
        const sRate = Number(selected.barber_commission.service) / 100;
        const pRate = Number(selected.barber_commission.product) / 100;
        const newCommission = (newServiceTotal * sRate) + (newProductTotal * pRate);

        const updatePayload = {
            items: currentItems,
            service_total: newServiceTotal,
            product_total: newProductTotal,
            total_value: newTotalValue,
            commission_amount: newCommission
        };

        setSelected({
            ...selected,
            total_price: newTotalValue,
            commission: newCommission,
            raw: { ...selected.raw, ...updatePayload }
        });

        await supabase.from('orders').update(updatePayload).eq('id', selected.id);
        setSelectedItems([]);
        setIsUpdatingOrder(false);
    };

    if (profileLoading) return <div className="text-center py-20 opacity-40">Carregando caixa...</div>;

    const isSalon = profile?.tenant?.business_type === 'salon';
    const businessType = profile?.tenant?.business_type;

    const calculatedTotal = selected ? (
        (Number(availableServices.find(s => s.id === (selected.raw.appointments?.service_id || selected.raw.appointments?.services?.id))?.price || selected.raw.appointments?.services?.price || 0)) +
        (selected.raw.items || []).reduce((acc: number, item: any) => acc + (Number(item.price) * (item.qty || 1)), 0)
    ) : 0;

    return (
        <div className="flex flex-col xl:flex-row gap-6 md:gap-8 animate-in slide-in-from-right duration-500 pb-10">
            {/* CENTRAL AREA */}
            <div className="flex-1 space-y-6 md:space-y-8">
                {selected ? (
                    <>
                        {/* HEADER COMANDA (MIRROR PROFISSIONAL) */}
                        <div className="border p-5 md:p-8 rounded-3xl md:rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6" style={{ backgroundColor: colors.cardBg, borderColor: `${colors.primary}33` }}>
                            <div className="flex items-center gap-3 md:gap-4 w-full">
                                <button onClick={() => setSelected(null)} className="transition-colors hover:scale-110 active:scale-90" style={{ color: colors.textMuted }}>
                                    <span className="material-symbols-outlined text-2xl md:text-3xl">arrow_back</span>
                                </button>
                                <div className="size-12 md:size-16 rounded-xl md:rounded-2xl flex items-center justify-center border shadow-inner shrink-0" style={{ backgroundColor: `${colors.primary}33`, color: colors.primary, borderColor: `${colors.primary}33` }}>
                                    <span className="material-symbols-outlined text-2xl md:text-4xl text-white">person</span>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-lg md:text-2xl font-black italic uppercase tracking-tight truncate" style={{ color: colors.text }}>{selected.customer_name}</h3>
                                    <p className="font-black text-[11px] md:text-[12px] uppercase tracking-[0.2em] opacity-60 truncate" style={{ color: colors.textMuted }}>
                                        {selected.raw.appointments?.scheduled_at ? (
                                            `${new Date(selected.raw.appointments.scheduled_at).toLocaleDateString('pt-BR')} às ${selected.raw.appointments.scheduled_at.split('T')[1].substring(0, 5)}`
                                        ) : 'COMANDA AVULSA'}
                                    </p>
                                </div>
                                <div className="hidden md:flex flex-col items-end">
                                    <span className="text-[10px] font-black opacity-40 uppercase tracking-widest" style={{ color: colors.text }}>STATUS</span>
                                    <span className="text-xs font-black italic px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 uppercase">PENDENTE</span>
                                </div>
                            </div>
                        </div>

                        <div className="px-2 md:px-0 space-y-8">
                            <div className="p-6 md:p-8 rounded-3xl border" style={{ backgroundColor: colors.cardBg, borderColor: `${colors.text}0d` }}>
                                <h4 className="text-base md:text-lg font-black uppercase italic tracking-tight mb-6 flex items-center gap-2" style={{ color: colors.text }}>
                                    <span className="material-symbols-outlined text-primary">edit_note</span> SERVIÇOS
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-widest opacity-50 ml-1" style={{ color: colors.textMuted }}>Serviço Agendado</label>
                                        <select
                                            className="w-full bg-black border border-white/10 rounded-xl py-4 px-4 text-sm font-bold text-white focus:border-primary outline-none transition-all cursor-pointer"
                                            value={selected.raw.appointments?.service_id || selected.raw.appointments?.services?.id}
                                            onChange={(e) => handleUpdateMainService(e.target.value)}
                                            disabled={isUpdatingOrder}
                                        >
                                            {availableServices.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-widest opacity-50 ml-1" style={{ color: colors.textMuted }}>Valor do Serviço (R$)</label>
                                        <div className="w-full bg-black/40 border border-white/5 rounded-xl py-4 px-4 text-sm font-bold text-zinc-400 opacity-60">
                                            {Number(availableServices.find(s => s.id === (selected.raw.appointments?.service_id || selected.raw.appointments?.services?.id))?.price || selected.raw.appointments?.services?.price || 0).toFixed(2)}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                                    <h4 className="text-base md:text-lg font-black uppercase italic tracking-tight flex items-center gap-2" style={{ color: colors.text }}>
                                        <span className="material-symbols-outlined text-primary">add_circle</span> + INCLUIR
                                    </h4>

                                    <div className="flex p-1 rounded-2xl bg-black/40 border border-white/5 w-fit gap-1">
                                        <button
                                            onClick={() => setInclusionTab('services')}
                                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${inclusionTab === 'services' ? 'bg-primary text-black italic' : 'text-zinc-500 hover:text-white'}`}
                                            style={inclusionTab === 'services' ? { backgroundColor: colors.primary } : {}}
                                        > SERVIÇOS </button>
                                        <button
                                            onClick={() => setInclusionTab('products')}
                                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${inclusionTab === 'products' ? 'bg-primary text-black italic' : 'text-zinc-500 hover:text-white'}`}
                                            style={inclusionTab === 'products' ? { backgroundColor: colors.primary } : {}}
                                        > PRODUTOS </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                                    {inclusionTab === 'services' ? (
                                        availableServices.filter(s => s.id !== (selected.raw.appointments?.service_id || selected.raw.appointments?.services?.id) && !selected.raw.items?.some((c: any) => c.id === s.id)).map(s => (
                                            <div key={s.id} className={`p-4 rounded-3xl border group transition-all relative ${selectedItems.includes(s.id) ? 'ring-2 ring-primary ring-offset-2 ring-offset-black' : ''}`} style={{ backgroundColor: colors.cardBg, borderColor: `${colors.text}0d` }}>
                                                <div className="flex gap-4 mb-4">
                                                    <div className="size-20 rounded-2xl flex items-center justify-center border overflow-hidden shrink-0" style={{ backgroundColor: `${colors.primary}1a`, borderColor: `${colors.primary}33`, color: colors.primary }}>
                                                        {s.image_url ? (
                                                            <img src={s.image_url} alt={s.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="material-symbols-outlined text-3xl">brush</span>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                                                        <h4 className="font-bold text-sm truncate uppercase italic" style={{ color: colors.text }}>{s.name}</h4>
                                                        <div className="flex justify-between items-end">
                                                            <input
                                                                type="checkbox"
                                                                className="size-5 rounded border-white/20 bg-black accent-primary cursor-pointer"
                                                                checked={selectedItems.includes(s.id)}
                                                                onChange={() => toggleSelectItem(s.id)}
                                                            />
                                                            <span className="font-black text-base italic" style={{ color: colors.primary }}>R$ {s.price}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        availableProducts.filter(p => !selected.raw.items?.some((c: any) => c.id === p.id)).map(p => (
                                            <div key={p.id} className={`p-4 rounded-3xl border group transition-all relative ${selectedItems.includes(p.id) ? 'ring-2 ring-primary ring-offset-2 ring-offset-black' : ''}`} style={{ backgroundColor: colors.cardBg, borderColor: `${colors.text}0d` }}>
                                                <div className="flex gap-4 mb-4">
                                                    <div className="size-20 rounded-2xl flex items-center justify-center border overflow-hidden shrink-0 bg-black/20" style={{ borderColor: `${colors.primary}1a`, color: colors.primary }}>
                                                        {p.image_url ? (
                                                            <img alt={p.name} src={p.image_url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                                        ) : (
                                                            <span className="material-symbols-outlined text-3xl">inventory_2</span>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                                                        <h4 className="font-bold text-sm truncate uppercase italic" style={{ color: colors.text }}>{p.name}</h4>
                                                        <div className="flex justify-between items-end">
                                                            <input
                                                                type="checkbox"
                                                                className="size-5 rounded border-white/20 bg-black accent-primary cursor-pointer"
                                                                checked={selectedItems.includes(p.id)}
                                                                onChange={() => toggleSelectItem(p.id)}
                                                            />
                                                            <span className="font-black text-base italic" style={{ color: colors.primary }}>R$ {p.sale_price}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {selectedItems.length > 0 && (
                                    <div className="mt-8 flex justify-center animate-in fade-in slide-in-from-bottom-4 duration-300">
                                        <button
                                            onClick={addSelectedToCart}
                                            disabled={isUpdatingOrder}
                                            className="px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl transition-all flex items-center gap-3 hover:scale-105 active:scale-95 italic"
                                            style={{ backgroundColor: colors.primary, color: businessType === 'salon' ? '#fff' : '#000' }}
                                        >
                                            <span className="material-symbols-outlined">add_shopping_cart</span>
                                            INCLUIR SELECIONADOS ({selectedItems.length})
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex items-center justify-between px-2 md:px-0 mb-4">
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setActiveTab('pending')}
                                    className={`text-sm md:text-base font-black italic uppercase transition-all ${activeTab === 'pending' ? 'opacity-100' : 'opacity-40 hover:opacity-70'}`}
                                    style={{ color: activeTab === 'pending' ? colors.primary : colors.text }}
                                >
                                    Fila Pendente
                                </button>
                                <button
                                    onClick={() => setActiveTab('history')}
                                    className={`text-sm md:text-base font-black italic uppercase transition-all ${activeTab === 'history' ? 'opacity-100' : 'opacity-40 hover:opacity-70'}`}
                                    style={{ color: activeTab === 'history' ? colors.primary : colors.text }}
                                >
                                    Histórico (90 Dias)
                                </button>
                            </div>
                            {activeTab === 'pending' && (
                                <span className="text-[9px] md:text-[10px] font-black px-3 py-1 rounded-full border uppercase"
                                    style={{ backgroundColor: `${colors.primary}1a`, color: colors.primary, borderColor: `${colors.primary}33` }}>
                                    {orders.length} FILA
                                </span>
                            )}
                        </div>

                        <div className="grid gap-3 md:gap-4">
                            {loading ? (
                                <div className="text-center py-20 opacity-40">
                                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 mx-auto" style={{ borderColor: colors.primary }}></div>
                                </div>
                            ) : (activeTab === 'pending' ? orders : historyOrders).length > 0 ? (
                                (activeTab === 'pending' ? orders : historyOrders).map(cmd => (
                                    <button
                                        key={cmd.id}
                                        onClick={() => activeTab === 'pending' ? setSelected(cmd) : null}
                                        className={`w-full p-4 md:p-6 rounded-3xl border text-left transition-all flex items-center justify-between group ${selected?.id === cmd.id ? 'shadow-xl scale-[1.01]' : 'hover:border-white/20'} ${activeTab === 'history' ? 'cursor-default border-white/5 opacity-80' : ''}`}
                                        style={{
                                            backgroundColor: selected?.id === cmd.id ? `${colors.primary}1a` : colors.cardBg,
                                            borderColor: selected?.id === cmd.id ? colors.primary : colors.border
                                        }}
                                    >
                                        <div className="flex items-center gap-3 md:gap-4 w-full">
                                            <div className="size-10 md:size-12 rounded-xl flex items-center justify-center transition-colors shrink-0"
                                                style={{ backgroundColor: selected?.id === cmd.id ? colors.primary : `${colors.primary}1a`, color: selected?.id === cmd.id ? (isSalon ? 'white' : 'black') : colors.primary }}>
                                                <span className="material-symbols-outlined text-[20px] md:text-[24px]">
                                                    {activeTab === 'pending' ? 'receipt' : 'check_circle'}
                                                </span>
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-bold text-base md:text-lg italic tracking-tight truncate" style={{ color: activeTab === 'history' ? colors.primary : colors.text }}>
                                                    {cmd.customer_name}
                                                </h4>
                                                <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest truncate flex items-center gap-2" style={{ color: colors.textMuted }}>
                                                    <span>Prof: {cmd.barber_name}</span>
                                                    {activeTab === 'history' && cmd.payment_method && (
                                                        <span className="font-black" style={{ color: colors.textMuted }}>• {cmd.payment_method}</span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-xl md:text-2xl font-black italic tracking-tighter" style={{ color: activeTab === 'history' ? colors.text : colors.primary }}>
                                                R$ {(cmd.total_price || 0).toFixed(2)}
                                            </p>
                                            <p className="text-[8px] md:text-[10px] font-black uppercase" style={{ color: colors.textMuted }}>
                                                {cmd.time ? new Date(cmd.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                {activeTab === 'history' && cmd.time && ` - ${new Date(cmd.time).toLocaleDateString()}`}
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
                    </>
                )}
            </div>

            {/* SIDEBAR - RECEBIMENTO / COMANDA VIRTUAL (MIRROR PROFISSIONAL) */}
            <div className="w-full xl:w-[400px] shrink-0 h-fit">
                {selected ? (
                    <div className="p-6 md:p-8 rounded-[2.5rem] md:rounded-[3rem] border animate-in slide-in-from-right duration-500 shadow-2xl sticky top-8" style={{ backgroundColor: colors.cardBg, borderColor: `${colors.primary}33` }}>
                        <div className="flex justify-between items-center mb-8">
                            <button onClick={() => setSelected(null)} className="flex items-center gap-2 group">
                                <span className="material-symbols-outlined text-base md:text-lg transition-transform group-hover:-translate-x-1" style={{ color: colors.textMuted }}>arrow_back</span>
                                <span className="text-[10px] md:text-[11px] font-black uppercase tracking-widest" style={{ color: colors.textMuted }}>VOLTAR</span>
                            </button>
                            <button onClick={handleReturnOrder} disabled={isReturningOrder || isProcessingPayment} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 transition-all">
                                <span className="material-symbols-outlined text-sm">undo</span>
                                <span className="text-[9px] font-black uppercase tracking-widest">DEVOLVER MÃO DE OBRA</span>
                            </button>
                        </div>

                        <h2 className="text-2xl md:text-3xl font-black italic uppercase tracking-tight mb-8 text-center" style={{ color: colors.text }}> RECEBIMENTO </h2>

                        <div className="space-y-6">
                            <div className="p-5 md:p-6 rounded-2xl md:rounded-3xl bg-black/40 border space-y-4" style={{ borderColor: `${colors.text}0d` }}>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="material-symbols-outlined text-primary text-sm">star</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: colors.textMuted }}>Serviço Principal</span>
                                    <span className="ml-auto text-xs font-black italic" style={{ color: colors.primary }}>R$ {Number(availableServices.find(s => s.id === (selected.raw.appointments?.service_id || selected.raw.appointments?.services?.id))?.price || selected.raw.appointments?.services?.price || 0).toFixed(2)}</span>
                                </div>
                                <div className="w-full py-3 px-4 rounded-xl border bg-black/60 text-[11px] font-bold text-white flex justify-between items-center group cursor-default" style={{ borderColor: `${colors.primary}33` }}>
                                    <span className="truncate">{selected.raw.appointments?.services?.name || 'Carregando...'}</span>
                                    <span className="material-symbols-outlined text-xs opacity-40">lock</span>
                                </div>

                                {/* ITEMS LIST (MIRROR PROFISSIONAL SIDEBAR) */}
                                {selected.raw?.items && selected.raw.items.length > 0 && (
                                    <div className="pt-4 border-t space-y-3" style={{ borderColor: `${colors.text}0d` }}>
                                        {selected.raw.items.map((item: any, idx: number) => (
                                            <div key={idx} className="flex justify-between items-center group/item animate-in fade-in slide-in-from-right-2 duration-300">
                                                <div className="flex items-center gap-3">
                                                    <button onClick={() => handleRemoveItem(idx)} className="size-8 rounded-lg flex items-center justify-center bg-rose-500/10 text-rose-500 hover:bg-rose-500 opacity-40 hover:opacity-100 transition-all group-hover/item:opacity-100">
                                                        <span className="material-symbols-outlined text-lg">delete</span>
                                                    </button>
                                                    <div className="flex flex-col">
                                                        <p className="text-[10px] font-black uppercase italic truncate max-w-[150px]" style={{ color: colors.text }}>{item.name}</p>
                                                        {item.type === 'product' ? (
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <button onClick={() => handleUpdateQty(idx, -1)} className="size-4 rounded-md bg-white/5 flex items-center justify-center hover:bg-white/10 text-[8px] font-black group-hover/item:bg-white/10">-</button>
                                                                <span className="text-[9px] font-black italic" style={{ color: colors.primary }}>{item.qty}x</span>
                                                                <button onClick={() => handleUpdateQty(idx, 1)} className="size-4 rounded-md bg-white/5 flex items-center justify-center hover:bg-white/10 text-[8px] font-black group-hover/item:bg-white/10">+</button>
                                                                <span className="text-[7px] font-bold opacity-30 uppercase tracking-[0.2em] ml-1" style={{ color: colors.textMuted }}>PRODUTO</span>
                                                            </div>
                                                        ) : (
                                                            <p className="text-[8px] font-bold opacity-40 uppercase tracking-widest mt-1" style={{ color: colors.textMuted }}>SERVIÇO</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <p className="text-xs font-black italic" style={{ color: colors.textMuted }}>R$ {(item.price * item.qty).toFixed(2)}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4">
                                <p className="text-[10px] font-black uppercase tracking-widest ml-1 italic opacity-60" style={{ color: colors.textMuted }}>Escolha o Método</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { label: 'PIX', val: 'PIX' },
                                        { label: 'CRÉDITO', val: 'CARTÃO' },
                                        { label: 'DINHEIRO', val: 'DINHEIRO' },
                                        { label: 'DÉBITO', val: 'DÉBITO' }
                                    ]
                                        .filter(m => tenantFees.payment_methods?.includes(m.val))
                                        .map(m => (
                                            <button
                                                key={m.val}
                                                onClick={() => setPaymentMethod(m.val)}
                                                className={`border font-black py-4 rounded-2xl transition-all text-[10px] tracking-widest uppercase active:scale-95 ${paymentMethod === m.val ? 'bg-primary text-black' : 'bg-black/40 text-white'}`}
                                                style={{
                                                    borderColor: paymentMethod === m.val ? colors.primary : `${colors.text}0d`,
                                                    backgroundColor: paymentMethod === m.val ? colors.primary : `${colors.text}08`,
                                                    color: paymentMethod === m.val ? (isSalon ? 'white' : 'black') : colors.text
                                                }}
                                            > {m.label} </button>
                                        ))}
                                </div>
                            </div>

                            {/* Fee Transparency Preview */}
                            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="flex justify-between items-center bg-black/40 border border-white/5 p-4 rounded-2xl">
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm" style={{ color: colors.textMuted }}>percent</span>
                                        <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: colors.text }}>Taxa Estimada ({paymentMethod})</span>
                                    </div>
                                    <div className="text-rose-500/80 font-black italic text-xs">
                                        {(() => {
                                            const feeKey = paymentMethod === 'PIX' ? 'pix' : paymentMethod === 'CARTÃO' ? 'credit' : paymentMethod === 'DÉBITO' ? 'debit' : 'cash';
                                            const feeRate = (tenantFees[feeKey] || 0) / 100;
                                            const estimatedFee = calculatedTotal * feeRate;
                                            return `- R$ ${estimatedFee.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                                        })()}
                                    </div>
                                </div>
                            </div>


                            {voucher && (
                                <div className="mt-4 bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl flex items-center justify-between animate-in fade-in">
                                    <div className="flex items-center gap-3">
                                        <span className="material-symbols-outlined text-emerald-500">card_giftcard</span>
                                        <div>
                                            <p className="text-emerald-500 text-[10px] font-black uppercase tracking-widest">{rewardServiceName || 'Recompensa Disponível'}</p>
                                            <p className="text-emerald-500/60 text-[8px] font-bold">Resgate Autorizado</p>
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

                            <div className="pt-8 md:pt-10 border-t" style={{ borderColor: `${colors.text}0d` }}>
                                <div className="flex justify-between items-end mb-8">
                                    <span className="font-black uppercase text-[10px] tracking-[0.2em] italic opacity-40" style={{ color: colors.textMuted }}>TOTAL GERAL</span>
                                    <span className="text-4xl md:text-5xl font-black italic tracking-tighter" style={{ color: colors.primary }}>
                                        <span className="text-base mr-1 tracking-normal">R$</span>
                                        {calculatedTotal.toFixed(2).split('.')[0]}
                                        <span className="text-xl opacity-60">.{calculatedTotal.toFixed(2).split('.')[1]}</span>
                                    </span>
                                </div>

                                <button
                                    disabled={isProcessingPayment || isUpdatingOrder}
                                    onClick={handleConfirmPayment}
                                    className={`w-full font-black py-5 md:py-6 rounded-2xl md:rounded-[2rem] text-lg shadow-2xl transition-all flex items-center justify-center gap-3 uppercase italic active:scale-95 ${(isProcessingPayment || isUpdatingOrder) ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] hover:-translate-y-1'}`}
                                    style={{ backgroundColor: colors.primary, color: isSalon ? 'white' : 'black', boxShadow: `0 20px 40px -10px ${colors.primary}4d` }}
                                >
                                    {isProcessingPayment ? 'PROCESSANDO...' : 'FINALIZAR'}
                                    <span className="material-symbols-outlined text-2xl">check_circle</span>
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-[500px] border border-dashed rounded-[3rem] flex flex-col items-center justify-center p-8 text-center sticky top-8"
                        style={{ backgroundColor: `${colors.text}05`, borderColor: `${colors.text}0d` }}>
                        <div className="size-20 rounded-full flex items-center justify-center mb-6" style={{ backgroundColor: `${colors.text}08`, color: colors.textMuted }}>
                            <span className="material-symbols-outlined text-5xl">point_of_sale</span>
                        </div>
                        <p className="font-black uppercase text-[11px] tracking-[0.3em] leading-relaxed opacity-40" style={{ color: colors.textMuted }}>
                            Selecione uma <br /> comanda para <br /> processar
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
