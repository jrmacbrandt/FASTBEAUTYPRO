"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const SystemGateway = () => {
    const router = useRouter();
    const [businessType, setBusinessType] = useState<'barber' | 'salon'>('barber');

    useEffect(() => {
        const savedType = localStorage.getItem('elite_business_type') as 'barber' | 'salon';
        if (savedType) {
            setBusinessType(savedType);
            document.body.className = savedType === 'salon' ? 'theme-salon' : '';
        }
    }, []);

    const colors = businessType === 'salon'
        ? { primary: '#7b438e', bg: '#faf8f5', text: '#1e1e1e', textMuted: '#6b6b6b', cardBg: '#ffffff' }
        : { primary: '#f2b90d', bg: '#000000', text: '#f8fafc', textMuted: '#64748b', cardBg: '#121214' };

    const terms = {
        description: 'FastBeauty Pro',
        accessBtn: 'Acessar Painel Administrativo',
        masterBtn: 'Painel Administrador Master'
    };

    return (
        <div className="h-screen w-screen flex items-center justify-center p-4 md:p-8 relative transition-colors duration-500 overflow-hidden" style={{ backgroundColor: colors.bg, color: colors.text }}>
            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r opacity-20" style={{ background: `linear-gradient(90deg, ${colors.primary}, ${colors.primary}33, ${colors.primary})` }}></div>

            <div className="w-full max-w-[400px] rounded-[2rem] p-6 md:p-8 relative border bg-opacity-95 z-10 animate-in fade-in zoom-in duration-700 shadow-2xl flex flex-col items-center text-center" style={{ backgroundColor: colors.cardBg, borderColor: `${colors.primary}33` }}>
                <button onClick={() => router.push('/')} className="absolute left-6 top-6 size-8 flex items-center justify-center rounded-full hover:opacity-80 transition-all group z-10" style={{ backgroundColor: businessType === 'salon' ? '#f5f3f0' : '#0f0f10', color: colors.text }}>
                    <span className="material-symbols-outlined text-[18px] group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
                </button>
                <div>
                    <span className="material-symbols-outlined text-4xl mb-2 animate-pulse" style={{ color: colors.primary }}>
                        {businessType === 'salon' ? 'spa' : 'content_cut'}
                    </span>
                </div>
                <div className="space-y-1 w-full flex flex-col items-center">
                    <h2 className="text-[14px] font-black italic tracking-[0.4em] uppercase opacity-60 leading-none" style={{ color: colors.primary }}>FastBeauty Pro</h2>
                    <h3 className="text-4xl md:text-5xl font-black leading-[0.9] tracking-tighter italic uppercase" style={{ color: colors.text }}>
                        Portal do <span style={{ color: colors.primary }}>Sistema</span> <br /> Premium
                    </h3>
                </div>

                <p className="text-xs md:text-sm font-medium w-full max-w-[280px] mx-auto leading-relaxed opacity-50" style={{ color: colors.textMuted }}>
                    Selecione seu ponto de acesso à <br className="hidden sm:block" /> <span className="font-bold italic" style={{ color: colors.text }}>Plataforma {terms.description}</span>.
                </p>

                <div className="pt-4 w-full flex justify-center">
                    <Link href="/login" className="w-full max-w-[320px] font-black py-5 rounded-2xl text-base md:text-lg shadow-lg transition-all hover:scale-[1.02] active:scale-95 uppercase tracking-tighter flex items-center justify-center" style={{ backgroundColor: colors.primary, color: businessType === 'salon' ? '#ffffff' : '#0a0a0b' }}>
                        {terms.accessBtn}
                    </Link>
                </div>

                <div className="pt-20 flex flex-col items-center gap-2 w-full">
                    <Link href="/login-master" className="text-[10px] md:text-xs font-black uppercase tracking-[0.3em] transition-opacity duration-300 opacity-20 hover:opacity-100 py-1" style={{ color: colors.textMuted }}>
                        {terms.masterBtn}
                    </Link>
                    <div className="w-8 h-0.5 rounded-full" style={{ backgroundColor: `${colors.primary}1a` }}></div>
                </div>
            </div>

            <div className="absolute -bottom-24 -left-24 size-96 blur-[120px] rounded-full pointer-events-none" style={{ backgroundColor: `${colors.primary}0d` }}></div>
            <div className="absolute -top-24 -right-24 size-96 blur-[120px] rounded-full pointer-events-none" style={{ backgroundColor: `${colors.primary}0d` }}></div>
        </div>
    );
};

export default SystemGateway;
