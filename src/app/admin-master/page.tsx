"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import ImageUpload from '@/components/ui/ImageUpload';
import { maskCPF, maskPhone, maskCEP } from '@/lib/masks';

export const dynamic = 'force-dynamic';

export default function MasterDashboardPage() {
    const [tenants, setTenants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [pendingCount, setPendingCount] = useState(0);
    const [businessType, setBusinessType] = useState<'barber' | 'salon'>('barber');

    // Management State
    const [selectedTenant, setSelectedTenant] = useState<any>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [newLogoFile, setNewLogoFile] = useState<File | null>(null);

    useEffect(() => {
        const savedType = localStorage.getItem('elite_business_type') as 'barber' | 'salon';
        if (savedType) setBusinessType(savedType);

        // Initial Fetch
        fetchTenants();
        fetchPendingCount();

        // Listen for internal approval events
        const handleApprovalUpdate = () => {
            console.log('🔄 Tenant approved! Refreshing dashboard...');
            fetchTenants();
            fetchPendingCount();
        };

        window.addEventListener('tenant-approved', handleApprovalUpdate);

        // Optional: Poll or focus re-fetch to ensure freshness
        const onFocus = () => {
            fetchTenants();
            fetchPendingCount();
        }
        window.addEventListener('focus', onFocus);

        return () => {
            window.removeEventListener('tenant-approved', handleApprovalUpdate);
            window.removeEventListener('focus', onFocus);
        };
    }, []);

    const colors = businessType === 'salon'
        ? { primary: '#fb7185', bg: '#fff1f2', text: '#881337', textMuted: '#be123c', cardBg: '#ffffff', tableBorder: '#fb718540' } // Rose Theme
        : { primary: '#f59e0b', bg: '#0f172a', text: '#f1f5f9', textMuted: '#94a3b8', cardBg: '#1e293b', tableBorder: '#f59e0b40' }; // Amber Theme

    const fetchPendingCount = async () => {
        const { count, error } = await supabase
            .from('tenants')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending_approval');

        if (!error && count !== null) {
            setPendingCount(count);
        }
    };

    const fetchTenants = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('tenants')
            .select('*, profiles!profiles_tenant_id_fkey(*)')
            .neq('status', 'pending_approval')
            .order('created_at', { ascending: false });

        if (!error && data) {
            // Client-side safeguard to ensure pending_approval are hidden
            const filtered = data.filter(t => t.status !== 'pending_approval');
            setTenants(filtered);
        }
        setLoading(false);
    };

    const handleCopy = (slug: string) => {
        const fullUrl = `${window.location.origin}/${slug}`;
        navigator.clipboard.writeText(fullUrl);
        alert('Link copiado para a área de transferência!');
    };

    const handleOpen = (slug: string) => {
        window.open(`${window.location.origin}/${slug}`, '_blank');
    };

    const normalizeSlug = (text: string) => {
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    };

    const handleSupport = async (tenant: any) => {
        if (!confirm(`MODO SUPORTE MASTER\n\nIsso irá:\n1. ATIVAR o bloqueio de manutenção para ${tenant.name}.\n2. Deslogar usuários ativos da loja.\n3. Permitir seu acesso exclusivo.\n\nDeseja continuar?`)) {
            return;
        }

        try {
            // 1. Tentar ativar via RPC (Mais seguro)
            const { error: rpcError } = await supabase.rpc('master_toggle_maintenance', {
                target_tenant_id: tenant.id,
                enable_maintenance: true
            });

            if (rpcError) {
                console.warn('RPC falhou, tentando update direto...', rpcError);
                // 2. Fallback: Update direto
                const { error: updateError } = await supabase
                    .from('tenants')
                    .update({ maintenance_mode: true })
                    .eq('id', tenant.id);

                if (updateError) throw updateError;
            }

            // 3. Sucesso: Redirecionar com param para o middleware setar o cookie
            window.location.href = `/admin?impersonate=${tenant.id}`;

        } catch (err: any) {
            console.error('Erro ao ativar suporte:', err);
            alert(`ERRO CRÍTICO: Não foi possível ativar o modo manutenção.\n\nDetalhes: ${err.message}`);
        }
    };

    const handleAction = async (action: 'pause' | 'delete' | 'resume' | 'save', data?: any, tenant?: any) => {
        const targetTenant = tenant || selectedTenant;
        console.log('========== MASTER ACTION DIAGNOSTIC ==========');
        console.log('[MasterAction-V3] Initiating action:', action);
        console.log('[MasterAction-V3] Target tenant:', targetTenant?.name, targetTenant?.id);
        console.log('=============================================');

        if (!targetTenant) {
            console.error('[MasterAction] ERROR: No target tenant selected');
            alert('ERRO: Nenhuma unidade selecionada');
            return;
        }


        setSaving(true);
        try {
            if (action === 'delete') {
                if (!confirm(`TEM CERTEZA? Esta ação irá EXCLUIR PERMANENTEMENTE a unidade "${targetTenant.name}" e TODOS os seus dados. Esta ação não pode ser desfeita.`)) {
                    setSaving(false);
                    return;
                }

                console.log('[MasterAction-V3] ✅ User confirmed deletion');
                console.log('[MasterAction-V3] Starting cleanup for:', targetTenant.id);

                // Nuclear Option: Call server-side API (Hard Delete)
                console.log('[MasterAction-V4] Invoking new Hard Delete API...');

                const response = await fetch('/api/admin/master/delete-tenant', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tenant_id: targetTenant.id })
                });

                const result = await response.json();

                if (!response.ok) {
                    console.error('[MasterAction-V4] ❌ API ERROR:', result.error);
                    throw new Error('Erro na API de exclusão: ' + (result.error || 'Erro desconhecido'));
                }

                console.log('[MasterAction-V4] ✅ API completed successfully:', result.message);

                // Verification
                console.log('[MasterAction-V3] Verifying deletion...');
                const { data: check } = await supabase.from('tenants').select('id').eq('id', targetTenant.id).single();

                if (check) {
                    console.error('[MasterAction-V3] ❌ VERIFICATION FAILED: Tenant still exists');
                    alert('AVISO: O banco confirmou a exclusão, mas a unidade ainda existe. Tente atualizar a página.');
                } else {
                    console.log('[MasterAction-V3] ✅ VERIFICATION PASSED: Tenant deleted successfully');

                    // FORCE UI UPDATE LOCAL STATE
                    setTenants(prev => prev.filter(t => t.id !== targetTenant.id));
                    setIsEditModalOpen(false);

                    alert('UNIDADE EXCLUÍDA COM SUCESSO! (V3)');
                }
            } else if (action === 'pause' || action === 'resume') {
                const newStatus = action === 'resume';
                console.log('[MasterAction-V3] Attempting to', action, 'tenant:', targetTenant.id);
                console.log('[MasterAction-V3] Setting active to:', newStatus);

                const { error, data: updateData } = await supabase
                    .from('tenants')
                    .update({ active: newStatus })
                    .eq('id', targetTenant.id)
                    .select();

                if (error) {
                    console.error('[MasterAction-V3] ❌ Pause/Resume error:', error);
                    throw error;
                }

                console.log('[MasterAction-V3] ✅ Update successful:', updateData);

                // FORCE UI UPDATE LOCAL STATE
                setTenants(prev => prev.map(t => t.id === targetTenant.id ? { ...t, active: newStatus } : t));

                alert(`Unidade ${newStatus ? 'ATIVADA' : 'PAUSADA'} com sucesso! (V3)`);
            } else if (action === 'save') {
                console.log('[MasterAction-V3] Attempting to save tenant data for:', targetTenant.id);
                console.log('[MasterAction-V3] Data to save:', data);

                let finalLogoUrl = data.logo_url;

                if (newLogoFile) {
                    try {
                        const fileName = `logo-${targetTenant.id}-${Date.now()}.webp`;
                        const { error: uploadError } = await supabase.storage
                            .from('logos')
                            .upload(fileName, newLogoFile, {
                                cacheControl: '3600',
                                upsert: true
                            });

                        if (uploadError) throw uploadError;

                        const { data: { publicUrl } } = supabase.storage
                            .from('logos')
                            .getPublicUrl(fileName);

                        finalLogoUrl = publicUrl;
                    } catch (error) {
                        console.error('Error uploading logo:', error);
                        alert('Erro ao fazer upload da logo.');
                        setSaving(false);
                        return;
                    }
                }

                const { error: tenantUpdateError } = await supabase.from('tenants').update({
                    name: data.name,
                    slug: data.slug,
                    business_type: data.business_type,
                    has_paid: data.has_paid,
                    phone: data.phone,
                    tax_id: data.tax_id,
                    contact_email: data.contact_email,
                    address_zip: data.address_zip,
                    address_street: data.address_street,
                    address_number: data.address_number,
                    address_complement: data.address_complement,
                    address_neighborhood: data.address_neighborhood,
                    address_city: data.address_city,
                    address_state: data.address_state,
                    logo_url: finalLogoUrl
                }).eq('id', targetTenant.id);
                if (tenantUpdateError) throw tenantUpdateError;

                const ownerProfile = targetTenant.profiles?.find((p: any) => p.role === 'owner') || targetTenant.profiles?.[0];
                if (ownerProfile?.id) {
                    await supabase.from('profiles').update({
                        full_name: data.owner_name,
                        cpf: data.tax_id
                    }).eq('id', ownerProfile.id);
                }
                alert('Alterações salvas com sucesso! (V3)');
                setIsEditModalOpen(false);
            }

            console.log('[MasterAction] Refreshing UI...');
            console.log('[MasterAction] Refreshing UI (Local Update)...');
            // await fetchTenants(); // REMOVED TO PREVENT RACE CONDITION
            setSelectedTenant(null);
        } catch (err: any) {
            console.error('[MasterAction] ERROR:', err);
            alert('ERRO (V3): ' + (err.message || 'Falha na operação'));
        } finally {
            setSaving(false);
        }
    };

    const handleCleanup = async () => {
        if (!confirm('ATENÇÃO: LIMPEZA PROFUNDA DO SISTEMA\n\nEsta operação irá:\n1. Remover arquivos de imagem órfãos (Storage).\n2. Excluir registros órfãos no Banco de Dados (agendamentos, perfis, produtos sem loja vinculada).\n\nArquivos e dados criados nas últimas 12h serão PRESERVADOS por segurança.\n\nDeseja iniciar a faxina completa?')) return;

        const originalLoading = loading;
        setLoading(true);
        try {
            const res = await fetch('/api/admin/master/cleanup-storage', { method: 'POST' });
            const data = await res.json();

            if (res.ok) {
                let report = '🧹 FAXINA CONCLUÍDA!\n\n';

                // STORAGE SECTION
                if (data.stats.storage) {
                    report += `🗄️ STORAGE:\n- Excluídos: ${data.stats.storage.deleted_count}\n- Mantidos: ${data.stats.storage.kept_count}\n\n`;
                }

                // DATABASE SECTION
                const db = data.stats.database || {};
                const errors = data.stats.errors || [];

                if (Object.keys(db).length > 0) {
                    report += '💾 BANCO DE DADOS (Registros Removidos):\n';
                    report += `- Perfis: ${db.deleted_profiles || 0}\n`;
                    report += `- Agendamentos: ${db.deleted_appointments || 0}\n`;
                    report += `- Produtos: ${db.deleted_products || 0}\n`;
                    report += `- Serviços: ${db.deleted_services || 0}\n`;
                    report += `- Clientes: ${db.deleted_customers || 0}\n`;
                } else if (errors.some((e: string) => e.includes('Database Clean Failed'))) {
                    report += '⚠️ AVISO: A limpeza do banco de dados falhou (Verifique se a função SQL foi criada).\n';
                } else {
                    report += '💾 BANCO DE DADOS: Nenhum registro órfão encontrado.\n';
                }

                alert(report);
            } else {
                throw new Error(data.error || 'Erro desconhecido');
            }
        } catch (error: any) {
            console.error('Cleanup error:', error);
            alert('❌ Erro na limpeza: ' + error.message);
        } finally {
            setLoading(originalLoading); // Restore previous loading state logic
        }
    };

    const metrics = [
        { label: 'Unidades Ativas (V3)', val: tenants.filter(t => t.active).length.toString(), trend: 'Sync: OK', icon: 'storefront' },
        { label: 'Status Sistema', val: '99.9%', trend: 'v3-final-' + new Date().getTime().toString().slice(-4), icon: 'check_circle' }
    ];

    return (
        <div className="space-y-12 animate-in fade-in duration-500">
            {pendingCount > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-[2rem] p-8 flex items-center justify-between shadow-xl backdrop-blur-sm relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                    <div className="flex items-center gap-6 relative z-10">
                        <div className="size-16 rounded-full bg-amber-500/20 flex items-center justify-center animate-pulse">
                            <span className="material-symbols-outlined text-3xl text-amber-500">priority_high</span>
                        </div>
                        <div>
                            <h3 className="text-2xl font-black italic text-white uppercase tracking-tight">Atenção Necessária</h3>
                            <p className="text-amber-500 font-bold text-sm mt-1">Existem {pendingCount} novas solicitações de adesão pendentes.</p>
                        </div>
                    </div>
                    <Link href="/admin-master/aprovacoes" className="bg-amber-500 text-black px-8 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center gap-2">
                        Ver Solicitações
                        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </Link>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {metrics.map((m, i) => (
                    <div key={i} className="p-8 rounded-[2rem] border relative group transition-all shadow-xl" style={{ backgroundColor: colors.cardBg, borderColor: `${colors.text}0d` }}>
                        <span className="material-symbols-outlined absolute top-8 right-8 text-6xl opacity-10 group-hover:opacity-20 transition-all" style={{ color: colors.primary }}>{m.icon}</span>
                        <p className="text-[10px] font-black uppercase tracking-widest mb-1 italic" style={{ color: colors.textMuted }}>{m.label}</p>
                        <h4 className="text-4xl font-black italic tracking-tighter mb-4" style={{ color: colors.text }}>{m.val}</h4>
                    </div>
                ))}
            </div>

            <div className="rounded-[2.5rem] border overflow-visible shadow-2xl" style={{ backgroundColor: colors.cardBg, borderColor: `${colors.text}0d` }}>
                <div className="p-6 md:p-10 border-b flex flex-wrap gap-4 justify-between items-center" style={{ borderColor: `${colors.text}0d` }}>
                    <div className="flex flex-wrap items-center gap-4">
                        <h3 className="text-2xl font-black italic tracking-tight uppercase" style={{ color: colors.text }}>INQUILINOS NA PLATAFORMA</h3>
                        <div className="hidden md:block h-6 w-px bg-white/10 mx-2"></div>
                        <button
                            onClick={handleCleanup}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all border border-red-500/20 text-[9px] font-black uppercase tracking-widest"
                            title="Limpar imagens não utilizadas (Storage)"
                        >
                            <span className="material-symbols-outlined text-[14px]">cleaning_services</span>
                            Limpar Storage
                        </button>
                    </div>
                    <button
                        onClick={() => { fetchTenants(); fetchPendingCount(); }}
                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity"
                        style={{ color: colors.text }}
                    >
                        <span className={`material-symbols-outlined text-[16px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
                        Atualizar Lista
                    </button>
                </div>
                <div className="p-8">
                    {loading ? (
                        <div className="text-center py-20 opacity-40">
                            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 mx-auto" style={{ borderColor: colors.primary }}></div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto overflow-y-visible custom-scrollbar pb-4">
                            <table className="w-full text-left border-separate border-spacing-y-2">
                                <thead>
                                    <tr className="text-[10px] font-black uppercase tracking-widest italic" style={{ color: colors.textMuted }}>
                                        <th className="pb-4 px-6">Identidade</th>
                                        <th className="pb-4 px-6 text-center">Slug</th>
                                        <th className="pb-4 px-6 text-center">Status</th>
                                        <th className="pb-4 px-6 text-center">Cadastro</th>
                                        <th className="pb-4 px-8 text-right min-w-[180px]">Gestão</th>
                                    </tr>
                                </thead>
                                <tbody className="font-bold text-sm" style={{ color: colors.text }}>
                                    {tenants.map(t => (
                                        <tr key={t.id} className="transition-all hover:bg-white/5 group">
                                            <td className="py-4 px-6 italic rounded-l-2xl border-y border-l" style={{ borderColor: `${colors.text}0d` }}>
                                                <div className="flex items-center gap-4">
                                                    <div className="size-10 rounded-full overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center shrink-0 relative group/logo">
                                                        {t.logo_url ? (
                                                            <img src={t.logo_url} alt={t.name} className="size-full object-cover" />
                                                        ) : (
                                                            <span className="material-symbols-outlined opacity-30">storefront</span>
                                                        )}
                                                        <button
                                                            onClick={() => { setSelectedTenant(t); setIsEditModalOpen(true); }}
                                                            style={{
                                                                position: 'absolute',
                                                                top: 0,
                                                                right: 0,
                                                                width: '24px',
                                                                height: '24px',
                                                                backgroundColor: 'rgba(0,0,0,0.8)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                borderBottomLeftRadius: '8px',
                                                                cursor: 'pointer',
                                                                border: 'none'
                                                            }}
                                                            title="Editar Logo"
                                                        >
                                                            <span className="material-symbols-outlined" style={{ fontSize: '12px', color: '#f2b90d' }}>edit</span>
                                                        </button>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-black uppercase tracking-tight">{t.name}</span>
                                                        <span className="text-[9px] opacity-40 uppercase tracking-tighter">Prop: {t.profiles?.[0]?.full_name || 'N/A'}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 text-center border-y" style={{ borderColor: `${colors.text}0d` }}>
                                                <div className="flex items-center justify-center gap-2">
                                                    <span className="text-xs italic opacity-60">/{t.slug}</span>
                                                    <div className="flex gap-2">
                                                        <button onClick={() => handleCopy(t.slug)} className="size-5 rounded-md hover:bg-white/10 flex items-center justify-center transition-all text-[#f2b90d]" title="Copiar Link Completo">
                                                            <span className="material-symbols-outlined text-[12px]">content_copy</span>
                                                        </button>
                                                        <button onClick={() => handleOpen(t.slug)} className="size-5 rounded-md hover:bg-white/10 flex items-center justify-center transition-all text-[#f2b90d]" title="Abrir Página">
                                                            <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 text-center border-y" style={{ borderColor: `${colors.text}0d` }}>
                                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${t.status === 'pending_approval'
                                                    ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                                    : t.active
                                                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                                        : 'bg-red-500/10 text-red-500 border-red-500/20'
                                                    }`}>
                                                    {t.status === 'pending_approval' ? 'PENDENTE' : (t.active ? 'ATIVO' : 'PAUSADO')}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-center border-y opacity-50 text-[11px]" style={{ borderColor: `${colors.text}0d` }}>{new Date(t.created_at).toLocaleDateString()}</td>
                                            <td className="py-4 px-8 text-right rounded-r-2xl border-y border-r" style={{ borderColor: `${colors.text}0d` }}>
                                                <div className="flex items-center justify-end gap-2 whitespace-nowrap min-w-max">

                                                    <button
                                                        onClick={() => handleSupport(t)}
                                                        className="size-9 bg-white/5 text-slate-400 rounded-xl flex items-center justify-center transition-all border border-white/5 hover:border-sky-500 hover:text-sky-500 shadow-md"
                                                        title="Suporte Master (Impersonation)"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
                                                    </button>

                                                    <button
                                                        onClick={() => {
                                                            console.log('[DEBUG] Pause/Resume clicked for:', t.name);
                                                            handleAction(t.active ? 'pause' : 'resume', null, t);
                                                        }}
                                                        className={`size-9 rounded-xl flex items-center justify-center transition-all border shadow-md ${t.active ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500 hover:text-white' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500 hover:text-white'}`}
                                                        title={t.active ? 'Pausar Acesso' : 'Ativar Acesso'}
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">{t.active ? 'pause_circle' : 'play_circle'}</span>
                                                    </button>

                                                    <button
                                                        onClick={() => {
                                                            console.log('[DEBUG] Hard Delete clicked for:', t.name);
                                                            handleAction('delete', null, t);
                                                        }}
                                                        className="size-10 bg-red-500/10 text-red-500 rounded-xl flex items-center justify-center transition-all border border-red-500/20 hover:bg-red-500 hover:text-white shadow-lg"
                                                        title="Excluir Unidade Permanente"
                                                    >
                                                        <span className="material-symbols-outlined text-[20px]">delete_forever</span>
                                                    </button>

                                                    <button
                                                        onClick={() => {
                                                            console.log('[DEBUG] Settings clicked for:', t.name);
                                                            setSelectedTenant(t);
                                                            setNewLogoFile(null); // Reset file
                                                            setIsEditModalOpen(true);
                                                        }}
                                                        className="size-10 bg-white/5 text-slate-400 rounded-xl flex items-center justify-center transition-all border border-white/5 hover:bg-[#f2b90d] hover:text-black shadow-lg"
                                                        title="Configurações"
                                                    >
                                                        <span className="material-symbols-outlined text-[20px]">settings</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de Gestão de Inquilino */}
            {
                isEditModalOpen && selectedTenant && (
                    <div className="fixed inset-0 z-[100] flex items-start justify-center py-8 bg-black/90 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto">
                        <div className="bg-[#121214] border border-white/10 w-full max-w-[600px] rounded-[3rem] p-10 relative shadow-2xl my-8">
                            <div className="absolute top-0 left-0 w-full h-1 bg-[#f2b90d] animate-pulse"></div>

                            <button onClick={() => setIsEditModalOpen(false)} className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>

                            <div className="flex flex-col items-center mb-10">
                                <div className="size-20 rounded-full overflow-hidden bg-white/5 border border-white/10 mb-4 shadow-xl">
                                    {selectedTenant.logo_url ? (
                                        <img src={selectedTenant.logo_url} alt={selectedTenant.name} className="size-full object-cover" />
                                    ) : (
                                        <div className="size-full flex items-center justify-center text-[#f2b90d]">
                                            <span className="material-symbols-outlined text-4xl">storefront</span>
                                        </div>
                                    )}
                                </div>
                                <h3 className="text-white text-2xl font-black italic uppercase italic leading-none">{selectedTenant.name}</h3>
                                <p className="text-[#f2b90d] text-[10px] font-black uppercase tracking-[0.3em] mt-2 opacity-60">ADMINISTRAÇÃO DE UNIDADE</p>
                            </div>

                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => handleAction(selectedTenant.active ? 'pause' : 'resume')}
                                        className={`py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border transition-all flex items-center justify-center gap-2 ${selectedTenant.active ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500 hover:text-black' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500 hover:text-white'}`}
                                    >
                                        <span className="material-symbols-outlined text-[18px]">{selectedTenant.active ? 'pause_circle' : 'play_circle'}</span>
                                        {selectedTenant.active ? 'Pausar Acesso' : 'Ativar Acesso'}
                                    </button>
                                    <button
                                        onClick={() => handleAction('delete')}
                                        className="py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">delete_forever</span>
                                        Excluir Perfil
                                    </button>
                                </div>

                                <div className="p-8 rounded-[2rem] bg-white/5 border border-white/5 space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-white text-[11px] font-black uppercase tracking-widest opacity-40">Dados do Estabelecimento</h4>
                                        <div className="text-[9px] font-black uppercase tracking-tighter opacity-30 text-white">ID: {selectedTenant.id.slice(0, 8)}</div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Nome da Loja</label>
                                            <input
                                                type="text"
                                                defaultValue={selectedTenant.name}
                                                onChange={(e) => {
                                                    const newName = e.target.value;
                                                    const newSlug = normalizeSlug(newName);
                                                    setSelectedTenant({ ...selectedTenant, name: newName, slug: newSlug });
                                                }}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-[#f2b90d]/50 transition-all"
                                            />
                                        </div>

                                        {/* ÁREA DE EDIÇÃO DE LOGO COMPLETA - INICIO */}
                                        <div className="space-y-3 bg-white/5 p-4 rounded-xl border border-white/10">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-xl">🖼️</span>
                                                <label className="text-[11px] font-black uppercase text-[#f2b90d]">
                                                    Alterar Logo do Estabelecimento
                                                </label>
                                            </div>

                                            <div className="space-y-2">
                                                <ImageUpload
                                                    currentImage={selectedTenant.logo_url}
                                                    onImageSelect={(file, preview) => {
                                                        setNewLogoFile(file);
                                                        setSelectedTenant({ ...selectedTenant, logo_url: preview });
                                                    }}
                                                    helperText="Nova logo (Substituir)"
                                                />
                                            </div>
                                        </div>
                                        {/* ÁREA DE EDIÇÃO DE LOGO COMPLETA - FIM */}

                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Slug (URL de Acesso)</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-3.5 text-xs text-white/30 font-bold">/</span>
                                                <input
                                                    type="text"
                                                    value={selectedTenant.slug}
                                                    onChange={(e) => {
                                                        const newSlug = normalizeSlug(e.target.value);
                                                        setSelectedTenant({ ...selectedTenant, slug: newSlug });
                                                    }}
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 pl-8 text-sm font-bold text-white focus:outline-none focus:border-[#f2b90d]/50 transition-all font-mono"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Tipo de Negócio</label>
                                            <div className="relative">
                                                <select
                                                    value={selectedTenant.business_type}
                                                    onChange={(e) => setSelectedTenant({ ...selectedTenant, business_type: e.target.value })}
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-[#f2b90d]/50 transition-all appearance-none cursor-pointer"
                                                >
                                                    <option className="bg-white text-black font-bold" value="barbearia">Barbearia</option>
                                                    <option className="bg-white text-black font-bold" value="salao">Salão de Beleza</option>
                                                    <option className="bg-white text-black font-bold" value="estetica">Clínica Estética</option>
                                                    <option className="bg-white text-black font-bold" value="esmalteria">Esmalteria</option>
                                                    <option className="bg-white text-black font-bold" value="spa">SPA</option>
                                                </select>
                                                <span className="material-symbols-outlined absolute right-3 top-3 text-white/30 pointer-events-none">expand_more</span>
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Status Pagamento</label>
                                            <div className="relative">
                                                <select
                                                    value={selectedTenant.has_paid ? 'paid' : 'pending'}
                                                    onChange={(e) => setSelectedTenant({ ...selectedTenant, has_paid: e.target.value === 'paid' })}
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none appearance-none"
                                                >
                                                    <option className="bg-white text-emerald-600 font-bold" value="paid">PAGO / OK</option>
                                                    <option className="bg-white text-red-600 font-bold" value="pending">PENDENTE</option>
                                                </select>
                                                <span className="material-symbols-outlined absolute right-3 top-3 text-white/30 pointer-events-none">expand_more</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Telefone / WhatsApp</label>
                                            <input
                                                type="text"
                                                value={selectedTenant.phone || ''}
                                                onChange={(e) => setSelectedTenant({ ...selectedTenant, phone: maskPhone(e.target.value) })}
                                                placeholder="(00) 00000-0000"
                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-slate-500 uppercase ml-1">E-mail de Contato</label>
                                            <input
                                                type="email"
                                                defaultValue={selectedTenant.contact_email || ''}
                                                onChange={(e) => setSelectedTenant({ ...selectedTenant, contact_email: e.target.value })}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-slate-500 uppercase ml-1">CPF / CNPJ</label>
                                            <input
                                                type="text"
                                                value={selectedTenant.tax_id || ''}
                                                onChange={(e) => setSelectedTenant({ ...selectedTenant, tax_id: maskCPF(e.target.value) })}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Proprietário (Nome)</label>
                                            <input
                                                type="text"
                                                value={selectedTenant.profiles?.find((p: any) => p.role === 'owner')?.full_name || selectedTenant.profiles?.[0]?.full_name || ''}
                                                onChange={(e) => {
                                                    const newProfiles = [...(selectedTenant.profiles || [])];
                                                    const ownerIdx = newProfiles.findIndex((p: any) => p.role === 'owner');
                                                    if (ownerIdx !== -1) {
                                                        newProfiles[ownerIdx] = { ...newProfiles[ownerIdx], full_name: e.target.value };
                                                    } else if (newProfiles[0]) {
                                                        newProfiles[0] = { ...newProfiles[0], full_name: e.target.value };
                                                    } else {
                                                        newProfiles[0] = { full_name: e.target.value, role: 'owner' };
                                                    }
                                                    setSelectedTenant({ ...selectedTenant, profiles: newProfiles });
                                                }}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-[#f2b90d]/50 transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-slate-500 uppercase ml-1">CEP</label>
                                            <input
                                                type="text"
                                                value={selectedTenant.address_zip || ''}
                                                onChange={(e) => setSelectedTenant({ ...selectedTenant, address_zip: maskCEP(e.target.value) })}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Cidade / UF</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <input
                                                    type="text"
                                                    defaultValue={selectedTenant.address_city}
                                                    onChange={(e) => setSelectedTenant({ ...selectedTenant, address_city: e.target.value })}
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none"
                                                />
                                                <input
                                                    type="text"
                                                    defaultValue={selectedTenant.address_state}
                                                    onChange={(e) => setSelectedTenant({ ...selectedTenant, address_state: e.target.value })}
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-center text-sm font-bold text-white focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Rua / Logradouro</label>
                                        <input
                                            type="text"
                                            defaultValue={selectedTenant.address_street}
                                            onChange={(e) => setSelectedTenant({ ...selectedTenant, address_street: e.target.value })}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Número</label>
                                            <input
                                                type="text"
                                                defaultValue={selectedTenant.address_number}
                                                onChange={(e) => setSelectedTenant({ ...selectedTenant, address_number: e.target.value })}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Bairro</label>
                                            <input
                                                type="text"
                                                defaultValue={selectedTenant.address_neighborhood}
                                                onChange={(e) => setSelectedTenant({ ...selectedTenant, address_neighborhood: e.target.value })}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none"
                                            />
                                        </div>
                                    </div>

                                    {/* Advanced Stats / Support Section */}
                                    <div className="pt-6 mt-6 border-t border-white/5 space-y-4">

                                        <button
                                            onClick={() => handleSupport(selectedTenant)}
                                            className="w-full flex items-center justify-between p-4 bg-sky-500/5 border border-sky-500/10 rounded-[1.5rem] hover:bg-sky-500/10 transition-all text-sky-500 group"
                                        >
                                            <div className="flex flex-col items-start">
                                                <span className="text-[10px] font-black uppercase tracking-widest">Acessar Unidade</span>
                                                <span className="text-[8px] font-bold text-slate-500 uppercase">Suporte Master (Impersonation)</span>
                                            </div>
                                            <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mt-8">
                                    <button
                                        onClick={() => setIsEditModalOpen(false)}
                                        className="bg-white/5 text-slate-400 font-black py-4 rounded-2xl uppercase tracking-widest text-[9px] hover:text-white transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        disabled={saving}
                                        onClick={() => handleAction('save', {
                                            name: selectedTenant.name,
                                            slug: selectedTenant.slug,
                                            business_type: selectedTenant.business_type,
                                            has_paid: selectedTenant.has_paid,
                                            phone: selectedTenant.phone,
                                            tax_id: selectedTenant.tax_id,
                                            contact_email: selectedTenant.contact_email,
                                            address_zip: selectedTenant.address_zip,
                                            address_street: selectedTenant.address_street,
                                            address_number: selectedTenant.address_number,
                                            address_complement: selectedTenant.address_complement,
                                            address_neighborhood: selectedTenant.address_neighborhood,
                                            address_city: selectedTenant.address_city,
                                            address_state: selectedTenant.address_state,
                                            owner_name: selectedTenant.profiles?.[0]?.full_name,
                                            logo_url: selectedTenant.logo_url
                                        })}
                                        className="bg-[#f2b90d] text-black font-black py-4 rounded-2xl uppercase tracking-widest text-[9px] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                                    >
                                        {saving ? 'Salvando...' : 'Salvar Alterações'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
