"use client";

import React from 'react';

interface HeaderProps {
    title: string;
}

const Header: React.FC<HeaderProps> = ({ title }) => {
    return (
        <header className="h-20 border-b border-slate-500/10 flex items-center justify-between px-8 bg-[#121214]/30 backdrop-blur-md shrink-0 z-40">
            <div className="flex flex-col">
                <h2 className="text-white text-xl md:text-2xl font-black tracking-tighter uppercase italic leading-none">{title}</h2>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1 opacity-60">Painel de Gestão</p>
            </div>

            <div className="flex items-center gap-4">
                <div className="flex items-center bg-[#121214]/50 rounded-full p-1 border border-slate-500/10 shadow-sm">
                    <button className="size-10 rounded-full flex items-center justify-center text-slate-400 hover:text-[#f2b90d] transition-all" title="Acessibilidade">
                        <span className="material-symbols-outlined text-[20px] font-bold">format_size</span>
                    </button>
                    <button className="size-10 rounded-full flex items-center justify-center text-slate-400 hover:text-[#f2b90d] transition-all">
                        <span className="material-symbols-outlined text-[22px]">dark_mode</span>
                    </button>
                </div>
                <button className="size-11 rounded-full bg-[#f2b90d]/10 border border-[#f2b90d]/30 flex items-center justify-center text-[#f2b90d] hover:scale-105 transition-all shadow-md">
                    <span className="material-symbols-outlined text-[24px]">person</span>
                </button>
            </div>
        </header>
    );
};

export default Header;
