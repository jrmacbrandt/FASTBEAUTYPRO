'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/hooks/useProfile';

export default function ScannerPage() {
    const { profile, businessType: hookBusinessType, theme: colors } = useProfile();
    const businessType = hookBusinessType || 'barber';

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
        <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-700 pb-20">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6" style={{ borderColor: colors.border }}>
                <div>
                    <h1 className="text-2xl md:text-3xl font-black italic tracking-tighter uppercase" style={{ color: colors.text }}>
                        Validador <span style={{ color: colors.primary }}>Digital</span>
                    </h1>
                    <p className="text-xs md:text-sm font-medium tracking-wide" style={{ color: colors.textMuted }}>
                        Check-in & Validação de Carteirinha
                    </p>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Search Form */}
                <div className="border p-6 rounded-3xl space-y-6 shadow-xl" style={{ backgroundColor: colors.cardBg, borderColor: colors.border }}>
                    <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: colors.text }}>
                        <span className="material-symbols-outlined" style={{ color: colors.primary }}>qr_code_scanner</span>
                        Entrada Manual
                    </h3>

                    <form onSubmit={handleSearch} className="space-y-4">
                        <div>
                            <label className="text-xs uppercase font-black tracking-widest ml-1" style={{ color: colors.textMuted }}>Telefone do Cliente</label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                                placeholder="(00) 00000-0000"
                                className="w-full border rounded-xl p-4 text-lg font-bold focus:outline-none transition-all"
                                style={{ backgroundColor: `${colors.bg}40`, borderColor: colors.border, color: colors.text }}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading || !phone}
                            className="w-full font-black uppercase py-4 rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50"
                            style={{ backgroundColor: colors.primary, color: businessType === 'salon' ? 'white' : 'black' }}
                        >
                            {loading ? 'Buscando...' : 'VALIDAR ACESSO'}
                        </button>
                    </form>

                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm font-bold flex items-center gap-3 animate-in shake">
                            <span className="material-symbols-outlined">error</span>
                            {error}
                        </div>
                    )}
                </div>

                {/* Result Card */}
                <div className="relative">
                    {!clientData ? (
                        <div className="h-full min-h-[300px] border-2 border-dashed rounded-3xl flex flex-col items-center justify-center p-8 text-center opacity-40 transition-colors"
                            style={{ borderColor: colors.border }}
                        >
                            <span className="material-symbols-outlined text-6xl mb-4" style={{ color: colors.textMuted }}>id_card</span>
                            <p className="font-bold text-sm uppercase tracking-widest" style={{ color: colors.textMuted }}>Aguardando Validação...</p>
                        </div>
                    ) : (
                        <div className="border p-8 rounded-3xl space-y-6 shadow-2xl animate-in zoom-in-95 duration-300 relative overflow-hidden"
                            style={{ backgroundColor: colors.cardBg, borderColor: `${colors.primary}33` }}
                        >
                            <div className="absolute top-0 left-0 w-full h-2" style={{ backgroundColor: colors.primary }}></div>

                            <div className="flex items-start justify-between">
                                <div>
                                    <h2 className="text-2xl font-black italic" style={{ color: colors.text }}>{clientData.name}</h2>
                                    <p className="font-bold text-sm" style={{ color: colors.textMuted }}>{clientData.phone}</p>
                                </div>
                                <div className="bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border border-emerald-500/20">
                                    Cliente Ativo
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-2xl border transition-colors" style={{ backgroundColor: `${colors.bg}40`, borderColor: colors.border }}>
                                    <p className="text-[10px] uppercase font-black tracking-widest mb-1" style={{ color: colors.textMuted }}>Fidelidade</p>
                                    <div className="flex items-end gap-1">
                                        <span className="text-3xl font-black" style={{ color: colors.primary }}>{clientData.client_loyalty?.[0]?.stamps_count || 0}</span>
                                        <span className="text-xs font-bold mb-1" style={{ color: colors.textMuted }}>/ 5 selos</span>
                                    </div>
                                </div>
                                <div className="p-4 rounded-2xl border transition-colors" style={{ backgroundColor: `${colors.bg}40`, borderColor: colors.border }}>
                                    <p className="text-[10px] uppercase font-black tracking-widest mb-1" style={{ color: colors.textMuted }}>Vouchers</p>
                                    <div className="flex items-end gap-1">
                                        <span className="text-3xl font-black" style={{ color: colors.text }}>{clientData.client_loyalty?.[0]?.total_vouchers_earned || 0}</span>
                                        <span className="text-xs font-bold mb-1" style={{ color: colors.textMuted }}>ganhos</span>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t" style={{ borderColor: colors.border }}>
                                <button
                                    onClick={() => {
                                        alert('Check-in registrado! (Simulação)');
                                        setClientData(null);
                                        setPhone('');
                                    }}
                                    className="w-full border font-bold py-3 rounded-xl uppercase text-xs tracking-widest transition-all hover:bg-opacity-10"
                                    style={{ borderColor: colors.border, color: colors.text, backgroundColor: `${colors.primary}1a` }}
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
