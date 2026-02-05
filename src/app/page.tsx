"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export default function GlobalLandingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [recentTenants, setRecentTenants] = useState<any[]>([]);

  useEffect(() => {
    async function loadRecent() {
      const { data } = await supabase
        .from('tenants')
        .select('name, slug')
        .limit(5);

      if (data) setRecentTenants(data);
      setLoading(false);
    }
    loadRecent();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-white font-display">
      {/* Platform Hero */}
      <section className="relative h-screen flex flex-col items-center justify-center p-6 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-yellow-500/10 via-transparent to-transparent opacity-50" />

        <div className="relative z-10 text-center space-y-8 max-w-4xl">
          <h1 className="text-7xl md:text-9xl font-black italic uppercase tracking-tighter leading-none">
            FASTBEAUTY <span className="text-yellow-500">PRO</span>
          </h1>
          <p className="text-xl md:text-3xl text-white/60 font-medium italic max-w-2xl mx-auto">
            A plataforma definitiva para gestão de barbearias e salões de alta performance.
          </p>

          <div className="flex flex-wrap justify-center gap-4 pt-8">
            <button
              onClick={() => router.push('/login')}
              className="px-10 py-5 bg-white text-black rounded-full font-black uppercase italic transition-all hover:scale-105 active:scale-95"
            >
              Área Administrativa
            </button>
            <button
              onClick={() => {
                // For demo/dev convenience, go to the first tenant if exists
                if (recentTenants.length > 0) router.push(`/${recentTenants[0].slug}`);
              }}
              className="px-10 py-5 bg-yellow-500 text-black rounded-full font-black uppercase italic transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(234,179,8,0.3)]"
            >
              Ver Demonstração
            </button>
          </div>
        </div>

        {/* Floating Elements */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center space-y-4 opacity-20 animate-bounce">
          <p className="text-[10px] font-black uppercase tracking-[0.5em]">Explore a Plataforma</p>
          <span className="material-symbols-outlined">expand_more</span>
        </div>
      </section>

      {/* Featured Shops / Recent (Internal Showcase) */}
      {recentTenants.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 py-32 space-y-12">
          <div className="space-y-2">
            <h2 className="text-4xl font-black italic uppercase tracking-tighter">Unidades <span className="text-yellow-500">FastBeauty</span></h2>
            <p className="text-white/40 font-bold uppercase tracking-widest text-xs">Estabelecimentos que utilizam nossa tecnologia</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {recentTenants.map(t => (
              <button
                key={t.slug}
                onClick={() => router.push(`/${t.slug}`)}
                className="group p-8 bg-white/5 border border-white/5 rounded-[2.5rem] text-left transition-all hover:bg-white/10 hover:border-white/20"
              >
                <div className="size-16 rounded-2xl bg-yellow-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-yellow-500 text-3xl">storefront</span>
                </div>
                <h3 className="text-2xl font-black italic uppercase mb-2">{t.name}</h3>
                <p className="text-sm text-white/40 font-bold uppercase tracking-widest">Unidade Oficial</p>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Corporate Footer */}
      <footer className="p-12 text-center border-t border-white/5 bg-black">
        <p className="text-[10px] font-black uppercase tracking-[1em] opacity-20">
          FastBeauty Pro &copy; 2026 - Todos os direitos reservados
        </p>
      </footer>
    </div>
  );
}
