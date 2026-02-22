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
            if (!profile?.tenant_id) throw new Error('Unidade não identificada.');

            const normalizedPhone = phone.replace(/\D/g, '');
            if (!normalizedPhone) throw new Error('Telefone inválido.');

            const { data: client, error: clientError } = await supabase
                .from('clients')
                .select('*')
                .eq('tenant_id', profile.tenant_id)
                .eq('phone', normalizedPhone)
                .single();

            if (clientError) {
                console.error('Database Error:', clientError);
                setError(`Erro na busca: ${clientError.message}`);
                return;
            }

            if (!client) {
                setError('Cliente não encontrado nesta unidade.');
                return;
            }

            // Fetch loyalty separately to avoid join errors
            const { data: loyalty } = await supabase
                .from('client_loyalty')
                .select('*')
                .eq('tenant_id', profile.tenant_id)
                .eq('client_phone', normalizedPhone)
                .single();

            setClientData({ ...client, client_loyalty: loyalty ? [loyalty] : [] });

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
                <div className="border p-4 md:p-6 rounded-3xl space-y-6 shadow-xl" style={{ backgroundColor: colors.cardBg, borderColor: colors.border }}>
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
                        <div className="border p-5 pt-14 md:p-8 md:pt-16 rounded-3xl space-y-6 shadow-2xl animate-in zoom-in-95 duration-300 relative overflow-hidden"
                            style={{ backgroundColor: colors.cardBg, borderColor: `${colors.primary}33` }}
                        >
                            <div className="absolute top-0 left-0 w-full h-2" style={{ backgroundColor: colors.primary }}></div>

                            {/* Botão Fechar */}
                            <button
                                onClick={() => {
                                    setClientData(null);
                                    setPhone('');
                                    setError('');
                                }}
                                className="absolute top-3 right-3 size-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors z-30"
                                style={{ color: colors.textMuted }}
                                title="Fechar"
                            >
                                <span className="material-symbols-outlined text-2xl">close</span>
                            </button>

                            <div className="flex items-start justify-between">
                                <div>
                                    <h2 className="text-2xl font-black italic italic uppercase tracking-tighter" style={{ color: colors.text }}>{clientData.name}</h2>
                                    <p className="font-bold text-sm tracking-widest opacity-60" style={{ color: colors.textMuted }}>{clientData.phone}</p>
                                </div>
                                <div className="bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-500/20 italic">
                                    Identificado
                                </div>
                            </div>

                            {/* Loyalty Card Grid (Scanner Version) */}
                            {(() => {
                                const stampsCount = clientData.client_loyalty?.[0]?.stamps_count || 0;
                                const loyaltyTarget = profile?.tenant?.loyalty_target || 10;
                                const isRewardReady = stampsCount >= loyaltyTarget;

                                return (
                                    <div className="p-6 rounded-3xl border relative overflow-hidden group" style={{ backgroundColor: `${colors.bg}40`, borderColor: colors.border }}>
                                        <div className="absolute -right-4 -bottom-4 opacity-5 rotate-12">
                                            <span className="material-symbols-outlined text-7xl" style={{ color: colors.primary }}>loyalty</span>
                                        </div>

                                        <div className="relative z-10 space-y-4">
                                            <div className="flex justify-between items-center mb-2">
                                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: colors.textMuted }}>Cartão Fidelidade</h4>
                                                <div className="bg-black/40 px-3 py-1 rounded-full border border-white/5 text-[10px] font-bold">
                                                    {stampsCount} / {loyaltyTarget}
                                                </div>
                                            </div>

                                            <div className="flex gap-2 flex-wrap">
                                                {[...Array(loyaltyTarget)].map((_, i) => (
                                                    <div
                                                        key={i}
                                                        className={`size-10 rounded-xl border-2 flex items-center justify-center transition-all duration-500 ${i < stampsCount
                                                                ? 'border-white/5'
                                                                : 'border-white/5 bg-white/5 opacity-20'
                                                            }`}
                                                        style={i < stampsCount ? {
                                                            backgroundColor: `${colors.primary}30`,
                                                            borderColor: `${colors.primary}60`,
                                                            boxShadow: `0 0 10px ${colors.primary}20`
                                                        } : {}}
                                                    >
                                                        {i < stampsCount ? (
                                                            <span className="material-symbols-outlined text-sm font-bold" style={{ color: colors.primary }}>star</span>
                                                        ) : (
                                                            <span className="text-[10px] font-black opacity-30">{i + 1}</span>
                                                        )}
                                                    </div>
                                                ))}
                                                {/* Final Reward Slot */}
                                                <div className={`size-10 rounded-xl border-2 border-dashed flex items-center justify-center transition-all ${isRewardReady
                                                        ? 'scale-110 animate-pulse'
                                                        : 'border-white/20 bg-white/5 opacity-50'
                                                    }`}
                                                    style={isRewardReady ? {
                                                        backgroundColor: colors.primary,
                                                        borderColor: colors.primary,
                                                        color: businessType === 'salon' ? 'white' : 'black'
                                                    } : {}}
                                                >
                                                    <span className="material-symbols-outlined text-lg">{isRewardReady ? 'workspace_premium' : 'redeem'}</span>
                                                </div>
                                            </div>

                                            <p className="text-[10px] font-bold uppercase tracking-widest leading-relaxed italic" style={{ color: isRewardReady ? colors.primary : colors.textMuted }}>
                                                {isRewardReady
                                                    ? '🔥 PRÊMIO LIBERADO! VALIDAR AGORA.'
                                                    : `Faltam ${Math.max(0, loyaltyTarget - stampsCount)} selos para a próxima cortesia.`}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })()}

                            <div className="pt-4 border-t" style={{ borderColor: colors.border }}>
                                <button
                                    onClick={() => {
                                        setClientData(null);
                                        setPhone('');
                                        setError('');
                                    }}
                                    className="w-full font-black py-4 rounded-xl uppercase text-xs tracking-widest transition-all active:scale-95 shadow-xl"
                                    style={{ backgroundColor: colors.primary, color: businessType === 'salon' ? 'white' : 'black' }}
                                >
                                    CONFIRMAR PRESENÇA
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
