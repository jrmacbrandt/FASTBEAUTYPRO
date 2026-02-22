"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export default function ProfessionalAgendaPage() {
    const [view, setView] = useState<'agenda' | 'command'>('agenda');
    const [businessType, setBusinessType] = useState<'barber' | 'salon'>('barber');
    const [selectedClient, setSelectedClient] = useState<any>(null);
    const [cart, setCart] = useState<{ id: string; name: string; price: number; qty: number; type: 'service' | 'product' }[]>([]);
    const [todayAgenda, setTodayAgenda] = useState<any[]>([]);
    const [upcomingAgenda, setUpcomingAgenda] = useState<any[]>([]);
    const [historyAgenda, setHistoryAgenda] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [allServices, setAllServices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [inclusionTab, setInclusionTab] = useState<'services' | 'products'>('services');
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [currentTab, setCurrentTab] = useState<'hoje' | 'proximos' | 'historico'>('hoje');

    // Definida ANTES dos useEffects para evitar stale closure no Realtime
    const fetchAgenda = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

        const { data, error } = await supabase
            .from('appointments')
            .select('*, profiles(full_name), services(name, price), orders(total_value, items)')
            .eq('barber_id', session.user.id)
            .gte('scheduled_at', sixtyDaysAgo.toISOString())
            .order('scheduled_at', { ascending: true });

        if (!error && data) {
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];

            setTodayAgenda(data.filter(a => a.scheduled_at.startsWith(todayStr) && a.status === 'scheduled'));
            setUpcomingAgenda(data.filter(a => a.scheduled_at > todayStr && a.status === 'scheduled'));
            setHistoryAgenda(data.filter(a => a.status === 'completed' || a.status === 'paid').reverse());
        }
        setLoading(false);
    };

    // Ref para capturar a versão mais atual de fetchAgenda (evita stale closure no canal Realtime)
    const fetchAgendaRef = React.useRef(fetchAgenda);
    useEffect(() => {
        fetchAgendaRef.current = fetchAgenda;
    });

    useEffect(() => {
        const savedType = localStorage.getItem('elite_business_type') as 'barber' | 'salon';
        if (savedType) setBusinessType(savedType);
        fetchAgenda();
        fetchProducts();
        fetchServices();
    }, []);

    // 🔴 REALTIME: Canal Supabase + polling de segurança como fallback
    useEffect(() => {
        let channel: ReturnType<typeof supabase.channel> | null = null;
        let pollInterval: ReturnType<typeof setInterval> | null = null;

        const setupRealtime = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            // Canal Realtime (requer Replication ativa no Supabase Dashboard)
            channel = supabase
                .channel(`profissional-agenda-${session.user.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'appointments',
                        filter: `barber_id=eq.${session.user.id}`
                    },
                    (payload) => {
                        console.log('[Realtime] appointments change:', payload.eventType);
                        fetchAgendaRef.current();
                    }
                )
                .subscribe((status) => {
                    console.log('[Realtime] status:', status);
                });

            // Polling a cada 15s como fallback caso Realtime não esteja com Replication ativa
            pollInterval = setInterval(() => {
                fetchAgendaRef.current();
            }, 15000);
        };

        setupRealtime();

        return () => {
            if (channel) supabase.removeChannel(channel);
            if (pollInterval) clearInterval(pollInterval);
        };
    }, []);

    const colors = React.useMemo(() => {
        return businessType === 'salon'
            ? { primary: '#7b438e', bg: '#faf8f5', text: '#1e1e1e', textMuted: '#6b6b6b', cardBg: '#ffffff', inputBg: '#f5f3f0' }
            : { primary: '#f2b90d', bg: '#000000', text: '#f8fafc', textMuted: '#64748b', cardBg: '#121214', inputBg: '#0f0f10' };
    }, [businessType]);

    const fetchProducts = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data: profile } = await supabase
            .from('profiles')
            .select('tenant_id')
            .eq('id', session.user.id)
            .single();

        if (profile?.tenant_id) {
            const { data } = await supabase
                .from('products')
                .select('*')
                .eq('tenant_id', profile.tenant_id)
                .order('name', { ascending: true });
            if (data) setProducts(data);
        }
    };

    const fetchServices = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data: profile } = await supabase
            .from('profiles')
            .select('tenant_id')
            .eq('id', session.user.id)
            .single();

        if (profile?.tenant_id) {
            const { data } = await supabase
                .from('services')
                .select('*')
                .eq('tenant_id', profile.tenant_id);
            if (data) setAllServices(data);
        }
    };

    const handleOpenCommand = (appointment: any) => {
        setSelectedClient(appointment);
        // Load custom items from order if exists
        const savedItems = appointment.orders?.[0]?.items || [];
        setCart(savedItems);
        setView('command');
    };

    const handleMarkAbsent = async (id: string) => {
        if (confirm('Marcar ausência? (Isso removerá 1 selo do cartão fidelidade do cliente)')) {
            setLoading(true);
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return;

                const { data: profile } = await supabase
                    .from('profiles')
                    .select('tenant_id')
                    .eq('id', session.user.id)
                    .single();

                if (!profile?.tenant_id) return;

                const { error } = await supabase.rpc('mark_appointment_no_show', {
                    p_appointment_id: id,
                    p_tenant_id: profile.tenant_id
                });

                if (error) throw error;
                fetchAgenda();
            } catch (err: any) {
                alert('Erro ao marcar ausência: ' + err.message);
            } finally {
                setLoading(false);
            }
        }
    };

    const handleUndoAbsent = async (id: string) => {
        const { error } = await supabase
            .from('appointments')
            .update({ status: 'scheduled' })
            .eq('id', id);
        if (!error) fetchAgenda();
    };

    const handleDeleteAppointment = async (id: string) => {
        if (confirm('Tem certeza que deseja EXCLUIR este agendamento definitivamente do banco de dados?')) {
            setLoading(true);
            try {
                const { error } = await supabase.from('appointments').delete().eq('id', id);
                if (error) throw error;
                fetchAgendaRef.current();
            } catch (err: any) {
                alert('Erro ao excluir: ' + err.message);
            } finally {
                setLoading(false);
            }
        }
    };

    const handleSaveDraft = async () => {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return setLoading(false);

        const { data: barberProfile } = await supabase
            .from('profiles')
            .select('tenant_id')
            .eq('id', session.user.id)
            .single();

        if (!barberProfile) return setLoading(false);

        const serviceTotal = parseFloat(selectedClient?.services?.price?.toString() || '0');
        const productTotal = cart.reduce((acc, curr) => acc + (curr.price * curr.qty), 0);
        const totalValue = serviceTotal + productTotal;

        // Upsert order as draft (items only, status pending_payment ONLY on Finalize)
        // Check if order exists
        const { data: existingOrder } = await supabase
            .from('orders')
            .select('id')
            .eq('appointment_id', selectedClient.id)
            .single();

        // Fetch professional commission rates
        const { data: profileData } = await supabase
            .from('profiles')
            .select('service_commission, product_commission')
            .eq('id', session.user.id)
            .single();

        const serviceRate = (profileData?.service_commission || 50) / 100;
        const productRate = (profileData?.product_commission || 10) / 100;

        const commissionAmount = (serviceTotal * serviceRate) + (productTotal * productRate);

        if (existingOrder) {
            await supabase.from('orders').update({
                service_total: serviceTotal,
                product_total: productTotal,
                total_value: totalValue,
                commission_amount: commissionAmount,
                items: cart
            }).eq('id', existingOrder.id);
        } else {
            await supabase.from('orders').insert({
                tenant_id: barberProfile.tenant_id,
                appointment_id: selectedClient.id,
                barber_id: session.user.id,
                service_total: serviceTotal,
                product_total: productTotal,
                total_value: totalValue,
                commission_amount: commissionAmount,
                status: 'draft',
                items: cart
            });
        }

        alert('Comanda salva como rascunho!');
        setLoading(false);
        fetchAgenda();
        setView('agenda');
    };

    const handleFinalizeOrder = async (item: any) => {
        if (!confirm('Deseja FINALIZAR este atendimento e enviar para o caixa?')) return;

        setLoading(true);

        // 1. Mark Appointment as completed
        const { error: apptError } = await supabase
            .from('appointments')
            .update({ status: 'completed' })
            .eq('id', item.id);

        if (apptError) {
            alert('Erro ao atualizar agendamento');
            setLoading(false);
            return;
        }

        // 2. Update Order status to pending_payment
        const { error: orderError } = await supabase
            .from('orders')
            .update({ status: 'pending_payment', finalized_at: new Date() })
            .eq('appointment_id', item.id);

        if (orderError) {
            console.error('Order finalize error:', orderError);
        }

        alert('Atendimento finalizado e enviado para o caixa!');
        setLoading(false);
        fetchAgenda();
    };

    const addToCart = (item: any, type: 'service' | 'product') => {
        if (type === 'product' && item.current_stock === 0) return alert('Sem estoque!');
        const itemPrice = Number(item.price || 0);
        setCart(prev => {
            const existing = prev.find(i => i.id === item.id);
            if (existing) return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
            return [...prev, { ...item, price: itemPrice, type, qty: 1 }];
        });
        setSelectedItems([]); // Clear multi-select when adding
    };

    const addSelectedToCart = () => {
        const itemsToAdd = inclusionTab === 'services'
            ? allServices.filter(s => selectedItems.includes(s.id))
            : products.filter(p => selectedItems.includes(p.id));

        itemsToAdd.forEach(item => {
            addToCart(item, inclusionTab === 'services' ? 'service' : 'product');
        });
        setSelectedItems([]);
    };

    const removeFromCart = (itemId: string) => {
        setCart(prev => prev.filter(i => i.id !== itemId));
    };

    const toggleSelectItem = (id: string) => {
        setSelectedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };



    if (view === 'agenda') {
        const activeAgenda = currentTab === 'hoje' ? todayAgenda : currentTab === 'proximos' ? upcomingAgenda : historyAgenda;

        return (
            <div className="space-y-4 md:space-y-6 animate-in fade-in duration-500 pb-10">
                {/* TABS NAVIGATION */}
                <div className="flex bg-black/40 p-1.5 rounded-2xl gap-1 border border-white/5 sticky top-0 z-20 backdrop-blur-xl">
                    <button
                        onClick={() => setCurrentTab('hoje')}
                        className={`flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${currentTab === 'hoje' ? 'bg-primary text-black' : 'text-slate-400 hover:text-white'}`}
                        style={currentTab === 'hoje' ? { backgroundColor: colors.primary } : {}}
                    >
                        Hoje ({todayAgenda.length})
                    </button>
                    <button
                        onClick={() => setCurrentTab('proximos')}
                        className={`flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${currentTab === 'proximos' ? 'bg-primary text-black' : 'text-slate-400 hover:text-white'}`}
                        style={currentTab === 'proximos' ? { backgroundColor: colors.primary } : {}}
                    >
                        Próximos ({upcomingAgenda.length})
                    </button>
                    <button
                        onClick={() => setCurrentTab('historico')}
                        className={`flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${currentTab === 'historico' ? 'bg-primary text-black' : 'text-slate-400 hover:text-white'}`}
                        style={currentTab === 'historico' ? { backgroundColor: colors.primary } : {}}
                    >
                        Histórico
                    </button>
                </div>

                <div className="space-y-12">
                    {currentTab === 'historico' ? (
                        <div className="rounded-[2rem] border overflow-hidden" style={{ backgroundColor: colors.cardBg, borderColor: `${colors.text}0d` }}>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="text-[9px] font-black uppercase tracking-widest italic opacity-40 border-b" style={{ color: colors.text, borderColor: `${colors.text}0d` }}>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4">Nome</th>
                                            <th className="px-6 py-4 text-center">Horário</th>
                                            <th className="px-6 py-4 text-right">Valor</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm font-bold">
                                        {historyAgenda.map(item => (
                                            <tr key={item.id} className="border-b transition-colors hover:bg-white/5" style={{ color: colors.text, borderColor: `${colors.text}0d` }}>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black ${item.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                                        {item.status === 'completed' ? 'REALIZADO' : 'AUSENTE'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 truncate max-w-[150px]">
                                                    <span className="block">{item.customer_name}</span>
                                                    <span className="text-[9px] opacity-40 font-mono italic">{item.customer_whatsapp || 'S/ Tel'}</span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="block">{new Date(item.scheduled_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                                                    <span className="text-[10px] opacity-60 italic">{item.scheduled_at.split('T')[1].substring(0, 5)}</span>
                                                </td>
                                                <td className="px-6 py-4 text-right font-black italic">
                                                    R$ {Number(item.orders?.[0]?.total_value || item.services?.price || 0).toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="grid gap-3 md:gap-4">
                            {activeAgenda.map(item => (
                                <AgendaCard
                                    key={item.id}
                                    item={item}
                                    colors={colors}
                                    businessType={businessType}
                                    onAbsent={handleMarkAbsent}
                                    onUndo={handleUndoAbsent}
                                    onDelete={handleDeleteAppointment}
                                    onStart={handleOpenCommand}
                                    onFinalize={handleFinalizeOrder}
                                    showDate={currentTab === 'proximos'}
                                />
                            ))}
                        </div>
                    )}

                    {!loading && activeAgenda.length === 0 && (
                        <div className="text-center py-16 md:py-20 opacity-30">
                            <span className="material-symbols-outlined text-4xl md:text-6xl italic" style={{ color: colors.textMuted }}>event_busy</span>
                            <p className="font-black uppercase text-[10px] md:text-xs tracking-[0.4em] mt-4" style={{ color: colors.textMuted }}>Nenhum agendamento encontrado</p>
                        </div>
                    )}
                </div>
            </div >
        );
    }

    const basePrice = Number(selectedClient?.services?.price || 0);
    const total = cart.reduce((acc, curr) => acc + (Number(curr.price || 0) * (curr.qty || 1)), basePrice);

    return (
        <div className="flex flex-col xl:flex-row gap-6 md:gap-8 animate-in slide-in-from-right duration-500 pb-10">
            <div className="flex-1 space-y-6 md:space-y-8">
                {/* HEADER COMANDA */}
                <div className="border p-5 md:p-8 rounded-3xl md:rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6" style={{ backgroundColor: colors.cardBg, borderColor: `${colors.primary}33` }}>
                    <div className="flex items-center gap-3 md:gap-4 w-full">
                        <button onClick={() => setView('agenda')} className="transition-colors hover:scale-110 active:scale-90" style={{ color: colors.textMuted }}><span className="material-symbols-outlined text-2xl md:text-3xl">arrow_back</span></button>
                        <div className="size-12 md:size-16 rounded-xl md:rounded-2xl flex items-center justify-center border shadow-inner shrink-0" style={{ backgroundColor: `${colors.primary}33`, color: colors.primary, borderColor: `${colors.primary}33` }}>
                            <span className="material-symbols-outlined text-2xl md:text-4xl text-white">person</span>
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="text-lg md:text-2xl font-black italic uppercase tracking-tight truncate" style={{ color: colors.text }}>{selectedClient.customer_name}</h3>
                            <p className="font-black text-[11px] md:text-[12px] uppercase tracking-[0.2em] opacity-60 truncate" style={{ color: colors.textMuted }}>
                                {new Date(selectedClient.scheduled_at).toLocaleDateString('pt-BR')} às {selectedClient.scheduled_at.split('T')[1].substring(0, 5)}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="px-2 md:px-0 space-y-8">
                    {/* EDIT SERVICE SECTION */}
                    <div className="p-6 md:p-8 rounded-3xl border" style={{ backgroundColor: colors.cardBg, borderColor: `${colors.text}0d` }}>
                        <h4 className="text-base md:text-lg font-black uppercase italic tracking-tight mb-6 flex items-center gap-2" style={{ color: colors.text }}>
                            <span className="material-symbols-outlined text-primary">edit_note</span> SERVIÇOS
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-widest opacity-50 ml-1" style={{ color: colors.textMuted }}>Serviço Agendado</label>
                                <select
                                    className="w-full bg-black border border-white/10 rounded-xl py-4 px-4 text-sm font-bold text-white focus:border-primary outline-none transition-all"
                                    value={selectedClient.service_id}
                                    onChange={(e) => {
                                        const s = allServices.find(sv => sv.id === e.target.value);
                                        if (s) {
                                            setSelectedClient({
                                                ...selectedClient,
                                                service_id: s.id,
                                                services: { ...s }
                                            });
                                        }
                                    }}
                                >
                                    {allServices.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-widest opacity-50 ml-1" style={{ color: colors.textMuted }}>Valor do Serviço (R$)</label>
                                <div className="w-full bg-black/40 border border-white/5 rounded-xl py-4 px-4 text-sm font-bold text-zinc-400 opacity-60">
                                    {selectedClient.services?.price || 0}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* UNIFIED INCLUSION SECTION */}
                    <div>
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                            <h4 className="text-base md:text-lg font-black uppercase italic tracking-tight flex items-center gap-2" style={{ color: colors.text }}>
                                <span className="material-symbols-outlined text-primary">add_circle</span> + INCLUIR
                            </h4>

                            {/* TABS */}
                            <div className="flex p-1 rounded-2xl bg-black/40 border border-white/5 w-fit gap-1">
                                <button
                                    onClick={() => setInclusionTab('services')}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${inclusionTab === 'services' ? 'bg-primary text-black italic' : 'text-zinc-500 hover:text-white'}`}
                                    style={inclusionTab === 'services' ? { backgroundColor: colors.primary } : {}}
                                >
                                    Serviços
                                </button>
                                <button
                                    onClick={() => setInclusionTab('products')}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${inclusionTab === 'products' ? 'bg-primary text-black italic' : 'text-zinc-500 hover:text-white'}`}
                                    style={inclusionTab === 'products' ? { backgroundColor: colors.primary } : {}}
                                >
                                    Produtos
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                            {inclusionTab === 'services' ? (
                                allServices.filter(s => s.id !== selectedClient.service_id && !cart.some(c => c.id === s.id)).map(s => (
                                    <div key={s.id} className={`p-4 rounded-3xl border group transition-all relative ${selectedItems.includes(s.id) ? 'ring-2 ring-primary ring-offset-2 ring-offset-black' : ''}`} style={{ backgroundColor: colors.cardBg, borderColor: `${colors.text}0d` }}>
                                        <div className="flex gap-4 mb-4">
                                            <div className="size-20 rounded-2xl flex items-center justify-center border overflow-hidden shrink-0" style={{ backgroundColor: `${colors.primary}1a`, borderColor: `${colors.primary}33`, color: colors.primary }}>
                                                {s.image_url ? (
                                                    <img src={s.image_url} alt={s.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="material-symbols-outlined text-3xl">flatware</span>
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
                                products.filter(p => !cart.some(c => c.id === p.id)).map(p => (
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
                                                    <span className="font-black text-base italic" style={{ color: colors.primary }}>R$ {p.price}</span>
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
                                    className="px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl transition-all flex items-center gap-3 hover:scale-105 active:scale-95 italic"
                                    style={{ backgroundColor: colors.primary, color: businessType === 'salon' ? '#fff' : '#000' }}
                                >
                                    <span className="material-symbols-outlined">add_task</span>
                                    ADICIONAR SELECIONADOS ({selectedItems.length})
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <aside className="w-full xl:w-80 2xl:w-96">
                <div className="border rounded-3xl md:rounded-[2.5rem] p-6 md:p-10 sticky top-4 md:top-10" style={{ backgroundColor: colors.cardBg, borderColor: `${colors.primary}33` }}>
                    <h3 className="text-base md:text-xl font-black uppercase italic tracking-tighter mb-8 flex items-center gap-2" style={{ color: colors.text }}>
                        <span className="material-symbols-outlined text-primary">analytics</span> COMANDA VIRTUAL
                    </h3>

                    <div className="space-y-6 mb-8 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                        {/* SERVIÇOS SECTION */}
                        <div className="space-y-3">
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40 italic block mb-2" style={{ color: colors.textMuted }}>Serviços</span>
                            <div className="flex justify-between items-center group/item">
                                <span className="font-bold text-[11px] md:text-xs uppercase opacity-70" style={{ color: colors.textMuted }}>{selectedClient.services?.name} (Base)</span>
                                <span className="font-black text-sm" style={{ color: colors.text }}>R$ {basePrice.toFixed(2)}</span>
                            </div>
                            {cart.filter(i => i.type === 'service').map(item => (
                                <div key={item.id} className="flex justify-between items-center group/item">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => removeFromCart(item.id)}
                                            className="transition-opacity text-rose-500 hover:scale-110 active:scale-90"
                                        >
                                            <span className="material-symbols-outlined text-lg">delete</span>
                                        </button>
                                        <span className="font-bold text-[11px] md:text-xs uppercase opacity-70" style={{ color: colors.textMuted }}>{item.name} (x{item.qty})</span>
                                    </div>
                                    <span className="font-black text-sm" style={{ color: colors.text }}>R$ {(item.price * item.qty).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>

                        {/* PRODUTOS SECTION */}
                        {cart.some(i => i.type === 'product') && (
                            <div className="space-y-3 pt-4 border-t" style={{ borderColor: `${colors.text}0d` }}>
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40 italic block mb-2" style={{ color: colors.textMuted }}>Produtos</span>
                                {cart.filter(i => i.type === 'product').map(item => (
                                    <div key={item.id} className="flex justify-between items-center group/item">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => removeFromCart(item.id)}
                                                className="transition-opacity text-rose-500 hover:scale-110 active:scale-90"
                                            >
                                                <span className="material-symbols-outlined text-lg">delete</span>
                                            </button>
                                            <span className="font-bold text-[11px] md:text-xs uppercase opacity-70" style={{ color: colors.textMuted }}>{item.name} (x{item.qty})</span>
                                        </div>
                                        <span className="font-black text-sm" style={{ color: colors.text }}>R$ {(item.price * item.qty).toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="border-t pt-5 md:pt-6" style={{ borderColor: `${colors.text}1a` }}>
                        <div className="flex justify-between items-baseline mb-6 md:mb-8">
                            <span className="font-black uppercase text-[9px] md:text-[10px] tracking-widest italic opacity-50" style={{ color: colors.textMuted }}>Total Geral</span>
                            <span className="text-3xl md:text-4xl font-black italic tracking-tighter" style={{ color: colors.primary }}>R$ {total.toFixed(2)}</span>
                        </div>
                        <button onClick={handleSaveDraft} className="w-full font-black py-4 md:py-5 rounded-2xl text-base md:text-lg shadow-2xl transition-all flex items-center justify-center gap-2 uppercase italic active:scale-95" style={{ backgroundColor: colors.primary, color: businessType === 'salon' ? '#fff' : '#000' }}>SALVAR <span className="material-symbols-outlined">save</span></button>
                    </div>
                </div>
            </aside>
        </div>
    );
}

// PREMIUM AGENDA CARD COMPONENT
const AgendaCard = ({ item, colors, businessType, onAbsent, onUndo, onDelete, onStart, onFinalize, showDate }: any) => {
    const isToday = !showDate;
    const status = item.status;
    const hasOrder = item.orders && item.orders.length > 0;

    return (
        <div className="group border p-4 md:p-6 rounded-[2rem] transition-all flex flex-col md:flex-row items-center justify-between gap-4 hover:shadow-lg" style={{ backgroundColor: colors.cardBg, borderColor: `${colors.text}0d` }}>
            <div className="flex items-center gap-5 w-full md:w-auto">
                <div className="size-14 md:size-20 rounded-2xl flex flex-col items-center justify-center font-black shrink-0 border transition-transform group-hover:scale-105 shadow-lg gap-0.5" style={{ backgroundColor: `${colors.primary}1a`, color: colors.primary, borderColor: `${colors.primary}33` }}>
                    <span className="text-sm md:text-2xl text-white opacity-90 uppercase tracking-tighter leading-none">
                        {isToday ? 'Hoje' : new Date(item.scheduled_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    </span>
                    <span className="text-[10px] md:text-xs opacity-60 leading-none tracking-widest">
                        {item.scheduled_at?.split('T')[1]?.substring(0, 5) || '00:00'}
                    </span>
                </div>
                <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-base md:text-xl truncate" style={{ color: colors.text }}>{item.customer_name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] md:text-xs font-black uppercase tracking-widest opacity-60" style={{ color: colors.textMuted }}>{item.services?.name || 'Serviço'}</span>
                        {hasOrder && <span className="text-[8px] bg-sky-500/20 text-sky-500 px-2 py-0.5 rounded-full font-black uppercase border border-sky-500/20">Comanda Iniciada</span>}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="flex flex-col items-end mr-4 hidden md:flex">
                    <span className="text-[9px] font-black uppercase tracking-widest opacity-40 italic" style={{ color: colors.textMuted }}>Valor</span>
                    <span className="text-lg font-black italic tracking-tighter" style={{ color: colors.text }}>R$ {Number(hasOrder ? item.orders[0].total_value : (item.services?.price || 0)).toFixed(2)}</span>
                </div>

                <div className="flex gap-2 w-full md:w-auto mt-4 md:mt-0">
                    <div className="flex items-center gap-2 bg-black/20 p-2 rounded-xl border border-white/5 mr-2">
                        <span className={`text-[8px] font-black uppercase tracking-widest ${status === 'scheduled' ? 'text-primary' : 'text-slate-500'}`}>Confirmado</span>
                        <button
                            onClick={() => status === 'scheduled' ? onAbsent(item.id) : (onUndo && onUndo(item.id))}
                            className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${status === 'scheduled' ? 'bg-primary/20' : 'bg-rose-500/20'}`}
                        >
                            <div className={`absolute top-0.5 bottom-0.5 w-4 rounded-full transition-all ${status === 'scheduled' ? 'left-0.5 bg-primary' : 'right-0.5 bg-rose-500'}`}></div>
                        </button>
                        <span className={`text-[8px] font-black uppercase tracking-widest ${status === 'absent' ? 'text-rose-500' : 'text-slate-500'}`}>Ausente</span>
                    </div>

                    {status === 'scheduled' && (
                        <>
                            <button onClick={() => onDelete && onDelete(item.id)} className="size-10 md:size-12 rounded-xl flex items-center justify-center transition-all bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 shrink-0" title="Excluir Agendamento">
                                <span className="material-symbols-outlined text-[20px]">delete</span>
                            </button>
                            <button
                                onClick={() => onStart(item)}
                                className="h-10 md:h-12 px-4 md:px-6 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95 italic border"
                                style={{ backgroundColor: 'transparent', borderColor: colors.primary, color: colors.primary }}
                            >
                                {hasOrder ? 'EDITAR' : 'INICIAR'}
                            </button>
                            {!showDate && (
                                <button
                                    onClick={() => onFinalize(item)}
                                    className="h-10 md:h-12 px-4 md:px-6 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95 italic"
                                    style={{ backgroundColor: colors.primary, color: businessType === 'salon' ? '#fff' : '#000' }}
                                >
                                    FINALIZAR
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
