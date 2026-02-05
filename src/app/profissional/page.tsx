"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function ProfessionalAgendaPage() {
    const [view, setView] = useState<'agenda' | 'command'>('agenda');
    const [selectedClient, setSelectedClient] = useState<any>(null);
    const [cart, setCart] = useState<{ id: string; name: string; price: number; qty: number }[]>([]);
    const [dailyAgenda, setDailyAgenda] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAgenda();
        fetchProducts();
    }, []);

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
        // In a real app, this would create a 'comanda' or update the appointment total
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
                    <h3 className="text-xl font-black italic uppercase text-white">Agenda de Hoje</h3>
                    <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">{new Date().toLocaleDateString()}</span>
                </div>

                <div className="grid gap-4">
                    {loading ? (
                        <div className="text-center py-20 opacity-40">
                            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#f2b90d] mx-auto"></div>
                        </div>
                    ) : dailyAgenda.length > 0 ? (
                        dailyAgenda.map(item => (
                            <div key={item.id} className="bg-[#121214] border border-white/5 shadow-lg p-6 rounded-[2rem] flex flex-col sm:flex-row items-center justify-between transition-all gap-4 group hover:border-[#f2b90d]/20">
                                <div className="flex items-center gap-4">
                                    <div className="size-14 rounded-2xl bg-[#f2b90d]/10 flex items-center justify-center text-[#f2b90d] font-black shrink-0 border border-[#f2b90d]/20">
                                        {item.appointment_time.split('T')[1].substring(0, 5)}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-lg text-white">{item.customer_name}</h4>
                                        <p className="text-slate-500 text-xs font-black uppercase tracking-widest">{item.services?.name || 'Serviço'}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2 w-full sm:w-auto">
                                    {item.status === 'absent' ? (
                                        <span className="w-full sm:w-auto text-center text-red-500 text-[10px] font-black uppercase border border-red-500/20 px-6 py-3 rounded-full bg-red-500/5">AUSENTE</span>
                                    ) : item.status === 'completed' ? (
                                        <span className="w-full sm:w-auto text-center text-emerald-500 text-[10px] font-black uppercase border border-emerald-500/20 px-6 py-3 rounded-full bg-emerald-500/5">REALIZADO</span>
                                    ) : (
                                        <>
                                            <button onClick={() => handleMarkAbsent(item.id)} className="flex-1 sm:flex-none bg-red-500/10 text-red-500 text-[10px] font-black uppercase px-4 py-3 rounded-xl border border-red-500/20 hover:bg-red-500/20 transition-all">AUSENTE</button>
                                            <button onClick={() => handleOpenCommand(item)} className="flex-1 sm:flex-none bg-[#f2b90d] hover:bg-[#d9a50c] text-black text-[10px] font-black uppercase px-6 py-3 rounded-xl shadow-lg shadow-[#f2b90d]/20 active:scale-95 transition-all italic tracking-tight">INICIAR ATENDIMENTO</button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-20 opacity-30">
                            <span className="material-symbols-outlined text-6xl italic text-slate-500">event_busy</span>
                            <p className="font-black uppercase text-xs tracking-[0.4em] mt-4 text-slate-500">Nenhum agendamento para hoje</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col xl:flex-row gap-8 animate-in slide-in-from-right duration-500">
            <div className="flex-1 space-y-8">
                <div className="bg-[#121214] border border-[#f2b90d]/20 p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setView('agenda')} className="text-slate-500 hover:text-[#f2b90d] transition-colors"><span className="material-symbols-outlined text-3xl">arrow_back</span></button>
                        <div className="size-16 bg-[#f2b90d]/20 rounded-2xl flex items-center justify-center text-[#f2b90d] border border-[#f2b90d]/20 shadow-inner">
                            <span className="material-symbols-outlined text-4xl">person</span>
                        </div>
                        <div>
                            <h3 className="text-2xl font-black italic text-white uppercase tracking-tight">{selectedClient.customer_name}</h3>
                            <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.2em]">{selectedClient.services?.name}</p>
                        </div>
                    </div>
                </div>

                <h4 className="text-lg font-black uppercase italic tracking-tight text-white mb-4">Adicionar Produtos</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {products.map(p => (
                        <div key={p.id} className="bg-[#121214] p-4 rounded-3xl border border-white/5 group hover:border-[#f2b90d]/30 transition-all">
                            <img src={p.image_url || 'https://picsum.photos/200/200'} className="w-full aspect-square rounded-2xl mb-4 object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                            <div className="flex justify-between items-start mb-4">
                                <h4 className="font-bold text-base text-white">{p.name}</h4>
                                <span className="text-[#f2b90d] font-black">R$ {p.price}</span>
                            </div>
                            <button onClick={() => addToCart(p)} className="w-full bg-[#f2b90d]/10 hover:bg-[#f2b90d] hover:text-black text-[#f2b90d] font-black py-4 rounded-xl transition-all flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest"><span className="material-symbols-outlined text-sm">add</span> ADICIONAR</button>
                        </div>
                    ))}
                </div>
            </div>

            <aside className="w-full xl:w-96">
                <div className="bg-[#121214] border border-[#f2b90d]/20 rounded-[2.5rem] p-10 sticky top-10">
                    <h3 className="text-xl font-black mb-8 flex items-center gap-2 italic uppercase text-white"><span className="material-symbols-outlined text-[#f2b90d]">receipt_long</span> Resumo</h3>
                    <div className="space-y-4 mb-8">
                        <div className="flex justify-between items-center text-slate-400">
                            <span className="font-bold text-xs uppercase">{selectedClient.services?.name}</span>
                            <span className="font-black text-white">R$ {basePrice.toFixed(2)}</span>
                        </div>
                        {cart.map(item => (
                            <div key={item.id} className="flex justify-between items-center">
                                <span className="font-bold text-sm text-slate-300">{item.name} (x{item.qty})</span>
                                <span className="font-black text-white">R$ {(item.price * item.qty).toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                    <div className="border-t border-white/10 pt-6">
                        <div className="flex justify-between items-baseline mb-8">
                            <span className="text-slate-500 font-black uppercase text-[10px] tracking-widest italic">Total</span>
                            <span className="text-[#f2b90d] text-4xl font-black italic tracking-tighter">R$ {total.toFixed(2)}</span>
                        </div>
                        <button onClick={handleFinishCommand} className="w-full bg-[#f2b90d] hover:bg-[#d9a50c] text-black font-black py-5 rounded-2xl text-lg shadow-2xl shadow-[#f2b90d]/20 transition-all flex items-center justify-center gap-2 uppercase italic">FINALIZAR <span className="material-symbols-outlined">send</span></button>
                    </div>
                </div>
            </aside>
        </div>
    );
}
