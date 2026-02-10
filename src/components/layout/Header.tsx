"use client";

import React from 'react';
import { NotificationBell } from '../NotificationBell';

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
    onMenuToggle?: () => void;
}

const Header: React.FC<HeaderProps> = ({ title, theme, onMenuToggle }) => {
    return (
        <header className="h-16 md:h-20 border-b flex items-center justify-between px-4 md:px-8 backdrop-blur-md shrink-0 z-40 transition-colors duration-500" style={{ backgroundColor: `${theme.headerBg}b3`, borderColor: theme.border }}>
            <div className="flex items-center gap-3 md:gap-0">
                {onMenuToggle && (
                    <button
                        onClick={onMenuToggle}
                        className="md:hidden size-10 flex items-center justify-center rounded-xl border"
                        style={{ backgroundColor: `${theme.cardBg}80`, borderColor: theme.border, color: theme.text }}
                    >
                        <span className="material-symbols-outlined">menu</span>
                    </button>
                )}
                <div className="flex flex-col">
                    <h2 className="text-lg md:text-2xl font-black tracking-tighter uppercase italic leading-none" style={{ color: theme.text }}>{title}</h2>
                    <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest mt-0.5 md:mt-1 opacity-60" style={{ color: theme.primary === '#f2b90d' ? '#64748b' : '#6b6b6b' }}>Painel de Gestão</p>
                </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
                <div className="flex items-center rounded-full p-1 border shadow-sm" style={{ backgroundColor: `${theme.cardBg}80`, borderColor: theme.border }}>
                    <div className="px-2 border-r border-white/5">
                        <NotificationBell />
                    </div>
                    <button className="size-8 md:size-10 rounded-full flex items-center justify-center transition-all" style={{ color: theme.primary }} title="Acessibilidade">
                        <span className="material-symbols-outlined text-[16px] md:text-[20px] font-bold">format_size</span>
                    </button>
                    <button className="size-8 md:size-10 rounded-full flex items-center justify-center opacity-40 hover:opacity-100 transition-all md:flex hidden" style={{ color: theme.text }}>
                        <span className="material-symbols-outlined text-[18px] md:text-[22px]">dark_mode</span>
                    </button>
                </div>
                <button className="size-9 md:size-11 rounded-full border flex items-center justify-center hover:scale-105 transition-all shadow-md" style={{ backgroundColor: `${theme.primary}1a`, borderColor: `${theme.primary}4d`, color: theme.primary }}>
                    <span className="material-symbols-outlined text-[18px] md:text-[24px]">person</span>
                </button>
            </div>
        </header>
    );
};

export default Header;
