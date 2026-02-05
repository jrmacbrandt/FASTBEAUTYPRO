"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export default function ShopLandingPage() {
    const params = useParams();
    const router = useRouter();
    const slug = params.slug as string;
    const [tenant, setTenant] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadTenant() {
            const { data, error } = await supabase
                .from('tenants')
                .select('*')
                .eq('slug', slug)
                .single();

            if (data) {
                setTenant(data);
            }
            setLoading(false);
        }
        loadTenant();
    }, [slug]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
            </div>
        );
    }

    if (!tenant) {
        return (
            <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center p-6 text-center">
                <h1 className="text-4xl font-black italic text-white mb-4">404 - ESTABELECIMENTO NÃO ENCONTRADO</h1>
                <p className="text-white/60 mb-8">O endereço que você tentou acessar não existe ou foi removido.</p>
                <button
                    onClick={() => router.push('/')}
                    className="bg-yellow-500 text-black px-8 py-3 rounded-full font-black uppercase italic"
                >
                    Voltar para o Início
                </button>
            </div>
        );
    }

    const primaryColor = tenant.config?.theme?.primary || '#f2b90d';

    return (
        <div className="min-h-screen bg-[#09090b] text-white">
            {/* Hero Section */}
            <section className="relative h-[60vh] flex items-center justify-center overflow-hidden">
                <div
                    className="absolute inset-0 opacity-30 grayscale"
                    style={{
                        backgroundImage: `url('https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80')`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-transparent to-transparent" />

                <div className="relative z-10 text-center space-y-4 px-4">
                    <h1 className="text-6xl md:text-8xl font-black italic uppercase tracking-tighter">
                        {tenant.name}
                    </h1>
                    <p className="text-xl md:text-2xl text-white/80 font-medium italic">
                        Experiência Premium em Estética e Bem-estar
                    </p>
                    <div className="pt-8">
                        <button
                            onClick={() => router.push(`/${slug}/agendamento`)}
                            className="px-12 py-6 rounded-full font-black text-xl uppercase italic transition-all hover:scale-105 shadow-2xl"
                            style={{ backgroundColor: primaryColor, color: '#000', boxShadow: `0 20px 40px ${primaryColor}40` }}
                        >
                            Agendar Agora
                        </button>
                    </div>
                </div>
            </section>

            {/* Info Sections */}
            <section className="max-w-4xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-12">
                <div className="bg-white/5 backdrop-blur-md p-8 rounded-[2.5rem] border border-white/5 space-y-4">
                    <h3 className="text-2xl font-black italic uppercase" style={{ color: primaryColor }}>Localização</h3>
                    <p className="text-lg opacity-80">{tenant.address || 'Endereço não informado'}</p>
                    <div className="pt-4 flex items-center gap-2">
                        <span className="material-symbols-outlined" style={{ color: primaryColor }}>near_me</span>
                        <span className="font-bold">Ver no Maps</span>
                    </div>
                </div>

                <div className="bg-white/5 backdrop-blur-md p-8 rounded-[2.5rem] border border-white/5 space-y-4">
                    <h3 className="text-2xl font-black italic uppercase" style={{ color: primaryColor }}>Horários</h3>
                    <div className="space-y-1 text-sm opacity-80">
                        <p className="flex justify-between"><span>Segunda - Sexta</span><span>09:00 - 19:00</span></p>
                        <p className="flex justify-between"><span>Sábado</span><span>09:00 - 18:00</span></p>
                        <p className="flex justify-between text-red-400"><span>Domingo</span><span>Fechado</span></p>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-20 text-center opacity-30 border-t border-white/5">
                <h2 className="text-2xl font-black italic tracking-tighter mb-4">
                    FASTBEAUTY <span style={{ color: primaryColor }}>PRO</span>
                </h2>
                <p className="text-[10px] uppercase font-black tracking-[0.5em]">PLATAFORMA CERTIFICADA</p>
            </footer>
        </div>
    );
}
