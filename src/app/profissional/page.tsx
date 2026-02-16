"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export default function ProfessionalAgendaPage() {
    const [view, setView] = useState<'agenda' | 'command'>('agenda');
    const [businessType, setBusinessType] = useState<'barber' | 'salon'>('barber');
    const [selectedClient, setSelectedClient] = useState<any>(null);
    const [cart, setCart] = useState<{ id: string; name: string; price: number; qty: number }[]>([]);
    const [dailyAgenda, setDailyAgenda] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [allServices, setAllServices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const savedType = localStorage.getItem('elite_business_type') as 'barber' | 'salon';
        if (savedType) setBusinessType(savedType);
        fetchAgenda();
        fetchProducts();
        fetchServices();
    }, []);

    const colors = businessType === 'salon'
        ? { primary: '#7b438e', bg: '#faf8f5', text: '#1e1e1e', textMuted: '#6b6b6b', cardBg: '#ffffff', inputBg: '#f5f3f0' }
        : { primary: '#f2b90d', bg: '#000000', text: '#f8fafc', textMuted: '#64748b', cardBg: '#121214', inputBg: '#0f0f10' };

    // ... fetchAgenda, fetchProducts, etc (keeping line numbers in mind for replacement)
    const fetchAgenda = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data, error } = await supabase
            .from('appointments')
            .select('*, profiles(full_name), services(name, price)')
            .eq('barber_id', session.user.id)
            .gte('scheduled_at', new Date().toISOString().split('T')[0] + 'T00:00:00')
            .order('scheduled_at', { ascending: true });

        if (!error && data) {
            setDailyAgenda(data);
        }
        setLoading(false);
    };

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
                .from('inventory')
                .select('*')
                .eq('tenant_id', profile.tenant_id);
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
        setCart([]);
        setView('command');
    };

    const handleMarkAbsent = async (id: string) => {
        if (confirm('Marcar ausência?')) {
            const { error } = await supabase
                .from('appointments')
                .update({ status: 'absent' })
                .eq('id', id);
            if (!error) fetchAgenda();
        }
    };

    const handleUndoAbsent = async (id: string) => {
        const { error } = await supabase
            .from('appointments')
            .update({ status: 'scheduled' })
            .eq('id', id);
        if (!error) fetchAgenda();
    };

    const handleFinishCommand = async () => {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return setLoading(false);

        const { data: barberProfile } = await supabase
            .from('profiles')
            .select('service_commission, product_commission, tenant_id')
            .eq('id', session.user.id)
            .single();

        if (!barberProfile) {
            alert('Erro ao buscar perfil do profissional.');
            setLoading(false);
            return;
        }

        const serviceTotal = parseFloat(selectedClient?.services?.price?.toString() || '0');
        const productTotal = cart.reduce((acc, curr) => acc + (curr.price * curr.qty), 0);
        const serviceCommissionRate = (barberProfile.service_commission || 0) / 100;
        const productCommissionRate = (barberProfile.product_commission || 0) / 100;

        const commissionAmount = (serviceTotal * serviceCommissionRate) + (productTotal * productCommissionRate);
        const totalValue = serviceTotal + productTotal;

        // Create ORDER record
        const { error: orderError } = await supabase
            .from('orders')
            .insert({
                tenant_id: barberProfile.tenant_id,
                appointment_id: selectedClient.id,
                barber_id: session.user.id,
                total_value: totalValue,
                service_total: serviceTotal,
                product_total: productTotal,
                commission_amount: commissionAmount,
                status: 'pending_payment',
                items: cart
            });

        if (orderError) {
            console.error(orderError);
            alert('Erro ao criar pedido: ' + orderError.message);
            setLoading(false);
            return;
        }

        // Update Appointment with final status, price and POSSIBLY changed service
        const { error: apptError } = await supabase
            .from('appointments')
            .update({
                status: 'completed',
                service_id: selectedClient.service_id,
                price: serviceTotal,
                total_price: totalValue
            })
            .eq('id', selectedClient.id);

        if (!apptError) {
            alert(`Comanda enviada para o Caixa!\nComissão estimada: R$ ${commissionAmount.toFixed(2)}`);
            fetchAgenda();
            setView('agenda');
        } else {
            alert('Erro ao atualizar agendamento: ' + apptError.message);
        }
        setLoading(false);
    };

    const addToCart = (product: any) => {
        if (product.current_stock === 0) return alert('Sem estoque!');
        setCart(prev => {
            const existing = prev.find(i => i.id === product.id);
            if (existing) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
            return [...prev, { ...product, qty: 1 }];
        });
    };

    const todayDate = new Date();
    const todayStr = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;
    const todayItems = dailyAgenda.filter(p => p.scheduled_at.startsWith(todayStr));
    const upcomingItems = dailyAgenda.filter(p => !p.scheduled_at.startsWith(todayStr));

    if (view === 'agenda') {
        return (
            <div className="space-y-4 md:space-y-6 animate-in fade-in duration-500 pb-10">
                <div className="space-y-12">
                    {/* TODAY SECTION */}
                    {todayItems.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 px-2">
                                <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                <h3 className="text-sm font-black uppercase tracking-widest opacity-60" style={{ color: colors.text }}>Agenda de Hoje</h3>
                            </div>
                            <div className="grid gap-3 md:gap-4">
                                {todayItems.map(item => (
                                    <AgendaCard key={item.id} item={item} colors={colors} businessType={businessType} onAbsent={handleMarkAbsent} onUndo={handleUndoAbsent} onStart={handleOpenCommand} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* UPCOMING SECTION */}
                    {upcomingItems.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 px-2">
                                <span className="size-2 rounded-full bg-amber-500"></span>
                                <h3 className="text-sm font-black uppercase tracking-widest opacity-60" style={{ color: colors.text }}>Próximos Agendamentos</h3>
                            </div>
                            <div className="grid gap-3 md:gap-4">
                                {upcomingItems.map(item => (
                                    <AgendaCard key={item.id} item={item} colors={colors} businessType={businessType} onAbsent={handleMarkAbsent} onUndo={handleUndoAbsent} onStart={handleOpenCommand} showDate />
                                ))}
                            </div>
                        </div>
                    )}

                    {!loading && todayItems.length === 0 && upcomingItems.length === 0 && (
                        <div className="text-center py-16 md:py-20 opacity-30">
                            <span className="material-symbols-outlined text-4xl md:text-6xl italic" style={{ color: colors.textMuted }}>event_busy</span>
                            <p className="font-black uppercase text-[10px] md:text-xs tracking-[0.4em] mt-4" style={{ color: colors.textMuted }}>Nenhum agendamento encontrado</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    const basePrice = selectedClient?.services?.price || 0;
    const total = cart.reduce((acc, curr) => acc + (curr.price * curr.qty), basePrice);

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
                            <p className="font-black text-[9px] md:text-[10px] uppercase tracking-[0.2em] opacity-60 truncate" style={{ color: colors.textMuted }}>
                                {new Date(selectedClient.scheduled_at).toLocaleDateString('pt-BR')} às {selectedClient.scheduled_at.split('T')[1].substring(0, 5)}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="px-2 md:px-0 space-y-8">
                    {/* EDIT SERVICE SECTION */}
                    <div className="p-6 md:p-8 rounded-3xl border" style={{ backgroundColor: colors.cardBg, borderColor: `${colors.text}0d` }}>
                        <h4 className="text-base md:text-lg font-black uppercase italic tracking-tight mb-6 flex items-center gap-2" style={{ color: colors.text }}>
                            <span className="material-symbols-outlined text-primary">edit_note</span> EDITAR SERVIÇO
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-widest opacity-50 ml-1" style={{ color: colors.textMuted }}>Serviço Realizado</label>
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
                                <input
                                    type="number"
                                    step="0.01"
                                    className="w-full bg-black border border-white/10 rounded-xl py-4 px-4 text-sm font-bold text-white focus:border-primary outline-none transition-all"
                                    value={selectedClient.services?.price || 0}
                                    onChange={(e) => {
                                        setSelectedClient({
                                            ...selectedClient,
                                            services: {
                                                ...selectedClient.services,
                                                price: e.target.value
                                            }
                                        });
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* ADD PRODUCTS SECTION */}
                    <div>
                        <h4 className="text-base md:text-lg font-black uppercase italic tracking-tight mb-4 flex items-center gap-2" style={{ color: colors.text }}>
                            <span className="material-symbols-outlined text-primary">inventory_2</span> ADICIONAR PRODUTOS
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                            {products.map(p => (
                                <div key={p.id} className="p-3 md:p-4 rounded-3xl border group transition-all" style={{ backgroundColor: colors.cardBg, borderColor: `${colors.text}0d` }}>
                                    <img alt="Produto" src={p.image_url || 'https://picsum.photos/200/200'} className="w-full aspect-square rounded-2xl mb-3 md:mb-4 object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                                    <div className="flex justify-between items-start mb-3 md:mb-4 px-1">
                                        <h4 className="font-bold text-sm md:text-base truncate mr-2" style={{ color: colors.text }}>{p.name}</h4>
                                        <span className="font-black text-xs md:text-base shrink-0" style={{ color: colors.primary }}>RS {p.price}</span>
                                    </div>
                                    <button onClick={() => addToCart(p)} className="w-full font-black py-3 md:py-4 rounded-xl transition-all flex items-center justify-center gap-2 text-[9px] md:text-[10px] uppercase tracking-widest" style={{ backgroundColor: `${colors.primary}1a`, color: colors.primary }}>
                                        <span className="material-symbols-outlined text-sm">add</span> ADICIONAR
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <aside className="w-full xl:w-80 2xl:w-96">
                <div className="border rounded-3xl md:rounded-[2.5rem] p-6 md:p-10 sticky top-4 md:top-10" style={{ backgroundColor: colors.cardBg, borderColor: `${colors.primary}33` }}>
                    <h3 className="text-lg md:text-xl font-black mb-6 md:mb-8 flex items-center gap-2 italic uppercase" style={{ color: colors.text }}><span className="material-symbols-outlined" style={{ color: colors.primary }}>receipt_long</span> Resumo</h3>
                    <div className="space-y-3 md:space-y-4 mb-6 md:mb-8 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                        <div className="flex justify-between items-center">
                            <span className="font-bold text-[10px] md:text-xs uppercase opacity-70" style={{ color: colors.textMuted }}>{selectedClient.services?.name}</span>
                            <span className="font-black text-sm" style={{ color: colors.text }}>R$ {basePrice.toFixed(2)}</span>
                        </div>
                        {cart.map(item => (
                            <div key={item.id} className="flex justify-between items-center">
                                <span className="font-bold text-xs md:text-sm opacity-70" style={{ color: colors.textMuted }}>{item.name} (x{item.qty})</span>
                                <span className="font-black text-sm" style={{ color: colors.text }}>R$ {(item.price * item.qty).toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                    <div className="border-t pt-5 md:pt-6" style={{ borderColor: `${colors.text}1a` }}>
                        <div className="flex justify-between items-baseline mb-6 md:mb-8">
                            <span className="font-black uppercase text-[9px] md:text-[10px] tracking-widest italic opacity-50" style={{ color: colors.textMuted }}>Total Geral</span>
                            <span className="text-3xl md:text-4xl font-black italic tracking-tighter" style={{ color: colors.primary }}>R$ {total.toFixed(2)}</span>
                        </div>
                        <button onClick={handleFinishCommand} className="w-full font-black py-4 md:py-5 rounded-2xl text-base md:text-lg shadow-2xl transition-all flex items-center justify-center gap-2 uppercase italic active:scale-95" style={{ backgroundColor: colors.primary, color: businessType === 'salon' ? '#fff' : '#000' }}>FINALIZAR <span className="material-symbols-outlined">send</span></button>
                    </div>
                </div>
            </aside>
        </div>
    );
}

// PREMIUM AGENDA CARD COMPONENT
const AgendaCard = ({ item, colors, businessType, onAbsent, onUndo, onStart, showDate }: any) => {
    const isToday = !showDate;
    const status = item.status;

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
                <div className="min-w-0">
                    <h4 className="font-bold text-base md:text-xl truncate" style={{ color: colors.text }}>{item.customer_name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] md:text-xs font-black uppercase tracking-widest opacity-60" style={{ color: colors.textMuted }}>{item.services?.name || 'Serviço'}</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="flex flex-col items-end mr-4 hidden md:flex">
                    <span className="text-[9px] font-black uppercase tracking-widest opacity-40 italic" style={{ color: colors.textMuted }}>Valor</span>
                    <span className="text-lg font-black italic tracking-tighter" style={{ color: colors.text }}>R$ {Number(item.services?.price || 0).toFixed(2)}</span>
                </div>

                <div className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border text-center flex-1 md:flex-none md:w-32 ${status === 'completed' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                    status === 'absent' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                        status === 'paid' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                            status === 'cancelled' ? 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20' :
                                'bg-amber-500/10 text-amber-500 border-amber-500/20'
                    }`}>
                    {status === 'completed' ? 'REALIZADO' :
                        status === 'absent' ? 'AUSENTE' :
                            status === 'paid' ? 'PAGO' :
                                status === 'cancelled' ? 'CANCELADO' :
                                    'AGENDADO'}
                </div>

                <div className="flex gap-2">
                    {status === 'absent' ? (
                        <button onClick={() => onUndo(item.id)} className="size-10 md:size-12 rounded-xl flex items-center justify-center transition-all bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20">
                            <span className="material-symbols-outlined text-[20px]">undo</span>
                        </button>
                    ) : status !== 'completed' && status !== 'paid' && status !== 'cancelled' ? (
                        <>
                            {!showDate && (
                                <button onClick={() => onAbsent(item.id)} className="size-10 md:size-12 rounded-xl flex items-center justify-center transition-all bg-rose-500/10 text-rose-500 hover:bg-rose-500/20">
                                    <span className="material-symbols-outlined text-[20px]">person_off</span>
                                </button>
                            )}
                            <button
                                onClick={() => onStart(item)}
                                className="h-10 md:h-12 px-4 md:px-6 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95 italic"
                                style={{ backgroundColor: colors.primary, color: businessType === 'salon' ? '#fff' : '#000' }}
                            >
                                {showDate ? 'DETALHES' : 'INICIAR'}
                            </button>
                        </>
                    ) : null}
                </div>
            </div>
        </div>
    );
};
