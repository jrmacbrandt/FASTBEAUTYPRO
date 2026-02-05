
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '../types';

interface LoginProps {
  type: 'standard' | 'master';
  businessType?: 'barber' | 'salon';
}

const Login: React.FC<LoginProps> = ({ type, businessType }) => {
  const navigate = useNavigate();
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'admin' | 'pro'>('pro');
  const isSalon = document.body.classList.contains('theme-salon');

  const terms = {
    title: type === 'master' ? 'ACESSO MASTER' : (activeTab === 'admin' ? 'LOGIN ADMIN' : 'LOGIN PROFISSIONAL'),
    subtitle: type === 'master' 
      ? 'Portal exclusivo para operadores master' 
      : `Portal de acesso para ${activeTab === 'admin' ? 'Proprietários' : 'Colaboradores'}`,
    idLabel: 'IDENTIFICAÇÃO',
    passLabel: 'CHAVE DE SEGURANÇA',
    footer: 'FASTBEAUTY PRO'
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (type === 'master') {
      localStorage.setItem('elite_user', JSON.stringify({ role: UserRole.MASTER, name: 'Admin Master', businessType }));
      navigate('/admin-master');
    } else {
      if (activeTab === 'admin') {
        localStorage.setItem('elite_user', JSON.stringify({ role: UserRole.OWNER, name: isSalon ? 'Helena Proprietária' : 'Michael Proprietário', tenantId: 't1', businessType }));
        navigate('/admin');
      } else {
        localStorage.setItem('elite_user', JSON.stringify({ role: UserRole.BARBER, name: isSalon ? 'Clara Profissional' : 'James Barbeiro', tenantId: 't1', businessType }));
        navigate('/profissional');
      }
    }
  };

  return (
    <div className={`min-h-screen ${isSalon ? 'bg-background-deep' : 'bg-black'} flex items-center justify-center p-4 font-sans transition-colors duration-500`}>
      <div className={`w-full max-w-[440px] ${isSalon ? 'bg-white shadow-[0_20px_50px_rgba(0,0,0,0.1)]' : 'bg-background-card'} rounded-[2.5rem] p-8 md:p-10 relative border ${isSalon ? 'border-primary/20' : 'border-white/5'} overflow-hidden`}>
        <button onClick={() => navigate('/sistema')} className={`absolute left-8 top-8 size-10 flex items-center justify-center rounded-full ${isSalon ? 'bg-primary/10 text-primary' : 'bg-black text-white'} hover:opacity-80 transition-all group z-10`}>
          <span className="material-symbols-outlined text-[20px] group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
        </button>
        <div className="flex flex-col items-center mb-8 pt-4">
          <div className="size-14 bg-primary/10 rounded-2xl border-2 border-primary flex items-center justify-center text-primary mb-6">
            <span className="material-symbols-outlined text-3xl font-bold">{type === 'master' ? 'security' : (isSalon ? 'spa' : (activeTab === 'admin' ? 'settings_account_box' : 'person_pin'))}</span>
          </div>
          <h1 className={`${isSalon ? 'text-primary' : 'text-white'} text-2xl md:text-3xl font-black mb-1 italic tracking-tight uppercase text-center leading-none`}>{terms.title}</h1>
          <p className={`${isSalon ? 'text-text-muted font-bold' : 'text-text-muted opacity-70'} text-xs text-center`}>{terms.subtitle}</p>
        </div>
        {type !== 'master' && (
          <div className={`flex p-1.5 rounded-2xl mb-8 ${isSalon ? 'bg-slate-100' : 'bg-black/50'} border ${isSalon ? 'border-slate-200' : 'border-white/5'}`}>
            <button onClick={() => setActiveTab('pro')} className={`flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all italic ${activeTab === 'pro' ? 'bg-primary text-white shadow-lg' : `${isSalon ? 'text-slate-400 hover:text-slate-600' : 'text-text-muted opacity-50 hover:opacity-100'}`}`}>PROFISSIONAL</button>
            <button onClick={() => setActiveTab('admin')} className={`flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all italic ${activeTab === 'admin' ? 'bg-primary text-white shadow-lg' : `${isSalon ? 'text-slate-400 hover:text-slate-600' : 'text-text-muted opacity-50 hover:opacity-100'}`}`}>ADMINISTRADOR</button>
          </div>
        )}
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2.5">
            <label className={`${isSalon ? 'text-text-muted font-black' : 'text-text-muted opacity-80'} text-[10px] uppercase tracking-widest ml-1 italic`}>{terms.idLabel}</label>
            <div className="relative">
              <span className={`material-symbols-outlined absolute left-5 top-4 ${isSalon ? 'text-primary' : 'text-text-muted'} text-[20px] ${isSalon ? 'opacity-70' : 'opacity-40'}`}>badge</span>
              <input type="text" placeholder="E-mail ou CPF" className={`w-full ${isSalon ? 'bg-white border-slate-200 text-text-main focus:bg-slate-50' : 'bg-black border-white/5 text-white'} border rounded-2xl py-4 pl-14 pr-6 focus:outline-none focus:border-primary/50 transition-all placeholder:text-slate-300 font-bold`} value={id} onChange={(e) => setId(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-2.5">
            <label className={`${isSalon ? 'text-text-muted font-black' : 'text-text-muted opacity-80'} text-[10px] uppercase tracking-widest ml-1 italic`}>{terms.passLabel}</label>
            <div className="relative">
              <span className={`material-symbols-outlined absolute left-5 top-4 ${isSalon ? 'text-primary' : 'text-text-muted'} text-[20px] ${isSalon ? 'opacity-70' : 'opacity-40'}`}>lock</span>
              <input type="password" placeholder="........" className={`w-full ${isSalon ? 'bg-white border-slate-200 text-text-main focus:bg-slate-50' : 'bg-black border-white/5 text-white'} border rounded-2xl py-4 pl-14 pr-6 focus:outline-none focus:border-primary/50 transition-all placeholder:text-slate-300 font-bold tracking-widest`} value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
          </div>
          <button type="submit" className={`w-full bg-primary hover:bg-primary-hover text-white font-black py-5 rounded-2xl text-[14px] shadow-2xl shadow-primary/20 transition-all mt-4 active:scale-95 uppercase italic tracking-tight`}>CONFIRMAR ACESSO</button>
        </form>
        <div className="mt-10 text-center border-t border-slate-100 pt-6">
          <p className="text-text-muted text-[9px] font-black uppercase tracking-[0.3em] opacity-60 italic">© 2024 {terms.footer}</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
