"use client";

import React from 'react';
import { useRouter } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function SystemGateway() {
    const router = useRouter();

    const handleChoice = (type: 'barber' | 'salon') => {
        localStorage.setItem('elite_business_type', type);
        document.body.className = type === 'salon' ? 'theme-salon' : '';
        router.push('/login');
    };

    const colors = {
        amber: '#f2b90d',
        purple: '#7b438e',
        darkBg: '#09090b',
        cardDark: '#18181b'
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-6 text-center transition-colors duration-700 overflow-hidden" style={{ backgroundColor: colors.darkBg }}>
            <div className="max-w-4xl w-full animate-in fade-in zoom-in-95 duration-700">
                <h1 className="text-4xl sm:text-6xl md:text-8xl font-black text-white mb-4 md:mb-6 tracking-tighter italic uppercase leading-tight md:leading-none">
                    FASTBEAUTY <span style={{ color: colors.amber }} className="italic">PRO</span>
                </h1>
                <p className="text-sm md:text-xl text-slate-400 mb-10 md:mb-16 max-w-2xl mx-auto leading-relaxed font-bold opacity-60">
                    Selecione o seu perfil para uma experiência personalizada na gestão do seu negócio.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 max-w-3xl mx-auto">
                    <button
                        onClick={() => handleChoice('barber')}
                        className="group relative border-2 border-transparent hover:border-[#f2b90d] p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] transition-all duration-500 shadow-2xl overflow-hidden text-left bg-[#18181b] active:scale-[0.98]"
                    >
                        <div className="absolute top-0 right-0 p-4 md:p-6 opacity-5 md:opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className="material-symbols-outlined text-6xl md:text-8xl" style={{ color: colors.amber }}>content_cut</span>
                        </div>
                        <h3 className="text-xl md:text-2xl font-black italic mb-2 md:mb-3 uppercase tracking-tight" style={{ color: colors.amber }}>Barbearia</h3>
                        <p className="text-slate-500 font-bold text-xs md:text-sm mb-6 md:mb-8 leading-snug">Estética clássica, tons Amber e gestão ágil.</p>
                        <span className="inline-block px-6 md:px-8 py-2.5 md:py-3 rounded-xl font-black text-[10px] md:text-xs transition-transform group-hover:scale-105" style={{ backgroundColor: colors.amber, color: colors.darkBg }}>ACESSAR</span>
                    </button>

                    <button
                        onClick={() => handleChoice('salon')}
                        className="group relative bg-white border-2 border-transparent hover:border-[#7b438e] p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] transition-all duration-500 shadow-2xl overflow-hidden text-left active:scale-[0.98]"
                    >
                        <div className="absolute top-0 right-0 p-4 md:p-6 opacity-5 md:opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className="material-symbols-outlined text-6xl md:text-8xl" style={{ color: colors.purple }}>spa</span>
                        </div>
                        <h3 className="text-xl md:text-2xl font-black italic mb-2 md:mb-3 uppercase tracking-tight" style={{ color: colors.purple }}>Salão & Spa</h3>
                        <p className="text-slate-400 font-bold text-xs md:text-sm mb-6 md:mb-8 leading-snug">Minimalismo SpaLab, tons Ametista e delicadeza.</p>
                        <span className="inline-block px-6 md:px-8 py-2.5 md:py-3 rounded-xl font-black text-[10px] md:text-xs text-white transition-transform group-hover:scale-105" style={{ backgroundColor: colors.purple }}>ACESSAR</span>
                    </button>
                </div>
            </div>
            <div className="mt-12 md:mt-20 opacity-20">
                <div className="w-10 md:w-12 h-1 rounded-full bg-white/20"></div>
            </div>
        </div>
    );
}

