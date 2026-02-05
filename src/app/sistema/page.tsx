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
        description: 'Plataforma FastBeauty Pro',
        accessBtn: 'Acessar Painel Administrativo',
        masterBtn: 'Painel Administrador Master'
    };

    return (
        <div className="h-screen w-screen flex items-center justify-center p-4 md:p-8 relative transition-colors duration-500 overflow-hidden" style={{ backgroundColor: colors.bg, color: colors.text }}>
            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r opacity-20" style={{ background: `linear-gradient(90deg, ${colors.primary}, ${colors.primary}33, ${colors.primary})` }}></div>

            <div className="absolute left-4 top-4 z-50">
                <button onClick={() => router.push('/')} className="size-8 flex items-center justify-center rounded-full border transition-all group shadow-sm bg-opacity-50" style={{ backgroundColor: colors.cardBg, borderColor: `${colors.text}1a`, color: colors.textMuted }}>
                    <span className="material-symbols-outlined text-[18px] group-hover:-translate-x-1 transition-transform" style={{ color: colors.primary }}>arrow_back</span>
                </button>
            </div>

            <div className="flex flex-col items-center justify-center text-center space-y-2 max-w-sm w-full z-10 animate-in fade-in zoom-in duration-700 bg-white/5 p-6 rounded-3xl border border-white/5 backdrop-blur-sm shadow-2xl">
                <div className="mb-0.5">
                    <span className="material-symbols-outlined text-xl animate-pulse" style={{ color: colors.primary }}>
                        {businessType === 'salon' ? 'spa' : 'content_cut'}
                    </span>
                </div>
                <h2 className="text-[5.6px] font-black italic tracking-[0.5em] uppercase opacity-60" style={{ color: colors.primary }}>FastBeauty Pro</h2>
                <h3 className="text-[10px] md:text-[12px] font-black leading-tight tracking-tighter italic" style={{ color: colors.text }}>
                    Portal do <span style={{ color: colors.primary }}>Sistema</span> <br className="hidden md:block" /> Premium
                </h3>
                <p className="text-[10px] md:text-xs font-medium w-full whitespace-nowrap mx-auto leading-tight opacity-50" style={{ color: colors.textMuted }}>
                    Selecione seu ponto de acesso à <span className="font-bold italic" style={{ color: colors.text }}>{terms.description}</span>.
                </p>

                <div className="pt-2 w-full flex justify-center">
                    <Link href="/login" className="inline-block px-10 font-black py-1.5 rounded-lg text-[6px] shadow-lg transition-all hover:scale-[1.02] active:scale-95 uppercase tracking-tight" style={{ backgroundColor: colors.primary, color: businessType === 'salon' ? '#ffffff' : '#0a0a0b' }}>
                        {terms.accessBtn}
                    </Link>
                </div>

                <div className="pt-20 flex flex-col items-center gap-1.5 w-full">
                    <Link href="/login-master" className="text-[1.6px] font-black uppercase tracking-[0.3em] transition-all hover:tracking-[0.4em] opacity-30 hover:opacity-70 py-1" style={{ color: colors.textMuted }}>
                        {terms.masterBtn}
                    </Link>
                    <div className="w-6 h-0.5 rounded-full" style={{ backgroundColor: `${colors.primary}1a` }}></div>
                </div>
            </div>

            <div className="absolute -bottom-24 -left-24 size-96 blur-[120px] rounded-full pointer-events-none" style={{ backgroundColor: `${colors.primary}0d` }}></div>
            <div className="absolute -top-24 -right-24 size-96 blur-[120px] rounded-full pointer-events-none" style={{ backgroundColor: `${colors.primary}0d` }}></div>
        </div>
    );
};

export default SystemGateway;
