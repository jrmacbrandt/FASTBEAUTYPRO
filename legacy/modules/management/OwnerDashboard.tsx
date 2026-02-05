
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const OwnerDashboard: React.FC<{ businessType: 'barber' | 'salon' }> = ({ businessType }) => {
  const navigate = useNavigate();
  // Alterado para false por padrão para garantir navegação imediata ao Dashboard
  const [isBlocked, setIsBlocked] = useState(false); 
  const [coupon, setCoupon] = useState('');
  const isSalon = businessType === 'salon';

  const data = [
    { name: 'Seg', faturamento: 400 },
    { name: 'Ter', faturamento: 600 },
    { name: 'Qua', faturamento: 550 },
    { name: 'Qui', faturamento: 900 },
    { name: 'Sex', faturamento: 1200 },
    { name: 'Sáb', faturamento: 1500 },
    { name: 'Dom', faturamento: 800 },
  ];

  const kpis = [
    { label: 'Faturamento do Dia', val: 'R$ 1.850', icon: 'today', trend: '+15,2%', color: 'text-emerald-500' },
    { label: 'Faturamento Mensal', val: 'R$ 24.500', icon: 'payments', trend: '+12,5%', color: 'text-emerald-500' },
    { label: 'Tickets Realizados', val: '24', icon: 'receipt', trend: '+4,2%', color: 'text-primary' },
    { label: 'Ticket Médio', val: 'R$ 77,20', icon: 'analytics', trend: '+5,2%', color: 'text-primary' },
  ];

  if (isBlocked) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-6 ${isSalon ? 'bg-background-deep' : 'bg-black'} relative overflow-hidden transition-colors duration-500`}>
        <button 
          onClick={() => navigate('/sistema')}
          className={`absolute left-8 top-8 size-12 flex items-center justify-center rounded-full transition-all group z-30 shadow-2xl ${
            isSalon ? 'bg-white text-primary border border-primary/20' : 'bg-background-card text-white border border-white/5'
          } hover:scale-110 active:scale-95`}
        >
          <span className="material-symbols-outlined text-[28px] group-hover:-translate-x-1 transition-transform font-bold">arrow_back</span>
        </button>

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[500px] bg-primary/5 blur-[120px] rounded-full"></div>
        
        <div className={`max-w-md w-full p-10 rounded-[3rem] border animate-in zoom-in duration-500 relative z-10 ${isSalon ? 'bg-white border-primary/20 shadow-2xl' : 'bg-background-card border-white/5 shadow-2xl'}`}>
          <div className="size-24 bg-primary/10 text-primary rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-primary/20 shadow-inner">
            <span className="material-symbols-outlined text-6xl italic font-black">lock_open</span>
          </div>
          
          <div className="space-y-4 mb-10 text-center">
            <h2 className={`text-3xl font-black uppercase italic tracking-tighter leading-none ${isSalon ? 'text-text-main' : 'text-white'}`}>
              Sistema <span className="text-primary">Bloqueado</span>
            </h2>
            <div className={`p-5 rounded-2xl ${isSalon ? 'bg-slate-50 border-slate-100' : 'bg-primary/5 border-primary/10'} border`}>
              <p className="text-text-muted text-sm font-bold leading-tight">Para acessar o Painel Administrativo, realize o pagamento de sua mensalidade.</p>
            </div>
            <div className="relative flex items-center py-4">
              <div className="flex-grow border-t border-slate-500/10"></div>
              <span className="flex-shrink mx-4 text-primary text-[11px] font-black uppercase italic tracking-widest">ou</span>
              <div className="flex-grow border-t border-slate-500/10"></div>
            </div>
            <div className="space-y-4">
              <p className="text-text-muted text-[11px] font-black uppercase tracking-widest italic">Digite seu CUPOM PROMOCIONAL de acesso.</p>
              <input type="text" placeholder="EX: ELITEFREEMIUM" className={`w-full p-5 rounded-2xl text-center font-black uppercase tracking-widest text-sm border focus:outline-none focus:border-primary transition-all shadow-inner ${isSalon ? 'bg-slate-50 border-slate-200 text-text-main' : 'bg-black/40 border-white/5 text-white'}`} value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} />
            </div>
          </div>
          
          <div className="space-y-3">
            <button onClick={() => setIsBlocked(false)} className="w-full bg-primary hover:bg-primary-hover text-white font-black py-5 rounded-2xl shadow-2xl shadow-primary/30 transition-all uppercase italic tracking-tight active:scale-95 flex items-center justify-center gap-2"><span className="material-symbols-outlined">payments</span> EFETUAR PAGAMENTO</button>
            <button onClick={() => setIsBlocked(false)} className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${isSalon ? 'border-slate-200 text-text-muted hover:bg-slate-50' : 'border-white/5 text-text-muted hover:bg-white/5'}`}>ATIVAR COM CUPOM</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Layout title={isSalon ? "Dashboard Salão & Spa" : "Dashboard Financeiro"}>
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {kpis.map((kpi, idx) => (
            <div key={idx} className={`${isSalon ? 'bg-white border-slate-100 shadow-sm' : 'bg-background-card border-white/5'} p-6 rounded-[2rem] border group hover:border-primary/20 transition-all`}>
              <div className="flex justify-between items-start mb-4">
                <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary transition-transform group-hover:scale-110"><span className="material-symbols-outlined">{kpi.icon}</span></div>
                <span className={`text-[10px] font-black ${kpi.color}`}>{kpi.trend}</span>
              </div>
              <p className="text-text-muted text-[9px] font-black uppercase tracking-widest italic">{kpi.label}</p>
              <h4 className="text-2xl font-black mt-1 italic tracking-tight">{kpi.val}</h4>
            </div>
          ))}
        </div>

        <div className={`${isSalon ? 'bg-white shadow-xl border-slate-100' : 'bg-background-card border-white/5'} p-8 rounded-[2.5rem] border`}>
           <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
              <div>
                <h3 className="text-xl font-black italic uppercase tracking-tight">Evolução do Faturamento</h3>
                <p className="text-text-muted text-[10px] font-bold uppercase tracking-widest">Comparativo de performance semanal</p>
              </div>
           </div>
           <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs><linearGradient id="colorFat" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/><stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isSalon ? '#f1f5f9' : '#27272a'} />
                <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} stroke={isSalon ? '#94a3b8' : '#52525b'} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} stroke={isSalon ? '#94a3b8' : '#52525b'} />
                <Tooltip contentStyle={{ backgroundColor: isSalon ? '#fff' : '#18181b', borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }} />
                <Area type="monotone" dataKey="faturamento" stroke="var(--primary)" strokeWidth={4} fillOpacity={1} fill="url(#colorFat)" />
              </AreaChart>
            </ResponsiveContainer>
           </div>
        </div>
      </div>
    </Layout>
  );
};

export default OwnerDashboard;
