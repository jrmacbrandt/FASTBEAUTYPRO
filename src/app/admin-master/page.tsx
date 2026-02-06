"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export default function MasterDashboardPage() {
    const [tenants, setTenants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [businessType, setBusinessType] = useState<'barber' | 'salon'>('barber');

    // Management State
    const [selectedTenant, setSelectedTenant] = useState<any>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const savedType = localStorage.getItem('elite_business_type') as 'barber' | 'salon';
        if (savedType) setBusinessType(savedType);
        fetchTenants();
    }, []);

    const colors = businessType === 'salon'
        ? { primary: '#7b438e', bg: '#faf8f5', text: '#1e1e1e', textMuted: '#6b6b6b', cardBg: '#ffffff', tableBorder: '#7b438e1a' }
        : { primary: '#f2b90d', bg: '#000000', text: '#f8fafc', textMuted: '#64748b', cardBg: '#121214', tableBorder: '#ffffff0d' };

    const fetchTenants = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('tenants')
            .select('*, profiles!profiles_tenant_id_fkey(*)')
            .order('created_at', { ascending: false });

        if (!error && data) {
            setTenants(data);
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

    const handleAction = async (action: 'pause' | 'delete' | 'resume' | 'save', data?: any) => {
        if (!selectedTenant) return;
        setSaving(true);

        try {
            if (action === 'delete') {
                if (!confirm('Tem certeza que deseja excluir este inquilino permanentemente?')) return;
                const { error } = await supabase.from('tenants').delete().eq('id', selectedTenant.id);
                if (error) throw error;
            } else if (action === 'pause' || action === 'resume') {
                const { error } = await supabase.from('tenants').update({ active: action === 'resume' }).eq('id', selectedTenant.id);
                if (error) throw error;
            } else if (action === 'save') {
                const { error } = await supabase.from('tenants').update({
                    name: data.name,
                    slug: data.slug,
                    business_type: data.business_type,
                    has_paid: data.has_paid,
                    phone: data.phone,
                    address: data.address,
                    logo_url: data.logo_url
                }).eq('id', selectedTenant.id);
                if (error) throw error;

                // Update Profile name if changed
                if (data.owner_name && selectedTenant.profiles?.[0]?.id) {
                    await supabase.from('profiles').update({ full_name: data.owner_name }).eq('id', selectedTenant.profiles[0].id);
                }
            }

            fetchTenants();
            setIsEditModalOpen(false);
            setSelectedTenant(null);
        } catch (err) {
            console.error('Action error:', err);
            alert('Erro ao executar ação.');
        } finally {
            setSaving(false);
        }
    };

    const metrics = [
        { label: 'Unidades Ativas', val: tenants.filter(t => t.active).length.toString(), trend: '+12%', icon: 'storefront' },
        { label: 'Status Sistema', val: '99.9%', trend: 'Optimum', icon: 'check_circle' }
    ];

    return (
        <div className="space-y-12 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {metrics.map((m, i) => (
                    <div key={i} className="p-8 rounded-[2rem] border relative group transition-all shadow-xl" style={{ backgroundColor: colors.cardBg, borderColor: `${colors.text}0d` }}>
                        <span className="material-symbols-outlined absolute top-8 right-8 text-6xl opacity-10 group-hover:opacity-20 transition-all" style={{ color: colors.primary }}>{m.icon}</span>
                        <p className="text-[10px] font-black uppercase tracking-widest mb-1 italic" style={{ color: colors.textMuted }}>{m.label}</p>
                        <h4 className="text-4xl font-black italic tracking-tighter mb-4" style={{ color: colors.text }}>{m.val}</h4>
                    </div>
                ))}
            </div>

            <div className="rounded-[2.5rem] border overflow-hidden shadow-2xl" style={{ backgroundColor: colors.cardBg, borderColor: `${colors.text}0d` }}>
                <div className="p-10 border-b flex justify-between items-center" style={{ borderColor: `${colors.text}0d` }}>
                    <h3 className="text-2xl font-black italic tracking-tight uppercase" style={{ color: colors.text }}>Inquilinos na Plataforma</h3>
                </div>
                <div className="p-8">
                    {loading ? (
                        <div className="text-center py-20 opacity-40">
                            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 mx-auto" style={{ borderColor: colors.primary }}></div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-separate border-spacing-y-2">
                                <thead>
                                    <tr className="text-[10px] font-black uppercase tracking-widest italic" style={{ color: colors.textMuted }}>
                                        <th className="pb-4 px-6">Identidade</th>
                                        <th className="pb-4 px-6 text-center">Slug</th>
                                        <th className="pb-4 px-6 text-center">Status</th>
                                        <th className="pb-4 px-6 text-center">Cadastro</th>
                                        <th className="pb-4 px-6 text-right">Gestão</th>
                                    </tr>
                                </thead>
                                <tbody className="font-bold text-sm" style={{ color: colors.text }}>
                                    {tenants.map(t => (
                                        <tr key={t.id} className="transition-all hover:bg-white/5 group">
                                            <td className="py-4 px-6 italic rounded-l-2xl border-y border-l" style={{ borderColor: `${colors.text}0d` }}>
                                                <div className="flex items-center gap-4">
                                                    <div className="size-10 rounded-xl overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center shrink-0 relative group/logo">
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
                                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${t.active ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                                                    {t.active ? 'ATIVO' : 'PAUSADO'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-center border-y opacity-50 text-[11px]" style={{ borderColor: `${colors.text}0d` }}>{new Date(t.created_at).toLocaleDateString()}</td>
                                            <td className="py-4 px-6 text-right rounded-r-2xl border-y border-r" style={{ borderColor: `${colors.text}0d` }}>
                                                <button
                                                    onClick={() => { setSelectedTenant(t); setIsEditModalOpen(true); }}
                                                    className="size-10 rounded-xl bg-white/5 hover:bg-[#f2b90d] hover:text-black transition-all border border-white/5"
                                                >
                                                    <span className="material-symbols-outlined text-[20px]">settings_accessibility</span>
                                                </button>
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
            {isEditModalOpen && selectedTenant && (
                <div className="fixed inset-0 z-[100] flex items-start justify-center py-8 bg-black/90 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto">
                    <div className="bg-[#121214] border border-white/10 w-full max-w-[600px] rounded-[3rem] p-10 relative shadow-2xl my-8">
                        <div className="absolute top-0 left-0 w-full h-1 bg-[#f2b90d] animate-pulse"></div>

                        <button onClick={() => setIsEditModalOpen(false)} className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors">
                            <span className="material-symbols-outlined">close</span>
                        </button>

                        <div className="flex flex-col items-center mb-10">
                            <div className="size-20 rounded-2xl overflow-hidden bg-white/5 border border-white/10 mb-4 shadow-xl">
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

                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-slate-500 uppercase ml-1">URL do Logo (Imagem)</label>
                                        <input
                                            type="text"
                                            defaultValue={selectedTenant.logo_url}
                                            onChange={(e) => setSelectedTenant({ ...selectedTenant, logo_url: e.target.value })}
                                            placeholder="https://exemplo.com/logo.png"
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-[#f2b90d]/50 transition-all"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Slug (URL de Acesso)</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-3.5 text-xs text-white/30 font-bold">/</span>
                                            <input
                                                type="text"
                                                value={selectedTenant.slug}
                                                readOnly
                                                className="w-full bg-black/20 border border-white/5 rounded-xl px-4 pl-7 py-3 text-sm font-bold text-[#f2b90d] opacity-80"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Tipo de Negócio</label>
                                            <select
                                                value={selectedTenant.business_type}
                                                onChange={(e) => setSelectedTenant({ ...selectedTenant, business_type: e.target.value })}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none appearance-none"
                                            >
                                                <option value="barber" className="bg-white text-black font-bold">BARBEARIA</option>
                                                <option value="salon" className="bg-white text-black font-bold">SALÃO</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Status Pagamento</label>
                                            <select
                                                value={selectedTenant.has_paid ? 'paid' : 'pending'}
                                                onChange={(e) => setSelectedTenant({ ...selectedTenant, has_paid: e.target.value === 'paid' })}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none appearance-none"
                                            >
                                                <option value="paid" className="bg-white text-emerald-600 font-bold">PAGO / OK</option>
                                                <option value="pending" className="bg-white text-red-600 font-bold">PENDENTE</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Telefone / WhatsApp</label>
                                            <input
                                                type="text"
                                                defaultValue={selectedTenant.phone}
                                                onChange={(e) => setSelectedTenant({ ...selectedTenant, phone: e.target.value })}
                                                placeholder="(00) 00000-0000"
                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Proprietário (Nome)</label>
                                            <input
                                                type="text"
                                                defaultValue={selectedTenant.profiles?.[0]?.full_name || ''}
                                                onChange={(e) => {
                                                    const newProfiles = [...(selectedTenant.profiles || [])];
                                                    if (newProfiles[0]) {
                                                        newProfiles[0] = { ...newProfiles[0], full_name: e.target.value };
                                                    } else {
                                                        newProfiles[0] = { full_name: e.target.value };
                                                    }
                                                    setSelectedTenant({ ...selectedTenant, profiles: newProfiles });
                                                }}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-[#f2b90d]/50 transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Endereço Completo</label>
                                        <input
                                            type="text"
                                            defaultValue={selectedTenant.address}
                                            onChange={(e) => setSelectedTenant({ ...selectedTenant, address: e.target.value })}
                                            placeholder="Rua, Número, Bairro, Cidade"
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none"
                                        />
                                    </div>
                                </div>
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
                                    address: selectedTenant.address
                                })}
                                className="bg-[#f2b90d] text-black font-black py-4 rounded-2xl uppercase tracking-widest text-[9px] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                            >
                                {saving ? 'Salvando...' : 'Salvar Alterações'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
