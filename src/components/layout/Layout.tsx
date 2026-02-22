"use client";

import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { supabase } from '@/lib/supabase';
import { usePathname } from 'next/navigation';
import { useProfile } from '@/hooks/useProfile';

interface LayoutProps {
    children: React.ReactNode;
    title?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, title }) => {
    const pathname = usePathname();
    const [user, setUser] = React.useState<any>(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
    const [isSupportMode, setIsSupportMode] = React.useState(false);
    const [isMaintenance, setIsMaintenance] = React.useState(false);

    const { profile, loading: profileLoading, theme, businessType, refreshProfile } = useProfile();

    React.useEffect(() => {
        const handleProfileUpdate = () => {
            console.log('🔄 Profile update detected! Refreshing...');
            refreshProfile?.();
        };
        window.addEventListener('profile-updated', handleProfileUpdate);
        return () => window.removeEventListener('profile-updated', handleProfileUpdate);
    }, [refreshProfile]);

    React.useEffect(() => {
        const checkSupport = () => {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('stop_impersonate')) {
                document.cookie = "support_tenant_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
                setIsSupportMode(false);
                return;
            }

            const cookies = document.cookie.split('; ');
            const supportCookie = cookies.find(row => row.trim().startsWith('support_tenant_id='));
            const supportId = supportCookie?.split('=')[1];
            setIsSupportMode(!!supportId);
        };
        checkSupport();
    }, [pathname]);

    React.useEffect(() => {
        if (profile) {
            setUser(profile);
            document.body.className = businessType === 'salon' ? 'theme-salon' : 'theme-barber';

            const maintenanceActive = profile.tenant?.maintenance_mode === true;
            setIsMaintenance(maintenanceActive);

            if (maintenanceActive) {
                const isMasterUser = profile.email === 'jrmacbrandt@gmail.com';
                const hasSupportCookie = document.cookie.includes('support_tenant_id=');

                if (!isMasterUser && !hasSupportCookie && !pathname.includes('/manutencao')) {
                    window.location.href = '/manutencao';
                }
            }

            // Realtime maintenance detector (kicks out non-masters instantly)
            if (profile.tenant_id) {
                const isMasterUser = profile.email === 'jrmacbrandt@gmail.com';
                const hasSupportCookie = document.cookie.includes('support_tenant_id=');

                const channel = supabase
                    .channel(`tenant_maintenance_${profile.tenant_id}`)
                    .on(
                        'postgres_changes',
                        {
                            event: 'UPDATE',
                            schema: 'public',
                            table: 'tenants',
                            filter: `id=eq.${profile.tenant_id}`
                        },
                        (payload) => {
                            const newMaintenanceMode = payload.new.maintenance_mode;
                            if (newMaintenanceMode && !isMasterUser && !hasSupportCookie) {
                                // Auto-lockout active users by redirecting them to the warning page
                                window.location.href = '/manutencao';
                            } else if (!newMaintenanceMode && pathname.includes('/manutencao')) {
                                window.location.href = profile.role === 'owner' ? '/admin' : '/profissional';
                            }
                        }
                    )
                    .subscribe();

                return () => {
                    supabase.removeChannel(channel);
                };
            }

        }
    }, [profile, pathname, businessType]);

    const handleStopSupport = async () => {
        const cookies = document.cookie.split('; ');
        const supportId = cookies.find(row => row.trim().startsWith('support_tenant_id='))?.split('=')[1];

        if (!supportId) {
            window.location.href = '/admin-master?stop_impersonate=true';
            return;
        }

        try {
            const { error: rpcError } = await supabase.rpc('master_toggle_maintenance', {
                target_tenant_id: supportId,
                enable_maintenance: false
            });

            if (rpcError) {
                await supabase
                    .from('tenants')
                    .update({ maintenance_mode: false })
                    .eq('id', supportId);
            }
            window.location.href = '/admin-master?stop_impersonate=true';
        } catch (err: any) {
            window.location.href = '/admin-master?stop_impersonate=true';
        }
    };

    if (profileLoading) return null;

    return (
        <div className="flex min-h-screen transition-colors duration-500 overflow-x-hidden" style={{ backgroundColor: theme.bg }}>
            <Sidebar
                user={user}
                theme={theme}
                businessType={businessType}
                isOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
            />
            <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
                {isSupportMode && profile?.email === 'jrmacbrandt@gmail.com' && (
                    <div className="bg-amber-500 text-black py-2 px-4 flex items-center justify-between z-[100] shadow-lg animate-in slide-in-from-top duration-500">
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined font-bold animate-pulse text-xl">
                                {isMaintenance ? 'engineering' : 'admin_panel_settings'}
                            </span>
                            <span className="text-[10px] md:text-xs font-black uppercase tracking-widest whitespace-nowrap">
                                {isMaintenance
                                    ? 'Modo Manutenção Ativo: Unidade Bloqueada para Usuários.'
                                    : 'Modo Suporte Ativo: Visualizando Unidade.'}
                            </span>
                        </div>
                        <button
                            onClick={handleStopSupport}
                            className="bg-black text-[#f2b90d] px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter hover:bg-zinc-900 transition-all flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined text-[14px]">logout</span>
                            {isMaintenance ? 'Finalizar Manutenção' : 'Sair do Suporte'}
                        </button>
                    </div>
                )}

                <Header
                    title={title || "FastBeauty Pro"}
                    theme={theme}
                    onMenuToggle={() => setIsMobileMenuOpen(true)}
                />
                <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth custom-scrollbar">
                    <div className="max-w-7xl mx-auto w-full">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;
