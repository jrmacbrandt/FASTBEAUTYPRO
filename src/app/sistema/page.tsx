"use client";

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const SystemGateway = () => {
    const router = useRouter();

    const terms = {
        description: 'Plataforma FastBeauty Pro',
        accessBtn: 'Acessar Painel Administrativo',
        masterBtn: 'Painel Administrador Master'
    };

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-between py-16 px-8 relative transition-colors duration-500 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#f2b90d] via-[#f2b90d]/20 to-[#f2b90d] opacity-50"></div>

            <div className="absolute left-8 top-8">
                <button onClick={() => router.push('/')} className="size-12 flex items-center justify-center rounded-full bg-[#121214] border border-white/10 text-slate-400 hover:text-[#f2b90d] hover:border-[#f2b90d]/50 transition-all group shadow-lg">
                    <span className="material-symbols-outlined text-[28px] group-hover:-translate-x-1 transition-transform">arrow_back</span>
                </button>
            </div>

            <div className="text-center space-y-8 max-w-4xl z-10 animate-in fade-in zoom-in duration-700">
                <div className="flex justify-center mb-2">
                    <span className="material-symbols-outlined text-[#f2b90d] text-6xl animate-pulse">content_cut</span>
                </div>
                <h2 className="text-[#f2b90d] text-xl md:text-3xl font-black italic tracking-[0.4em] uppercase opacity-90 drop-shadow-sm">FastBeauty Pro</h2>
                <h3 className="text-[#f8fafc] text-5xl md:text-8xl font-black leading-[1.1] tracking-tighter italic">Portal do <span className="text-[#f2b90d]">Sistema</span> <br className="hidden md:block" /> Premium</h3>
                <p className="text-slate-400 text-lg md:text-xl font-medium max-w-md mx-auto leading-relaxed">Selecione seu ponto de acesso à <span className="text-white font-bold italic">{terms.description}</span>.</p>

                <div className="pt-8">
                    <Link href="/login" className="inline-block bg-[#f2b90d] hover:bg-[#d9a60c] text-black font-black py-6 px-16 rounded-[1.8rem] text-xl shadow-2xl shadow-[#f2b90d]/30 transition-all hover:scale-105 active:scale-95 uppercase tracking-tight">
                        {terms.accessBtn}
                    </Link>
                </div>
            </div>

            <div className="w-full flex flex-col items-center gap-4 mt-auto">
                <Link href="/login-master" className="text-slate-500 hover:text-[#f2b90d] text-[10px] md:text-xs font-black uppercase tracking-[0.4em] transition-all hover:tracking-[0.5em] opacity-40 hover:opacity-100 py-4">
                    {terms.masterBtn}
                </Link>
                <div className="w-16 h-0.5 bg-[#f2b90d]/10 rounded-full"></div>
            </div>

            <div className="absolute -bottom-24 -left-24 size-96 bg-[#f2b90d]/5 blur-[120px] rounded-full pointer-events-none"></div>
            <div className="absolute -top-24 -right-24 size-96 bg-[#f2b90d]/5 blur-[120px] rounded-full pointer-events-none"></div>
        </div>
    );
};

export default SystemGateway;
