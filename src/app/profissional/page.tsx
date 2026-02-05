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
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const savedType = localStorage.getItem('elite_business_type') as 'barber' | 'salon';
        if (savedType) setBusinessType(savedType);
        fetchAgenda();
        fetchProducts();
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
            .gte('appointment_time', new Date().toISOString().split('T')[0])
            .order('appointment_time', { ascending: true });

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

    const handleFinishCommand = async () => {
        const { error } = await supabase
            .from('appointments')
            .update({
                status: 'completed',
                total_price: total
            })
            .eq('id', selectedClient.id);

        if (!error) {
            alert('Comanda finalizada e aguardando pagamento!');
            fetchAgenda();
            setView('agenda');
        }
    };

    const addToCart = (product: any) => {
        if (product.current_stock === 0) return alert('Sem estoque!');
        setCart(prev => {
            const existing = prev.find(i => i.id === product.id);
            if (existing) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
            return [...prev, { ...product, qty: 1 }];
        });
    };

    const basePrice = selectedClient?.services?.price || 0;
    const total = cart.reduce((acc, curr) => acc + (curr.price * curr.qty), basePrice);

    if (view === 'agenda') {
        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black italic uppercase" style={{ color: colors.text }}>Agenda de Hoje</h3>
                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: colors.textMuted }}>{new Date().toLocaleDateString()}</span>
                </div>

                <div className="grid gap-4">
                    {loading ? (
                        <div className="text-center py-20 opacity-40">
                            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 mx-auto" style={{ borderColor: colors.primary }}></div>
                        </div>
                    ) : dailyAgenda.length > 0 ? (dailyAgenda.map(item => (
                        <div key={item.id} className="border shadow-lg p-6 rounded-[2rem] flex flex-col sm:flex-row items-center justify-between transition-all gap-4 group" style={{ backgroundColor: colors.cardBg, borderColor: `${colors.text}0d` }}>
                            <div className="flex items-center gap-4">
                                <div className="size-14 rounded-2xl flex items-center justify-center font-black shrink-0 border" style={{ backgroundColor: `${colors.primary}1a`, color: colors.primary, borderColor: `${colors.primary}33` }}>
                                    {item.appointment_time.split('T')[1].substring(0, 5)}
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg" style={{ color: colors.text }}>{item.customer_name}</h4>
                                    <p className="text-xs font-black uppercase tracking-widest" style={{ color: colors.textMuted }}>{item.services?.name || 'Serviço'}</p>
                                </div>
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto">
                                {item.status === 'absent' ? (
                                    <span className="w-full sm:w-auto text-center text-red-500 text-[10px] font-black uppercase border border-red-500/20 px-6 py-3 rounded-full bg-red-500/5">AUSENTE</span>
                                ) : item.status === 'completed' ? (
                                    <span className="w-full sm:w-auto text-center text-emerald-500 text-[10px] font-black uppercase border border-emerald-500/20 px-6 py-3 rounded-full bg-emerald-500/5">REALIZADO</span>
                                ) : (
                                    <>
                                        <button onClick={() => handleMarkAbsent(item.id)} className="flex-1 sm:flex-none text-red-500 text-[10px] font-black uppercase px-4 py-3 rounded-xl border border-red-500/20 hover:bg-red-500/10 transition-all">AUSENTE</button>
                                        <button onClick={() => handleOpenCommand(item)} className="flex-1 sm:flex-none text-black text-[10px] font-black uppercase px-6 py-3 rounded-xl shadow-lg active:scale-95 transition-all italic tracking-tight" style={{ backgroundColor: colors.primary, color: businessType === 'salon' ? '#fff' : '#000' }}>INICIAR ATENDIMENTO</button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))
                    ) : (
                        <div className="text-center py-20 opacity-30">
                            <span className="material-symbols-outlined text-6xl italic" style={{ color: colors.textMuted }}>event_busy</span>
                            <p className="font-black uppercase text-xs tracking-[0.4em] mt-4" style={{ color: colors.textMuted }}>Nenhum agendamento para hoje</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col xl:flex-row gap-8 animate-in slide-in-from-right duration-500">
            <div className="flex-1 space-y-8">
                <div className="border p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6" style={{ backgroundColor: colors.cardBg, borderColor: `${colors.primary}33` }}>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setView('agenda')} className="transition-colors" style={{ color: colors.textMuted }}><span className="material-symbols-outlined text-3xl">arrow_back</span></button>
                        <div className="size-16 rounded-2xl flex items-center justify-center border shadow-inner" style={{ backgroundColor: `${colors.primary}33`, color: colors.primary, borderColor: `${colors.primary}33` }}>
                            <span className="material-symbols-outlined text-4xl">person</span>
                        </div>
                        <div>
                            <h3 className="text-2xl font-black italic uppercase tracking-tight" style={{ color: colors.text }}>{selectedClient.customer_name}</h3>
                            <p className="font-black text-[10px] uppercase tracking-[0.2em]" style={{ color: colors.textMuted }}>{selectedClient.services?.name}</p>
                        </div>
                    </div>
                </div>

                <h4 className="text-lg font-black uppercase italic tracking-tight mb-4" style={{ color: colors.text }}>Adicionar Produtos</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {products.map(p => (
                        <div key={p.id} className="p-4 rounded-3xl border group transition-all" style={{ backgroundColor: colors.cardBg, borderColor: `${colors.text}0d` }}>
                            <img alt="Produto" src={p.image_url || 'https://picsum.photos/200/200'} className="w-full aspect-square rounded-2xl mb-4 object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                            <div className="flex justify-between items-start mb-4">
                                <h4 className="font-bold text-base" style={{ color: colors.text }}>{p.name}</h4>
                                <span className="font-black" style={{ color: colors.primary }}>R$ {p.price}</span>
                            </div>
                            <button onClick={() => addToCart(p)} className="w-full font-black py-4 rounded-xl transition-all flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest" style={{ backgroundColor: `${colors.primary}1a`, color: colors.primary }}>
                                <span className="material-symbols-outlined text-sm">add</span> ADICIONAR
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <aside className="w-full xl:w-96">
                <div className="border rounded-[2.5rem] p-10 sticky top-10" style={{ backgroundColor: colors.cardBg, borderColor: `${colors.primary}33` }}>
                    <h3 className="text-xl font-black mb-8 flex items-center gap-2 italic uppercase" style={{ color: colors.text }}><span className="material-symbols-outlined" style={{ color: colors.primary }}>receipt_long</span> Resumo</h3>
                    <div className="space-y-4 mb-8">
                        <div className="flex justify-between items-center">
                            <span className="font-bold text-xs uppercase" style={{ color: colors.textMuted }}>{selectedClient.services?.name}</span>
                            <span className="font-black" style={{ color: colors.text }}>R$ {basePrice.toFixed(2)}</span>
                        </div>
                        {cart.map(item => (
                            <div key={item.id} className="flex justify-between items-center">
                                <span className="font-bold text-sm" style={{ color: colors.textMuted }}>{item.name} (x{item.qty})</span>
                                <span className="font-black" style={{ color: colors.text }}>R$ {(item.price * item.qty).toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                    <div className="border-t pt-6" style={{ borderColor: `${colors.text}1a` }}>
                        <div className="flex justify-between items-baseline mb-8">
                            <span className="font-black uppercase text-[10px] tracking-widest italic" style={{ color: colors.textMuted }}>Total</span>
                            <span className="text-4xl font-black italic tracking-tighter" style={{ color: colors.primary }}>R$ {total.toFixed(2)}</span>
                        </div>
                        <button onClick={handleFinishCommand} className="w-full font-black py-5 rounded-2xl text-lg shadow-2xl transition-all flex items-center justify-center gap-2 uppercase italic" style={{ backgroundColor: colors.primary, color: businessType === 'salon' ? '#fff' : '#000' }}>FINALIZAR <span className="material-symbols-outlined">send</span></button>
                    </div>
                </div>
            </aside>
        </div>
    );
}
