import React from 'react';
import Link from 'next/link';

export default function SuspendedUnitPage() {
    return (
        <div className="min-h-screen bg-[#09090b] text-white flex flex-col items-center justify-center p-6 text-center">
            {/* Decorative background */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[500px] bg-[#f2b90d] blur-[150px] opacity-10 rounded-full pointer-events-none"></div>

            <div className="relative z-10 max-w-md w-full space-y-8 animate-in fade-in zoom-in-95 duration-700">
                <div className="size-24 bg-[#f2b90d]/10 rounded-full flex items-center justify-center mx-auto border border-[#f2b90d]/20">
                    <span className="material-symbols-outlined text-5xl text-[#f2b90d]">pause_circle</span>
                </div>

                <div className="space-y-4">
                    <h1 className="text-4xl font-black italic uppercase italic tracking-tight">
                        ACESSO <span className="text-[#f2b90d]">SUSPENSO</span>
                    </h1>
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] leading-relaxed">
                        ESTA UNIDADE ESTÁ TEMPORARIAMENTE SUSPENSA. <br />
                        POR FAVOR, ENTRE EM CONTATO COM O ADMINISTRADOR MASTER PARA MAIS INFORMAÇÕES.
                    </p>
                </div>

                <div className="pt-4">
                    <Link
                        href="/login-master"
                        className="inline-block bg-[#f2b90d] text-black font-black px-10 py-4 rounded-xl text-xs uppercase tracking-widest italic shadow-xl shadow-[#f2b90d]/20 active:scale-95 transition-all"
                    >
                        VOLTAR AO LOGIN
                    </Link>
                </div>
            </div>

            <footer className="absolute bottom-10 opacity-20">
                <p className="text-[8px] font-black uppercase tracking-[0.4em]">FastBeauty Pro Platform</p>
            </footer>
        </div>
    );
}
