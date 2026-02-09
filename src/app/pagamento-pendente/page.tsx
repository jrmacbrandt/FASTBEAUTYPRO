"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function PendingPaymentPage() {
    const router = useRouter();
    const [coupon, setCoupon] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [businessType, setBusinessType] = useState<'barber' | 'salon'>('barber');

    useEffect(() => {
        const savedType = localStorage.getItem('elite_business_type') as 'barber' | 'salon';
        if (savedType) {
            setBusinessType(savedType);
            document.body.className = savedType === 'salon' ? 'theme-salon' : '';
        }
    }, []);

    const colors = businessType === 'salon'
        ? { primary: '#7b438e', bg: '#decad4', text: '#1e1e1e', cardBg: '#ffffff', inputBg: '#d3bcc8' }
        : { primary: '#f2b90d', bg: '#000000', text: '#f8fafc', cardBg: '#18181b', inputBg: '#0f0f10' };

    const handleAccess = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Usuário não autenticado.");

            // Get profile to find tenant_id
            const { data: profile, error: pError } = await supabase
                .from('profiles')
                .select('tenant_id')
                .eq('id', user.id)
                .single();

            if (pError || !profile?.tenant_id) throw new Error("Perfil ou estabelecimento não encontrado.");

            // Validate Coupon
            const { data: couponData, error: cError } = await supabase
                .from('coupons')
                .select('*')
                .eq('code', coupon.toUpperCase())
                .eq('active', true)
                .single();

            if (cError || !couponData) {
                setError("Cupom inválido ou expirado.");
                setLoading(false);
                return;
            }

            // Update Tenant as Paid
            const { error: tError } = await supabase
                .from('tenants')
                .update({ has_paid: true, subscription_status: 'active' })
                .eq('id', profile.tenant_id);

            if (tError) throw tError;

            setSuccess(true);
            setTimeout(() => {
                router.push('/admin');
            }, 2000);

        } catch (err: any) {
            setError(err.message || "Erro ao validar cupom.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 font-sans transition-colors duration-500" style={{ backgroundColor: colors.bg }}>
            <div className="w-full max-w-[450px] rounded-[2.5rem] p-8 md:p-12 relative border bg-opacity-95" style={{ backgroundColor: colors.cardBg, borderColor: businessType === 'salon' ? '#7b438e20' : '#ffffff0d' }}>

                <button
                    onClick={() => router.push('/login')}
                    className="absolute left-6 top-6 size-8 flex items-center justify-center rounded-full hover:opacity-80 transition-all group z-10"
                    style={{ backgroundColor: colors.inputBg, color: colors.text }}
                >
                    <span className="material-symbols-outlined text-[18px] group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
                </button>

                <div className="flex flex-col items-center mb-10">
                    <div className="size-16 rounded-2xl bg-[#f2b90d]/10 flex items-center justify-center text-[#f2b90d] mb-6 border border-[#f2b90d]/20" style={businessType === 'salon' ? { backgroundColor: '#7b438e1a', color: '#7b438e', borderColor: '#7b438e20' } : {}}>
                        <span className="material-symbols-outlined text-4xl font-bold">payments</span>
                    </div>

                    <h1 className="text-xl md:text-2xl font-black mb-4 italic tracking-tight uppercase text-center leading-tight" style={{ color: colors.text }}>
                        Faça o pagamento para o acesso completo ao sistema
                    </h1>

                    <div className="flex items-center gap-4 w-full mb-4">
                        <div className="h-px flex-1 bg-white/10"></div>
                        <span className="text-[10px] font-black uppercase opacity-40 italic" style={{ color: colors.text }}>ou</span>
                        <div className="h-px flex-1 bg-white/10"></div>
                    </div>

                    <p className="text-xs font-bold opacity-60 text-center uppercase tracking-widest leading-relaxed mb-8" style={{ color: colors.text }}>
                        Digite seu <span style={{ color: colors.primary }}>CUPOM</span> de acesso.
                    </p>
                </div>

                {success ? (
                    <div className="text-center py-6 animate-in zoom-in duration-500">
                        <div className="size-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20 mb-4">
                            <span className="material-symbols-outlined text-5xl">verified</span>
                        </div>
                        <h2 className="text-xl font-black italic uppercase" style={{ color: colors.text }}>Cupom Validado!</h2>
                        <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest mt-2">Redirecionando para o painel...</p>
                    </div>
                ) : (
                    <form onSubmit={handleAccess} className="space-y-6">
                        {error && (
                            <div className="text-[10px] text-center font-bold p-3 rounded-xl border animate-in shake duration-300" style={{ color: '#ef4444', backgroundColor: '#ef444410', borderColor: '#ef444420' }}>
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="opacity-70 text-[9px] uppercase tracking-[0.2em] ml-2 italic font-black" style={{ color: colors.text }}>CÓDIGO DO CUPOM</label>
                            <input
                                type="text"
                                placeholder="EX: FASTVIP2024"
                                className="w-full border rounded-2xl py-4 px-6 focus:outline-none transition-all font-black text-sm italic tracking-widest uppercase"
                                style={{ backgroundColor: colors.inputBg, borderColor: businessType === 'salon' ? '#7b438e20' : '#ffffff0d', color: colors.text }}
                                value={coupon}
                                onChange={(e) => setCoupon(e.target.value)}
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !coupon}
                            className="w-full font-black py-5 rounded-[1.5rem] text-[12px] shadow-2xl transition-all active:scale-95 uppercase italic tracking-[0.1em] disabled:opacity-50"
                            style={{ backgroundColor: colors.primary, color: businessType === 'salon' ? '#ffffff' : '#000000' }}
                        >
                            {loading ? 'VALIDANDO...' : 'ACESSAR'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
