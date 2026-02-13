'use client';

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { createPayloadCampaign } from '@/lib/campaigns';
import { useRouter, useSearchParams } from 'next/navigation';

function NewCampaignContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const segment = searchParams.get('segment') || 'all';

    const [loading, setLoading] = useState(false);
    const [tenant, setTenant] = useState<any>(null);

    // Form State
    const [name, setName] = useState('');
    const [filters, setFilters] = useState({
        days_inactive: 0,
        min_spent: 0,
        birth_month: 0
    });
    const [template, setTemplate] = useState('');

    useEffect(() => {
        const loadContext = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase
                .from('profiles')
                .select('tenant_id')
                .eq('id', user.id)
                .single();

            const tenantId = profile?.tenant_id || user.user_metadata.tenant_id;

            if (!tenantId) {
                console.error('No tenant_id found');
                return;
            }

            const { data: tenantData } = await supabase
                .from('tenants')
                .select('name, phone, loyalty_target')
                .eq('id', tenantId)
                .single();

            if (tenantData) setTenant(tenantData);

            // Presets based on Segment
            const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
            const currentMonth = monthNames[new Date().getMonth()];

            if (segment === 'churn') {
                setName(`Recuperação de Inativos - ${currentMonth}`);
                setTemplate(`Olá {name}, sentimos sua falta aqui na ${tenantData?.name || 'loja'}! 👋 Preparamos uma condição especial para você voltar esta semana. Vamos agendar? ✂️`);
                setFilters(prev => ({ ...prev, days_inactive: 45 }));
            } else if (segment === 'birthdays') {
                setName(`Aniversariantes de ${currentMonth}`);
                setTemplate(`Parabéns, {name}! 🎉 A equipe da ${tenantData?.name || 'loja'} te deseja o melhor. Como presente, você ganhou um benefício exclusivo no seu próximo serviço. Vamos agendar? 🎁`);
                setFilters(prev => ({ ...prev, birth_month: new Date().getMonth() + 1 }));
            } else if (segment === 'vip') {
                setName(`Agradecimento VIP - ${currentMonth}`);
                setTemplate(`Olá {name}! 🌟 Passando para agradecer sua fidelidade à ${tenantData?.name || 'loja'}. Você é um cliente especial e preparamos um mimo para sua próxima visita. 💎`);
                setFilters(prev => ({ ...prev, min_spent: 500 }));
            } else if (segment === 'loyalty') {
                setName(`Aviso de Fidelidade - ${currentMonth}`);
                setTemplate(`Oi {name}! 🌟 Passando para avisar que falta muito pouco para o seu prêmio do cartão fidelidade na ${tenantData?.name || 'loja'}. Garanta seu horário! 🏆`);
            } else {
                setName(`Base Ativa - ${currentMonth}`);
                setTemplate(`Olá {name}! 👋 Como você está? Passando para convidar você para uma nova visita à ${tenantData?.name || 'loja'}. Temos horários para esta semana! ✂️`);
            }
        };

        loadContext();
    }, [segment]);

    const handleCreate = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            const activeFilters: any = {};
            if (filters.days_inactive > 0) activeFilters.days_inactive = filters.days_inactive;
            if (filters.min_spent > 0) activeFilters.min_spent = filters.min_spent;
            if (filters.birth_month > 0) activeFilters.birth_month = filters.birth_month;

            const { data: profile } = await supabase
                .from('profiles')
                .select('tenant_id')
                .eq('id', user.id)
                .single();

            const tenantId = profile?.tenant_id || user.user_metadata.tenant_id;

            if (!tenantId) {
                alert('Erro: Seu perfil não possui uma unidade vinculada.');
                setLoading(false);
                return;
            }

            const { count } = await createPayloadCampaign(
                tenantId,
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

    const getSegmentLabel = () => {
        switch (segment) {
            case 'churn': return 'Clientes Inativos (+45 dias)';
            case 'birthdays': return 'Aniversariantes do Mês';
            case 'vip': return 'Clientes VIP (LTV > R$ 500)';
            case 'loyalty': return 'Próximos de Recompensa (> 70% Meta)';
            default: return 'Toda a Base Ativa';
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8 text-slate-100 animate-in slide-in-from-bottom-5 duration-700">
            <header>
                <button onClick={() => router.back()} className="text-sm text-slate-400 hover:text-white mb-4 flex items-center gap-2">
                    ← Voltar
                </button>
                <h1 className="text-3xl font-black italic tracking-tighter text-white">
                    CONFIGURAR <span className="text-[#f2b90d]">CAMPANHA</span>
                </h1>
                <p className="text-sm text-slate-400">Personalize o disparo para o público selecionado.</p>
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

                {/* STEP 2: SEGMENTAÇÃO (Remodelado) */}
                <section>
                    <h3 className="text-lg font-bold text-white mb-4 border-b border-white/5 pb-2">2. Segmentação (Público-Alvo)</h3>
                    <div className="bg-black/40 border border-white/5 rounded-2xl p-6 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] uppercase font-black tracking-widest text-[#f2b90d] mb-1">Público Selecionado</p>
                            <p className="text-xl font-black italic uppercase text-white">{getSegmentLabel()}</p>
                        </div>
                        <button
                            onClick={() => router.push('/admin/crm')}
                            className="bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-xl transition-all flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined text-sm">edit</span>
                            Alterar Público
                        </button>
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
                            <div className="absolute top-0 -left-2 w-0 h-0 border-t-[10px] border-t-[#075e54] border-l-[10px] border-l-transparent transform rotate-90"></div>
                            <p className="whitespace-pre-wrap">{template.replace('{name}', 'Cliente')}</p>
                            <span className="text-[10px] text-white/60 block text-right mt-1">10:42</span>
                        </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-white/5">
                        <p className="text-xs text-slate-500 mb-2">Link Gerado (Usando Telefone da Loja):</p>
                        <code className="block bg-black/50 p-3 rounded-lg text-[10px] text-emerald-400 font-mono break-all border border-white/5">
                            {`https://wa.me/${tenant?.phone?.replace(/\D/g, '') || '5511999999999'}?text=${encodeURIComponent(template.replace('{name}', 'Cliente'))}`}
                        </code>
                        <a
                            href={`https://wa.me/${tenant?.phone?.replace(/\D/g, '') || '5511999999999'}?text=${encodeURIComponent(template.replace('{name}', 'Cliente'))}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-xs font-bold text-[#f2b90d] mt-3 hover:underline"
                        >
                            <span className="material-symbols-outlined text-sm">open_in_new</span>
                            Testar Link Real da Loja
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

export default function NewCampaignPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-slate-500">Carregando contexto da campanha...</div>}>
            <NewCampaignContent />
        </Suspense>
    );
}
