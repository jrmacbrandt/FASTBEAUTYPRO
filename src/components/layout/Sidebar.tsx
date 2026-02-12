"use client";

import React, { useRef, useLayoutEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface SidebarProps {
    user: {
        role: string;
        full_name: string;
        tenant?: {
            subscription_plan: string;
            trial_ends_at: string | null;
            created_at: string;
        };
    } | null;
    theme: {
        primary: string;
        bg: string;
        text: string;
        cardBg: string;
        sidebarBg: string;
        headerBg: string;
        border: string;
    };
    businessType: 'barber' | 'salon';
    isOpen?: boolean;
    onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ user, theme, businessType, isOpen, onClose }) => {
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

    const [pendingCount, setPendingCount] = React.useState(0);

    const fetchPending = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', session.user.id).single();
        if (!profile?.tenant_id) return;

        const { count } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', profile.tenant_id)
            .eq('status', 'pending');

        setPendingCount(count || 0);
    };

    React.useEffect(() => {
        fetchPending();
        // Listen only to explicit approval events to avoid loop
        const handleUpdate = () => fetchPending();
        window.addEventListener('professional-approved', handleUpdate);
        return () => window.removeEventListener('professional-approved', handleUpdate);
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        localStorage.removeItem('elite_user');
        sessionStorage.removeItem('elite_sidebar_scroll');
        router.push('/login');
    };

    const menuItems = React.useMemo(() => {
        const isMasterArea = pathname.startsWith('/admin-master');
        const isAdminArea = pathname.startsWith('/admin');
        const isProArea = pathname.startsWith('/profissional');

        if (isMasterArea) return [
            { label: 'Painel Master', icon: 'dashboard', path: '/admin-master' },
            { label: 'Aprovações', icon: 'check_circle', path: '/admin-master/aprovacoes' },
            { label: 'Comunicados', icon: 'broadcast_on_personal', path: '/admin-master/comunicados' },
            { label: 'Cupons Globais', icon: 'local_offer', path: '/admin-master/cupons' },
        ];

        if (isAdminArea) return [
            { label: 'Dashboard', icon: 'dashboard', path: '/admin' },
            { label: 'Clube VIP', icon: 'diamond', path: '/admin/assinaturas' },
            { label: 'Scanner (Check-in)', icon: 'qr_code_scanner', path: '/admin/scanner' },
            { label: 'CRM & Fidelidade', icon: 'campaign', path: '/admin/crm' },
            { label: 'Caixa / Checkout', icon: 'point_of_sale', path: '/admin/caixa' },
            { label: 'Agenda Geral', icon: 'calendar_month', path: '/profissional' },
            { label: 'Comissões', icon: 'payments', path: '/admin/comissoes' },
            { label: 'Equipe', icon: 'group', path: '/admin/equipe', badge: pendingCount },

            { label: 'Mensagem', icon: 'chat_bubble', path: '/admin/mensagens' },
            { label: 'Serviços', icon: 'content_cut', path: '/admin/servicos' },
            { label: 'Estoque', icon: 'inventory_2', path: '/admin/estoque' },
            { label: 'Relatórios', icon: 'bar_chart', path: '/admin/relatorios' },
            { label: 'Configurações', icon: 'settings', path: '/admin/configuracoes' },
        ];


        return [
            { label: 'Agenda Geral', icon: 'calendar_month', path: '/profissional' },
            { label: 'Comissões', icon: 'payments', path: '/profissional/comissoes' },
            { label: 'Histórico', icon: 'history', path: '/profissional/historico' },
            { label: 'Configuração', icon: 'settings', path: '/profissional/configuracao' },
        ];
    }, [pathname, pendingCount]);

    const isSalon = businessType === 'salon';

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] md:hidden animate-in fade-in duration-300"
                    onClick={onClose}
                />
            )}

            <aside
                className={`fixed md:sticky top-0 h-screen w-64 border-r flex flex-col backdrop-blur-md shrink-0 z-[100] transition-all duration-300 ease-in-out ${isOpen ? 'left-0 translate-x-0' : '-translate-x-full md:translate-x-0 md:flex'} overflow-hidden md:flex`}
                style={{ backgroundColor: `${theme.sidebarBg}f2`, borderColor: theme.border }}
            >
                <div className="p-8 pb-6 shrink-0 flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-black italic tracking-tighter uppercase leading-none" style={{ color: theme.text }}>
                            FASTBEAUTY <span style={{ color: theme.primary }}>PRO</span>
                        </h1>
                        <p className="font-black tracking-[0.3em] text-[8px] uppercase opacity-80 mt-1" style={{ color: theme.primary }}>
                            PLATAFORMA SAAS
                        </p>
                    </div>
                    {onClose && (
                        <button onClick={onClose} className="md:hidden p-2 rounded-lg opacity-60 hover:opacity-100" style={{ color: theme.text }}>
                            <span className="material-symbols-outlined text-[20px]">close</span>
                        </button>
                    )}
                </div>

                <nav
                    ref={sidebarNavRef}
                    onScroll={handleSidebarScroll}
                    className="flex-1 px-4 space-y-1 elite-nav-container custom-scrollbar pb-10 overflow-y-auto"
                >
                    {menuItems.map(item => {
                        const isActive = pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                onClick={() => {
                                    if (window.innerWidth < 768 && onClose) onClose();
                                }}
                                className={`flex items-center p-3 rounded-xl transition-all relative group ${isActive ? 'font-extrabold' : 'font-semibold opacity-60 hover:opacity-100'}`}
                                style={{
                                    backgroundColor: isActive ? `${theme.primary}1a` : 'transparent',
                                    color: isActive ? theme.primary : theme.text
                                }}
                            >
                                <span className="material-symbols-outlined text-[22px] mr-3.5">{item.icon}</span>
                                <span className="text-sm tracking-tight">{item.label}</span>
                                {/* @ts-ignore */}
                                {(item.badge || 0) > 0 && (
                                    <span className="ml-auto bg-red-500 text-white text-[9px] font-black rounded-full size-5 flex items-center justify-center animate-pulse">
                                        {/* @ts-ignore */}
                                        {item.badge}
                                    </span>
                                )}
                                {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full shadow-lg" style={{ backgroundColor: theme.primary, boxShadow: `0 0 10px ${theme.primary}` }}></div>}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t shrink-0 relative z-[100]" style={{ borderColor: theme.border, backgroundColor: `${theme.sidebarBg}cc` }}>
                    <div className="p-3 border rounded-xl mb-4 shadow-inner pointer-events-none select-none" style={{ backgroundColor: theme.sidebarBg, borderColor: theme.border }}>
                        <p className="text-[7px] font-black uppercase tracking-[0.2em] mb-0.5" style={{ color: theme.primary }}>
                            {user?.role?.toUpperCase() || 'ACESSO'}
                        </p>
                        <p className="text-[11px] font-black truncate" style={{ color: theme.text }}>{user?.full_name || 'Membro FastBeauty'}</p>
                    </div>

                    {/* STATUS ASSINATURA */}
                    {user?.tenant && (
                        <div className="mb-4 px-3 py-2 rounded-lg border border-dashed border-white/10 opacity-70 hover:opacity-100 transition-opacity">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[8px] uppercase font-bold tracking-wider" style={{ color: theme.text }}>Plano Ativo</span>
                                <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded text-[7px]"
                                    style={{ backgroundColor: user.tenant.subscription_plan === 'unlimited' ? '#10b98120' : '#f59e0b20', color: user.tenant.subscription_plan === 'unlimited' ? '#10b981' : '#f59e0b' }}>
                                    {user.tenant.subscription_plan === 'unlimited' ? 'FULL' : 'TRIAL'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-[8px] mb-0.5" style={{ color: theme.text }}>
                                <span className="opacity-60">Desde:</span>
                                <span className="font-mono font-bold">
                                    {new Date(user.tenant.created_at).toLocaleDateString('pt-BR')}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-[8px]" style={{ color: theme.text }}>
                                <span className="opacity-60">Expira:</span>
                                <span className="font-mono font-bold">
                                    {user.tenant.subscription_plan === 'unlimited'
                                        ? 'INDETERMINADO'
                                        : user.tenant.trial_ends_at
                                            ? new Date(user.tenant.trial_ends_at).toLocaleDateString('pt-BR')
                                            : 'N/A'}
                                </span>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 text-[9px] font-black uppercase tracking-[0.2em] transition-all w-full px-2 py-2.5 border border-transparent hover:border-red-400/10 rounded-xl cursor-pointer"
                        style={{ color: isSalon ? '#64748b' : '#94a3b8' }}
                    >
                        <span className="material-symbols-outlined text-[16px]">logout</span>
                        SAIR DO SISTEMA
                    </button>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
