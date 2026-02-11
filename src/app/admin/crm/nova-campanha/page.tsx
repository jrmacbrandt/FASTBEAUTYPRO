'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { createPayloadCampaign } from '@/lib/campaigns';
import { useRouter } from 'next/navigation';

export default function NewCampaignPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1);

    // Form State
    const [name, setName] = useState('');
    const [filters, setFilters] = useState({
        days_inactive: 0,
        min_spent: 0,
        birth_month: 0
    });
    const [template, setTemplate] = useState('Olá {name}, estamos com saudades! Agende seu horário e ganhe 10% OFF.');

    const handleCreate = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            // Limpar filtros zerados
            const activeFilters: any = {};
            if (filters.days_inactive > 0) activeFilters.days_inactive = filters.days_inactive;
            if (filters.min_spent > 0) activeFilters.min_spent = filters.min_spent;
            if (filters.birth_month > 0) activeFilters.birth_month = filters.birth_month;

            const { count } = await createPayloadCampaign(
                user.user_metadata.tenant_id,
                name,
                activeFilters,
                template
            );

            alert(`Campanha criada com sucesso! ${count} clientes na lista.`);
            router.push('/admin/crm');

        } catch (error: any) {
            console.error('Error creating campaign:', error);
            alert('Erro ao criar campanha: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8 text-slate-100 animate-in slide-in-from-bottom-5 duration-700">
            <header>
                <button onClick={() => router.back()} className="text-sm text-slate-400 hover:text-white mb-4 flex items-center gap-2">
                    ← Voltar
                </button>
                <h1 className="text-3xl font-black italic tracking-tighter text-white">
                    NOVA <span className="text-[#f2b90d]">CAMPANHA</span>
                </h1>
                <p className="text-sm text-slate-400">Crie listas de transmissão para reengajar seus clientes.</p>
            </header>

            <div className="bg-[#18181b] border border-white/5 rounded-2xl p-8 space-y-8">

                {/* STEP 1: DADOS BÁSICOS */}
                <section>
                    <h3 className="text-lg font-bold text-white mb-4 border-b border-white/5 pb-2">1. Nome da Campanha</h3>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ex: Recuperação de Inativos - Março"
                        className="w-full bg-black/20 border border-white/10 rounded-lg p-4 text-white focus:border-[#f2b90d] outline-none transition-all"
                    />
                </section>

                {/* STEP 2: SEGMENTAÇÃO */}
                <section>
                    <h3 className="text-lg font-bold text-white mb-4 border-b border-white/5 pb-2">2. Segmentação (Quem recebe?)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs uppercase font-bold text-slate-500">Dias sem Visita (Mínimo)</label>
                            <input
                                type="number"
                                value={filters.days_inactive}
                                onChange={(e) => setFilters({ ...filters, days_inactive: Number(e.target.value) })}
                                className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white"
                            />
                            <p className="text-[10px] text-slate-600">Ex: 45 dias (Churn Risk)</p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs uppercase font-bold text-slate-500">Gasto Total Mínimo (R$)</label>
                            <input
                                type="number"
                                value={filters.min_spent}
                                onChange={(e) => setFilters({ ...filters, min_spent: Number(e.target.value) })}
                                className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white"
                            />
                            <p className="text-[10px] text-slate-600">Para clientes VIP</p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs uppercase font-bold text-slate-500">Mês de Aniversário</label>
                            <select
                                value={filters.birth_month}
                                onChange={(e) => setFilters({ ...filters, birth_month: Number(e.target.value) })}
                                className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white"
                            >
                                <option value={0}>Todos</option>
                                <option value={1}>Janeiro</option>
                                <option value={2}>Fevereiro</option>
                                <option value={12}>Dezembro</option>
                                {/* Simplificado para MVP */}
                            </select>
                        </div>
                    </div>
                </section>

                {/* STEP 3: MENSAGEM */}
                <section>
                    <h3 className="text-lg font-bold text-white mb-4 border-b border-white/5 pb-2">3. Mensagem (WhatsApp)</h3>
                    <div className="relative">
                        <textarea
                            value={template}
                            onChange={(e) => setTemplate(e.target.value)}
                            rows={4}
                            className="w-full bg-black/20 border border-white/10 rounded-lg p-4 text-white focus:border-[#f2b90d] outline-none transition-all"
                        />
                        <div className="absolute bottom-4 right-4 text-xs text-slate-500 bg-black/50 px-2 py-1 rounded">
                            Variáveis: {'{name}'} será substituído pelo primeiro nome.
                        </div>
                    </div>
                </section>

                {/* VISUALIZAÇÃO PRÉVIA (TESTE) */}
                <section className="bg-black/40 p-6 rounded-2xl border border-white/5">
                    <h3 className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-widest">Pré-visualização (Simulação)</h3>

                    <div className="flex gap-4 items-start">
                        <div className="bg-[#075e54] p-4 rounded-lg text-white text-sm max-w-sm shadow-lg relative">
                            {/* Ponta do balão do WhatsApp */}
                            <div className="absolute top-0 -left-2 w-0 h-0 border-t-[10px] border-t-[#075e54] border-l-[10px] border-l-transparent transform rotate-90"></div>

                            <p className="whitespace-pre-wrap">{template.replace('{name}', 'Cliente')}</p>
                            <span className="text-[10px] text-white/60 block text-right mt-1">10:42</span>
                        </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-white/5">
                        <p className="text-xs text-slate-500 mb-2">Link Gerado (Exemplo para um cliente):</p>
                        <code className="block bg-black/50 p-3 rounded-lg text-[10px] text-emerald-400 font-mono break-all border border-white/5">
                            {`https://wa.me/5511999999999?text=${encodeURIComponent(template.replace('{name}', 'Cliente'))}`}
                        </code>
                        <a
                            href={`https://wa.me/5511999999999?text=${encodeURIComponent(template.replace('{name}', 'Cliente'))}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-xs font-bold text-[#f2b90d] mt-3 hover:underline"
                        >
                            <span className="material-symbols-outlined text-sm">open_in_new</span>
                            Testar Link Real
                        </a>
                    </div>
                </section>

                <div className="pt-6 border-t border-white/5 flex justify-end">
                    <button
                        onClick={handleCreate}
                        disabled={loading || !name}
                        className="bg-[#f2b90d] hover:bg-[#d9a50b] text-black font-black uppercase tracking-widest px-8 py-4 rounded-xl transition-all shadow-lg hover:shadow-[#f2b90d]/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Gerando Lista...' : 'CRIAR CAMPANHA'}
                    </button>
                </div>

            </div>
        </div>
    );
}
