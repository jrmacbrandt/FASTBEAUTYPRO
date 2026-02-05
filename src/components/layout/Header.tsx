"use client";

import React from 'react';

interface HeaderProps {
    title: string;
    theme: {
        primary: string;
        bg: string;
        text: string;
        cardBg: string;
        sidebarBg: string;
        headerBg: string;
        border: string;
    };
}

const Header: React.FC<HeaderProps> = ({ title, theme }) => {
    return (
        <header className="h-20 border-b flex items-center justify-between px-8 backdrop-blur-md shrink-0 z-40 transition-colors duration-500" style={{ backgroundColor: `${theme.headerBg}b3`, borderColor: theme.border }}>
            <div className="flex flex-col">
                <h2 className="text-xl md:text-2xl font-black tracking-tighter uppercase italic leading-none" style={{ color: theme.text }}>{title}</h2>
                <p className="text-[10px] font-black uppercase tracking-widest mt-1 opacity-60" style={{ color: theme.primary === '#f2b90d' ? '#64748b' : '#6b6b6b' }}>Painel de Gestão</p>
            </div>

            <div className="flex items-center gap-4">
                <div className="flex items-center rounded-full p-1 border shadow-sm" style={{ backgroundColor: `${theme.cardBg}80`, borderColor: theme.border }}>
                    <button className="size-10 rounded-full flex items-center justify-center transition-all" style={{ color: theme.primary }} title="Acessibilidade">
                        <span className="material-symbols-outlined text-[20px] font-bold">format_size</span>
                    </button>
                    <button className="size-10 rounded-full flex items-center justify-center opacity-40 hover:opacity-100 transition-all" style={{ color: theme.text }}>
                        <span className="material-symbols-outlined text-[22px]">dark_mode</span>
                    </button>
                </div>
                <button className="size-11 rounded-full border flex items-center justify-center hover:scale-105 transition-all shadow-md" style={{ backgroundColor: `${theme.primary}1a`, borderColor: `${theme.primary}4d`, color: theme.primary }}>
                    <span className="material-symbols-outlined text-[24px]">person</span>
                </button>
            </div>
        </header>
    );
};

export default Header;
