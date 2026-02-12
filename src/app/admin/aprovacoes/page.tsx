
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function ProfessionalApprovalsPage() {
    const [loading, setLoading] = useState(true);
    const [pendingProfessionals, setPendingProfessionals] = useState<any[]>([]);
    const [currentUserTenantId, setCurrentUserTenantId] = useState<string | null>(null);
    const [businessType, setBusinessType] = useState<'barber' | 'salon'>('barber');
    const [processing, setProcessing] = useState<string | null>(null);

    const [allTenantProfiles, setAllTenantProfiles] = useState<any[]>([]);

    const router = useRouter();

    useEffect(() => {
        const savedType = localStorage.getItem('elite_business_type') as 'barber' | 'salon';
        if (savedType) setBusinessType(savedType);
        fetchPending();
    }, []);

    const colors = businessType === 'salon'
        ? { primary: '#fb7185', bg: '#fff1f2', text: '#881337', textMuted: '#be123c', cardBg: '#ffffff', border: '#fb718540' } // Rose Theme
        : { primary: '#f2b90d', bg: '#0f172a', text: '#f1f5f9', textMuted: '#94a3b8', cardBg: '#18181b', border: '#ffffff0d' }; // Amber Theme

    const fetchPending = async () => {
        setLoading(true);

        // 1. Get Current User Tenant
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            setLoading(false);
            return;
        }

        const { data: userProfile } = await supabase
            .from('profiles')
            .select('tenant_id')
            .eq('id', session.user.id)
            .single();

        if (!userProfile?.tenant_id) {
            setLoading(false);
            return;
        }

        setCurrentUserTenantId(userProfile.tenant_id);

        // 2. Fetch ALL Profiles for this Tenant (for Debugging)
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('tenant_id', userProfile.tenant_id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error(error);
        } else {
            setAllTenantProfiles(data || []);
            // Filter pending for the main view
            setPendingProfessionals(data?.filter(p => p.status === 'pending') || []);
        }

        setLoading(false);
    };

    const handleApprove = async (profileId: string, profileName: string) => {
        if (!confirm(`CONFIRMAR APROVAÇÃO?\n\nProfissional: ${profileName}\n\nEsta ação liberará o acesso imediato ao painel do profissional.`)) return;

        setProcessing(profileId);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    status: 'active'
                })
                .eq('id', profileId);

            if (error) throw error;

            alert(`SUCESSO! O profissional ${profileName} foi aprovado e já pode acessar o sistema.`);

            // Refresh
            await fetchPending();
            router.refresh();

            // Dispatch event to update Sidebar/Dashboard counts
            window.dispatchEvent(new Event('professional-approved'));

        } catch (err: any) {
            alert('ERRO AO APROVAR: ' + err.message);
        } finally {
            setProcessing(null);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-20">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-black italic tracking-tighter" style={{ color: colors.text }}>
                        APROVAÇÕES <span style={{ color: colors.primary }}>PENDENTES</span>
                    </h1>
                    <p className="text-sm font-medium opacity-60" style={{ color: colors.textMuted }}>
                        Libere o acesso de novos membros da equipe.
                    </p>
                </div>
                <button
                    onClick={fetchPending}
                    className="text-xs uppercase font-bold hover:opacity-80 transition-colors flex items-center gap-2"
                    style={{ color: colors.primary }}
                >
                    <span className="material-symbols-outlined text-lg">refresh</span>
                    Atualizar Lista
                </button>
            </header>

            {loading ? (
                <div className="flex justify-center py-20">
                    <span className="material-symbols-outlined text-4xl animate-spin" style={{ color: colors.primary }}>progress_activity</span>
                </div>
            ) : pendingProfessionals.length === 0 ? (
                <div className="border rounded-2xl p-10 text-center" style={{ backgroundColor: colors.cardBg, borderColor: colors.border }}>
                    <span className="material-symbols-outlined text-4xl mb-4 text-emerald-500">check_circle</span>
                    <h3 className="text-xl font-bold" style={{ color: colors.text }}>Tudo em dia!</h3>
                    <p style={{ color: colors.textMuted }}>Nenhuma solicitação de profissional pendente no momento.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pendingProfessionals.map(prof => (
                        <div key={prof.id} className="border rounded-2xl p-6 flex flex-col gap-4 hover:border-opacity-50 transition-all shadow-lg" style={{ backgroundColor: colors.cardBg, borderColor: colors.border }}>
                            <div className="flex justify-between items-start">
                                <div className="size-10 rounded-full flex items-center justify-center font-bold uppercase opacity-80" style={{ backgroundColor: `${colors.text}10`, color: colors.text }}>
                                    {prof.full_name?.substring(0, 2) || '??'}
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded bg-amber-500/10 text-amber-500">
                                    Aguardando
                                </span>
                            </div>

                            <div>
                                <h3 className="text-lg font-black leading-tight" style={{ color: colors.text }}>{prof.full_name}</h3>
                                <p className="text-xs font-mono mt-1 opacity-70" style={{ color: colors.textMuted }}>{prof.email}</p>
                            </div>

                            <div className="text-xs space-y-1 p-3 rounded-lg border" style={{ backgroundColor: `${colors.bg}50`, borderColor: colors.border, color: colors.textMuted }}>
                                <p><strong style={{ color: colors.text }}>CPF:</strong> {prof.cpf || 'N/A'}</p>
                                <p><strong style={{ color: colors.text }}>Comissão:</strong> {prof.service_commission}% (Padrão)</p>
                                <p><strong style={{ color: colors.text }}>Solicitado:</strong> {new Date(prof.created_at).toLocaleDateString()}</p>
                            </div>

                            <div className="mt-auto pt-4">
                                <button
                                    onClick={() => handleApprove(prof.id, prof.full_name)}
                                    disabled={processing === prof.id}
                                    className="w-full bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white font-black uppercase tracking-widest text-[10px] py-3 rounded-xl transition-all border border-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {processing === prof.id ? 'PROCESSANDO...' : 'LIBERAR ACESSO'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* DEBUG SECTION */}
            <div className="mt-8 p-6 bg-black/50 rounded-2xl border border-white/5 opacity-60 hover:opacity-100 transition-opacity">
                <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4">DIAGNÓSTICO DO SISTEMA (DEBUG)</h4>
                <div className="font-mono text-[10px] space-y-2 text-slate-400">
                    <p>Tenant ID Atual: {currentUserTenantId || 'Carregando...'}</p>
                    <p>Total Perfis Encontrados: {allTenantProfiles.length}</p>
                    <p>Pendentes: {pendingProfessionals.length}</p>

                    <div className="mt-4 border-t border-white/5 pt-4">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-slate-600 border-b border-dashed border-white/5">
                                    <th className="pb-2">NOME</th>
                                    <th className="pb-2">EMAIL</th>
                                    <th className="pb-2">ROLE</th>
                                    <th className="pb-2">STATUS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allTenantProfiles.map(p => (
                                    <tr key={p.id} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                                        <td className="py-2 text-white">{p.full_name}</td>
                                        <td className="py-2">{p.email}</td>
                                        <td className="py-2 uppercase text-xs">{p.role}</td>
                                        <td className="py-2 uppercase text-xs">
                                            <span className={`px-1.5 py-0.5 rounded ${p.status === 'active' ? 'bg-emerald-500/20 text-emerald-500' : (p.status === 'pending' ? 'bg-amber-500/20 text-amber-500' : 'bg-red-500/20 text-red-500')}`}>
                                                {p.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
