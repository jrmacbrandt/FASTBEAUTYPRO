"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface LoginProps {
    type: 'standard' | 'master';
}

const LoginComponent: React.FC<LoginProps> = ({ type }) => {
    const router = useRouter();
    const [businessType, setBusinessType] = useState<'barber' | 'salon'>('barber');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'admin' | 'pro'>('pro');

    useEffect(() => {
        const savedType = localStorage.getItem('elite_business_type') as 'barber' | 'salon';
        if (savedType) {
            setBusinessType(savedType);
            document.body.className = savedType === 'salon' ? 'theme-salon' : '';
        }
    }, []);

    const colors = businessType === 'salon'
        ? { primary: '#7b438e', bg: '#faf8f5', text: '#1e1e1e', textMuted: '#6b6b6b', cardBg: '#ffffff', inputBg: '#f5f3f0', buttonText: '#ffffff' }
        : { primary: '#f2b90d', bg: '#000000', text: '#f8fafc', textMuted: '#64748b', cardBg: '#18181b', inputBg: '#0f0f10', buttonText: '#000000' };

    const terms = {
        title: type === 'master' ? 'ACESSO MASTER' : (activeTab === 'admin' ? 'LOGIN ADMIN' : 'LOGIN PROFISSIONAL'),
        subtitle: type === 'master'
            ? 'Portal exclusivo para operadores master'
            : `Portal de acesso para ${activeTab === 'admin' ? 'Proprietários' : 'Colaboradores'}`,
        idLabel: 'E-MAIL',
        passLabel: 'CHAVE DE SEGURANÇA',
        footer: 'FASTBEAUTY PRO'
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { data, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (authError) {
            setError(authError.message);
            setLoading(false);
            return;
        }

        if (data.session) {
            // Since middleware is disabled, handle redirection here based on profile role
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', data.session.user.id)
                .single();

            if (type === 'master') {
                router.push('/admin-master');
            } else if (profile?.role === 'owner') {
                router.push('/admin');
            } else if (profile?.role === 'barber') {
                router.push('/profissional');
            } else {
                router.push('/sistema');
            }
        }
    };


    return (
        <div className="min-h-screen flex items-center justify-center p-4 font-sans transition-colors duration-500" style={{ backgroundColor: colors.bg }}>
            <div className="w-full max-w-[440px] rounded-[2.5rem] p-8 md:p-10 relative border overflow-hidden" style={{ backgroundColor: colors.cardBg, borderColor: businessType === 'salon' ? '#7b438e20' : '#ffffff0d' }}>
                <button onClick={() => router.push('/sistema')} className="absolute left-8 top-8 size-10 flex items-center justify-center rounded-full hover:opacity-80 transition-all group z-10" style={{ backgroundColor: colors.inputBg, color: colors.text }}>
                    <span className="material-symbols-outlined text-[20px] group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
                </button>

                <div className="flex flex-col items-center mb-8 pt-4">
                    <div className="size-14 rounded-2xl border-2 flex items-center justify-center mb-6" style={{ backgroundColor: `${colors.primary}1a`, borderColor: colors.primary, color: colors.primary }}>
                        <span className="material-symbols-outlined text-3xl font-bold">{type === 'master' ? 'security' : 'person_pin'}</span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black mb-1 italic tracking-tight uppercase text-center leading-none" style={{ color: colors.text }}>{terms.title}</h1>
                    <p className="opacity-70 text-xs text-center" style={{ color: colors.textMuted }}>{terms.subtitle}</p>
                </div>

                {type !== 'master' && (
                    <div className="flex p-1.5 rounded-2xl mb-8 border" style={{ backgroundColor: colors.inputBg, borderColor: businessType === 'salon' ? '#7b438e20' : '#ffffff0d' }}>
                        <button onClick={() => setActiveTab('pro')} className={`flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all italic ${activeTab === 'pro' ? 'shadow-lg' : 'opacity-50 hover:opacity-100'}`} style={activeTab === 'pro' ? { backgroundColor: colors.primary, color: colors.buttonText } : { color: colors.textMuted }}>PROFISSIONAL</button>
                        <button onClick={() => setActiveTab('admin')} className={`flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all italic ${activeTab === 'admin' ? 'shadow-lg' : 'opacity-50 hover:opacity-100'}`} style={activeTab === 'admin' ? { backgroundColor: colors.primary, color: colors.buttonText } : { color: colors.textMuted }}>ADMINISTRADOR</button>
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-6">
                    {error && <div className="text-xs text-center font-bold p-3 rounded-xl border" style={{ color: '#ef4444', backgroundColor: '#ef444410', borderColor: '#ef444420' }}>{error}</div>}

                    <div className="space-y-2.5">
                        <label className="opacity-80 text-[10px] uppercase tracking-widest ml-1 italic" style={{ color: colors.textMuted }}>{terms.idLabel}</label>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-5 top-4 text-[20px] opacity-40" style={{ color: colors.textMuted }}>badge</span>
                            <input type="email" placeholder="nome@exemplo.com" className="w-full border rounded-2xl py-4 pl-14 pr-6 focus:outline-none transition-all font-bold" style={{ backgroundColor: colors.inputBg, borderColor: businessType === 'salon' ? '#7b438e20' : '#ffffff0d', color: colors.text }} value={email} onChange={(e) => setEmail(e.target.value)} required />
                        </div>
                    </div>

                    <div className="space-y-2.5">
                        <label className="opacity-80 text-[10px] uppercase tracking-widest ml-1 italic" style={{ color: colors.textMuted }}>{terms.passLabel}</label>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-5 top-4 text-[20px] opacity-40" style={{ color: colors.textMuted }}>lock</span>
                            <input type="password" placeholder="........" className="w-full border rounded-2xl py-4 pl-14 pr-6 focus:outline-none transition-all font-bold tracking-widest" style={{ backgroundColor: colors.inputBg, borderColor: businessType === 'salon' ? '#7b438e20' : '#ffffff0d', color: colors.text }} value={password} onChange={(e) => setPassword(e.target.value)} required />
                        </div>
                    </div>

                    <button type="submit" disabled={loading} className="w-full font-black py-5 rounded-2xl text-[14px] shadow-2xl transition-all mt-4 active:scale-95 uppercase italic tracking-tight disabled:opacity-50" style={{ backgroundColor: colors.primary, color: colors.buttonText, boxShadow: `0 20px 60px ${colors.primary}20` }}>
                        {loading ? 'PROCESSANDO...' : 'CONFIRMAR ACESSO'}
                    </button>
                </form>

                <div className="mt-10 text-center border-t pt-6" style={{ borderColor: businessType === 'salon' ? '#7b438e20' : '#ffffff0d' }}>
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-60 italic" style={{ color: colors.textMuted }}>© 2024 {terms.footer}</p>
                </div>
            </div>
        </div>
    );
};

export default LoginComponent;
