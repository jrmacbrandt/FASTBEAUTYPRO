"use client";

import React from 'react';
import { useRouter } from 'next/navigation';

const LandingPage = () => {
  const router = useRouter();

  const handleChoice = (type: 'barber' | 'salon') => {
    // Note: Hybrid theme logic skipped per user request. 
    // We will just proceed to the system gateway.
    router.push('/sistema');
  };

  const colors = {
    amber: '#f2b90d',
    purple: '#7b438e',
    darkBg: '#09090b',
    cardDark: '#18181b'
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 text-center shadow-inner" style={{ backgroundColor: colors.darkBg }}>
      <div className="max-w-4xl w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
        <h1 className="text-5xl md:text-8xl font-black text-white mb-6 tracking-tighter italic uppercase leading-none">
          FASTBEAUTY <span style={{ color: colors.amber }} className="italic">PRO</span>
        </h1>
        <p className="text-lg md:text-xl text-slate-400 mb-16 max-w-2xl mx-auto leading-relaxed font-bold">
          Digitalização completa para o seu estabelecimento de beleza.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          <button onClick={() => handleChoice('barber')} className="group relative border-2 border-transparent hover:border-[#f2b90d] p-10 rounded-[2.5rem] transition-all duration-500 shadow-2xl overflow-hidden text-left bg-[#18181b]">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
              <span className="material-symbols-outlined text-8xl text-[#f2b90d]">content_cut</span>
            </div>
            <h3 className="text-2xl font-black italic mb-3 uppercase tracking-tight text-[#f2b90d]">Entrar no Sistema</h3>
            <p className="text-slate-500 font-bold text-sm mb-8 leading-snug">Gestão de agenda, estoque e comissões para prestadores.</p>
            <span className="inline-block px-8 py-3 rounded-xl font-black text-xs transition-transform group-hover:scale-105 active:scale-95 bg-[#f2b90d] text-[#09090b]">SELECIONAR</span>
          </button>

          <div className="group relative bg-[#18181b] border-2 border-white/5 p-10 rounded-[2.5rem] overflow-hidden text-left opacity-40 grayscale pointer-events-none">
            <div className="absolute top-0 right-0 p-6 opacity-10">
              <span className="material-symbols-outlined text-8xl text-slate-400">rocket_launch</span>
            </div>
            <h3 className="text-2xl font-black italic mb-3 uppercase tracking-tight text-slate-400">Em Breve</h3>
            <p className="text-slate-500 font-bold text-sm mb-8 leading-snug">Novas funcionalidades e módulos premium.</p>
          </div>
        </div>
      </div>
    </main>
  );
};

export default LandingPage;
