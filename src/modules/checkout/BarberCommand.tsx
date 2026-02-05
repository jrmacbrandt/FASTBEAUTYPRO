
import React, { useState } from 'react';
import Layout from '../../components/layout/Layout';

const BarberCommand: React.FC<{ businessType: 'barber' | 'salon' }> = ({ businessType }) => {
  const [view, setView] = useState<'agenda' | 'command'>('agenda');
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [cart, setCart] = useState<{ id: string; name: string; price: number; qty: number }[]>([]);
  const isSalon = businessType === 'salon';

  const [dailyAgenda, setDailyAgenda] = useState([
    { id: '1', name: 'Marcus T.', service: isSalon ? 'Coloração' : 'Corte Degradê', time: '10:30', status: 'pending' },
    { id: '2', name: 'Daniel K.', service: isSalon ? 'Hidratação' : 'Barba Clássica', time: '11:15', status: 'absent' },
    { id: '3', name: 'Robert M.', service: isSalon ? 'Manicure' : 'Corte Tesoura', time: '12:00', status: 'pending' },
  ]);

  const products = [
    { id: 'p1', name: isSalon ? 'Máscara Orchid' : 'Pomada Elite Matte', price: 22, stock: 12, img: 'https://picsum.photos/200/200?random=1' },
    { id: 'p2', name: isSalon ? 'Sérum Finalizador' : 'Óleo de Cedro', price: 18, stock: 3, img: 'https://picsum.photos/200/200?random=2' },
  ];

  const handleOpenCommand = (appointment: any) => {
    setSelectedClient(appointment);
    setCart([]);
    setView('command');
  };

  const handleMarkAbsent = (id: string) => {
    if (confirm('Marcar ausência?')) setDailyAgenda(prev => prev.map(item => item.id === id ? { ...item, status: 'absent' } : item));
  };

  const handleFinishCommand = () => {
    alert('Comanda encaminhada ao caixa!');
    setDailyAgenda(prev => prev.map(item => item.id === selectedClient.id ? { ...item, status: 'completed' } : item));
    setView('agenda');
  };

  const addToCart = (product: any) => {
    if (product.stock === 0) return alert('Sem estoque!');
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const total = cart.reduce((acc, curr) => acc + (curr.price * curr.qty), isSalon ? 80 : 35);

  if (view === 'agenda') {
    return (
      <Layout title={isSalon ? "Minha Agenda Profissional" : "Minha Agenda"}>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black italic uppercase">Hoje</h3>
            <span className="text-text-muted text-xs font-bold uppercase tracking-widest">{new Date().toLocaleDateString()}</span>
          </div>

          <div className="grid gap-4">
            {dailyAgenda.map(item => (
              <div key={item.id} className={`${isSalon ? 'bg-white border-slate-100 shadow-sm' : 'bg-background-card border-white/5 shadow-lg'} p-6 rounded-[2rem] border flex flex-col sm:flex-row items-center justify-between transition-all gap-4`}>
                <div className="flex items-center gap-4">
                  <div className={`size-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black shrink-0`}>
                    {item.time}
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">{item.name}</h4>
                    <p className="text-text-muted text-xs font-black uppercase tracking-widest">{item.service}</p>
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
                      <button onClick={() => handleOpenCommand(item)} className="flex-1 sm:flex-none bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black uppercase px-6 py-3 rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all italic tracking-tight">INICIAR ATENDIMENTO</button>
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
      <div className="flex flex-col xl:flex-row gap-8">
        <div className="flex-1 space-y-8">
          <div className={`${isSalon ? 'bg-white shadow-xl' : 'bg-background-elite/40'} border border-primary/20 p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6`}>
            <div className="flex items-center gap-4">
              <button onClick={() => setView('agenda')} className="text-text-muted hover:text-primary transition-colors"><span className="material-symbols-outlined text-3xl">arrow_back</span></button>
              <div className="size-16 bg-primary/20 rounded-2xl flex items-center justify-center text-primary"><span className="material-symbols-outlined text-4xl">person</span></div>
              <div>
                <h3 className="text-2xl font-black italic">{selectedClient.name}</h3>
                <p className="text-text-muted font-black text-[10px] uppercase tracking-[0.2em]">{selectedClient.service}</p>
              </div>
            </div>
          </div>

          <h4 className="text-lg font-black uppercase italic tracking-tight">Produtos & Extras</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map(p => (
              <div key={p.id} className={`${isSalon ? 'bg-white border-slate-100 shadow-sm' : 'bg-background-card border-white/5'} p-4 rounded-3xl border group hover:border-primary/30 transition-all`}>
                <img alt="Produto" src={p.img} className="w-full aspect-square rounded-2xl mb-4 object-cover" />
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-base">{p.name}</h4>
                  <span className="text-primary font-black">R$ {p.price}</span>
                </div>
                <button onClick={() => addToCart(p)} className="w-full bg-primary/10 hover:bg-primary hover:text-white text-primary font-black py-3 rounded-xl transition-all flex items-center justify-center gap-2"><span className="material-symbols-outlined text-sm">add</span> ADICIONAR</button>
              </div>
            ))}
          </div>
        </div>

        <aside className="w-full xl:w-96">
          <div className={`${isSalon ? 'bg-white shadow-2xl' : 'bg-background-elite/60'} border border-primary/20 rounded-[2.5rem] p-10 sticky top-28`}>
            <h3 className="text-xl font-black mb-8 flex items-center gap-2 italic uppercase"><span className="material-symbols-outlined text-primary">receipt_long</span> Resumo</h3>
            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-center text-text-muted"><span className="font-bold text-xs uppercase">{selectedClient.service}</span><span className="font-black">R$ {isSalon ? '80,00' : '35,00'}</span></div>
              {cart.map(item => (
                <div key={item.id} className="flex justify-between items-center"><span className="font-bold text-sm">{item.name} (x{item.qty})</span><span className="font-black">R$ {item.price * item.qty}</span></div>
              ))}
            </div>
            <div className="border-t border-slate-100 pt-6">
              <div className="flex justify-between items-baseline mb-6"><span className="text-text-muted font-black uppercase text-[10px]">Total</span><span className="text-primary text-4xl font-black italic">R$ {total.toFixed(2)}</span></div>
              <button onClick={handleFinishCommand} className="w-full bg-primary hover:bg-primary-hover text-white font-black py-5 rounded-2xl text-lg shadow-2xl transition-all flex items-center justify-center gap-2 uppercase italic">FINALIZAR <span className="material-symbols-outlined">send</span></button>
            </div>
          </div>
        </aside>
      </div>
    </Layout>
  );
};

export default BarberCommand;
