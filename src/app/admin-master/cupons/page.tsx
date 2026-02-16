'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function MasterCuponsPage() {
    const [loading, setLoading] = useState(true);
    const [coupons, setCoupons] = useState<any[]>([]);

    // Form states
    const [code, setCode] = useState('');
    const [discountType, setDiscountType] = useState('full_access');
    const [maxUses, setMaxUses] = useState(999);

    const fetchCoupons = async () => {
        setLoading(true);

        // 1. Tenta via RPC Seguro (Ignora RLS bugado)
        let { data, error } = await supabase.rpc('get_admin_coupons');

        // 2. Fallback para Select padrão se a função ainda não existir
        if (error) {
            console.warn('[AdminMaster] RPC get_admin_coupons falhou, tentando SELECT direto:', error.message);
            const response = await supabase
                .from('coupons')
                .select('*')
                .order('created_at', { ascending: false });
            data = response.data;
            error = response.error;
        }

        if (error) {
            console.error('[AdminMaster] Erro crítico:', error);
            // Não alertamos para não travar a UI, mas logamos
        } else {
            console.log('[AdminMaster] Cupons carregados:', data?.length);
            setCoupons(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchCoupons();
    }, []);

    const handleCreate = async () => {
        if (!code) return;

        const { error } = await supabase.from('coupons').insert({
            code: code.toUpperCase().trim(),
            discount_type: discountType,
            max_uses: maxUses,
            active: true
        });

        if (error) {
            alert('Erro ao criar cupom: ' + error.message);
        } else {
            alert('Cupom criado!');
            setCode('');
            fetchCoupons();
        }
    };

    const toggleStatus = async (id: string, currentStatus: boolean) => {
        await supabase.from('coupons').update({ active: !currentStatus }).eq('id', id);
        fetchCoupons();
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 text-slate-100 animate-in fade-in duration-700">
            <header>
                <h1 className="text-3xl font-black italic tracking-tighter text-white">
                    GESTÃO DE <span className="text-[#f2b90d]">CUPONS</span>
                </h1>
                <p className="text-sm text-slate-400">Crie códigos para liberação automática de acesso no cadastro.</p>
            </header>

            {/* Create Form */}
            <div className="bg-[#18181b] border border-white/5 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500">Código do Cupom</label>
                    <input
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="EX: VIP2024"
                        className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:border-[#f2b90d] outline-none font-black uppercase tracking-wider"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500">Tipo de Benefício</label>
                    <select
                        value={discountType}
                        onChange={(e) => setDiscountType(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:border-[#f2b90d] outline-none text-xs font-bold"
                    >
                        <option value="full_access">Acesso Total (Vitalício)</option>
                        <option value="trial_30">Trial 30 Dias</option>
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500">Limite de Uso</label>
                    <input
                        type="number"
                        value={maxUses}
                        onChange={(e) => setMaxUses(parseInt(e.target.value))}
                        className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:border-[#f2b90d] outline-none font-bold"
                    />
                </div>
                <button
                    onClick={handleCreate}
                    className="bg-[#f2b90d] hover:bg-[#d9a50b] text-black font-black uppercase tracking-widest text-xs py-3.5 rounded-xl transition-all shadow-lg hover:shadow-[#f2b90d]/20 active:scale-95"
                >
                    + CRIAR CUPOM
                </button>
            </div>

            {/* List */}
            <div className="bg-[#18181b] border border-white/5 rounded-2xl overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-white/5 text-[10px] uppercase font-black text-slate-400 tracking-wider">
                        <tr>
                            <th className="p-4">Código</th>
                            <th className="p-4">Benefício</th>
                            <th className="p-4">Usos</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Ação</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs font-medium text-slate-300">
                        {coupons.map(coupon => (
                            <tr key={coupon.id} className="hover:bg-white/5 transition-colors">
                                <td className="p-4 font-black text-white tracking-wider">{coupon.code}</td>
                                <td className="p-4">{coupon.discount_type === 'full_access' ? 'Acesso Vitalício' : 'Trial 30 Dias'}</td>
                                <td className="p-4">{coupon.used_count} / {coupon.max_uses}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wide ${coupon.active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                        {coupon.active ? 'Ativo' : 'Inativo'}
                                    </span>
                                </td>
                                <td className="p-4 text-right">
                                    <button
                                        onClick={() => toggleStatus(coupon.id, coupon.active)}
                                        className="text-[10px] font-bold underline opacity-50 hover:opacity-100 uppercase"
                                    >
                                        {coupon.active ? 'Desativar' : 'Ativar'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {coupons.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-slate-500 italic">Nenhum cupom criado ainda.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
