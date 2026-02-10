'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function MasterAprovacoesPage() {
    const [loading, setLoading] = useState(true);
    const [pendingTenants, setPendingTenants] = useState<any[]>([]);

    const fetchPending = async () => {
        setLoading(true);
        // Fetch tenants with pending_approval status
        // We also need profile info, but tenants <-> profiles is 1:N. 
        // We'll fetch tenants and then maybe get the owner? 
        // Or fetch profiles where role=owner and tenant.status=pending?
        // Let's query tenants directly first.

        const { data, error } = await supabase
            .from('tenants')
            .select(`
                id, name, slug, status, created_at,
                profiles:profiles(full_name, email, phone, cpf)
            `)
            .eq('status', 'pending_approval')
            .order('created_at', { ascending: false });

        if (error) console.error(error);
        else setPendingTenants(data || []);

        setLoading(false);
    };

    useEffect(() => {
        fetchPending();
    }, []);

    const router = useRouter(); // Import useRouter at the top if not present, checking imports below
    const [couponCode, setCouponCode] = useState('');
    const [processing, setProcessing] = useState<string | null>(null);

    const handleApprove = async (tenantId: string) => {
        if (!confirm('CONFIRMAR LIBERAÇÃO TOTAL?\n\nEsta ação concederá:\n- Status: ATIVO\n- Plano: ILIMITADO\n- Validade: INDETERMINADA\n\nDeseja continuar?')) return;

        setProcessing(tenantId);
        try {
            const { error } = await supabase
                .from('tenants')
                .update({
                    status: 'active',
                    subscription_plan: 'unlimited',
                    trial_ends_at: null,
                    active: true
                })
                .eq('id', tenantId);

            if (error) throw error;

            // Success feedback
            alert('ACESSO LIBERADO COM SUCESSO!\n\nO estabelecimento foi ativado e movido para o Painel Master.');

            // Refresh data
            await fetchPending();
            router.refresh(); // Forces server components to re-fetch if needed and updates client cache

            // Dispatch custom event to notify other tabs/components if needed (optional but good for syncing)
            window.dispatchEvent(new Event('tenant-approved'));

        } catch (err: any) {
            alert('ERRO AO LIBERAR: ' + err.message);
        } finally {
            setProcessing(null);
        }
    };

    const handleApproveWithCoupon = async (tenantId: string) => {
        if (!couponCode) return alert('Por favor, digite o código do cupom.');

        setProcessing(tenantId);
        try {
            // 1. Validate Coupon
            const { data: coupon, error: couponError } = await supabase
                .from('coupons')
                .select('*')
                .eq('code', couponCode.toUpperCase().trim())
                .eq('active', true)
                .single();

            if (couponError || !coupon) throw new Error('Cupom inválido ou não encontrado.');
            if (coupon.used_count >= coupon.max_uses) throw new Error('Este cupom atingiu o limite máximo de usos.');

            // 2. Determine Plan Rules
            let appliedPlan = 'trial';
            let trialEndsAt = null;

            if (coupon.discount_type === 'full_access') {
                appliedPlan = 'unlimited';
            } else if (coupon.discount_type === 'trial_30') {
                const d = new Date();
                d.setDate(d.getDate() + 30);
                trialEndsAt = d.toISOString();
            }

            // 3. Update Tenant
            const { error: updateError } = await supabase
                .from('tenants')
                .update({
                    status: 'active',
                    subscription_plan: appliedPlan,
                    trial_ends_at: trialEndsAt,
                    coupon_used: coupon.code,
                    active: true
                })
                .eq('id', tenantId);

            if (updateError) throw new Error('Falha ao atualizar estabelecimento: ' + updateError.message);

            // 4. Update Coupon Usage
            await supabase.from('coupons').update({ used_count: coupon.used_count + 1 }).eq('id', coupon.id);

            alert(`SUCESSO! Cupom ${coupon.code} aplicado.\nEstabelecimento ativado conforme regras.`);
            setCouponCode('');

            await fetchPending();
            router.refresh();
            window.dispatchEvent(new Event('tenant-approved'));

        } catch (err: any) {
            alert('ERRO: ' + err.message);
        } finally {
            setProcessing(null);
        }
    };


    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700 text-slate-100">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-black italic tracking-tighter text-white">
                        APROVAÇÕES <span className="text-[#f2b90d]">PENDENTES</span>
                    </h1>
                    <p className="text-sm text-slate-400">Libere o acesso de novos administradores à plataforma.</p>
                </div>
                <button onClick={fetchPending} className="text-xs uppercase font-bold text-[#f2b90d] hover:text-white transition-colors flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">refresh</span>
                    Atualizar Lista
                </button>
            </header>

            {loading ? (
                <div className="flex justify-center py-20">
                    <span className="material-symbols-outlined text-4xl animate-spin text-[#f2b90d]">progress_activity</span>
                </div>
            ) : pendingTenants.length === 0 ? (
                <div className="bg-[#18181b] border border-white/5 rounded-2xl p-10 text-center">
                    <span className="material-symbols-outlined text-4xl text-emerald-500 mb-4">check_circle</span>
                    <h3 className="text-xl font-bold text-white">Tudo em dia!</h3>
                    <p className="text-slate-500">Nenhuma solicitação pendente no momento.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pendingTenants.map(tenant => {
                        const owner = tenant.profiles?.[0]; // Assuming first profile returned is owner (not perfect but OK for MVP if filtered correctly)
                        // Note: profiles query on tenants is list.

                        return (
                            <div key={tenant.id} className="bg-[#18181b] border border-white/5 rounded-2xl p-6 flex flex-col gap-4 hover:border-[#f2b90d]/30 transition-all shadow-lg">
                                <div className="flex justify-between items-start">
                                    <div className="size-10 rounded-full bg-white/5 flex items-center justify-center text-white/40 font-bold uppercase">
                                        {tenant.name.substring(0, 2)}
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded bg-amber-500/10 text-amber-500">
                                        Aguardando
                                    </span>
                                </div>

                                <div>
                                    <h3 className="text-lg font-black text-white leading-tight">{tenant.name}</h3>
                                    <p className="text-xs text-slate-500 font-mono mt-1 opacity-70">{tenant.slug}</p>
                                </div>

                                {owner && (
                                    <div className="text-xs text-slate-400 space-y-1 bg-black/20 p-3 rounded-lg border border-white/5">
                                        <p><strong className="text-slate-300">Responsável:</strong> {owner.full_name}</p>
                                        <p><strong className="text-slate-300">Email:</strong> {owner.email}</p>
                                        <p><strong className="text-slate-300">CPF:</strong> {owner.cpf}</p>
                                        <p><strong className="text-slate-300">Solicitado:</strong> {new Date(tenant.created_at).toLocaleDateString()}</p>
                                    </div>
                                )}

                                <div className="mt-auto pt-4 space-y-3">
                                    {/* Opção 1: Cupom */}
                                    <div className="bg-white/5 p-3 rounded-xl space-y-2 border border-white/5">
                                        <label className="text-[9px] font-black uppercase text-slate-500 block">Liberar via Cupom</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="CÓDIGO"
                                                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs font-bold text-white uppercase focus:outline-none focus:border-[#f2b90d]"
                                                value={couponCode}
                                                onChange={(e) => setCouponCode(e.target.value)}
                                            />
                                            <button
                                                onClick={() => handleApproveWithCoupon(tenant.id)}
                                                className="bg-white/10 hover:bg-[#f2b90d] hover:text-black text-white p-2 rounded-lg transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-lg">check</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Opção 2: Liberar Total */}
                                    <button
                                        onClick={() => handleApprove(tenant.id)}
                                        disabled={processing === tenant.id}
                                        className="w-full bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white font-black uppercase tracking-widest text-[10px] py-3 rounded-xl transition-all border border-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {processing === tenant.id ? 'PROCESSANDO...' : 'LIBERAR ACESSO TOTAL'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
