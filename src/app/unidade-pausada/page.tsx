import React from 'react';
import Link from 'next/link';

export default function PausedUnitPage() {
    return (
        <div className="min-h-screen bg-[#09090b] text-white flex flex-col items-center justify-center p-6 text-center">
            {/* Decorative background */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[500px] bg-sky-500 blur-[150px] opacity-10 rounded-full pointer-events-none"></div>

            <div className="relative z-10 max-w-md w-full space-y-8 animate-in fade-in zoom-in-95 duration-700">
                <div className="size-24 bg-sky-500/10 rounded-full flex items-center justify-center mx-auto border border-sky-500/20 shadow-xl shadow-sky-500/10">
                    <span className="material-symbols-outlined text-5xl text-sky-500">motion_photos_paused</span>
                </div>

                <div className="space-y-4">
                    <h1 className="text-4xl font-black italic uppercase tracking-tight">
                        UNIDADE <span className="text-sky-500">PAUSADA</span>
                    </h1>
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] leading-relaxed">
                        ESTA UNIDADE ENCONTRA-SE TEMPORARIAMENTE PAUSADA PELO ADMINISTRADOR MASTER DA PLATAFORMA. <br />
                        AGUARDE A RETOMADA DO SISTEMA PARA ACESSAR SEU PAINEL.
                    </p>
                </div>

                <div className="pt-4">
                    <Link
                        href="/login"
                        className="inline-block bg-sky-500 text-white font-black px-10 py-4 rounded-xl text-xs uppercase tracking-widest italic shadow-xl shadow-sky-500/20 active:scale-95 transition-all"
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
