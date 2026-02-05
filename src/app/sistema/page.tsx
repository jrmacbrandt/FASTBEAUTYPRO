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
        <div className="min-h-screen flex flex-col items-center justify-between py-16 px-8 relative transition-colors duration-500 overflow-hidden" style={{ backgroundColor: colors.bg, color: colors.text }}>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r opacity-50" style={{ background: `linear-gradient(90deg, ${colors.primary}, ${colors.primary}33, ${colors.primary})` }}></div>

            <div className="absolute left-8 top-8">
                <button onClick={() => router.push('/')} className="size-12 flex items-center justify-center rounded-full border transition-all group shadow-lg" style={{ backgroundColor: colors.cardBg, borderColor: `${colors.text}1a`, color: colors.textMuted }}>
                    <span className="material-symbols-outlined text-[28px] group-hover:-translate-x-1 transition-transform" style={{ color: colors.primary }}>arrow_back</span>
                </button>
            </div>

            <div className="text-center space-y-8 max-w-4xl z-10 animate-in fade-in zoom-in duration-700">
                <div className="flex justify-center mb-2">
                    <span className="material-symbols-outlined text-6xl animate-pulse" style={{ color: colors.primary }}>
                        {businessType === 'salon' ? 'spa' : 'content_cut'}
                    </span>
                </div>
                <h2 className="text-xl md:text-3xl font-black italic tracking-[0.4em] uppercase opacity-90 drop-shadow-sm" style={{ color: colors.primary }}>FastBeauty Pro</h2>
                <h3 className="text-5xl md:text-8xl font-black leading-[1.1] tracking-tighter italic" style={{ color: colors.text }}>
                    Portal do <span style={{ color: colors.primary }}>Sistema</span> <br className="hidden md:block" /> Premium
                </h3>
                <p className="text-lg md:text-xl font-medium max-w-md mx-auto leading-relaxed" style={{ color: colors.textMuted }}>
                    Selecione seu ponto de acesso à <span className="font-bold italic" style={{ color: colors.text }}>{terms.description}</span>.
                </p>

                <div className="pt-8">
                    <Link href="/login" className="inline-block font-black py-6 px-16 rounded-[1.8rem] text-xl shadow-2xl transition-all hover:scale-105 active:scale-95 uppercase tracking-tight" style={{ backgroundColor: colors.primary, color: businessType === 'salon' ? '#ffffff' : '#0a0a0b' }}>
                        {terms.accessBtn}
                    </Link>
                </div>
            </div>

            <div className="w-full flex flex-col items-center gap-4 mt-auto">
                <Link href="/login-master" className="text-xs font-black uppercase tracking-[0.4em] transition-all hover:tracking-[0.5em] opacity-40 hover:opacity-100 py-4" style={{ color: colors.textMuted }}>
                    {terms.masterBtn}
                </Link>
                <div className="w-16 h-0.5 rounded-full" style={{ backgroundColor: `${colors.primary}1a` }}></div>
            </div>

            <div className="absolute -bottom-24 -left-24 size-96 blur-[120px] rounded-full pointer-events-none" style={{ backgroundColor: `${colors.primary}0d` }}></div>
            <div className="absolute -top-24 -right-24 size-96 blur-[120px] rounded-full pointer-events-none" style={{ backgroundColor: `${colors.primary}0d` }}></div>
        </div>
    );
};

export default SystemGateway;
