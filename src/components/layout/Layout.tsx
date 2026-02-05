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

    React.useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                supabase.from('profiles').select('*').eq('id', session.user.id).single()
                    .then(({ data }) => setUser(data));
            }
        });
    }, []);

    return (
        <div className="flex min-h-screen bg-black overflow-hidden">
            <Sidebar user={user} />
            <div className="flex-1 flex flex-col min-w-0">
                <Header title={title || "FastBeauty Pro"} />
                <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;
