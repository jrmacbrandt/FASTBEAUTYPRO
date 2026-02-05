
import React, { useState } from 'react';
import Layout from '../../components/Layout';

const BarberHistory: React.FC<{ businessType: 'barber' | 'salon' }> = ({ businessType }) => {
  const isSalon = businessType === 'salon';
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const history = [
    { id: '1', customer: 'Marcus Vinicius', date: '2024-05-15', time: '10:30', service: 'Corte Degradê', items: ['Pomada Matte'], total: 65.00, status: 'completed' },
    { id: '2', customer: 'Daniel Silva', date: '2024-05-15', time: '14:20', service: 'Barba Terapia', items: [], total: 35.00, status: 'completed' },
    { id: '3', customer: 'Ricardo Oliveira', date: '2024-05-14', time: '09:00', service: 'Corte Tesoura', items: ['Shampoo Elite'], total: 80.00, status: 'completed' },
    { id: '4', customer: 'Fernando Souza', date: '2024-05-14', time: '16:45', service: 'Corte Degradê', items: [], total: 45.00, status: 'completed' },
    { id: '5', customer: 'Claudio J.', date: '2024-05-13', time: '11:30', service: 'Pezinho', items: [], total: 15.00, status: 'completed' },
  ];

  const filteredHistory = history.filter(item => {
    const matchesName = item.customer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDate = dateFilter ? item.date === dateFilter : true;
    return matchesName && matchesDate;
  });

  const totalValue = filteredHistory.reduce((acc, curr) => acc + curr.total, 0);

  return (
    <Layout title="Histórico de Atendimentos">
      <div className="space-y-8 animate-in fade-in duration-500">
        {/* Resumo Rápido */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className={`${isSalon ? 'bg-white shadow-sm border-slate-100' : 'bg-background-card border-white/5'} p-8 rounded-[2rem] border`}>
              <p className="text-text-muted text-[10px] font-black uppercase tracking-[0.2em] mb-1">Total Atendimentos Filtrados</p>
              <h4 className="text-4xl font-black italic tracking-tighter">{filteredHistory.length}</h4>
           </div>
           <div className={`${isSalon ? 'bg-white shadow-sm border-slate-100' : 'bg-background-card border-white/5'} p-8 rounded-[2rem] border`}>
              <p className="text-text-muted text-[10px] font-black uppercase tracking-[0.2em] mb-1">Valor Total Gerado</p>
              <h4 className="text-4xl font-black italic tracking-tighter text-primary">R$ {totalValue.toFixed(2)}</h4>
           </div>
        </div>

        {/* Barra de Filtros */}
        <div className={`${isSalon ? 'bg-white border-slate-100 shadow-sm' : 'bg-background-card border-white/5'} p-6 rounded-[2rem] border flex flex-col md:flex-row gap-4 items-end`}>
          <div className="flex-1 w-full space-y-2">
            <label className="text-[10px] font-black uppercase text-text-muted ml-1 tracking-widest italic">Buscar por Nome</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-3 text-text-muted text-[20px] opacity-40">search</span>
              <input 
                type="text" 
                placeholder="Ex: Marcus Vinicius"
                className={`w-full ${isSalon ? 'bg-slate-50 border-slate-200' : 'bg-black border-white/10'} border rounded-xl py-3 pl-12 pr-4 outline-none focus:border-primary font-bold text-sm`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="w-full md:w-64 space-y-2">
            <label className="text-[10px] font-black uppercase text-text-muted ml-1 tracking-widest italic">Filtrar por Data</label>
            <input 
              type="date" 
              className={`w-full ${isSalon ? 'bg-slate-50 border-slate-200' : 'bg-black border-white/10'} border rounded-xl py-3 px-4 outline-none focus:border-primary font-bold text-sm [color-scheme:dark]`}
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>
          <button 
            onClick={() => { setSearchTerm(''); setDateFilter(''); }}
            className="h-[46px] px-6 bg-background-deep border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-primary transition-colors"
          >
            Limpar
          </button>
        </div>

        {/* Lista de Histórico */}
        <div className="space-y-4">
          {filteredHistory.length > 0 ? (
            filteredHistory.map(item => (
              <div key={item.id} className={`${isSalon ? 'bg-white border-slate-100 shadow-sm' : 'bg-background-card border-white/5'} p-6 rounded-[2rem] border flex flex-col md:flex-row items-center justify-between gap-6 group hover:border-primary/20 transition-all`}>
                <div className="flex items-center gap-4">
                  <div className="size-14 bg-primary/10 rounded-2xl flex flex-col items-center justify-center text-primary font-black leading-none">
                    <span className="text-[10px] uppercase opacity-60 mb-1">{item.date.split('-')[2]}/{item.date.split('-')[1]}</span>
                    <span className="text-lg italic">{item.time}</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-lg leading-tight">{item.customer}</h4>
                    <p className="text-text-muted text-[10px] font-black uppercase tracking-widest">{item.service}</p>
                    {item.items.length > 0 && (
                      <p className="text-primary text-[9px] font-bold uppercase mt-1 italic opacity-80">+ {item.items.join(', ')}</p>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-text-muted text-[9px] font-black uppercase tracking-[0.2em] italic mb-1">Valor da Comanda</p>
                  <p className="text-2xl font-black italic tracking-tighter">R$ {item.total.toFixed(2)}</p>
                  <div className="flex justify-end gap-2 mt-2">
                     <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase tracking-widest rounded-full border border-emerald-500/20">Realizado</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-20 opacity-30">
               <span className="material-symbols-outlined text-6xl italic">manage_search</span>
               <p className="font-black uppercase text-xs tracking-[0.4em] mt-4">Nenhum atendimento encontrado</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default BarberHistory;
