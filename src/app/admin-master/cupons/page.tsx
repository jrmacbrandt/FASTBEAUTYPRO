"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function GlobalCouponsPage() {
    const [coupons, setCoupons] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCoupons();
    }, []);

    const fetchCoupons = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('coupons')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) {
            setCoupons(data);
        }
        setLoading(false);
    };

    return (
        <div className="space-y-12 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-white text-3xl font-black italic tracking-tight uppercase">Cupons Globais</h3>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest italic mt-1">Gestão de promoções transversais da plataforma</p>
                </div>
                <button className="bg-[#f2b90d] text-black px-10 py-5 rounded-2xl font-black text-xs shadow-xl shadow-[#f2b90d]/20 uppercase italic tracking-tight flex items-center gap-3 active:scale-95 transition-all">
                    <span className="material-symbols-outlined font-black">add_circle</span>
                    NOVO CUPOM GLOBAL
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full text-center py-20 opacity-40">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#f2b90d] mx-auto"></div>
                    </div>
                ) : coupons.length > 0 ? (
                    coupons.map(coupon => (
                        <div key={coupon.id} className="bg-[#121214] border border-white/5 p-8 rounded-[2.5rem] relative group hover:border-[#f2b90d]/30 transition-all overflow-hidden shadow-2xl">
                            <div className="absolute -top-4 -right-4 size-32 bg-[#f2b90d]/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className="flex justify-between items-start mb-6">
                                <div className="size-14 bg-[#f2b90d]/10 rounded-2xl flex items-center justify-center text-[#f2b90d] border border-[#f2b90d]/20">
                                    <span className="material-symbols-outlined text-3xl">confirmation_number</span>
                                </div>
                                <span className="bg-emerald-500/10 text-emerald-500 text-[9px] font-black px-3 py-1 rounded-full border border-emerald-500/20 uppercase">ATIVO</span>
                            </div>
                            <h4 className="text-white text-2xl font-black italic mb-1 tracking-tight">{coupon.code}</h4>
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-6">{coupon.discount_percent}% de Desconto em Toda a Rede</p>
                            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] italic">
                                <div className="text-slate-400">Usos: <span className="text-white">0</span></div>
                                <button className="text-[#f2b90d] hover:underline">Gerenciar Regras</button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full py-20 text-center opacity-30">
                        <span className="material-symbols-outlined text-6xl italic text-slate-500">sell</span>
                        <p className="font-black uppercase text-xs tracking-[0.4em] mt-4 text-slate-500">Nenhum cupom global ativo</p>
                    </div>
                )}
            </div>
        </div>
    );
}
