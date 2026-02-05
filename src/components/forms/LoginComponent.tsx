"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface LoginProps {
    type: 'standard' | 'master';
}

const LoginComponent: React.FC<LoginProps> = ({ type }) => {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'admin' | 'pro'>('pro');

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
            // Middleware will handle redirection based on roles
            router.push('/sistema');
        }
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4 font-sans transition-colors duration-500">
            <div className="w-full max-w-[440px] bg-[#121214] rounded-[2.5rem] p-8 md:p-10 relative border border-white/5 overflow-hidden">
                <button onClick={() => router.push('/sistema')} className="absolute left-8 top-8 size-10 flex items-center justify-center rounded-full bg-black text-white hover:opacity-80 transition-all group z-10">
                    <span className="material-symbols-outlined text-[20px] group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
                </button>

                <div className="flex flex-col items-center mb-8 pt-4">
                    <div className="size-14 bg-[#f2b90d]/10 rounded-2xl border-2 border-[#f2b90d] flex items-center justify-center text-[#f2b90d] mb-6">
                        <span className="material-symbols-outlined text-3xl font-bold">{type === 'master' ? 'security' : 'person_pin'}</span>
                    </div>
                    <h1 className="text-white text-2xl md:text-3xl font-black mb-1 italic tracking-tight uppercase text-center leading-none">{terms.title}</h1>
                    <p className="text-slate-400 opacity-70 text-xs text-center">{terms.subtitle}</p>
                </div>

                {type !== 'master' && (
                    <div className="flex p-1.5 rounded-2xl mb-8 bg-black/50 border border-white/5">
                        <button onClick={() => setActiveTab('pro')} className={`flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all italic ${activeTab === 'pro' ? 'bg-[#f2b90d] text-black shadow-lg' : 'text-slate-400 opacity-50 hover:opacity-100'}`}>PROFISSIONAL</button>
                        <button onClick={() => setActiveTab('admin')} className={`flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all italic ${activeTab === 'admin' ? 'bg-[#f2b90d] text-black shadow-lg' : 'text-slate-400 opacity-50 hover:opacity-100'}`}>ADMINISTRADOR</button>
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-6">
                    {error && <div className="text-red-500 text-xs text-center font-bold bg-red-500/10 p-3 rounded-xl border border-red-500/20">{error}</div>}

                    <div className="space-y-2.5">
                        <label className="text-slate-400 opacity-80 text-[10px] uppercase tracking-widest ml-1 italic">{terms.idLabel}</label>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-5 top-4 text-slate-400 text-[20px] opacity-40">badge</span>
                            <input type="email" placeholder="nome@exemplo.com" className="w-full bg-black border border-white/5 text-white rounded-2xl py-4 pl-14 pr-6 focus:outline-none focus:border-[#f2b90d]/50 transition-all placeholder:text-slate-700 font-bold" value={email} onChange={(e) => setEmail(e.target.value)} required />
                        </div>
                    </div>

                    <div className="space-y-2.5">
                        <label className="text-slate-400 opacity-80 text-[10px] uppercase tracking-widest ml-1 italic">{terms.passLabel}</label>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-5 top-4 text-slate-400 text-[20px] opacity-40">lock</span>
                            <input type="password" placeholder="........" className="w-full bg-black border border-white/5 text-white rounded-2xl py-4 pl-14 pr-6 focus:outline-none focus:border-[#f2b90d]/50 transition-all placeholder:text-slate-700 font-bold tracking-widest" value={password} onChange={(e) => setPassword(e.target.value)} required />
                        </div>
                    </div>

                    <button type="submit" disabled={loading} className="w-full bg-[#f2b90d] hover:bg-[#d9a60c] text-black font-black py-5 rounded-2xl text-[14px] shadow-2xl shadow-[#f2b90d]/20 transition-all mt-4 active:scale-95 uppercase italic tracking-tight disabled:opacity-50">
                        {loading ? 'PROCESSANDO...' : 'CONFIRMAR ACESSO'}
                    </button>
                </form>

                <div className="mt-10 text-center border-t border-white/5 pt-6">
                    <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.3em] opacity-60 italic">© 2024 {terms.footer}</p>
                </div>
            </div>
        </div>
    );
};

export default LoginComponent;
