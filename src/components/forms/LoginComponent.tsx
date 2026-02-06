"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface LoginProps {
    type: 'standard' | 'master';
}

const LoginComponent: React.FC<LoginProps> = ({ type }) => {
    const router = useRouter();
    const [businessType, setBusinessType] = useState<'barber' | 'salon'>('barber');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'admin' | 'pro'>('pro');
    const [view, setView] = useState<'login' | 'register'>('login');

    // Registration states
    const [fullName, setFullName] = useState('');
    const [cpf, setCpf] = useState('');
    const [shopSlug, setShopSlug] = useState('');
    const [shopName, setShopName] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [registerSuccess, setRegisterSuccess] = useState(false);

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
        title: view === 'register'
            ? (activeTab === 'admin' ? 'NOVO PROPRIETÁRIO' : 'CADASTRO PROFISSIONAL')
            : (type === 'master' ? 'ACESSO MASTER' : (activeTab === 'admin' ? 'LOGIN ADMIN' : 'LOGIN PROFISSIONAL')),
        subtitle: view === 'register'
            ? 'Preencha os dados para iniciar na plataforma'
            : (type === 'master' ? 'Portal exclusivo para operadores master' : `Portal de acesso para ${activeTab === 'admin' ? 'Proprietários' : 'Colaboradores'}`),
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
            const { data: profile } = await supabase
                .from('profiles')
                .select('role, status, tenants(has_paid)')
                .eq('id', data.session.user.id)
                .single();

            if (profile?.status === 'pending') {
                setError('Sua conta está aguardando aprovação administrativa.');
                await supabase.auth.signOut();
                setLoading(false);
                return;
            }

            if (profile?.role === 'owner' && (profile as any).tenants?.has_paid === false) {
                // Redirect to a payment/setup page or show a specific modal
                // For now, let's proceed but we'll need a blocker in the admin layout
            }

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

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // 1. Validation for professional
            let tenantId: string | null = null;
            if (activeTab === 'pro') {
                const { data: tenant, error: tError } = await supabase
                    .from('tenants')
                    .select('id')
                    .eq('slug', shopSlug)
                    .single();

                if (tError || !tenant) {
                    setError('A loja informada não foi encontrada. Verifique o link/slug digitado.');
                    setLoading(false);
                    return;
                }
                tenantId = tenant.id;
            }

            // 2. Auth Sign Up
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                    }
                }
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error('Erro ao criar usuário');

            const userId = authData.user.id;

            // 3. Image Upload
            let imageUrl = '';
            if (file) {
                const bucket = activeTab === 'admin' ? 'logos' : 'avatars';
                const fileExt = file.name.split('.').pop();
                const fileName = `${userId}-${Math.random()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from(bucket)
                    .upload(fileName, file);

                if (!uploadError) {
                    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName);
                    imageUrl = publicUrl;
                }
            }

            // 4. Admin Specific: Create Tenant
            if (activeTab === 'admin') {
                const slug = shopName.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
                const { data: newTenant, error: tenantError } = await supabase
                    .from('tenants')
                    .insert({
                        name: shopName,
                        slug: slug,
                        logo_url: imageUrl,
                        has_paid: false,
                        subscription_status: 'trialing'
                    })
                    .select()
                    .single();

                if (tenantError) throw tenantError;
                tenantId = newTenant.id;
            }

            // 5. Create Profile
            const { error: profileError } = await supabase
                .from('profiles')
                .insert({
                    id: userId,
                    tenant_id: tenantId,
                    full_name: fullName,
                    email: email,
                    cpf: cpf,
                    role: activeTab === 'admin' ? 'owner' : 'barber',
                    status: activeTab === 'admin' ? 'active' : 'pending',
                    avatar_url: activeTab === 'pro' ? imageUrl : null
                });

            if (profileError) throw profileError;

            setRegisterSuccess(true);
        } catch (err: any) {
            setError(err.message || 'Ocorreu um erro ao realizar o cadastro.');
            console.error('Registration error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 font-sans transition-colors duration-500" style={{ backgroundColor: colors.bg }}>
            <div className="w-full max-w-[400px] rounded-[2rem] p-6 md:p-8 relative border bg-opacity-95" style={{ backgroundColor: colors.cardBg, borderColor: businessType === 'salon' ? '#7b438e20' : '#ffffff0d' }}>
                <button onClick={() => view === 'register' ? setView('login') : router.push('/sistema')} className="absolute left-6 top-6 size-8 flex items-center justify-center rounded-full hover:opacity-80 transition-all group z-10" style={{ backgroundColor: colors.inputBg, color: colors.text }}>
                    <span className="material-symbols-outlined text-[18px] group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
                </button>

                <div className="flex flex-col items-center mb-6 pt-2">
                    <div className="size-12 rounded-xl border-2 flex items-center justify-center mb-4" style={{ backgroundColor: `${colors.primary}1a`, borderColor: colors.primary, color: colors.primary }}>
                        <span className="material-symbols-outlined text-2xl font-bold">{view === 'register' ? 'person_add' : (type === 'master' ? 'security' : 'person_pin')}</span>
                    </div>
                    <h1 className="text-xl md:text-2xl font-black mb-1 italic tracking-tight uppercase text-center leading-none" style={{ color: colors.text }}>{terms.title}</h1>
                    <p className="opacity-60 text-[10px] text-center" style={{ color: colors.textMuted }}>{terms.subtitle}</p>
                </div>

                {type !== 'master' && !registerSuccess && (
                    <div className="flex p-1 rounded-xl mb-6 border" style={{ backgroundColor: colors.inputBg, borderColor: businessType === 'salon' ? '#7b438e20' : '#ffffff0d' }}>
                        <button onClick={() => setActiveTab('pro')} className={`flex-1 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all italic ${activeTab === 'pro' ? 'shadow-md scale-[1.02]' : 'opacity-40 hover:opacity-100'}`} style={activeTab === 'pro' ? { backgroundColor: colors.primary, color: colors.buttonText } : { color: colors.textMuted }}>PROFISSIONAL</button>
                        <button onClick={() => setActiveTab('admin')} className={`flex-1 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all italic ${activeTab === 'admin' ? 'shadow-md scale-[1.02]' : 'opacity-40 hover:opacity-100'}`} style={activeTab === 'admin' ? { backgroundColor: colors.primary, color: colors.buttonText } : { color: colors.textMuted }}>ADMIN</button>
                    </div>
                )}

                {type === 'master' && (
                    <div className="h-[46px] mb-6 invisible select-none pointer-events-none" />
                )}

                {registerSuccess ? (
                    <div className="text-center py-10 space-y-6 animate-in zoom-in duration-500">
                        <div className="size-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                            <span className="material-symbols-outlined text-5xl">check_circle</span>
                        </div>
                        <h2 className="text-xl font-black italic uppercase" style={{ color: colors.text }}>Solicitação Enviada!</h2>
                        <p className="text-xs font-bold opacity-60 leading-relaxed" style={{ color: colors.textMuted }}>
                            {activeTab === 'pro'
                                ? 'Seus dados foram enviados. Aguarde a aprovação do administrador do estabelecimento para acessar o painel.'
                                : 'Sua conta foi criada! Realize o login para acessar o painel e concluir a configuração do seu estabelecimento.'}
                        </p>
                        <button onClick={() => { setView('login'); setRegisterSuccess(false); }} className="w-full font-black py-4 rounded-xl text-xs uppercase italic tracking-widest" style={{ backgroundColor: colors.primary, color: colors.buttonText }}>
                            VOLTAR PARA O LOGIN
                        </button>
                    </div>
                ) : (
                    <form onSubmit={view === 'login' ? handleLogin : handleRegister} className="space-y-4">
                        {error && <div className="text-[10px] text-center font-bold p-2.5 rounded-xl border animate-in shake duration-300" style={{ color: '#ef4444', backgroundColor: '#ef444410', borderColor: '#ef444420' }}>{error}</div>}

                        {view === 'register' && (
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="opacity-70 text-[9px] uppercase tracking-widest ml-1 italic" style={{ color: colors.textMuted }}>NOME COMPLETO</label>
                                    <div className="relative">
                                        <span className="material-symbols-outlined absolute left-4 top-3 text-[18px] opacity-40" style={{ color: colors.textMuted }}>person</span>
                                        <input type="text" placeholder="Seu nome" className="w-full border rounded-xl py-3 pl-12 pr-4 focus:outline-none transition-all font-bold text-xs" style={{ backgroundColor: colors.inputBg, borderColor: businessType === 'salon' ? '#7b438e20' : '#ffffff0d', color: colors.text }} value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                                    </div>
                                </div>

                                {activeTab === 'admin' && (
                                    <div className="space-y-1.5">
                                        <label className="opacity-70 text-[9px] uppercase tracking-widest ml-1 italic" style={{ color: colors.textMuted }}>NOME DO ESTABELECIMENTO</label>
                                        <div className="relative">
                                            <span className="material-symbols-outlined absolute left-4 top-3 text-[18px] opacity-40" style={{ color: colors.textMuted }}>storefront</span>
                                            <input type="text" placeholder="Nome da Loja" className="w-full border rounded-xl py-3 pl-12 pr-4 focus:outline-none transition-all font-bold text-xs" style={{ backgroundColor: colors.inputBg, borderColor: businessType === 'salon' ? '#7b438e20' : '#ffffff0d', color: colors.text }} value={shopName} onChange={(e) => setShopName(e.target.value)} required />
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <label className="opacity-70 text-[9px] uppercase tracking-widest ml-1 italic" style={{ color: colors.textMuted }}>{activeTab === 'admin' ? 'CPF / CNPJ' : 'CPF'}</label>
                                    <div className="relative">
                                        <span className="material-symbols-outlined absolute left-4 top-3 text-[18px] opacity-40" style={{ color: colors.textMuted }}>fingerprint</span>
                                        <input type="text" placeholder="000.000.000-00" className="w-full border rounded-xl py-3 pl-12 pr-4 focus:outline-none transition-all font-bold text-xs" style={{ backgroundColor: colors.inputBg, borderColor: businessType === 'salon' ? '#7b438e20' : '#ffffff0d', color: colors.text }} value={cpf} onChange={(e) => setCpf(e.target.value)} required />
                                    </div>
                                </div>

                                {activeTab === 'pro' && (
                                    <div className="space-y-1.5">
                                        <label className="opacity-70 text-[9px] uppercase tracking-widest ml-1 italic" style={{ color: colors.textMuted }}>SLUG DA LOJA (DESEJADO)</label>
                                        <div className="relative">
                                            <span className="material-symbols-outlined absolute left-4 top-3 text-[18px] opacity-40" style={{ color: colors.textMuted }}>link</span>
                                            <input type="text" placeholder="ex: barbearia-elite" className="w-full border rounded-xl py-3 pl-12 pr-4 focus:outline-none transition-all font-bold text-xs" style={{ backgroundColor: colors.inputBg, borderColor: businessType === 'salon' ? '#7b438e20' : '#ffffff0d', color: colors.text }} value={shopSlug} onChange={(e) => setShopSlug(e.target.value)} required />
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <label className="opacity-70 text-[9px] uppercase tracking-widest ml-1 italic" style={{ color: colors.textMuted }}>{activeTab === 'admin' ? 'LOGO DA LOJA' : 'SUA FOTO'}</label>
                                    <div className="relative">
                                        <input type="file" accept="image/*" className="hidden" id="file-upload" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                                        <label htmlFor="file-upload" className="w-full border-2 border-dashed rounded-xl py-6 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-all gap-2" style={{ borderColor: businessType === 'salon' ? '#7b438e20' : '#ffffff0d', color: colors.textMuted }}>
                                            <span className="material-symbols-outlined text-2xl">{file ? 'check_circle' : 'add_a_photo'}</span>
                                            <span className="text-[10px] font-bold uppercase">{file ? file.name : 'Clique para selecionar'}</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="opacity-70 text-[9px] uppercase tracking-widest ml-1 italic" style={{ color: colors.textMuted }}>{terms.idLabel}</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-4 top-3 text-[18px] opacity-40" style={{ color: colors.textMuted }}>mail</span>
                                <input type="email" placeholder="nome@exemplo.com" className="w-full border rounded-xl py-3 pl-12 pr-4 focus:outline-none transition-all font-bold text-xs" style={{ backgroundColor: colors.inputBg, borderColor: businessType === 'salon' ? '#7b438e20' : '#ffffff0d', color: colors.text }} value={email} onChange={(e) => setEmail(e.target.value)} required />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="opacity-70 text-[9px] uppercase tracking-widest ml-1 italic" style={{ color: colors.textMuted }}>{terms.passLabel}</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-4 top-3 text-[18px] opacity-40" style={{ color: colors.textMuted }}>lock</span>
                                <input type={showPassword ? "text" : "password"} placeholder="........" className="w-full border rounded-xl py-3 pl-12 pr-12 focus:outline-none transition-all font-bold tracking-widest text-xs" style={{ backgroundColor: colors.inputBg, borderColor: businessType === 'salon' ? '#7b438e20' : '#ffffff0d', color: colors.text }} value={password} onChange={(e) => setPassword(e.target.value)} required />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-3 hover:opacity-100 transition-opacity z-30" style={{ color: colors.text }}>
                                    <span className="material-symbols-outlined text-[18px]">{showPassword ? 'visibility' : 'visibility_off'}</span>
                                </button>
                            </div>
                        </div>

                        <button type="submit" disabled={loading} className="w-full font-black py-4 rounded-xl text-[12px] shadow-xl transition-all mt-4 active:scale-95 uppercase italic tracking-tight disabled:opacity-50" style={{ backgroundColor: colors.primary, color: colors.buttonText, boxShadow: `0 10px 30px ${colors.primary}20` }}>
                            {loading ? 'PROCESSANDO...' : (view === 'login' ? 'CONFIRMAR ACESSO' : 'CRIAR MINHA CONTA')}
                        </button>

                        {type !== 'master' && (
                            <button type="button" onClick={() => setView(view === 'login' ? 'register' : 'login')} className="w-full text-center text-[9px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 mt-4 transition-all" style={{ color: colors.text }}>
                                {view === 'login' ? 'Não tem uma conta? Cadastre-se' : 'Já possui cadastro? Faça o Login'}
                            </button>
                        )}
                    </form>
                )}

                <div className="mt-8 text-center border-t pt-4" style={{ borderColor: businessType === 'salon' ? '#7b438e20' : '#ffffff0d' }}>
                    <Link href={type === 'master' ? "/login" : "/login-master"} className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 hover:opacity-100 transition-opacity italic" style={{ color: colors.textMuted }}>
                        {type === 'master' ? "Acessar Painel ADMINISTRATIVO" : "Acessar Painel ADM MASTER"}
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default LoginComponent;
