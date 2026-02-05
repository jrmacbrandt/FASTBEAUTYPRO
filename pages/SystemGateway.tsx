
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const SystemGateway: React.FC = () => {
  const navigate = useNavigate();
  const isSalon = document.body.classList.contains('theme-salon');

  const terms = {
    description: isSalon ? 'Plataforma FastBeauty Pro' : 'Plataforma FastBeauty Pro',
    accessBtn: 'Acessar Painel Administrativo',
    masterBtn: 'Painel Administrador Master'
  };

  return (
    <div className="min-h-screen bg-background-deep flex flex-col items-center justify-between py-16 px-8 relative transition-colors duration-500 overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-primary/20 to-primary opacity-50"></div>
      <div className="absolute left-8 top-8">
        <button onClick={() => navigate('/')} className="size-12 flex items-center justify-center rounded-full bg-background-card border border-slate-500/10 text-text-muted hover:text-primary hover:border-primary/50 transition-all group shadow-lg" title="Trocar tipo de negócio">
          <span className="material-symbols-outlined text-[28px] group-hover:-translate-x-1 transition-transform">arrow_back</span>
        </button>
      </div>
      <div className="hidden lg:block"></div>
      <div className="text-center space-y-8 animate-in fade-in zoom-in duration-700 max-w-4xl z-10">
        <div className="flex justify-center mb-2">
          <span className="material-symbols-outlined text-primary text-6xl animate-pulse">{isSalon ? 'spa' : 'content_cut'}</span>
        </div>
        <h2 className="text-primary text-xl md:text-3xl font-black italic tracking-[0.4em] uppercase opacity-90 drop-shadow-sm">FastBeauty Pro</h2>
        <h3 className="text-text-main text-5xl md:text-8xl font-black font-display leading-[1.1] tracking-tighter italic">Portal do <span className="text-primary">Sistema</span> <br className="hidden md:block" /> Premium</h3>
        <p className="text-text-muted text-lg md:text-xl font-medium max-w-md mx-auto leading-relaxed">Selecione seu ponto de acesso à <span className="text-text-main font-bold italic">{terms.description}</span>.</p>
        <div className="pt-8">
          <Link to="/login" className="inline-block bg-primary hover:bg-primary-hover text-background-deep font-black py-6 px-16 rounded-[1.8rem] text-xl shadow-2xl shadow-primary/30 transition-all hover:scale-105 active:scale-95 uppercase tracking-tight">{terms.accessBtn}</Link>
        </div>
      </div>
      <div className="w-full flex flex-col items-center gap-4 mt-auto">
        <Link to="/login-master" className="text-text-muted hover:text-primary text-[10px] md:text-xs font-black uppercase tracking-[0.4em] transition-all hover:tracking-[0.5em] opacity-40 hover:opacity-100 py-4">{terms.masterBtn}</Link>
        <div className="w-16 h-0.5 bg-primary/10 rounded-full"></div>
      </div>
      <div className="absolute -bottom-24 -left-24 size-96 bg-primary/5 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute -top-24 -right-24 size-96 bg-primary/5 blur-[120px] rounded-full pointer-events-none"></div>
    </div>
  );
};

export default SystemGateway;
