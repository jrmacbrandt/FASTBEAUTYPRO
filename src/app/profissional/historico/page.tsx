"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

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
            .order('appointment_time', { ascending: false });

        if (!error && data) {
            setHistory(data);
        }
        setLoading(false);
    };

    const filteredHistory = history.filter(item => {
        // Basic simulation for filtered items if joined data isn't perfect
        const customerName = item.customer_name || 'Cliente';
        const matchesName = customerName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDate = dateFilter ? item.appointment_time.startsWith(dateFilter) : true;
        return matchesName && matchesDate;
    });

    const totalValue = filteredHistory.reduce((acc, curr) => acc + (curr.total_price || 0), 0);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#121214] border border-white/5 p-8 rounded-[2rem]">
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1 italic">Total Atendimentos</p>
                    <h4 className="text-4xl text-white font-black italic tracking-tighter">{filteredHistory.length}</h4>
                </div>
                <div className="bg-[#121214] border border-white/5 p-8 rounded-[2rem]">
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1 italic">Valor Total Gerado</p>
                    <h4 className="text-4xl text-[#f2b90d] font-black italic tracking-tighter">R$ {totalValue.toFixed(2)}</h4>
                </div>
            </div>

            <div className="bg-[#121214] border border-white/5 p-6 rounded-[2rem] flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-widest italic">Buscar por Cliente</label>
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-4 top-3 text-slate-500 text-[20px] opacity-40">search</span>
                        <input
                            type="text"
                            placeholder="Ex: Marcus Vinicius"
                            className="w-full bg-black border border-white/10 rounded-xl py-3 pl-12 pr-4 outline-none focus:border-[#f2b90d] font-bold text-sm text-white"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div className="w-full md:w-64 space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-widest italic">Filtrar por Data</label>
                    <input
                        type="date"
                        className="w-full bg-black border border-white/10 rounded-xl py-3 px-4 outline-none focus:border-[#f2b90d] font-bold text-sm text-white [color-scheme:dark]"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                    />
                </div>
                <button
                    onClick={() => { setSearchTerm(''); setDateFilter(''); }}
                    className="h-[46px] px-6 bg-black border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-[#f2b90d] transition-colors text-slate-400"
                >
                    Limpar
                </button>
            </div>

            <div className="space-y-4">
                {loading ? (
                    <div className="text-center py-20 opacity-40">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#f2b90d] mx-auto"></div>
                    </div>
                ) : filteredHistory.length > 0 ? (
                    filteredHistory.map(item => (
                        <div key={item.id} className="bg-[#121214] border border-white/5 p-6 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6 group hover:border-[#f2b90d]/20 transition-all">
                            <div className="flex items-center gap-4">
                                <div className="size-14 bg-[#f2b90d]/10 rounded-2xl flex flex-col items-center justify-center text-[#f2b90d] font-black leading-none">
                                    <span className="text-[10px] uppercase opacity-60 mb-1">{item.appointment_time.split('T')[0].split('-')[2]}/{item.appointment_time.split('T')[0].split('-')[1]}</span>
                                    <span className="text-lg italic">{item.appointment_time.split('T')[1].substring(0, 5)}</span>
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg text-white leading-tight">{item.customer_name}</h4>
                                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{item.services?.name || 'Serviço'}</p>
                                </div>
                            </div>

                            <div className="text-right">
                                <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em] italic mb-1">Valor da Comanda</p>
                                <p className="text-2xl text-white font-black italic tracking-tighter">R$ {(item.total_price || 0).toFixed(2)}</p>
                                <div className="flex justify-end gap-2 mt-2">
                                    <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase tracking-widest rounded-full border border-emerald-500/20">Realizado</span>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-20 opacity-30">
                        <span className="material-symbols-outlined text-6xl italic text-slate-500">manage_search</span>
                        <p className="font-black uppercase text-xs tracking-[0.4em] mt-4 text-slate-500">Nenhum atendimento encontrado</p>
                    </div>
                )}
            </div>
        </div>
    );
}
