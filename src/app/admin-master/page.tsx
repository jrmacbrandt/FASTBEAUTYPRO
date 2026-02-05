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
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) {
            setTenants(data);
        }
        setLoading(false);
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
                const { error } = await supabase.from('tenants').update(data).eq('id', selectedTenant.id);
                if (error) throw error;
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
                                                    <div className="size-10 rounded-xl overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                                                        {t.logo_url ? (
                                                            <img src={t.logo_url} alt={t.name} className="size-full object-cover" />
                                                        ) : (
                                                            <span className="material-symbols-outlined opacity-30">storefront</span>
                                                        )}
                                                    </div>
                                                    <span className="font-black uppercase tracking-tight">{t.name}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 text-center border-y" style={{ borderColor: `${colors.text}0d`, color: colors.primary }}>/{t.slug}</td>
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
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-[#121214] border border-white/10 w-full max-w-[500px] rounded-[3rem] p-10 relative overflow-hidden shadow-2xl">
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
                            <p className="text-[#f2b90d] text-[10px] font-black uppercase tracking-[0.3em] mt-2 opacity-60">ID Inquilino: {selectedTenant.id.slice(0, 8)}</p>
                        </div>

                        <div className="space-y-4">
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

                            <div className="p-6 rounded-3xl bg-white/5 border border-white/5 space-y-4">
                                <h4 className="text-white text-[11px] font-black uppercase tracking-widest opacity-40">Dados do Estabelecimento</h4>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center bg-black/20 p-3 rounded-xl">
                                        <span className="text-slate-500 text-[10px] font-bold">Slug Atual</span>
                                        <span className="text-[#f2b90d] text-[10px] font-black tracking-widest uppercase">/{selectedTenant.slug}</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-black/20 p-3 rounded-xl">
                                        <span className="text-slate-500 text-[10px] font-bold">Tipo de Negócio</span>
                                        <span className="text-white text-[10px] font-black tracking-widest uppercase">{selectedTenant.business_type === 'salon' ? 'Salão' : 'Barbearia'}</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-black/20 p-3 rounded-xl">
                                        <span className="text-slate-500 text-[10px] font-bold">Pagamento</span>
                                        <span className={`text-[10px] font-black tracking-widest uppercase ${selectedTenant.has_paid ? 'text-emerald-500' : 'text-red-500'}`}>{selectedTenant.has_paid ? 'OK' : 'PENDENTE'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button
                            disabled={saving}
                            onClick={() => setIsEditModalOpen(false)}
                            className="w-full mt-8 bg-white/5 text-slate-400 font-black py-5 rounded-2xl uppercase italic tracking-widest text-[10px] hover:text-white transition-all"
                        >
                            FECHAR GERENCIAMENTO
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
