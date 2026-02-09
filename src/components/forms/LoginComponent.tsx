"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { processImage } from '@/lib/image-processing';

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
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [registerSuccess, setRegisterSuccess] = useState(false);

    // Professional tenant search states
    const [tenantSearchQuery, setTenantSearchQuery] = useState('');
    const [tenantSuggestions, setTenantSuggestions] = useState<Array<{ id: string, name: string, slug: string }>>([]);
    const [selectedTenant, setSelectedTenant] = useState<{ id: string, name: string, slug: string } | null>(null);
    const [searchingTenant, setSearchingTenant] = useState(false);

    useEffect(() => {
        const savedType = localStorage.getItem('elite_business_type') as 'barber' | 'salon';
        if (savedType) {
            setBusinessType(savedType);
            document.body.className = savedType === 'salon' ? 'theme-salon' : '';
        }
    }, []);

    // Debounced tenant search for professionals
    useEffect(() => {
        console.log('[TenantSearch] Query:', tenantSearchQuery, 'ActiveTab:', activeTab, 'View:', view);

        if (activeTab !== 'pro' || view !== 'register' || tenantSearchQuery.length < 2 || selectedTenant) {
            setTenantSuggestions([]);
            return;
        }

        const timer = setTimeout(async () => {
            setSearchingTenant(true);
            console.log('[TenantSearch] Searching for:', tenantSearchQuery);
            try {
                const { data, error } = await supabase
                    .from('tenants')
                    .select('id, name, slug')
                    .ilike('name', `%${tenantSearchQuery}%`)
                    .limit(5);

                console.log('[TenantSearch] Result:', { data, error });

                if (error) {
                    console.error('[TenantSearch] Error:', error);
                } else if (data) {
                    setTenantSuggestions(data);
                }
            } catch (e) {
                console.error('[TenantSearch] Exception:', e);
            } finally {
                setSearchingTenant(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [tenantSearchQuery, activeTab, view, selectedTenant]);

    const handleSelectTenant = (tenant: { id: string, name: string, slug: string }) => {
        setSelectedTenant(tenant);
        setTenantSearchQuery(tenant.name);
        setShopSlug(tenant.slug);
        setTenantSuggestions([]);
    };

    const colors = businessType === 'salon'
        ? { primary: '#7b438e', bg: '#decad4', text: '#1e1e1e', textMuted: '#444444', cardBg: '#ffffff', inputBg: '#d3bcc8', buttonText: '#ffffff' }
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

        console.log('[Login] Attempting for:', email, 'Type:', type);

        if (authError) {
            console.error('[Login] Auth Error:', authError.message);
            setError(authError.message);
            setLoading(false);
            return;
        }

        console.log('[Login] Session obtained:', !!data.session);

        if (data.session) {
            console.log('[Login] Fetching profile for ID:', data.session.user.id);
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('role, status, tenants(has_paid)')
                .eq('id', data.session.user.id)
                .single();

            console.log('[Login] Profile response:', { profile, error: profileError });



            if (profile?.role === 'owner' && (profile as any).tenants?.has_paid === false) {
                // Redirect to a payment/setup page or show a specific modal
                // For now, let's proceed but we'll need a blocker in the admin layout
            }

            if (profile?.role === 'master') {
                console.log('[Login] Redirecting Master to /admin-master');
                router.push('/admin-master');
            } else if (profile?.role === 'owner') {
                if ((profile as any).tenants?.has_paid === false) {
                    console.log('[Login] Redirecting Owner to payment page');
                    router.push('/pagamento-pendente');
                } else {
                    console.log('[Login] Redirecting Owner to /admin');
                    router.push('/admin');
                }
            } else if (profile?.role === 'barber') {
                if (profile?.status === 'pending') {
                    console.log('[Login] Redirecting Barber to awaiting approval');
                    router.push('/aguardando-aprovacao');
                } else {
                    console.log('[Login] Redirecting Barber to /profissional');
                    router.push('/profissional');
                }
            } else {
                console.log('[Login] Redirecting to system gateway');
                router.push('/sistema');
            }
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setLoading(true);
            try {
                // Process image immediately for preview and storage
                const optimizedBlob = await processImage(selectedFile, 150, 150, 0.7);
                const optimizedFile = new File([optimizedBlob], `${selectedFile.name.split('.')[0]}.webp`, { type: 'image/webp' });

                setFile(optimizedFile);
                setUploadStatus('success');

                const objectUrl = URL.createObjectURL(optimizedBlob);
                if (previewUrl) URL.revokeObjectURL(previewUrl); // Clean up previous preview URL
                setPreviewUrl(objectUrl);

            } catch (err) {
                console.error('Image processing error:', err);
                setUploadStatus('error');
            } finally {
                setLoading(false);
            }
        } else {
            setUploadStatus('idle');
            if (previewUrl) URL.revokeObjectURL(previewUrl); // Clean up if no file selected
            setPreviewUrl(null);
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
                if (!selectedTenant) {
                    setError('Selecione uma loja da lista de sugestões.');
                    setLoading(false);
                    return;
                }
                tenantId = selectedTenant.id;
            }

            // 2. Image Upload
            let imageUrl = '';
            if (file) {
                const bucket = activeTab === 'admin' ? 'logos' : 'avatars';
                const fileName = `pending-${Math.random()}.webp`;
                const { error: uploadError } = await supabase.storage
                    .from(bucket)
                    .upload(fileName, file, {
                        contentType: 'image/webp',
                        upsert: true
                    });

                if (!uploadError) {
                    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName);
                    imageUrl = publicUrl;
                }
            }

            // 3. Generate slug for new tenant (admin only)
            const baseSlug = shopName.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
            const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;

            // 4. Auth Sign Up (trigger not working, we'll create profile manually)
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                        role: activeTab === 'admin' ? 'owner' : 'barber',
                    }
                }
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error('Erro ao criar usuário.');

            const userId = authData.user.id;

            // 5. Create Tenant (for admin/owner only)
            if (activeTab === 'admin') {
                // First check if we already have a tenant created by trigger
                const { data: existingTenant } = await supabase
                    .from('tenants')
                    .select('id')
                    .eq('slug', slug)
                    .single();

                if (existingTenant) {
                    tenantId = existingTenant.id;
                } else {
                    const { data: newTenant, error: tenantError } = await supabase
                        .from('tenants')
                        .insert({
                            name: shopName,
                            slug: slug,
                            business_type: 'barber',
                            active: true,
                            has_paid: false,
                            logo_url: imageUrl || null,
                            subscription_status: 'trialing'
                        })
                        .select('id')
                        .single();

                    if (tenantError) {
                        console.error('Tenant creation error:', tenantError);
                        throw new Error('Erro ao criar estabelecimento: ' + tenantError.message);
                    }
                    tenantId = newTenant.id;
                }
            }

            // 6. Create or Update Profile (using upsert to handle trigger conflict)
            // Wait a moment for trigger to potentially complete
            await new Promise(resolve => setTimeout(resolve, 500));

            // Check if profile already exists (created by trigger)
            const { data: existingProfile } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', userId)
                .single();

            if (existingProfile) {
                // Profile exists, update it with our data
                const { error: updateError } = await supabase
                    .from('profiles')
                    .update({
                        tenant_id: tenantId,
                        full_name: fullName,
                        cpf: cpf,
                        role: activeTab === 'admin' ? 'owner' : 'barber',
                        status: activeTab === 'admin' ? 'active' : 'pending',
                        avatar_url: activeTab === 'pro' ? imageUrl : null
                    })
                    .eq('id', userId);

                if (updateError) {
                    console.error('Profile update error:', updateError);
                    throw new Error('Erro ao atualizar perfil: ' + updateError.message);
                }
            } else {
                // Profile doesn't exist, create it
                const { error: profileError } = await supabase
                    .from('profiles')
                    .insert({
                        id: userId,
                        tenant_id: tenantId,
                        full_name: fullName,
                        cpf: cpf,
                        email: email,
                        role: activeTab === 'admin' ? 'owner' : 'barber',
                        status: activeTab === 'admin' ? 'active' : 'pending',
                        avatar_url: activeTab === 'pro' ? imageUrl : null
                    });

                if (profileError) {
                    console.error('Profile creation error:', profileError);
                    throw new Error('Erro ao criar perfil: ' + profileError.message);
                }
            }

            // 7. Success flow
            if (activeTab === 'admin') {
                // Auto-login and redirect owner to payment page
                const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
                if (!loginError) {
                    router.push('/pagamento-pendente');
                } else {
                    setRegisterSuccess(true);
                }
            } else {
                setRegisterSuccess(true);
            }
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
                                ? 'Usuário aguardando aprovação do Administrador da loja.'
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
                                {/* Professional: Establishment search FIRST */}
                                {activeTab === 'pro' && (
                                    <>
                                        <div className="space-y-1.5">
                                            <label className="opacity-70 text-[9px] uppercase tracking-widest ml-1 italic" style={{ color: colors.textMuted }}>NOME DO ESTABELECIMENTO</label>
                                            <div className="relative">
                                                <span className="material-symbols-outlined absolute left-4 top-3 text-[18px] opacity-40" style={{ color: colors.textMuted }}>store</span>
                                                <input
                                                    type="text"
                                                    placeholder="Digite o nome da loja..."
                                                    className="w-full border rounded-xl py-3 pl-12 pr-10 focus:outline-none transition-all font-bold text-xs"
                                                    style={{ backgroundColor: colors.inputBg, borderColor: selectedTenant ? colors.primary : (businessType === 'salon' ? '#7b438e20' : '#ffffff0d'), color: colors.text }}
                                                    value={tenantSearchQuery}
                                                    onChange={(e) => {
                                                        setTenantSearchQuery(e.target.value);
                                                        if (selectedTenant && e.target.value !== selectedTenant.name) {
                                                            setSelectedTenant(null);
                                                            setShopSlug('');
                                                        }
                                                    }}
                                                    required
                                                />
                                                {searchingTenant && (
                                                    <span className="material-symbols-outlined absolute right-4 top-3 text-[18px] animate-spin" style={{ color: colors.primary }}>progress_activity</span>
                                                )}
                                                {selectedTenant && (
                                                    <span className="material-symbols-outlined absolute right-4 top-3 text-[18px] text-emerald-500">check_circle</span>
                                                )}
                                            </div>
                                            {tenantSuggestions.length > 0 && (
                                                <div className="absolute z-50 w-[calc(100%-3rem)] ml-6 mt-1 rounded-xl border overflow-hidden shadow-xl" style={{ backgroundColor: colors.cardBg, borderColor: businessType === 'salon' ? '#7b438e40' : '#ffffff1a' }}>
                                                    {tenantSuggestions.map((t) => (
                                                        <button
                                                            key={t.id}
                                                            type="button"
                                                            onClick={() => handleSelectTenant(t)}
                                                            className="w-full px-4 py-3 text-left hover:bg-white/10 transition-colors flex items-center gap-3 border-b last:border-b-0"
                                                            style={{ borderColor: businessType === 'salon' ? '#7b438e20' : '#ffffff0d' }}
                                                        >
                                                            <span className="material-symbols-outlined text-sm" style={{ color: colors.primary }}>storefront</span>
                                                            <div>
                                                                <div className="text-xs font-bold" style={{ color: colors.text }}>{t.name}</div>
                                                                <div className="text-[10px] opacity-50" style={{ color: colors.textMuted }}>{t.slug}</div>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="opacity-70 text-[9px] uppercase tracking-widest ml-1 italic" style={{ color: colors.textMuted }}>SLUG DA LOJA</label>
                                            <div className="relative">
                                                <span className="material-symbols-outlined absolute left-4 top-3 text-[18px] opacity-40" style={{ color: colors.textMuted }}>link</span>
                                                <input
                                                    type="text"
                                                    placeholder="Será preenchido automaticamente"
                                                    className="w-full border rounded-xl py-3 pl-12 pr-4 focus:outline-none transition-all font-bold text-xs cursor-not-allowed"
                                                    style={{ backgroundColor: colors.inputBg, borderColor: businessType === 'salon' ? '#7b438e20' : '#ffffff0d', color: colors.text, opacity: 0.7 }}
                                                    value={shopSlug}
                                                    readOnly
                                                    disabled
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}

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

                                <div className="space-y-1.5">
                                    <label className="opacity-70 text-[9px] uppercase tracking-widest ml-1 italic" style={{ color: colors.textMuted }}>{activeTab === 'admin' ? 'LOGO DA LOJA' : 'SUA FOTO DE PERFIL'}</label>
                                    <div className="relative">
                                        <input type="file" accept="image/*" className="hidden" id="file-upload" onChange={handleFileChange} />
                                        <label htmlFor="file-upload" className="w-full border-2 border-dashed rounded-xl py-6 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-all gap-2 relative overflow-hidden min-h-[140px]" style={{ borderColor: uploadStatus === 'success' ? colors.primary : (uploadStatus === 'error' ? '#ef4444' : (businessType === 'salon' ? '#7b438e40' : '#ffffff1a')), color: colors.textMuted }}>
                                            {previewUrl ? (
                                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 transition-all group">
                                                    <img src={previewUrl} alt="Preview" className="h-full w-full object-contain p-4" />
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 gap-1">
                                                        <span className="material-symbols-outlined text-white">sync</span>
                                                        <span className="text-[10px] font-black text-white uppercase italic">Trocar Imagem</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <span className="material-symbols-outlined text-2xl" style={{ color: colors.primary }}>add_a_photo</span>
                                                    <span className="text-[10px] font-black uppercase italic">Clique aqui para fazer o upload</span>
                                                </>
                                            )}
                                        </label>
                                        {uploadStatus === 'success' && (
                                            <div className="flex items-center gap-1.5 mt-2 ml-1 text-emerald-500 animate-in fade-in slide-in-from-top-1">
                                                <span className="material-symbols-outlined text-sm font-bold">check_circle</span>
                                                <span className="text-[9px] font-black uppercase italic">Carregado com sucesso!</span>
                                            </div>
                                        )}
                                        {uploadStatus === 'error' && (
                                            <div className="flex items-center gap-1.5 mt-2 ml-1 text-red-500 animate-in fade-in slide-in-from-top-1">
                                                <span className="material-symbols-outlined text-sm font-bold">error</span>
                                                <span className="text-[9px] font-black uppercase italic">Imagem com erro. Tente novamente.</span>
                                            </div>
                                        )}
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
