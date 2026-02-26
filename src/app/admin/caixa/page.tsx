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

    // States for adding items
    const [availableServices, setAvailableServices] = useState<any[]>([]);
    const [availableProducts, setAvailableProducts] = useState<any[]>([]);
    const [showAddItem, setShowAddItem] = useState(false);
    const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);
    // 🛡️ [BLINDADO] Prevenção de duplo clique em devoluções
    const [isReturningOrder, setIsReturningOrder] = useState(false);
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
                appointments!appointment_id (
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
            console.warn('[Caixa] Detalhes do Tenant ID:', tid);
        }

        if (!error && data) {
            console.log(`[Caixa] ${data.length} comandas pendentes encontradas.`);
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
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        const { data, error } = await supabase
            .from('orders')
            .select(`
                id, 
                total_value, 
                status, 
                finalized_at,
                payment_method,
                appointments!appointment_id (
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

    // Helper Ref to hold the latest tenant_id and avoid stale closures in listeners
    const tenantIdRef = React.useRef(profile?.tenant_id);
    const activeTabRef = React.useRef(activeTab);

    useEffect(() => {
        tenantIdRef.current = profile?.tenant_id;
        activeTabRef.current = activeTab;

        if (profile?.tenant_id) {
            if (activeTab === 'pending') fetchPendingOrders(profile.tenant_id);
            if (activeTab === 'history') fetchHistoryOrders(profile.tenant_id);
            setSelected(null);
        }
    }, [profile, activeTab]);

    // 🛡️ [BLINDADO] - Estabilização do Catálogo e Configurações (Prevenir listas vazias)
    useEffect(() => {
        if (profile?.tenant_id) {
            fetchCatalog(profile.tenant_id);
            fetchTenantFees(profile.tenant_id);
        }
    }, [profile?.tenant_id]);

    // Garantia extra: Recarregar catálogo ao selecionar comanda se estiver vazio
    useEffect(() => {
        if (selected && availableServices.length === 0 && profile?.tenant_id) {
            fetchCatalog(profile.tenant_id);
        }
    }, [selected]);

    // 🛡️ [BLINDADO] - REALTIME LISTENERS & POLLING (Auto-Atualização do Caixa)
    useEffect(() => {
        let channel: ReturnType<typeof supabase.channel> | null = null;
        let pollInterval: ReturnType<typeof setInterval> | null = null;

        const setupRealtime = () => {
            const currentTenant = tenantIdRef.current;
            if (!currentTenant) return;

            console.log('[Caixa Realtime] Initializing Subscription for tenant:', currentTenant);

            // Channel listening for orders table modifications for this tenant
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
                        console.log('[Caixa Realtime] Orders modification detected:', payload.eventType);
                        const tab = activeTabRef.current;
                        const tid = tenantIdRef.current;
                        if (tid) {
                            if (tab === 'pending') fetchPendingOrders(tid);
                            if (tab === 'history') fetchHistoryOrders(tid);
                        }
                    }
                )
                .subscribe((status) => {
                    console.log('[Caixa Realtime] Status:', status);
                });

            // Fallback Polling (15s) in case WebSocket connection is interrupted or missed
            pollInterval = setInterval(() => {
                const tab = activeTabRef.current;
                const tid = tenantIdRef.current;
                if (tid) {
                    if (tab === 'pending') fetchPendingOrders(tid);
                    if (tab === 'history') fetchHistoryOrders(tid);
                }
            }, 15000);
        };

        // Delayed start to ensure profile is completely loaded
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
        console.log('[Caixa] Buscando catálogo para tenant:', tid);

        try {
            const [servRes, prodRes] = await Promise.all([
                supabase.from('services').select('*').eq('tenant_id', tid).order('name'),
                supabase.from('products').select('*').eq('tenant_id', tid).gt('current_stock', 0).order('name')
            ]);

            if (servRes.error) console.error('[Caixa] Erro ao buscar serviços:', servRes.error);
            if (prodRes.error) console.error('[Caixa] Erro ao buscar produtos:', prodRes.error);

            if (servRes.data) {
                console.log(`[Caixa] ${servRes.data.length} serviços encontrados.`);
                setAvailableServices(servRes.data);
            }
            if (prodRes.data) {
                console.log(`[Caixa] ${prodRes.data.length} produtos encontrados.`);
                setAvailableProducts(prodRes.data);
            }
        } catch (err) {
            console.error('[Caixa] Erro critico no fetchCatalog:', err);
        }
    };

    // 🛡️ [BLINDADO] - Injeção Dinâmica de Itens Extras na Comanda
    const handleAddExtraItem = async (item: any, type: 'service' | 'product') => {
        if (!selected || isUpdatingOrder) return;
        setIsUpdatingOrder(true);

        const currentItems = selected.raw.items || [];
        const itemPrice = Number(type === 'product' ? item.sale_price : item.price) || 0;

        let newItems = [...currentItems];
        const existing = newItems.find(i => i.id === item.id);

        if (existing) {
            newItems = newItems.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
        } else {
            newItems.push({ ...item, price: itemPrice, type, qty: 1 });
        }

        // 🛡️ [BLINDADO] Recalculate everything from scratch to guarantee accuracy
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

        const { error } = await supabase.from('orders').update(updatePayload).eq('id', selected.id);

        if (!error) {
            // Optimistic update
            setSelected({
                ...selected,
                total_price: newTotalValue,
                commission: newCommission,
                raw: { ...selected.raw, ...updatePayload }
            });
            setShowAddItem(false);
        } else {
            alert('Erro ao adicionar item.');
        }
        setIsUpdatingOrder(false);
    };

    const handleRemoveItem = async (idx: number) => {
        if (!selected || isUpdatingOrder) return;
        if (!confirm('Deseja remover este item da fatura?')) return;
        setIsUpdatingOrder(true);

        const currentItems = [...(selected.raw.items || [])];
        const itemToRemove = currentItems[idx];
        if (!itemToRemove) {
            setIsUpdatingOrder(false);
            return;
        }

        const type = itemToRemove.type;
        const itemTotalPrice = Number(itemToRemove.price) * (itemToRemove.qty || 1);

        // Remove the item
        const newItems = currentItems.filter((_, i) => i !== idx);

        // 🛡️ [BLINDADO] Recalculate everything from scratch to guarantee accuracy
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

        const { error } = await supabase.from('orders').update(updatePayload).eq('id', selected.id);

        if (!error) {
            // Optimistic update
            setSelected({
                ...selected,
                total_price: updatePayload.total_value,
                commission: updatePayload.commission_amount,
                raw: { ...selected.raw, ...updatePayload }
            });
        } else {
            alert('Erro ao remover item.');
        }
        setIsUpdatingOrder(false);
    };

    const handleUpdateMainService = async (serviceId: string) => {
        if (!selected || !selected.raw.appointments || isUpdatingOrder) return;
        setIsUpdatingOrder(true);

        const service = availableServices.find(s => s.id === serviceId);
        if (!service) {
            setIsUpdatingOrder(false);
            return;
        }

        const newMainPrice = Number(service.price);

        // 🛡️ [BLINDADO] Recalculate everything from scratch to guarantee accuracy
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
            // Update appointment service
            const { error: apptError } = await supabase
                .from('appointments')
                .update({ service_id: serviceId })
                .eq('id', selected.appointment_id);

            if (apptError) throw apptError;

            // Update order totals
            const { error: orderError } = await supabase
                .from('orders')
                .update({
                    service_total: newServiceTotal,
                    total_value: newTotalValue,
                    commission_amount: newCommission
                })
                .eq('id', selected.id);

            if (orderError) throw orderError;

            // Optimistic update
            setSelected({
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
            });
        } catch (err: any) {
            alert('Erro ao atualizar serviço principal: ' + err.message);
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

    useEffect(() => {
        if (selected?.client_id) {
            checkLoyaltyVoucher(selected.client_id);
        } else {
            setVoucher(null);
        }
    }, [selected]);

    // 🛡️ [BLINDADO] - Fluxo de Devolução Segura (Protegido contra Duplicidade)
    const handleReturnOrder = async () => {
        if (!selected || isReturningOrder) return;
        if (!confirm('Devolver esta comanda para a fila do profissional? Status voltará para em andamento.')) return;

        setIsReturningOrder(true);
        try {
            // Executamos a RPC atômica para proteger a integridade no banco
            const { data, error } = await supabase.rpc('return_order_to_professional', {
                p_order_id: selected.id,
                p_appointment_id: selected.appointment_id || null
            });

            if (error || (data && !data.success)) {
                console.error('RPC Error:', error || data);
                alert(`Erro ao devolver comanda.\nDetalhes: ${error?.message || data?.error || 'Desconhecido'}`);
            } else {
                alert('Comanda devolvida com sucesso!');
                setSelected(null);
                if (profile?.tenant_id) fetchPendingOrders(profile.tenant_id);
            }
        } catch (err: any) {
            console.error('Caught Exception:', err);
            alert(`Erro critico: ${err.message}`);
        } finally {
            setIsReturningOrder(false);
        }
    };

    // 🛡️ [BLINDADO] - Fluxo de Checkout Seguro (Protegido contra Duplicidade)
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

        // ── Transação atômica v2: pagamento + CRM + fidelidade + BAIXA DE ESTOQUE ──
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
            const msg = rpcError?.message || rpcResult?.error || 'Erro desconhecido';
            alert('Erro ao processar pagamento: ' + msg);
            setIsProcessingPayment(false);
            return;
        }

        // Notificar recompensa de fidelidade se conquistada
        if (rpcResult.reward_granted) {
            alert(`🎉 PARABÉNS! ${selected.customer_name} completou o cartão fidelidade!\nPrêmio liberado.`);
        }

        alert(`Pagamento de R$ ${selected.total_price.toFixed(2)} confirmado!\nEstoque atualizado.`);
        setSelected(null);
        if (profile?.tenant_id) fetchPendingOrders(profile.tenant_id);
        setIsProcessingPayment(false);
    };

    if (profileLoading) return <div className="text-center py-20 opacity-40">Carregando caixa...</div>;

    const isSalon = profile?.tenant?.business_type === 'salon';

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 animate-in fade-in duration-500 pb-10">
            <div className="lg:col-span-2 space-y-4 md:space-y-6">
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
            </div>

            <aside className="w-full">
                {selected ? (
                    <div className="border p-6 md:p-8 rounded-3xl md:rounded-[2.5rem] space-y-6 md:space-y-8 animate-in slide-in-from-bottom-4 shadow-2xl sticky top-4 md:top-10"
                        style={{ backgroundColor: colors.cardBg, borderColor: `${colors.primary}4d` }}>

                        {/* 🛡️ [BLINDADO] Actions row for Cancel/Return */}
                        <div className="flex justify-between items-center -mt-2 mb-4">
                            <button
                                onClick={() => setSelected(null)}
                                className="text-[9px] md:text-[10px] font-black tracking-widest uppercase transition-all opacity-60 hover:opacity-100 flex items-center gap-1"
                                style={{ color: colors.text }}
                            >
                                <span className="material-symbols-outlined text-sm">arrow_back</span>
                                Voltar
                            </button>
                            {/* 🛡️ [BLINDADO] Prevenção de Duplicidade ao Devolver Comanda */}
                            <button
                                disabled={isReturningOrder}
                                onClick={handleReturnOrder}
                                className={`text-[8px] md:text-[9px] font-black tracking-widest uppercase transition-all text-orange-500 hover:text-orange-400 border border-orange-500/30 px-3 py-1.5 rounded-lg bg-orange-500/5 hover:bg-orange-500/10 flex items-center gap-1 ${isReturningOrder ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <span className="material-symbols-outlined text-sm">undo</span>
                                {isReturningOrder ? 'DEVOLVENDO...' : 'Devolver Mão de Obra'}
                            </button>
                        </div>

                        <div className="text-center">
                            <h3 className="text-xl md:text-2xl font-black italic tracking-tight mb-1 md:mb-2 uppercase" style={{ color: colors.text }}>Recebimento</h3>
                            <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest italic" style={{ color: colors.textMuted }}>{selected.customer_name}</p>
                        </div>

                        <div className="space-y-4 max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
                            {/* SERVIÇO PRINCIPAL (SEMPRE VISÍVEL E EDITÁVEL) */}
                            <div className="p-4 rounded-2xl border bg-black/40 space-y-3" style={{ borderColor: `${colors.primary}33` }}>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm" style={{ color: colors.primary }}>star</span>
                                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60" style={{ color: colors.textMuted }}>Serviço Principal</span>
                                    </div>
                                    <span className="text-xs font-black italic" style={{ color: colors.primary }}>
                                        R$ {Number(
                                            availableServices.find(s => s.id === (selected.raw.appointments?.service_id || selected.raw.appointments?.services?.id))?.price ||
                                            selected.raw.appointments?.services?.price ||
                                            0
                                        ).toFixed(2)}
                                    </span>
                                </div>
                                <select
                                    className="w-full bg-black/60 border border-white/5 rounded-xl py-3 px-3 text-[11px] font-bold text-white focus:border-primary outline-none transition-all cursor-pointer"
                                    value={selected.raw.appointments?.service_id || selected.raw.appointments?.services?.id}
                                    onChange={(e) => handleUpdateMainService(e.target.value)}
                                    disabled={isUpdatingOrder}
                                >
                                    {/* PRIORIDADE: Mostrar todos os serviços carregados do catálogo */}
                                    {availableServices.length > 0 ? (
                                        <>
                                            {availableServices.map(s => (
                                                <option key={s.id} value={s.id}>{s.name} - R$ {Number(s.price).toFixed(2)}</option>
                                            ))}
                                            {/* Segurança: Se o serviço atual não estiver no catálogo carregado, mostra ele em destaque */}
                                            {!availableServices.find(s => s.id === (selected.raw.appointments?.service_id || selected.raw.appointments?.services?.id)) && (
                                                <option value={selected.raw.appointments?.services?.id}>
                                                    {selected.raw.appointments?.services?.name} (Serviço Atual)
                                                </option>
                                            )}
                                        </>
                                    ) : (
                                        /* FALLBACK: Durante o carregamento ou se a lista falhar, mostra pelo menos o serviço atual */
                                        <option value={selected.raw.appointments?.service_id || selected.raw.appointments?.services?.id}>
                                            {selected.raw.appointments?.services?.name || 'Carregando serviços...'}
                                        </option>
                                    )}
                                </select>
                            </div>

                            {/* ITENS EXTRAS */}
                            {selected.raw?.items && selected.raw.items.length > 0 && selected.raw.items.map((item: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center text-xs font-bold border-b pb-2 group/item" style={{ borderColor: colors.border }}>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => handleRemoveItem(idx)}
                                            className="transition-opacity text-rose-500 hover:scale-110 active:scale-90"
                                            title="Remover Item"
                                        >
                                            <span className="material-symbols-outlined text-lg">delete</span>
                                        </button>
                                        <div className="flex flex-col">
                                            <span className="italic font-black uppercase tracking-widest text-[9px] mr-4" style={{ color: colors.textMuted }}>
                                                {item.qty > 1 && `${item.qty}x `}{item.name}
                                            </span>
                                            <span className="text-[8px] opacity-50" style={{ color: colors.primary }}>{item.type === 'service' ? 'SERVIÇO' : 'PRODUTO'}</span>
                                        </div>
                                    </div>
                                    <span style={{ color: colors.text }}>R$ {(item.price * item.qty).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>

                        {/* ADD EXTRA ITEMS UI */}
                        {activeTab === 'pending' && (
                            <div className="pt-2">
                                {showAddItem ? (
                                    <div className="space-y-3 p-4 rounded-xl border bg-black/20" style={{ borderColor: colors.border }}>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] uppercase font-black tracking-widest" style={{ color: colors.text }}>Adicionar Item</span>
                                            <button onClick={() => setShowAddItem(false)} className="opacity-50 hover:opacity-100">
                                                <span className="material-symbols-outlined text-sm">close</span>
                                            </button>
                                        </div>

                                        <div className="max-h-[150px] overflow-y-auto custom-scrollbar space-y-2 pr-1">
                                            <p className="text-[8px] font-black uppercase tracking-widest opacity-50 mb-1" style={{ color: colors.primary }}>Serviços</p>
                                            {availableServices.map(s => (
                                                <button key={s.id} onClick={() => handleAddExtraItem(s, 'service')} disabled={isUpdatingOrder} className="w-full text-left p-2 rounded-lg border hover:border-white/20 transition-all flex justify-between items-center" style={{ backgroundColor: colors.cardBg, borderColor: colors.border }}>
                                                    <span className="text-[10px] font-bold" style={{ color: colors.text }}>{s.name}</span>
                                                    <span className="text-[10px] font-black" style={{ color: colors.primary }}>R$ {Number(s.price).toFixed(2)}</span>
                                                </button>
                                            ))}

                                            <p className="text-[8px] font-black uppercase tracking-widest opacity-50 mb-1 mt-4" style={{ color: colors.primary }}>Produtos</p>
                                            {availableProducts.map(p => (
                                                <button key={p.id} onClick={() => handleAddExtraItem(p, 'product')} disabled={isUpdatingOrder} className="w-full text-left p-2 rounded-lg border hover:border-white/20 transition-all flex justify-between items-center" style={{ backgroundColor: colors.cardBg, borderColor: colors.border }}>
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-bold" style={{ color: colors.text }}>{p.name}</span>
                                                        <span className="text-[8px] opacity-50" style={{ color: colors.textMuted }}>Estoque: {p.current_stock}</span>
                                                    </div>
                                                    <span className="text-[10px] font-black" style={{ color: colors.primary }}>R$ {Number(p.sale_price).toFixed(2)}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setShowAddItem(true)}
                                        className="w-full py-2 rounded-xl border border-dashed flex items-center justify-center gap-2 transition-all hover:bg-white/5 opacity-70 hover:opacity-100"
                                        style={{ borderColor: colors.primary, color: colors.primary }}
                                    >
                                        <span className="material-symbols-outlined text-sm">add_circle</span>
                                        <span className="text-[10px] font-black uppercase tracking-widest">Adicionar Venda Extra</span>
                                    </button>
                                )}
                            </div>
                        )}

                        <div className="space-y-3">
                            <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest ml-1 italic opacity-60" style={{ color: colors.textMuted }}>Escolha o Método</p>
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

                        {/* Fee Breakdown Visual (REMOVIDO A PEDIDO DO CLIENTE - BLINDADO) */}

                        <div className="pt-5 md:pt-6 border-t mt-4" style={{ borderColor: colors.border }}>
                            <div className="flex justify-between items-end mb-5 md:mb-6">
                                <span className="font-bold uppercase text-[9px] md:text-[10px] tracking-widest italic opacity-50" style={{ color: colors.textMuted }}>Total Cobrado do Cliente</span>
                                <span className="text-3xl md:text-4xl font-black italic tracking-tighter" style={{ color: colors.primary }}>R$ {(selected.total_price || 0).toFixed(2)}</span>
                            </div>
                            {/* 🛡️ [BLINDADO] Prevenção de Double Checkout */}
                            <button
                                disabled={isProcessingPayment}
                                onClick={handleConfirmPayment}
                                className={`w-full font-black py-4 md:py-5 rounded-xl md:rounded-2xl text-base md:text-lg shadow-2xl transition-all flex items-center justify-center gap-2 uppercase italic active:scale-95 ${isProcessingPayment ? 'opacity-50 cursor-not-allowed' : ''}`}
                                style={{ backgroundColor: colors.primary, color: isSalon ? 'white' : 'black', boxShadow: `0 10px 20px -5px ${colors.primary}33` }}
                            >
                                {isProcessingPayment ? 'PROCESSANDO...' : 'CONFIRMAR'}
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
