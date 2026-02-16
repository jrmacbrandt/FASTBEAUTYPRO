"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import CustomDatePicker from '@/components/CustomDatePicker';

export const dynamic = 'force-dynamic';

export default function ProfessionalHistoryPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data, error } = await supabase
            .from('appointments')
            .select('*, profiles(full_name), services(name)')
            .eq('barber_id', session.user.id)
            .eq('status', 'completed')
            .order('scheduled_at', { ascending: false });

        if (!error && data) {
            setHistory(data);
        }
        setLoading(false);
    };

    const filteredHistory = history.filter(item => {
        // Basic simulation for filtered items if joined data isn't perfect
        const customerName = item.customer_name || 'Cliente';
        const matchesName = customerName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDate = dateFilter ? item.scheduled_at?.startsWith(dateFilter) : true;
        return matchesName && matchesDate;
    });

    const totalValue = filteredHistory.reduce((acc, curr) => acc + (curr.total_price || 0), 0);

    return (
        <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-10">
            <div className="grid grid-cols-2 md:grid-cols-2 gap-4 md:gap-6">
                <div className="bg-[#121214] border border-white/5 p-6 md:p-8 rounded-2xl md:rounded-[2rem] shadow-xl">
                    <p className="text-slate-500 text-[8px] md:text-[10px] font-black uppercase tracking-[0.1em] md:tracking-[0.2em] mb-1 italic opacity-60">Atendimentos</p>
                    <h4 className="text-2xl md:text-4xl text-white font-black italic tracking-tighter">{filteredHistory.length}</h4>
                </div>
                <div className="bg-[#121214] border border-white/5 p-6 md:p-8 rounded-2xl md:rounded-[2rem] shadow-xl">
                    <p className="text-slate-500 text-[8px] md:text-[10px] font-black uppercase tracking-[0.1em] md:tracking-[0.2em] mb-1 italic opacity-60">Faturamento</p>
                    <h4 className="text-2xl md:text-4xl text-[#f2b90d] font-black italic tracking-tighter truncate">RS {totalValue.toFixed(2)}</h4>
                </div>
            </div>

            <div className="bg-[#121214] border border-white/5 p-4 md:p-6 rounded-2xl md:rounded-[2rem] flex flex-col md:flex-row gap-4 items-end shadow-lg">
                <div className="flex-1 w-full space-y-1.5 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-black uppercase text-slate-500 ml-1 tracking-widest italic opacity-60">Buscar</label>
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-4 top-3 text-slate-500 text-[18px] md:text-[20px] opacity-40">search</span>
                        <input
                            type="text"
                            placeholder="Nome do cliente..."
                            className="w-full bg-black border border-white/10 rounded-xl py-3 pl-12 pr-4 outline-none focus:border-[#f2b90d] font-bold text-sm text-white placeholder:opacity-30"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div className="w-full md:w-64 space-y-1.5 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-black uppercase text-slate-500 ml-1 tracking-widest italic opacity-60">Data</label>
                    <CustomDatePicker
                        value={dateFilter}
                        onChange={val => setDateFilter(val)}
                        className="w-full bg-black border border-white/10 rounded-xl py-3 px-4 text-sm text-white"
                    />
                </div>
                <button
                    onClick={() => { setSearchTerm(''); setDateFilter(''); }}
                    className="w-full md:w-auto h-[46px] px-6 bg-black border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-[#f2b90d] transition-all text-slate-400 active:scale-95"
                >
                    LIMPAR
                </button>
            </div>

            <div className="space-y-3 md:space-y-4">
                {loading ? (
                    <div className="text-center py-20 opacity-40">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#f2b90d] mx-auto"></div>
                    </div>
                ) : filteredHistory.length > 0 ? (
                    filteredHistory.map(item => (
                        <div key={item.id} className="bg-[#121214] border border-white/5 p-4 md:p-6 rounded-2xl md:rounded-[2rem] flex flex-col sm:flex-row items-center justify-between gap-4 md:gap-6 group hover:border-[#f2b90d]/20 transition-all shadow-md">
                            <div className="flex items-center gap-3 md:gap-4 w-full">
                                <div className="size-12 md:size-14 bg-[#f2b90d]/10 rounded-xl md:rounded-2xl flex flex-col items-center justify-center text-[#f2b90d] font-black leading-none shrink-0 border border-[#f2b90d]/10">
                                    <span className="text-[8px] md:text-[9px] uppercase opacity-60 mb-1">
                                        {item.scheduled_at?.split('T')[0]?.split('-')[2]}/{item.scheduled_at?.split('T')[0]?.split('-')[1]}
                                    </span>
                                    <span className="text-base md:text-lg italic">
                                        {item.scheduled_at?.split('T')[1]?.substring(0, 5) || '00:00'}
                                    </span>
                                </div>
                                <div className="min-w-0">
                                    <h4 className="font-bold text-base md:text-lg text-white leading-tight truncate">{item.customer_name}</h4>
                                    <p className="text-slate-500 text-[8px] md:text-[10px] font-black uppercase tracking-widest truncate opacity-60">{item.services?.name || 'Serviço'}</p>
                                </div>
                            </div>

                            <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto border-t sm:border-t-0 border-white/5 pt-3 sm:pt-0">
                                <div className="hidden sm:block">
                                    <p className="text-slate-500 text-[8px] font-black uppercase tracking-widest italic mb-1 opacity-40">Valor</p>
                                </div>
                                <p className="text-xl md:text-2xl text-white font-black italic tracking-tighter">RS {(item.total_price || 0).toFixed(2)}</p>
                                <div className="flex justify-end gap-2 sm:mt-2">
                                    <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-500 text-[7px] md:text-[8px] font-black uppercase tracking-widest rounded-full border border-emerald-500/20">Pago</span>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-20 opacity-30">
                        <span className="material-symbols-outlined text-5xl md:text-6xl italic text-slate-500">manage_search</span>
                        <p className="font-black uppercase text-[10px] md:text-xs tracking-[0.4em] mt-4 text-slate-500">Nenhum registro</p>
                    </div>
                )}
            </div>
        </div>
    );
}
