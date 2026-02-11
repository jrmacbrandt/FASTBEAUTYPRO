
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function ScannerPage() {
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [clientData, setClientData] = useState<any>(null);
    const [error, setError] = useState('');

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!phone) return;

        setLoading(true);
        setError('');
        setClientData(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Não autenticado');

            // 1. Check if Client Exists in this Tenant
            const { data: client, error: clientError } = await supabase
                .from('clients')
                .select('*, client_loyalty(*)')
                .eq('tenant_id', user.user_metadata.tenant_id)
                .eq('phone', phone)
                .single();

            if (clientError || !client) {
                setError('Cliente não encontrado nesta unidade.');
            } else {
                setClientData(client);
            }

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-700">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black italic tracking-tighter text-white uppercase">
                        Validador <span className="text-[#f2b90d]">Digital</span>
                    </h1>
                    <p className="text-xs md:text-sm text-slate-400 font-medium tracking-wide">
                        Check-in & Validação de Carteirinha
                    </p>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Search Form */}
                <div className="bg-[#18181b] border border-white/5 p-6 rounded-3xl space-y-6">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#f2b90d]">qr_code_scanner</span>
                        Entrada Manual
                    </h3>

                    <form onSubmit={handleSearch} className="space-y-4">
                        <div>
                            <label className="text-xs uppercase font-black text-slate-500 tracking-widest ml-1">Telefone do Cliente</label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                                placeholder="(00) 00000-0000"
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-lg font-bold text-white focus:border-[#f2b90d] outline-none transition-all"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading || !phone}
                            className="w-full bg-[#f2b90d] hover:bg-[#d9a50b] text-black font-black uppercase py-4 rounded-xl shadow-lg hover:shadow-[#f2b90d]/20 active:scale-95 disabled:opacity-50 transition-all"
                        >
                            {loading ? 'Buscando...' : 'VALIDAR ACESSO'}
                        </button>
                    </form>

                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-200 text-sm font-bold flex items-center gap-3 animate-in shake">
                            <span className="material-symbols-outlined">error</span>
                            {error}
                        </div>
                    )}
                </div>

                {/* Result Card */}
                <div className="relative">
                    {!clientData ? (
                        <div className="h-full min-h-[300px] border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center p-8 text-center opacity-50">
                            <span className="material-symbols-outlined text-6xl text-slate-600 mb-4">id_card</span>
                            <p className="text-slate-500 font-bold text-sm uppercase tracking-widest">Aguardando Validação...</p>
                        </div>
                    ) : (
                        <div className="bg-[#121214] border border-[#f2b90d]/30 p-8 rounded-3xl space-y-6 shadow-2xl animate-in zoom-in-95 duration-300 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-2 bg-[#f2b90d]"></div>

                            <div className="flex items-start justify-between">
                                <div>
                                    <h2 className="text-2xl font-black italic text-white">{clientData.name}</h2>
                                    <p className="text-slate-400 font-bold text-sm">{clientData.phone}</p>
                                </div>
                                <div className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border border-emerald-500/20">
                                    Cliente Ativo
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                                    <p className="text-[10px] uppercase font-black text-slate-500 tracking-widest mb-1">Fidelidade</p>
                                    <div className="flex items-end gap-1">
                                        <span className="text-3xl font-black text-[#f2b90d]">{clientData.client_loyalty?.[0]?.stamps_count || 0}</span>
                                        <span className="text-xs font-bold text-slate-500 mb-1">/ 5 selos</span>
                                    </div>
                                </div>
                                <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                                    <p className="text-[10px] uppercase font-black text-slate-500 tracking-widest mb-1">Vouchers</p>
                                    <div className="flex items-end gap-1">
                                        <span className="text-3xl font-black text-white">{clientData.client_loyalty?.[0]?.total_vouchers_earned || 0}</span>
                                        <span className="text-xs font-bold text-slate-500 mb-1">ganhos</span>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-white/5">
                                <button
                                    onClick={() => {
                                        alert('Check-in registrado! (Simulação)');
                                        setClientData(null);
                                        setPhone('');
                                    }}
                                    className="w-full border border-white/10 hover:bg-white/5 text-white font-bold py-3 rounded-xl uppercase text-xs tracking-widest transition-all"
                                >
                                    Confirmar Presença
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
