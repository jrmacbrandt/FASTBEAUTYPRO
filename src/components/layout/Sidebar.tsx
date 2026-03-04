"use client";

import React, { useRef, useLayoutEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useEffect, useState, useMemo } from 'react';

interface SidebarProps {
    user: {
        id: string;
        email: string;
        role: string;
        full_name: string;
        tenant_id?: string;
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
    const [pendingCount, setPendingCount] = useState(0); // For Master Approvals
    const [ordersCount, setOrdersCount] = useState(0);   // For Admin Checkout orders

    // 🛡️ [BLINDADO] Real-time Approvals Badge - Master Only
    useEffect(() => {
        const isMaster = user?.role === 'master' || user?.email === 'jrmacbrandt@gmail.com';
        if (!isMaster) {
            setPendingCount(0);
            return;
        }

        const fetchCount = async () => {
            console.log('📊 [Sidebar] Fetching pending count...');
            const { data, error } = await supabase
                .from('tenants')
                .select('id, status, active, has_paid, subscription_plan, trial_ends_at')
                .or('status.eq.pending_approval,status.eq.suspended,subscription_plan.in.(trial,trial_2h,trial_30)');

            if (!error && data) {
                const blockedCount = data.filter(t => {
                    if (t.status === 'pending_approval' || t.status === 'suspended') return true;
                    const isTrialPlan = t.subscription_plan === 'trial' ||
                        t.subscription_plan === 'trial_2h' ||
                        t.subscription_plan === 'trial_30';
                    const isTrialExpired = isTrialPlan && (!t.trial_ends_at || new Date(t.trial_ends_at) < new Date());
                    if (isTrialExpired && t.has_paid === false) return true;
                    return false;
                }).length;
                setPendingCount(blockedCount);
            }
        };

        fetchCount();

        // 1. Listen for local events (Approvals page actions)
        const handleLocalUpdate = () => {
            console.log('🔄 [Sidebar] Local "tenant-approved" event detected');
            fetchCount();
        };
        window.addEventListener('tenant-approved', handleLocalUpdate);

        // 2. Listen for remote database changes (Supabase Realtime)
        const channel = supabase
            .channel('master_pending_approvals_sidebar')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'tenants' },
                () => {
                    console.log('🔔 [Sidebar] Real-time update detected for tenants');
                    // Small delay to allow DB state to settle
                    setTimeout(fetchCount, 500);
                }
            )
            .subscribe();

        return () => {
            window.removeEventListener('tenant-approved', handleLocalUpdate);
            supabase.removeChannel(channel);
        };
    }, [user?.id, user?.role, user?.email]);

    // 🛡️ [BLINDADO] Real-time Checkout Orders Badge - Admin Only (Persistent)
    useEffect(() => {
        if (!user?.tenant_id) {
            setOrdersCount(0);
            return;
        }

        const fetchOrdersCount = async () => {
            const { count, error } = await supabase
                .from('orders')
                .select('*', { count: 'exact', head: true })
                .eq('tenant_id', user.tenant_id)
                .eq('status', 'pending_payment');

            if (!error) setOrdersCount(count || 0);
        };

        const handleLocalUpdate = () => {
            console.log('🔄 [Sidebar] Local checkout/order event detected - Refreshing badge');
            fetchOrdersCount();
        };

        fetchOrdersCount(); // 🟢 [CORREÇÃO] Carregamento inicial obrigatório

        window.addEventListener('checkout-completed', handleLocalUpdate);
        window.addEventListener('order-created', handleLocalUpdate);

        // Unique channel per tenant to avoid clashes
        const channel = supabase
            .channel(`sidebar_checkout_orders_${user.tenant_id}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'orders', filter: `tenant_id=eq.${user.tenant_id}` },
                () => {
                    fetchOrdersCount();
                }
            )
            .subscribe();

        return () => {
            window.removeEventListener('checkout-completed', handleLocalUpdate);
            window.removeEventListener('order-created', handleLocalUpdate);
            supabase.removeChannel(channel);
        };
    }, [user?.tenant_id]); // Persistent across all pages

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
        const isMasterArea = pathname.startsWith('/admin-master');
        const isAdminArea = pathname.startsWith('/admin');
        const isProArea = pathname.startsWith('/profissional');

        if (isMasterArea) return [
            { label: 'Painel Master', icon: 'dashboard', path: '/admin-master' },
            { label: 'Aprovações', icon: 'check_circle', path: '/admin-master/aprovacoes', badge: pendingCount },
            { label: 'Comunicados', icon: 'broadcast_on_personal', path: '/admin-master/comunicados' },
            { label: 'Cupons Globais', icon: 'local_offer', path: '/admin-master/cupons' },
        ];

        if (isAdminArea) return [
            { label: 'Dashboard', icon: 'dashboard', path: '/admin' },
            { label: 'Caixa / Checkout', icon: 'point_of_sale', path: '/admin/caixa', badge: ordersCount },
            { label: 'Scanner (Check-in)', icon: 'qr_code_scanner', path: '/admin/scanner' },
            { label: 'Agenda Geral', icon: 'calendar_month', path: '/admin/agenda' },
            { label: 'CRM & Fidelidade', icon: 'campaign', path: '/admin/crm' },
            { label: 'Equipe', icon: 'group', path: '/admin/equipe' },
            { label: 'Comissões', icon: 'payments', path: '/admin/comissoes' },

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
    }, [pathname, pendingCount, ordersCount]);

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
                        <p className="font-black tracking-[0.3em] text-[8px] uppercase mt-1" style={{ color: theme.primary, opacity: 0.8 }}>
                            PLATAFORMA SAAS
                        </p>
                    </div>
                    {onClose && (
                        <button onClick={onClose} className="md:hidden p-2 rounded-lg" style={{ color: theme.text, opacity: 0.6 }}>
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
                            {user?.role === 'owner' ? 'PROPRIETÁRIO' : (user?.role?.toUpperCase() || 'ACESSO')}
                        </p>
                        <p className="text-[11px] font-black truncate" style={{ color: theme.text }}>{user?.full_name || 'Membro FastBeauty'}</p>
                    </div>

                    {/* STATUS ASSINATURA - VISÍVEL APENAS PARA DONOS (NÃO MASTERS) */}
                    {user?.tenant && user?.role === 'owner' && (
                        <div className="mb-4 px-3 py-3 rounded-xl border border-dashed transition-all"
                            style={{
                                backgroundColor: isSalon ? '#00000005' : '#ffffff05',
                                borderColor: isSalon ? '#7b438e33' : '#ffffff1a'
                            }}
                        >
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] uppercase font-black tracking-wider" style={{ color: theme.text }}>Plano Ativo</span>
                                <span className="font-black uppercase px-2 py-0.5 rounded text-[9px]"
                                    style={{ backgroundColor: user.tenant.subscription_plan === 'unlimited' ? '#10b98120' : '#f59e0b20', color: user.tenant.subscription_plan === 'unlimited' ? '#10b981' : '#f59e0b' }}>
                                    {user.tenant.subscription_plan === 'unlimited' ? 'FULL' : 'TRIAL'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] mb-1" style={{ color: theme.text }}>
                                <span className="opacity-70">Desde:</span>
                                <span className="font-mono font-black italic">
                                    {new Date(user.tenant.created_at).toLocaleDateString('pt-BR')}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-[10px]" style={{ color: theme.text }}>
                                <span className="opacity-70">Expira:</span>
                                <span className="font-mono font-black italic">
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
                        style={{ color: theme.text, opacity: 0.6 }}
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
