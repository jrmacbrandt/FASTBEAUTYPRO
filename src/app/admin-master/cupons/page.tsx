"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export default function GlobalCouponsPage() {
    const [coupons, setCoupons] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // New Coupon State
    const [code, setCode] = useState('');
    const [discount, setDiscount] = useState('10');
    const [durationType, setDurationType] = useState<'days' | 'months' | 'indefinite'>('indefinite');
    const [durationValue, setDurationValue] = useState('30');
    const [saving, setSaving] = useState(false);

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

    const handleCreateCoupon = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        const { error } = await supabase
            .from('coupons')
            .insert({
                code: code.toUpperCase(),
                discount_percent: parseFloat(discount),
                duration_type: durationType,
                duration_value: durationType === 'indefinite' ? null : parseInt(durationValue),
                active: true
            });

        if (!error) {
            fetchCoupons();
            setIsModalOpen(false);
            setCode('');
        }
        setSaving(false);
    };

    return (
        <div className="space-y-12 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-white text-3xl font-black italic tracking-tight uppercase">Cupons Globais</h3>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest italic mt-1">Gestão de promoções transversais da plataforma</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-[#f2b90d] text-black px-10 py-5 rounded-2xl font-black text-xs shadow-xl shadow-[#f2b90d]/20 uppercase italic tracking-tight flex items-center gap-3 active:scale-95 transition-all"
                >
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
                            <p className="text-[#f2b90d] text-[10px] font-black uppercase tracking-widest mb-1">{coupon.discount_percent}% de Desconto</p>
                            <p className="text-slate-500 text-[9px] font-bold uppercase mb-6 italic opacity-60">
                                Duração: {coupon.duration_type === 'indefinite' ? 'Indeterminada' : `${coupon.duration_value} ${coupon.duration_type === 'days' ? 'Dias' : 'Meses'}`}
                            </p>
                            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] italic">
                                <div className="text-slate-400">Status: <span className="text-emerald-500">Pronto</span></div>
                                <button className="text-[#f2b90d] hover:underline">Revogar</button>
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

            {/* Modal de Criação */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-[#121214] border border-white/5 w-full max-w-[450px] rounded-[2.5rem] p-10 relative overflow-hidden shadow-2xl">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors"
                        >
                            <span className="material-symbols-outlined italic">close</span>
                        </button>

                        <div className="flex flex-col items-center mb-10">
                            <div className="size-16 rounded-2xl bg-[#f2b90d]/10 flex items-center justify-center text-[#f2b90d] mb-4 border border-[#f2b90d]/20">
                                <span className="material-symbols-outlined text-4xl">local_activity</span>
                            </div>
                            <h3 className="text-white text-xl font-black italic uppercase italic">Gerar Novo Cupom</h3>
                        </div>

                        <form onSubmit={handleCreateCoupon} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-slate-500 text-[10px] font-black uppercase tracking-widest italic ml-2">Código do Cupom</label>
                                <input
                                    type="text"
                                    placeholder="EX: VERÃO2024"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-black italic focus:border-[#f2b90d] transition-all"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-slate-500 text-[10px] font-black uppercase tracking-widest italic ml-2">Desconto (%)</label>
                                    <input
                                        type="number"
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-[#f2b90d] font-black italic focus:border-[#f2b90d] transition-all"
                                        value={discount}
                                        onChange={(e) => setDiscount(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-slate-500 text-[10px] font-black uppercase tracking-widest italic ml-2">Tipo Duração</label>
                                    <select
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-black italic focus:border-[#f2b90d] transition-all"
                                        value={durationType}
                                        onChange={(e) => setDurationType(e.target.value as any)}
                                    >
                                        <option value="days" className="bg-[#121214]">Por Dias</option>
                                        <option value="months" className="bg-[#121214]">Por Meses</option>
                                        <option value="indefinite" className="bg-[#121214]">Indeterminado</option>
                                    </select>
                                </div>
                            </div>

                            {durationType !== 'indefinite' && (
                                <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                                    <label className="text-slate-500 text-[10px] font-black uppercase tracking-widest italic ml-2">Quantidade ({durationType === 'days' ? 'Dias' : 'Meses'})</label>
                                    <input
                                        type="number"
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-black italic focus:border-[#f2b90d] transition-all"
                                        value={durationValue}
                                        onChange={(e) => setDurationValue(e.target.value)}
                                        required
                                    />
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full bg-[#f2b90d] text-black font-black py-5 rounded-2xl uppercase italic tracking-widest text-xs shadow-xl shadow-[#f2b90d]/20 active:scale-95 transition-all mt-4 disabled:opacity-50"
                            >
                                {saving ? 'CRIANDO...' : 'CRIAR CUPOM AGORA'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
