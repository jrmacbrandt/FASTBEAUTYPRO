"use client";

import React from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { useProfile } from '@/hooks/useProfile';

export default function SystemLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { profile, loading } = useProfile();

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#f2b90d]"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black flex text-white font-sans">
            <Sidebar user={profile} />

            <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
                <Header title="Painel de Gestão" />

                <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-black/30">
                    <div className="max-w-[1600px] mx-auto">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}
