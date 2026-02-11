"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Layout from '../../components/layout/Layout';

const BarberCommand: React.FC<{ businessType: 'barber' | 'salon' }> = ({ businessType }) => {
  const [view, setView] = useState<'agenda' | 'command'>('agenda');
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [cart, setCart] = useState<{ id: string; name: string; price: number; qty: number; isService?: boolean }[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [dailyAgenda, setDailyAgenda] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const isSalon = businessType === 'salon';

  // 1. Fetch Agenda Logic
  const fetchAgenda = async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    // Get Barber Profile
    const { data: profile } = await supabase.from('profiles').select('id, tenant_id').eq('id', user.id).single();
    if (!profile) return;

    // Fetch Appointments for Today
    const today = new Date().toISOString().split('T')[0];
    const { data: appts } = await supabase
      .from('appointments')
      .select('*, services(name, price, duration)')
      .eq('barber_id', profile.id)
      .gte('scheduled_at', `${today}T00:00:00`)
      .lte('scheduled_at', `${today}T23:59:59`)
      .order('scheduled_at', { ascending: true });

    if (appts) {
      setDailyAgenda(appts.map(a => ({
        id: a.id,
        name: a.customer_name,
        service: a.services?.name || 'Serviço Personalizado',
        service_price: a.services?.price || 0,
        service_id: a.service_id,
        time: new Date(a.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        status: a.status // pending, completed, absent
      })));
    }
  };

  // 2. Fetch Products
  const fetchProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .gt('current_stock', 0); // Only available products
    if (data) setProducts(data);
  };

  useEffect(() => {
    fetchAgenda();
    fetchProducts();
  }, []);

  const handleOpenCommand = (appointment: any) => {
    setSelectedAppointment(appointment);
    // Add base service to cart automatically
    setCart([{
      id: appointment.service_id,
      name: appointment.service,
      price: appointment.service_price,
      qty: 1,
      isService: true
    }]);
    setView('command');
  };

  const handleMarkAbsent = async (id: string) => {
    if (!confirm('Marcar ausência?')) return;
    await supabase.from('appointments').update({ status: 'absent' }).eq('id', id);
    fetchAgenda();
  };

  const addToCart = (product: any) => {
    if (product.current_stock === 0) return alert('Sem estoque!');
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id && !i.isService);
      if (existing) {
        if (existing.qty >= product.current_stock) {
          alert('Estoque máximo atingido na comanda!');
          return prev;
        }
        return prev.map(i => i.id === product.id && !i.isService ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, {
        id: product.id,
        name: product.name,
        price: product.sale_price || 0,
        qty: 1,
        isService: false
      }];
    });
  };

  const removeFromCart = (itemId: string, isService: boolean) => {
    if (isService) {
      alert('O serviço principal não pode ser removido.');
      return;
    }
    setCart(prev => prev.filter(i => !(i.id === itemId && !i.isService)));
  }

  const handleFinishCommand = async () => {
    setLoading(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      const totalValue = cart.reduce((acc, curr) => acc + (curr.price * curr.qty), 0);

      // 1. Create Order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          tenant_id: (await supabase.from('profiles').select('tenant_id').eq('id', user?.id).single()).data?.tenant_id,
          appointment_id: selectedAppointment.id,
          barber_id: user?.id,
          total_value: totalValue,
          status: 'pending_payment', // Waiting for Cashier
          finalized_at: new Date()
        })
        .select()
        .single();

      if (orderError) throw new Error('Erro ao criar comanda: ' + orderError.message);

      // 2. Insert Order Items
      const itemsToInsert = cart.map(item => ({
        order_id: order.id,
        product_id: item.isService ? null : item.id,
        service_id: item.isService ? item.id : null,
        quantity: item.qty,
        unit_price: item.price
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(itemsToInsert);
      if (itemsError) throw new Error('Erro ao adicionar itens: ' + itemsError.message);

      // 3. Mark Appointment as Completed (Ready for Cashier)
      await supabase.from('appointments').update({ status: 'completed' }).eq('id', selectedAppointment.id);

      alert('Comanda finalizada! Encaminhada para o Caixa.');
      setView('agenda');
      fetchAgenda(); // Refresh list

    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const total = cart.reduce((acc, curr) => acc + (curr.price * curr.qty), 0);

  if (view === 'agenda') {
    return (
      <Layout title={isSalon ? "Minha Agenda Profissional" : "Minha Agenda"}>
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black italic uppercase">Hoje</h3>
            <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest">{new Date().toLocaleDateString()}</span>
          </div>

          <div className="grid gap-4">
            {dailyAgenda.length === 0 && (
              <p className="text-zinc-500 text-center py-10 font-bold">Nenhum agendamento para hoje.</p>
            )}
            {dailyAgenda.map(item => (
              <div key={item.id} className={`${isSalon ? 'bg-white border-slate-100 shadow-sm' : 'bg-[#18181b] border-white/5 shadow-lg'} p-6 rounded-[2rem] border flex flex-col sm:flex-row items-center justify-between transition-all gap-4`}>
                <div className="flex items-center gap-4">
                  <div className={`size-12 rounded-xl bg-[#f2b90d]/10 flex items-center justify-center text-[#f2b90d] font-black shrink-0`}>
                    {item.time}
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-white">{item.name}</h4>
                    <p className="text-zinc-500 text-xs font-black uppercase tracking-widest">{item.service}</p>
                  </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  {item.status === 'absent' ? (
                    <span className="w-full sm:w-auto text-center text-red-500 text-[10px] font-black uppercase border border-red-500/20 px-6 py-3 rounded-full bg-red-500/5">AUSENTE</span>
                  ) : item.status === 'completed' || item.status === 'paid' ? (
                    <span className="w-full sm:w-auto text-center text-emerald-500 text-[10px] font-black uppercase border border-emerald-500/20 px-6 py-3 rounded-full bg-emerald-500/5">REALIZADO</span>
                  ) : (
                    <>
                      <button onClick={() => handleMarkAbsent(item.id)} className="flex-1 sm:flex-none bg-red-500/10 text-red-500 text-[10px] font-black uppercase px-4 py-3 rounded-xl border border-red-500/20 hover:bg-red-500/20 transition-all">AUSENTE</button>
                      <button onClick={() => handleOpenCommand(item)} className="flex-1 sm:flex-none bg-[#f2b90d] hover:bg-[#d9a50c] text-black text-[10px] font-black uppercase px-6 py-3 rounded-xl shadow-lg shadow-[#f2b90d]/20 active:scale-95 transition-all italic tracking-tight">INICIAR ATENDIMENTO</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Operação / Comanda">
      <div className="flex flex-col xl:flex-row gap-8 animate-in slide-in-from-right duration-500">
        <div className="flex-1 space-y-8">
          <div className={`${isSalon ? 'bg-white shadow-xl' : 'bg-[#18181b]'} border border-white/10 p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6`}>
            <div className="flex items-center gap-4">
              <button onClick={() => setView('agenda')} className="text-zinc-500 hover:text-[#f2b90d] transition-colors"><span className="material-symbols-outlined text-3xl">arrow_back</span></button>
              <div className="size-16 bg-[#f2b90d]/20 rounded-2xl flex items-center justify-center text-[#f2b90d]"><span className="material-symbols-outlined text-4xl">person</span></div>
              <div>
                <h3 className="text-2xl font-black italic text-white">{selectedAppointment.name}</h3>
                <p className="text-zinc-500 font-black text-[10px] uppercase tracking-[0.2em]">Comanda Aberta</p>
              </div>
            </div>
          </div>

          <h4 className="text-lg font-black uppercase italic tracking-tight text-white">Adicionar Produtos</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map(p => (
              <div key={p.id} className="bg-[#18181b] border border-white/5 p-4 rounded-3xl group hover:border-[#f2b90d]/30 transition-all">
                <div className="w-full aspect-square rounded-2xl mb-4 bg-white/5 flex items-center justify-center text-4xl">
                  {p.photo_url ? <img src={p.photo_url} className="w-full h-full object-cover rounded-2xl" /> : '🧴'}
                </div>
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-base text-white">{p.name}</h4>
                  <span className="text-[#f2b90d] font-black">R$ {p.sale_price}</span>
                </div>
                <div className="text-xs text-zinc-500 mb-2 font-mono">Estoque: {p.current_stock}</div>
                <button onClick={() => addToCart(p)} className="w-full bg-[#f2b90d]/10 hover:bg-[#f2b90d] hover:text-black text-[#f2b90d] font-black py-3 rounded-xl transition-all flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-sm">add</span> ADICIONAR
                </button>
              </div>
            ))}
          </div>
        </div>

        <aside className="w-full xl:w-96">
          <div className={`${isSalon ? 'bg-white shadow-2xl' : 'bg-[#18181b]'} border border-white/10 rounded-[2.5rem] p-10 sticky top-28`}>
            <h3 className="text-xl font-black mb-8 flex items-center gap-2 italic uppercase text-white"><span className="material-symbols-outlined text-[#f2b90d]">receipt_long</span> Resumo</h3>
            <div className="space-y-4 mb-8">
              {cart.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center group">
                  <span className="font-bold text-sm text-zinc-300">
                    {item.name} {item.qty > 1 && `(x${item.qty})`} {item.isService && <span className="text-[#f2b90d] text-[10px] ml-1 border border-[#f2b90d] px-1 rounded">SERV</span>}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="font-black text-white">R$ {item.price * item.qty}</span>
                    {!item.isService && (
                      <button onClick={() => removeFromCart(item.id, false)} className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><span className="material-symbols-outlined text-sm">delete</span></button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-white/10 pt-6">
              <div className="flex justify-between items-baseline mb-6"><span className="text-zinc-500 font-black uppercase text-[10px]">Total</span><span className="text-[#f2b90d] text-4xl font-black italic">R$ {total.toFixed(2)}</span></div>
              <button
                onClick={handleFinishCommand}
                disabled={loading}
                className="w-full bg-[#f2b90d] hover:bg-[#d9a50c] text-black font-black py-5 rounded-2xl text-lg shadow-xl shadow-[#f2b90d]/10 transition-all flex items-center justify-center gap-2 uppercase italic disabled:opacity-50"
              >
                {loading ? 'Processando...' : 'FINALIZAR'} <span className="material-symbols-outlined">send</span>
              </button>
            </div>
          </div>
        </aside>
      </div>
    </Layout>
  );
};

export default BarberCommand;
