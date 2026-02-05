"use client";

import React, { useRef, useLayoutEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface SidebarProps {
    user: {
        role: string;
        full_name: string;
    } | null;
}

const Sidebar: React.FC<SidebarProps> = ({ user }) => {
    const pathname = usePathname();
    const router = useRouter();
    const sidebarNavRef = useRef<HTMLElement>(null);

    useLayoutEffect(() => {
        const savedScroll = sessionStorage.getItem('elite_sidebar_scroll');
        if (sidebarNavRef.current && savedScroll) {
            sidebarNavRef.current.scrollTop = parseInt(savedScroll, 10);
        }
    }, [pathname]);

    const handleSidebarScroll = (e: React.UIEvent<HTMLElement>) => {
        sessionStorage.setItem('elite_sidebar_scroll', String(e.currentTarget.scrollTop));
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        localStorage.removeItem('elite_user');
        sessionStorage.removeItem('elite_sidebar_scroll');
        router.push('/login');
    };

    const menuItems = React.useMemo(() => {
        if (user?.role === 'master') return [
            { label: 'Painel Master', icon: 'dashboard', path: '/admin-master' },
            { label: 'Cupons Globais', icon: 'local_offer', path: '/admin-master/cupons' },
        ];

        if (user?.role === 'owner') return [
            { label: 'Dashboard', icon: 'dashboard', path: '/admin' },
            { label: 'Caixa / Checkout', icon: 'point_of_sale', path: '/admin/caixa' },
            { label: 'Agenda Geral', icon: 'calendar_month', path: '/profissional' },
            { label: 'Comissões', icon: 'payments', path: '/admin/comissoes' },
            { label: 'Equipe', icon: 'group', path: '/admin/equipe' },
            { label: 'Mensagem', icon: 'chat_bubble', path: '/admin/mensagens' },
            { label: 'Estoque', icon: 'inventory_2', path: '/admin/estoque' },
            { label: 'Configurações', icon: 'settings', path: '/admin/configuracoes' },
        ];

        return [
            { label: 'Agenda Geral', icon: 'calendar_month', path: '/profissional' },
            { label: 'Comissões', icon: 'payments', path: '/profissional/comissoes' },
            { label: 'Histórico', icon: 'history', path: '/profissional/historico' },
            { label: 'Configuração', icon: 'settings', path: '/profissional/configuracao' },
        ];
    }, [user?.role]);

    return (
        <aside className="w-64 border-r border-slate-500/10 flex flex-col bg-[#121214]/50 backdrop-blur-md sticky top-0 h-screen hidden md:flex shrink-0 z-50 overflow-hidden">
            <div className="p-8 pb-6 shrink-0">
                <h1 className="text-white text-2xl font-black italic tracking-tighter uppercase leading-none">
                    FASTBEAUTY <span className="text-[#f2b90d]">PRO</span>
                </h1>
                <p className="text-[#f2b90d] font-black tracking-[0.3em] text-[10px] uppercase opacity-80 mt-1">
                    PLATAFORMA SAAS
                </p>
            </div>

            <nav
                ref={sidebarNavRef}
                onScroll={handleSidebarScroll}
                className="flex-1 px-6 space-y-2 elite-nav-container custom-scrollbar pb-10 overflow-y-auto"
            >
                {menuItems.map(item => {
                    const isActive = pathname === item.path;
                    return (
                        <Link
                            key={item.path}
                            href={item.path}
                            className={`flex items-center p-3.5 rounded-xl text-slate-400 font-semibold transition-all hover:bg-[#f2b90d]/5 group ${isActive ? 'bg-[#f2b90d]/10 text-[#f2b90d] font-extrabold' : ''}`}
                        >
                            <span className="material-symbols-outlined text-[24px] mr-4">{item.icon}</span>
                            <span className="text-sm tracking-tight">{item.label}</span>
                            {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#f2b90d] rounded-r-full shadow-[0_0_15px_#f2b90d]"></div>}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-6 border-t border-slate-500/10 shrink-0 bg-[#121214]/80 relative z-[100]">
                <div className="p-4 bg-[#121214] border border-slate-500/10 rounded-[1.25rem] mb-6 shadow-inner pointer-events-none select-none">
                    <p className="text-[8px] font-black text-[#f2b90d] uppercase tracking-[0.2em] mb-1">
                        {user?.role?.toUpperCase() || 'ACESSO'}
                    </p>
                    <p className="text-xs font-black truncate text-white">{user?.full_name || 'Membro FastBeauty'}</p>
                </div>

                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 text-slate-500 hover:text-red-400 text-[10px] font-black uppercase tracking-[0.2em] transition-all w-full px-2 py-3 border border-transparent hover:border-red-400/10 rounded-xl cursor-pointer"
                >
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                    SAIR DO SISTEMA
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
