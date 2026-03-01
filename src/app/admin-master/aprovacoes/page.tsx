'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { addMonths } from '@/utils/date-utils';

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
                id, name, slug, status, phone, created_at,
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

    const handleLiberarAcesso = async (tenantId: string) => {
        if (!couponCode.trim()) return alert('Por favor, insira um código de cupom válido.');

        setProcessing(tenantId);
        try {
            // 1. Validate Coupon via robust RPC (Bypass RLS bug)
            const { data: coupon, error: couponError } = await supabase.rpc('validate_admin_coupon', {
                p_code: couponCode.toUpperCase().trim()
            });

            if (couponError || !coupon) {
                throw new Error(couponError?.message || 'Cupom inválido ou não encontrado.');
            }

            // 2. Determine Plan Rules based on Coupon Data
            let appliedPlan = 'trial';
            let trialEndsAt = null;

            if (coupon.discount_type === 'full_access') {
                appliedPlan = 'unlimited';
            } else if (coupon.discount_type === 'trial_30') {
                // 🛡️ [BLINDADO] LOGIC REFINEMENT: DATA-PARA-DATA (Ex: 02/02 -> 02/03)
                trialEndsAt = addMonths(new Date(), 1).toISOString();
            } else if (coupon.discount_type === 'trial_2h') {
                const d = new Date();
                d.setHours(d.getHours() + 2);
                trialEndsAt = d.toISOString();
            }

            // 3. Update Tenant
            const { data: updatedTenant, error: updateError } = await supabase
                .from('tenants')
                .update({
                    status: 'active',
                    subscription_plan: appliedPlan,
                    trial_ends_at: trialEndsAt,
                    coupon_used: coupon.code,
                    active: true,
                    has_paid: appliedPlan === 'unlimited' ? true : false
                })
                .eq('id', tenantId)
                .select();

            if (updateError) throw new Error('Falha ao atualizar estabelecimento: ' + updateError.message);

            if (!updatedTenant || updatedTenant.length === 0) {
                throw new Error('RLS BLOCK: O banco não permitiu a alteração deste registro.');
            }

            // 4. Update Coupon Usage
            await supabase.from('coupons').update({ used_count: (coupon.used_count || 0) + 1 }).eq('id', coupon.id);

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
                                        <p><strong className="text-slate-300">Telefone:</strong> {tenant.phone || owner.phone || 'N/A'}</p>
                                        <p><strong className="text-slate-300">CPF:</strong> {owner.cpf}</p>
                                        <p><strong className="text-slate-300">Solicitado:</strong> {new Date(tenant.created_at).toLocaleDateString()}</p>
                                    </div>
                                )}

                                {/* WhatsApp Button */}
                                <div className="px-1">
                                    <button
                                        onClick={() => {
                                            const phone = tenant.phone || owner?.phone;
                                            if (!phone) return alert('Telefone não encontrado.');

                                            const name = owner?.full_name || tenant.name;
                                            const message = `Olá ${name}, notamos que seu cadastro no FastBeauty Pro está aguardando a liberação. Para começar a usar o sistema agora mesmo, basta finalizar seu pagamento pelo link: https://melhorhotelfazendarj.com.br/pagamento-pendente`;

                                            const whatsappUrl = `https://wa.me/55${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
                                            window.open(whatsappUrl, '_blank');
                                        }}
                                        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366] text-[#25D366] hover:text-white text-[10px] font-black uppercase tracking-widest transition-all border border-[#25D366]/20"
                                    >
                                        <span className="material-symbols-outlined text-sm">chat</span>
                                        Contactar via WhatsApp
                                    </button>
                                </div>

                                <div className="mt-auto pt-4 space-y-3">
                                    <div className="bg-white/5 p-4 rounded-2xl space-y-4 border border-white/5">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-slate-500 block ml-1">Liberar via Cupom</label>
                                            <input
                                                type="text"
                                                placeholder="DIGITE O CÓDIGO"
                                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-xs font-black text-white uppercase focus:outline-none focus:border-[#f2b90d] transition-all"
                                                value={couponCode}
                                                onChange={(e) => setCouponCode(e.target.value)}
                                            />
                                        </div>

                                        <button
                                            onClick={() => handleLiberarAcesso(tenant.id)}
                                            disabled={processing === tenant.id}
                                            className="w-full bg-[#f2b90d] hover:bg-[#d9a50b] text-black font-black uppercase tracking-[0.2em] text-[10px] py-4 rounded-xl transition-all shadow-lg shadow-[#f2b90d]/10 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        >
                                            {processing === tenant.id ? 'PROCESSANDO...' : 'LIBERAR ACESSO'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
