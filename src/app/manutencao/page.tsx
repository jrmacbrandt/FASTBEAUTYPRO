"use client";

import React from 'react';
import Link from 'next/link';

export default function MaintenancePage() {
    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            <div className="max-w-md w-full text-center space-y-8 animate-in zoom-in-95 duration-500">
                <div className="relative inline-block">
                    <div className="size-24 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-500 mx-auto mb-6 relative z-10">
                        <span className="material-symbols-outlined text-5xl animate-pulse">engineering</span>
                    </div>
                    <div className="absolute inset-0 bg-amber-500/20 blur-3xl rounded-full"></div>
                </div>

                <div className="space-y-4">
                    <h1 className="text-3xl font-black italic uppercase text-white tracking-tighter">
                        Manutenção em <span className="text-amber-500">Progresso</span>
                    </h1>

                    <div className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4">
                        <p className="text-sm font-bold text-slate-400 leading-relaxed uppercase tracking-wide">
                            Manutenção preventiva ou corretiva sendo realizada pelo Administrador Master.
                        </p>
                        <p className="text-[11px] font-black text-amber-500 uppercase tracking-[0.2em]">
                            Por favor, aguarde até que a manutenção seja encerrada para retomar o acesso.
                        </p>
                    </div>
                </div>

                <div className="pt-6">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest text-slate-500 italic">
                        <span className="size-1.5 rounded-full bg-amber-500 animate-ping"></span>
                        O acesso será liberado automaticamente
                    </div>
                </div>

                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 opacity-20">
                    <p className="text-[10px] font-black uppercase tracking-tighter text-white">FastBeauty Pro Support</p>
                </div>
            </div>
        </div>
    );
}
