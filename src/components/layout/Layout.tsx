"use client";

import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { supabase } from '@/lib/supabase';

interface LayoutProps {
    children: React.ReactNode;
    title?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, title }) => {
    const [user, setUser] = React.useState<any>(null);
    const [businessType, setBusinessType] = React.useState<'barber' | 'salon'>('barber');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

    const [isSupportMode, setIsSupportMode] = React.useState(false);
    const [isMaintenance, setIsMaintenance] = React.useState(false);

    React.useEffect(() => {
        const checkSupport = () => {
            const supportId = document.cookie
                .split('; ')
                .find(row => row.startsWith('support_tenant_id='))
                ?.split('=')[1];
            setIsSupportMode(!!supportId);
        };
        checkSupport();
    }, []);

    React.useEffect(() => {
        const savedType = localStorage.getItem('elite_business_type') as 'barber' | 'salon';
        if (savedType) {
            setBusinessType(savedType);
        }

        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                // Fetch User Profile + Tenant Details
                supabase.from('profiles')
                    .select('*, tenant(*)')
                    .eq('id', session.user.id)
                    .single()
                    .then(async ({ data }) => {
                        if (data) {
                            let finalUser = { ...data };

                            // Support Mode Sync
                            const supportId = document.cookie
                                .split('; ')
                                .find(row => row.startsWith('support_tenant_id='))
                                ?.split('=')[1];

                            if (supportId && (data.role === 'master' || data.email === 'jrmacbrandt@gmail.com')) {
                                const { data: impTenant } = await supabase.from('tenants').select('*').eq('id', supportId).single();
                                if (impTenant) {
                                    finalUser.tenant = impTenant;
                                    setIsMaintenance(impTenant.maintenance_mode);
                                }
                            } else {
                                setIsMaintenance(data.tenant?.maintenance_mode);
                            }

                            setUser(finalUser);
                        }
                    });
            }
        });
    }, []);

    const handleStopSupport = () => {
        window.location.href = '/admin-master?stop_impersonate=true';
    };

    const theme = businessType === 'salon'
        ? { primary: '#7b438e', bg: '#decad4', text: '#1e1e1e', cardBg: '#ffffff', sidebarBg: '#ffffff', headerBg: '#decad4', border: '#7b438e33' }
        : { primary: '#f2b90d', bg: '#000000', text: '#f8fafc', cardBg: '#121214', sidebarBg: '#121214', headerBg: '#121214', border: '#ffffff0d' };

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
                {/* Master Support / Maintenance Banner */}
                {(isSupportMode || isMaintenance) && (
                    <div className="bg-amber-500 text-black py-2 px-4 flex items-center justify-between z-[100] shadow-lg animate-in slide-in-from-top duration-500">
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined font-bold animate-pulse text-xl">
                                {isMaintenance ? 'engineering' : 'admin_panel_settings'}
                            </span>
                            <span className="text-[10px] md:text-xs font-black uppercase tracking-widest whitespace-nowrap">
                                {isMaintenance
                                    ? 'Manutenção preventiva ou corretiva sendo realizada.'
                                    : 'Modo Suporte Ativo: Visualizando painel administrativo da unidade.'}
                            </span>
                        </div>
                        {isSupportMode && (
                            <button
                                onClick={handleStopSupport}
                                className="bg-black text-[#f2b90d] px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter hover:bg-zinc-900 transition-all flex items-center gap-2"
                            >
                                <span className="material-symbols-outlined text-[14px]">logout</span>
                                Finalizar Manutenção
                            </button>
                        )}
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
