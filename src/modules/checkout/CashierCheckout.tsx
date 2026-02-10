
import React, { useState } from 'react';
import Layout from '../../components/layout/Layout';

const CashierCheckout: React.FC = () => {
  // Estado inicial das ordens pendentes
  const [orders, setOrders] = useState([
    { id: '1', client: 'Marcus T.', barber: 'James', items: ['Fade Cut', 'Matte Clay'], total: 57, time: '10:30 AM' },
    { id: '2', client: 'Daniel K.', barber: 'Leo', items: ['Classic Shave'], total: 45, time: '11:15 AM' },
  ]);

  const [selected, setSelected] = useState<any>(null);

  const handleConfirmPayment = async () => {
    if (!selected) return;

    // Remove a ordem finalizada da lista de pendentes
    const updatedOrders = orders.filter(order => order.id !== selected.id);

    // Feedback de sucesso (simulado)
    alert(`Pagamento de R$ ${selected.total},00 confirmado para ${selected.client}! Estoque atualizado.`);

    // --- INTEGRATION: LOYALTY (5+1) ---
    // In a real scenario, we would have the client's phone and tenant ID.
    // For MVP/Demo preservation, we simulate a phone or try to get it from context.
    try {
      const { LoyaltyService } = await import('@/lib/loyalty');
      // TODO: Replace with actual Tenant ID and Client Phone from context/auth
      // console.log('Adding loyalty stamp...'); 
      // await LoyaltyService.addStamp('CURRENT_TENANT_ID', 'CLIENT_PHONE'); 
      console.log('[Loyalty] Stamp logic ready to hook with real data.');
    } catch (err) {
      console.error('[Loyalty] Error updating stamps', err);
    }
    // ----------------------------------

    // Atualiza os estados
    setOrders(updatedOrders);
    setSelected(null);
  };

  return (
    <Layout title="Caixa / Checkout">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Coluna de Ordens Pendentes */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-white text-xl font-black italic uppercase">Comandas Pendentes</h3>
            <span className="bg-primary/10 text-primary text-[10px] font-black px-3 py-1 rounded-full border border-primary/20">
              {orders.length} AGUARDANDO
            </span>
          </div>

          <div className="grid gap-4">
            {orders.length > 0 ? (
              orders.map(cmd => (
                <button
                  key={cmd.id}
                  onClick={() => setSelected(cmd)}
                  className={`w-full p-6 rounded-3xl border text-left transition-all flex items-center justify-between group animate-in slide-in-from-left-4 duration-300 ${selected?.id === cmd.id ? 'bg-primary/5 border-primary shadow-xl shadow-primary/5 scale-[1.02]' : 'bg-background-card border-white/5 hover:border-white/20'
                    }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`size-12 rounded-xl flex items-center justify-center transition-colors ${selected?.id === cmd.id ? 'bg-primary text-white' : 'bg-white/5 text-primary'}`}>
                      <span className="material-symbols-outlined">receipt</span>
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-lg italic tracking-tight">{cmd.client}</h4>
                      <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Profissional: {cmd.barber}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-primary text-2xl font-black italic tracking-tighter">R$ {cmd.total}.00</p>
                    <p className="text-slate-500 text-[10px] font-black uppercase">{cmd.time}</p>
                  </div>
                </button>
              ))
            ) : (
              <div className="py-20 bg-white/5 border border-dashed border-white/10 rounded-[2.5rem] flex flex-col items-center justify-center opacity-40">
                <span className="material-symbols-outlined text-6xl mb-4">check_circle</span>
                <p className="font-black uppercase text-xs tracking-[0.4em]">Tudo limpo no momento</p>
              </div>
            )}
          </div>
        </div>

        {/* Coluna de Resumo de Pagamento */}
        <aside>
          {selected ? (
            <div className="bg-background-elite/60 border border-primary/30 p-8 rounded-[2.5rem] space-y-8 animate-in fade-in slide-in-from-bottom-4 shadow-2xl sticky top-28">
              <div className="text-center">
                <h3 className="text-white text-2xl font-black italic tracking-tight mb-2 uppercase">Resumo da Comanda</h3>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Cliente: {selected.client}</p>
              </div>

              <div className="space-y-4">
                {selected.items.map((item: string, i: number) => (
                  <div key={i} className="flex justify-between items-center text-sm font-bold border-b border-white/5 pb-2">
                    <span className="text-slate-400 italic">{item}</span>
                    <span className="text-primary/60 text-[10px] font-black uppercase">Pronto</span>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest ml-1 italic">Método de Recebimento</p>
                <div className="grid grid-cols-2 gap-2">
                  {['PIX', 'CARTÃO', 'DINHEIRO', 'DÉBITO'].map(m => (
                    <button key={m} className="bg-black/40 border border-white/10 text-white font-black py-4 rounded-xl hover:border-primary hover:text-primary transition-all text-[10px] tracking-widest uppercase">
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-white/5">
                <div className="flex justify-between items-end mb-6">
                  <span className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Valor Final</span>
                  <span className="text-primary text-4xl font-black italic tracking-tighter">R$ {selected.total}.00</span>
                </div>
                <button
                  onClick={handleConfirmPayment}
                  className="w-full bg-primary hover:bg-primary-hover text-white font-black py-6 rounded-2xl text-lg shadow-2xl shadow-primary/20 transition-all flex items-center justify-center gap-2 uppercase italic tracking-tight active:scale-95"
                >
                  CONFIRMAR PAGAMENTO
                  <span className="material-symbols-outlined">check_circle</span>
                </button>
                <button
                  onClick={() => setSelected(null)}
                  className="w-full mt-4 text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-widest transition-colors"
                >
                  CANCELAR SELEÇÃO
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[400px] bg-background-card/40 border border-dashed border-white/10 rounded-[2.5rem] flex flex-col items-center justify-center p-8 text-center sticky top-28">
              <div className="size-20 bg-white/5 rounded-full flex items-center justify-center mb-6 text-slate-700">
                <span className="material-symbols-outlined text-5xl">point_of_sale</span>
              </div>
              <p className="text-slate-500 font-bold uppercase text-xs tracking-widest leading-relaxed">
                Selecione uma comanda ao lado <br /> para processar o recebimento
              </p>
            </div>
          )}
        </aside>
      </div>
    </Layout>
  );
};

export default CashierCheckout;
