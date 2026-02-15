"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { processImage } from '@/lib/image-processing';
import { maskCPF, maskPhone } from '@/lib/masks';

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
    const [view, setView] = useState<'login' | 'register'>('login');

    // Registration states (Only for Owners now)
    const [fullName, setFullName] = useState('');
    const [cpf, setCpf] = useState('');
    const [storePhone, setStorePhone] = useState(''); // Store WhatsApp
    const [shopName, setShopName] = useState('');
    const [couponCode, setCouponCode] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [registerSuccess, setRegisterSuccess] = useState(false);

    useEffect(() => {
        const savedType = localStorage.getItem('elite_business_type') as 'barber' | 'salon';
        if (savedType) {
            setBusinessType(savedType);
            document.body.className = savedType === 'salon' ? 'theme-salon' : '';
        }
    }, []);

    const colors = businessType === 'salon'
        ? { primary: '#7b438e', bg: '#decad4', text: '#1e1e1e', textMuted: '#444444', cardBg: '#ffffff', inputBg: '#d3bcc8', buttonText: '#ffffff' }
        : { primary: '#f2b90d', bg: '#000000', text: '#f8fafc', textMuted: '#64748b', cardBg: '#18181b', inputBg: '#0f0f10', buttonText: '#000000' };

    const terms = {
        title: view === 'register'
            ? 'NOVO ESTABELECIMENTO'
            : (type === 'master' ? 'ACESSO MASTER' : 'PLATAFORMA INTEGRADA'),
        subtitle: view === 'register'
            ? 'Crie sua conta e gerencie seu negócio'
            : (type === 'master' ? 'Acesso restrito para administração global' : 'Identificação automática de perfil'),
        idLabel: 'E-MAIL',
        passLabel: 'SENHA',
        footer: 'FASTBEAUTY PRO'
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // 1. Authenticate
        const { data, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (authError) {
            console.error('[Login] Auth Error:', authError.message);
            setError('Credenciais inválidas. Verifique e tente novamente.');
            setLoading(false);
            return;
        }

        if (data.session) {
            // 2. Fetch Profile to Determine Role
            const { data: profileOrigin, error: profileError } = await supabase
                .from('profiles')
                .select('role, status, tenant_id')
                .eq('id', data.session.user.id)
                .maybeSingle();

            let profile = profileOrigin;

            // MASTER BYPASS: Check hardcoded email
            const isMasterEmail = data.session.user.email === 'jrmacbrandt@gmail.com';
            if (isMasterEmail) {
                profile = { ...profileOrigin, role: 'master', status: 'active' } as any;
            }

            // 3. MASTER LOGIN GUARD (Strict Mode)
            if (type === 'master') {
                if (profile?.role !== 'master' && !isMasterEmail) {
                    // Fail silently/generically as requested
                    await supabase.auth.signOut();
                    setError('Acesso negado. Perfil não autorizado para este painel.');
                    setLoading(false);
                    return;
                }
            }

            // 4. Role-based Redirection (Smart Router)
            if (!profile?.role) {
                setLoading(false);
                alert("Olá! Parece que você ainda não tem um perfil configurado.");
                return;
            }

            // Master -> Admin Master
            if (profile.role === 'master') {
                router.push('/admin-master');
                return;
            }

            // Owner -> Admin Panel
            if (profile.role === 'owner') {
                if (profile.tenant_id) {
                    const { data: tenantData } = await supabase
                        .from('tenants')
                        .select('has_paid, status')
                        .eq('id', profile.tenant_id)
                        .maybeSingle();

                    // AUDIT CHECK: Requires Active/Trialing status AND Payment confirmed
                    const isActiveStatus = tenantData?.status === 'active' || tenantData?.status === 'trialing';
                    const isPaid = tenantData?.has_paid !== false;

                    if (!isPaid || !isActiveStatus) {
                        console.warn(`[Login] Access Blocked for Owner. Status: ${tenantData?.status}, Paid: ${isPaid}`);
                        router.push('/pagamento-pendente');
                    } else {
                        router.push('/admin');
                    }
                } else {
                    router.push('/admin'); // Fallback
                }
                return;
            }

            // Barber/Professional -> Professional Panel
            if (profile.role === 'barber' || profile.role === 'profissional') {
                router.push('/profissional');
                return;
            }

            // Fallback
            console.error('Role desconhecido:', profile.role);
            router.push('/sistema');
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setLoading(true);
            try {
                const optimizedBlob = await processImage(selectedFile, 150, 150, 0.7);
                const optimizedFile = new File([optimizedBlob], `${selectedFile.name.split('.')[0]}.webp`, { type: 'image/webp' });
                setFile(optimizedFile);
                setUploadStatus('success');
                const objectUrl = URL.createObjectURL(optimizedBlob);
                if (previewUrl) URL.revokeObjectURL(previewUrl);
                setPreviewUrl(objectUrl);
            } catch (err) {
                setUploadStatus('error');
            } finally {
                setLoading(false);
            }
        }
    };

    // Unified Registration (Only for Owners/Estabelecimentos)
    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // 1. Image Upload
            let imageUrl = '';
            if (file) {
                const fileName = `pending-${Math.random()}.webp`;
                const { error: uploadError } = await supabase.storage
                    .from('logos')
                    .upload(fileName, file, { contentType: 'image/webp', upsert: true });

                if (!uploadError) {
                    const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(fileName);
                    imageUrl = publicUrl;
                }
            }

            // 2. Generate slug
            const normalizeSlug = (text: string) => {
                return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-');
            };
            const slug = normalizeSlug(shopName);

            // 3. Auth Sign Up
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { full_name: fullName, role: 'owner' }
                }
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error('Erro ao criar usuário.');

            const userId = authData.user.id;

            // 4. Verify Coupon (Simplified logic for brevity, keeping core logic)
            let appliedPlan = 'trial';
            let appliedStatus = 'pending_approval';
            let trialEndsAt = null;

            if (couponCode) {
                const { data: coupon } = await supabase.from('coupons').select('*').eq('code', couponCode.toUpperCase().trim()).eq('active', true).single();
                if (coupon) {
                    if (coupon.discount_type === 'full_access') { appliedPlan = 'unlimited'; appliedStatus = 'active'; }
                    else if (coupon.discount_type === 'trial_30') {
                        appliedPlan = 'trial'; appliedStatus = 'active';
                        const d = new Date(); d.setDate(d.getDate() + 30); trialEndsAt = d.toISOString();
                    }
                    await supabase.from('coupons').update({ used_count: coupon.used_count + 1 }).eq('id', coupon.id);
                } else {
                    throw new Error('Cupom inválido.');
                }
            }

            // 5. Create Tenant (Owner Logic)
            const { data: newTenant, error: tenantError } = await supabase
                .from('tenants')
                .insert({
                    name: shopName,
                    slug: slug,
                    phone: storePhone.replace(/\D/g, ''),
                    business_type: 'barber',
                    active: true,
                    has_paid: appliedStatus === 'active',
                    logo_url: imageUrl || null,
                    subscription_status: appliedPlan === 'unlimited' ? 'active' : 'trialing',
                    status: appliedStatus,
                    subscription_plan: appliedPlan,
                    trial_ends_at: trialEndsAt,
                    coupon_used: couponCode || null
                })
                .select('id')
                .single();

            if (tenantError) throw new Error('Erro ao criar estabelecimento: ' + tenantError.message);

            // 6. Create Profile
            // Wait for trigger
            await new Promise(resolve => setTimeout(resolve, 500));
            const { data: existingProfile } = await supabase.from('profiles').select('id').eq('id', userId).single();

            if (existingProfile) {
                await supabase.from('profiles').update({
                    tenant_id: newTenant.id,
                    full_name: fullName,
                    cpf: cpf.replace(/\D/g, ''),
                    role: 'owner',
                    status: 'active'
                }).eq('id', userId);
            } else {
                await supabase.from('profiles').insert({
                    id: userId,
                    tenant_id: newTenant.id,
                    full_name: fullName,
                    cpf: cpf.replace(/\D/g, ''),
                    email: email,
                    role: 'owner',
                    status: 'active'
                });
            }

            // 7. Auto Login
            const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
            if (!loginError) router.push('/pagamento-pendente');
            else setRegisterSuccess(true);

        } catch (err: any) {
            setError(err.message || 'Ocorreu um erro ao realizar o cadastro.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 font-sans transition-colors duration-500" style={{ backgroundColor: colors.bg }}>
            <div className="w-full max-w-[400px] rounded-[2rem] p-6 md:p-8 relative border bg-opacity-95" style={{ backgroundColor: colors.cardBg, borderColor: businessType === 'salon' ? '#7b438e20' : '#ffffff0d' }}>
                <button onClick={() => view === 'register' ? setView('login') : router.push('/')} className="absolute left-6 top-6 size-8 flex items-center justify-center rounded-full hover:opacity-80 transition-all group z-10" style={{ backgroundColor: colors.inputBg, color: colors.text }}>
                    <span className="material-symbols-outlined text-[18px] group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
                </button>

                <div className="flex flex-col items-center mb-6 pt-2">
                    <div className="size-12 rounded-xl border-2 flex items-center justify-center mb-4" style={{ backgroundColor: `${colors.primary}1a`, borderColor: colors.primary, color: colors.primary }}>
                        <span className="material-symbols-outlined text-2xl font-bold">{view === 'register' ? 'store' : (type === 'master' ? 'security' : 'lock_person')}</span>
                    </div>
                    <h1 className="text-xl md:text-2xl font-black mb-1 italic tracking-tight uppercase text-center leading-none" style={{ color: colors.text }}>{terms.title}</h1>
                    <p className="opacity-60 text-[10px] text-center" style={{ color: colors.textMuted }}>{terms.subtitle}</p>
                </div>

                {registerSuccess ? (
                    <div className="text-center py-10 space-y-6 animate-in zoom-in duration-500">
                        <div className="size-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                            <span className="material-symbols-outlined text-5xl">check_circle</span>
                        </div>
                        <h2 className="text-xl font-black italic uppercase" style={{ color: colors.text }}>Conta Criada!</h2>
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

                                <div className="space-y-1.5">
                                    <label className="opacity-70 text-[9px] uppercase tracking-widest ml-1 italic" style={{ color: colors.textMuted }}>NOME DO ESTABELECIMENTO</label>
                                    <div className="relative">
                                        <span className="material-symbols-outlined absolute left-4 top-3 text-[18px] opacity-40" style={{ color: colors.textMuted }}>storefront</span>
                                        <input type="text" placeholder="Nome da Loja" className="w-full border rounded-xl py-3 pl-12 pr-4 focus:outline-none transition-all font-bold text-xs" style={{ backgroundColor: colors.inputBg, borderColor: businessType === 'salon' ? '#7b438e20' : '#ffffff0d', color: colors.text }} value={shopName} onChange={(e) => setShopName(e.target.value)} required />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="opacity-70 text-[9px] uppercase tracking-widest ml-1 italic" style={{ color: colors.textMuted }}>WHATSAPP DA LOJA</label>
                                    <div className="relative">
                                        <span className="material-symbols-outlined absolute left-4 top-3 text-[18px] opacity-40" style={{ color: colors.textMuted }}>perm_phone_msg</span>
                                        <input type="tel" placeholder="(00) 00000-0000" className="w-full border rounded-xl py-3 pl-12 pr-4 focus:outline-none transition-all font-bold text-xs" style={{ backgroundColor: colors.inputBg, borderColor: businessType === 'salon' ? '#7b438e20' : '#ffffff0d', color: colors.text }} value={storePhone} onChange={(e) => setStorePhone(maskPhone(e.target.value))} required />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="opacity-70 text-[9px] uppercase tracking-widest ml-1 italic" style={{ color: colors.textMuted }}>CPF / CNPJ</label>
                                    <div className="relative">
                                        <span className="material-symbols-outlined absolute left-4 top-3 text-[18px] opacity-40" style={{ color: colors.textMuted }}>fingerprint</span>
                                        <input type="text" placeholder="000.000.000-00" className="w-full border rounded-xl py-3 pl-12 pr-4 focus:outline-none transition-all font-bold text-xs" style={{ backgroundColor: colors.inputBg, borderColor: businessType === 'salon' ? '#7b438e20' : '#ffffff0d', color: colors.text }} value={cpf} onChange={(e) => setCpf(maskCPF(e.target.value))} maxLength={14} required />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="opacity-70 text-[9px] uppercase tracking-widest ml-1 italic" style={{ color: colors.textMuted }}>LOGO DA LOJA</label>
                                    <div className="relative">
                                        <input type="file" accept="image/*" className="hidden" id="file-upload" onChange={handleFileChange} />
                                        <label htmlFor="file-upload" className="w-full border-2 border-dashed rounded-xl py-6 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-all gap-2 relative overflow-hidden min-h-[100px]" style={{ borderColor: uploadStatus === 'success' ? colors.primary : (businessType === 'salon' ? '#7b438e40' : '#ffffff1a'), color: colors.textMuted }}>
                                            {previewUrl ? <img src={previewUrl} alt="Preview" className="h-full w-full object-contain p-2 absolute" /> : <span className="material-symbols-outlined text-2xl" style={{ color: colors.primary }}>add_a_photo</span>}
                                        </label>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="opacity-70 text-[9px] uppercase tracking-widest ml-1 italic" style={{ color: colors.textMuted }}>CÓDIGO DE CONVITE (OPCIONAL)</label>
                                    <div className="relative">
                                        <span className="material-symbols-outlined absolute left-4 top-3 text-[18px] opacity-40" style={{ color: colors.textMuted }}>confirmation_number</span>
                                        <input type="text" placeholder="Possui um código?" className="w-full border rounded-xl py-3 pl-12 pr-4 focus:outline-none transition-all font-bold text-xs uppercase" style={{ backgroundColor: colors.inputBg, borderColor: businessType === 'salon' ? '#7b438e20' : '#ffffff0d', color: colors.text }} value={couponCode} onChange={(e) => setCouponCode(e.target.value)} />
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
                                {view === 'login' ? 'NÃO TEM UMA CONTA? CADASTRE-SE' : 'JÁ POSSUI CADASTRO? FAÇA O LOGIN'}
                            </button>
                        )}
                    </form>
                )}

                { /* Link adicional oculto para Master no rodapé, apenas para manter a acesso existente caso necessário */}
                {type !== 'master' && (
                    <div className="mt-8 text-center border-t pt-4" style={{ borderColor: businessType === 'salon' ? '#7b438e20' : '#ffffff0d' }}>
                        <Link href="/login-master" className="text-[9px] font-black uppercase tracking-[0.2em] opacity-30 hover:opacity-100 transition-opacity italic" style={{ color: colors.textMuted }}>
                            Acessar Painel Master
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LoginComponent;
