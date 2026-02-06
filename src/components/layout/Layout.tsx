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

    React.useEffect(() => {
        const savedType = localStorage.getItem('elite_business_type') as 'barber' | 'salon';
        if (savedType) {
            setBusinessType(savedType);
        }

        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                supabase.from('profiles').select('*').eq('id', session.user.id).single()
                    .then(({ data }) => setUser(data));
            }
        });
    }, []);

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
