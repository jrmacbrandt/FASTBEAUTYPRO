"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function WaitingApprovalPage() {
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
        ? { primary: '#7b438e', bg: '#decad4', text: '#1e1e1e', cardBg: '#ffffff' }
        : { primary: '#f2b90d', bg: '#000000', text: '#f8fafc', cardBg: '#18181b' };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 font-sans transition-colors duration-500" style={{ backgroundColor: colors.bg }}>
            <div className="w-full max-w-[450px] rounded-[2.5rem] p-10 md:p-14 text-center relative border bg-opacity-95" style={{ backgroundColor: colors.cardBg, borderColor: businessType === 'salon' ? '#7b438e20' : '#ffffff0d' }}>

                <div className="size-24 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto border border-amber-500/20 mb-8 animate-pulse" style={businessType === 'salon' ? { backgroundColor: '#7b438e1a', color: '#7b438e', borderColor: '#7b438e20' } : {}}>
                    <span className="material-symbols-outlined text-6xl">hourglass_top</span>
                </div>

                <h1 className="text-xl md:text-2xl font-black mb-6 italic tracking-tight uppercase leading-tight" style={{ color: colors.text }}>
                    Usuário aguardando aprovação <br /> do Administrador da loja.
                </h1>

                <p className="text-xs font-bold opacity-60 leading-relaxed mb-10 italic" style={{ color: colors.text }}>
                    Seu cadastro foi realizado com sucesso. Assim que o administrador aprovar seu acesso, você poderá utilizar todas as ferramentas do seu painel profissional.
                </p>

                <button
                    onClick={async () => {
                        await supabase.auth.signOut();
                        router.push('/login');
                    }}
                    className="w-full font-black py-4 rounded-xl text-[10px] shadow-xl transition-all hover:opacity-90 active:scale-95 uppercase italic tracking-widest"
                    style={{ backgroundColor: colors.primary, color: businessType === 'salon' ? '#ffffff' : '#000000' }}
                >
                    VOLTAR PARA O LOGIN
                </button>
            </div>
        </div>
    );
}
