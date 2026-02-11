"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams } from 'next/navigation';
import QRCode from "react-qr-code";

export default function CarteirinhaPage() {
    const params = useParams();
    const slug = params.slug as string;
    const [loading, setLoading] = useState(true);
    const [tenant, setTenant] = useState<any>(null);
    const [loyalty, setLoyalty] = useState<any>(null);
    const [subscription, setSubscription] = useState<any>(null);
    const [clientPhone, setClientPhone] = useState(''); // Simulated login for now

    // Theme colors based on business type (defaulting to master logic for now)
    const isSalon = tenant?.business_type === 'salon';
    const colors = isSalon
        ? { primary: '#fb7185', bg: '#fff1f2', text: '#881337', card: '#ffffff' }
        : { primary: '#f59e0b', bg: '#0f172a', text: '#f1f5f9', card: '#1e293b' };

    useEffect(() => {
        if (slug) fetchTenantData();
    }, [slug]);

    const fetchTenantData = async () => {
        const { data, error } = await supabase
            .from('tenants')
            .select('*')
            .eq('slug', slug)
            .single();

        if (data) setTenant(data);
        setLoading(false);
    };

    const fetchClientData = async (phone: string) => {
        if (!tenant) return;
        setLoading(true);

        // Fetch Loyalty
        const { data: loyaltyData } = await supabase
            .from('client_loyalty')
            .select('*')
            .eq('tenant_id', tenant.id)
            .eq('client_phone', phone)
            .maybeSingle(); // Assuming 1 loyalty card per client for MVP

        if (loyaltyData) setLoyalty(loyaltyData);

        // Fetch Subscription
        const { data: subData } = await supabase
            .from('client_subscriptions')
            .select('*')
            .eq('tenant_id', tenant.id)
            .eq('client_phone', phone)
            .eq('client_phone', phone)
            .eq('status', 'active')
            .maybeSingle();

        if (subData) setSubscription(subData);
        setLoading(false);
    };

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        fetchClientData(clientPhone);
    };

    if (loading && !tenant) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
    if (!tenant) return <div className="min-h-screen flex items-center justify-center">Estabelecimento não encontrado.</div>;

    return (
        <div className="min-h-screen p-6 font-sans flex flex-col items-center" style={{ backgroundColor: colors.bg, color: colors.text }}>

            {/* Header */}
            <div className="w-full max-w-md flex flex-col items-center mb-10 mt-8">
                <div className="size-24 rounded-full overflow-hidden border-4 shadow-xl mb-4" style={{ borderColor: colors.primary }}>
                    {tenant.logo_url ? (
                        <img src={tenant.logo_url} alt={tenant.name} className="size-full object-cover" />
                    ) : (
                        <div className="size-full flex items-center justify-center bg-black/20">
                            <span className="material-symbols-outlined text-4xl">storefront</span>
                        </div>
                    )}
                </div>
                <h1 className="text-2xl font-black uppercase tracking-tight italic">{tenant.name}</h1>
                <p className="opacity-60 text-xs font-bold uppercase tracking-widest">Carteira Digital</p>
            </div>

            {/* Content */}
            <div className="w-full max-w-md space-y-8 pb-20">

                {/* Login Simulation (Remove in Prod) */}
                {!loyalty && !subscription && (
                    <form onSubmit={handleLogin} className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-4">
                        <label className="text-xs font-black uppercase opacity-50">Digite seu Celular</label>
                        <input
                            type="tel"
                            value={clientPhone}
                            onChange={e => setClientPhone(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 font-bold focus:outline-none focus:border-primary transition-colors"
                            placeholder="(00) 00000-0000"
                        />
                        <button type="submit" className="w-full py-4 rounded-xl font-black uppercase text-sm shadow-lg hover:scale-[1.02] active:scale-95 transition-all" style={{ backgroundColor: colors.primary, color: isSalon ? 'white' : 'black' }}>
                            Acessar Carteira
                        </button>
                    </form>
                )}

                {/* Apple Wallet Style Card - Loyalty */}
                {loyalty && (
                    <div className="relative w-full aspect-[1.6/1] rounded-[2rem] p-6 shadow-2xl overflow-hidden group transition-all hover:scale-[1.02]"
                        style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.bg})` }}>

                        <div className="absolute top-0 right-0 p-6 opacity-20">
                            <span className="material-symbols-outlined text-9xl">loyalty</span>
                        </div>

                        <div className="relative z-10 h-full flex flex-col justify-between" style={{ color: isSalon ? 'white' : 'black' }}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Fidelidade</p>
                                    <h3 className="text-3xl font-black italic tracking-tighter">5 + 1 Free</h3>
                                </div>
                                <span className="material-symbols-outlined text-3xl">verified</span>
                            </div>

                            <div className="flex gap-2 mt-4">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className={`size-10 rounded-full border-2 flex items-center justify-center ${i < loyalty.stamps_count ? 'bg-black/20 border-black/10' : 'border-black/10 opacity-30'}`}>
                                        {i < loyalty.stamps_count && <span className="material-symbols-outlined">check</span>}
                                    </div>
                                ))}
                                <div className={`size-10 rounded-full border-2 flex items-center justify-center ${loyalty.stamps_count >= 5 ? 'bg-white text-black' : 'border-dashed border-black/20 opacity-50'}`}>
                                    <span className="material-symbols-outlined">redeem</span>
                                </div>
                            </div>

                            <div className="text-right">
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Próximo Selo</p>
                                <p className="font-bold text-sm">Em breve</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* VIP Card */}
                {subscription && (
                    <div className="relative w-full aspect-[1.6/1] rounded-[2rem] p-6 shadow-2xl overflow-hidden group transition-all hover:scale-[1.02] text-white"
                        style={{ background: '#121214', border: `1px solid ${colors.primary}40` }}>

                        <div className="absolute -right-10 -bottom-10 opacity-10">
                            <span className="material-symbols-outlined text-[12rem]" style={{ color: colors.primary }}>diamond</span>
                        </div>

                        <div className="relative z-10 h-full flex flex-col justify-between">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[#f2b90d]">workspace_premium</span>
                                    <span className="text-xs font-black uppercase tracking-[0.2em] text-[#f2b90d]">Membro VIP</span>
                                </div>
                                <div className="px-3 py-1 rounded-full bg-white/10 text-[9px] font-bold uppercase backdrop-blur-md">
                                    Ativo
                                </div>
                            </div>

                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Benefícios Restantes</p>
                                <div className="flex gap-3">
                                    {Object.entries(subscription.benefits).map(([key, val]: any) => (
                                        <div key={key} className="bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                                            <span className="block text-2xl font-black italic">{val}</span>
                                            <span className="text-[9px] font-bold uppercase text-slate-500">{key}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Validade</p>
                                    <p className="font-bold text-sm">{new Date(subscription.expires_at).toLocaleDateString()}</p>
                                </div>
                                <div className="p-2 bg-white rounded-lg flex items-center justify-center">
                                    <QRCode
                                        value={JSON.stringify({
                                            phone: clientPhone,
                                            tenant_id: tenant.id,
                                            type: 'fastbeauty_checkin'
                                        })}
                                        size={48}
                                        style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                        viewBox={`0 0 256 256`}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
