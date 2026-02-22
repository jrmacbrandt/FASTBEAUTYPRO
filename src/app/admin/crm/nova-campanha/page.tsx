'use client';

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { createPayloadCampaign } from '@/lib/campaigns';
import { getSegmentedClients } from '@/lib/crm';
import { useRouter, useSearchParams } from 'next/navigation';

function NewCampaignContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const segment = searchParams.get('segment') || 'all';

    const [loading, setLoading] = useState(false);
    const [tenant, setTenant] = useState<any>(null);

    // Dispatch State (UX v5.2)
    const [isDispatchReady, setIsDispatchReady] = useState(false);
    const [campaignCreated, setCampaignCreated] = useState<any>(null);
    const [count, setCount] = useState(0);

    // Filter Manager Modal
    const [isListModalOpen, setIsListModalOpen] = useState(false);
    const [targetClients, setTargetClients] = useState<any[]>([]);
    const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
    const [loadingList, setLoadingList] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [filters, setFilters] = useState({
        days_inactive: 0,
        min_spent: 0,
        birth_month: 0
    });
    const [template, setTemplate] = useState('');
    const [rewardService, setRewardService] = useState<any>(null);
    const [rewardProduct, setRewardProduct] = useState<any>(null);
    const [selectedIncentive, setSelectedIncentive] = useState<'none' | 'service' | 'product'>('none');

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
                .select('name, phone, loyalty_target, loyalty_reward_service_id, loyalty_reward_product_id')
                .eq('id', tenantId)
                .single();

            if (tenantData) {
                setTenant(tenantData);

                // Fetch Reward Names if set
                if (tenantData.loyalty_reward_service_id) {
                    const { data: s } = await supabase.from('loyalty_rewards_services').select('name').eq('id', tenantData.loyalty_reward_service_id).single();
                    if (s) setRewardService({ id: tenantData.loyalty_reward_service_id, name: s.name });
                }
                if (tenantData.loyalty_reward_product_id) {
                    const { data: p } = await supabase.from('loyalty_rewards_products').select('name').eq('id', tenantData.loyalty_reward_product_id).single();
                    if (p) setRewardProduct({ id: tenantData.loyalty_reward_product_id, name: p.name });
                }
            }

            // Presets based on Segment
            const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
            const currentMonth = monthNames[new Date().getMonth()];

            let activeFilters = { days_inactive: 0, min_spent: 0, birth_month: 0 };

            if (segment === 'churn') {
                setName(`Recuperação de Inativos - ${currentMonth}`);
                setTemplate(`Olá {name}, sentimos sua falta aqui na ${tenantData?.name || 'loja'}! 👋 Preparamos uma condição especial para você voltar esta semana. Vamos agendar? ✂️`);
                activeFilters.days_inactive = 45;
            } else if (segment === 'birthdays') {
                setName(`Aniversariantes de ${currentMonth}`);
                setTemplate(`Parabéns, {name}! 🎉 A equipe da ${tenantData?.name || 'loja'} te deseja o melhor. Como presente, você ganhou um benefício exclusivo no seu próximo serviço. Vamos agendar? 🎁`);
                activeFilters.birth_month = new Date().getMonth() + 1;
            } else if (segment === 'vip') {
                setName(`Agradecimento VIP - ${currentMonth}`);
                setTemplate(`Olá {name}! 🌟 Passando para agradecer sua fidelidade à ${tenantData?.name || 'loja'}. Você é um cliente especial e preparamos um mimo para sua próxima visita. 💎`);
                activeFilters.min_spent = 500;
            } else if (segment === 'loyalty') {
                setName(`Aviso de Fidelidade - ${currentMonth}`);
                setTemplate(`Oi {name}! 🌟 Passando para avisar que falta muito pouco para o seu prêmio do cartão fidelidade na ${tenantData?.name || 'loja'}. Garanta seu horário! 🏆`);
            } else {
                setName(`Base Ativa - ${currentMonth}`);
                setTemplate(`Olá {name}! 👋 Como você está? Passando para convidar você para uma nova visita à ${tenantData?.name || 'loja'}. Temos horários para esta semana! ✂️`);
            }

            setFilters(activeFilters);

            // Auto-load targeted list
            loadTargetList(tenantId, activeFilters);
        };

        loadContext();
    }, [segment]);

    const loadTargetList = async (tId: string, f: any) => {
        setLoadingList(true);
        try {
            const list = await getSegmentedClients(tId, f);
            setTargetClients(list || []);
            setSelectedClientIds(list?.map((c: any) => c.id) || []);
        } catch (error) {
            console.error('Error loading target list:', error);
        } finally {
            setLoadingList(false);
        }
    };

    const handleCreate = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

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

            // Create payload but filters are ignored for the final items if we have a manual selection
            // However, the campaign record still needs them for reference.
            const campaignData = {
                tenant_id: tenantId,
                name,
                filters: filters,
                message_template: template,
                status: 'PROCESSED'
            };

            const { data: campaign, error: cError } = await supabase
                .from('campaigns')
                .insert(campaignData)
                .select()
                .single();

            if (cError) throw cError;

            // Filter the clients to only those selected in the list
            const finalClients = targetClients.filter(c => selectedClientIds.includes(c.id));

            if (finalClients.length > 0) {
                const items = finalClients.map(client => {
                    const firstName = client.name.split(' ')[0];
                    const msg = template.replace('{name}', firstName);
                    const encodedMsg = encodeURIComponent(msg);
                    const { WhatsAppService } = require('@/lib/whatsapp');
                    const cleanPhone = WhatsAppService.formatPhone(client.phone);

                    return {
                        campaign_id: campaign.id,
                        client_name: client.name,
                        client_phone: client.phone,
                        generated_url: `https://wa.me/${cleanPhone}?text=${encodedMsg}`,
                        status: 'PENDING'
                    };
                });

                const { error: iError } = await supabase
                    .from('campaign_items')
                    .insert(items);

                if (iError) throw iError;
            }

            setCount(finalClients.length);
            setCampaignCreated(campaign);
            setIsDispatchReady(true);

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

    const toggleClient = (id: string) => {
        setSelectedClientIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleAll = () => {
        if (selectedClientIds.length === targetClients.length) {
            setSelectedClientIds([]);
        } else {
            setSelectedClientIds(targetClients.map(c => c.id));
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8 text-slate-100 animate-in slide-in-from-bottom-5 duration-700">
            <header>
                <button onClick={() => router.push('/admin/crm')} className="text-sm text-slate-400 hover:text-white mb-4 flex items-center gap-2">
                    ← Voltar
                </button>
                <h1 className="text-3xl font-black italic tracking-tighter text-white">
                    CONFIGURAR <span className="text-[#f2b90d]">CAMPANHA</span>
                </h1>
                <p className="text-sm text-slate-400">Personalize o disparo para o público selecionado.</p>
            </header>

            <div className="bg-[#18181b] border border-white/5 rounded-2xl p-8 space-y-8 relative overflow-hidden">

                {/* OVERLAY: DISPATCH READY (UX v5.2) */}
                {isDispatchReady && (
                    <div className="absolute inset-0 z-[100] bg-[#0a0a0b]/98 backdrop-blur-2xl flex items-center justify-center p-8 animate-in fade-in duration-500">
                        <div className="w-full max-w-md text-center space-y-8">
                            <div className="size-24 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_50px_rgba(16,185,129,0.1)]">
                                <span className="material-symbols-outlined text-4xl text-emerald-500 animate-bounce">check_circle</span>
                            </div>
                            <div>
                                <h2 className="text-2xl font-black italic uppercase text-white mb-2">Campanha Preparada!</h2>
                                <p className="text-slate-400 text-sm">
                                    A estratégia &ldquo;{name}&rdquo; foi consolidada com <span className="text-white font-bold">{count} clientes</span> na fila de disparo.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <button
                                    onClick={() => router.push(`/admin/crm?start_queue=true&filter=${segment}`)}
                                    disabled={count === 0}
                                    className="w-full bg-[#f2b90d] hover:bg-[#d9a50b] disabled:bg-white/5 disabled:text-slate-500 text-black font-black uppercase tracking-widest px-8 py-5 rounded-2xl transition-all shadow-lg flex items-center justify-center gap-3 active:scale-95 group shadow-[#f2b90d]/10"
                                >
                                    <span className="material-symbols-outlined group-hover:rotate-12 transition-transform">rocket_launch</span>
                                    {count === 0 ? 'Fila Vazia' : 'Iniciar Fila de Disparo'}
                                </button>

                                <button
                                    onClick={() => setIsDispatchReady(false)}
                                    className="w-full bg-white/5 hover:bg-white/10 text-white font-black uppercase tracking-widest px-8 py-4 rounded-2xl transition-all border border-white/5"
                                >
                                    Cancelar e Voltar
                                </button>
                            </div>

                            {count === 0 && (
                                <p className="text-[10px] text-rose-500 font-bold uppercase tracking-widest animate-pulse">
                                    Nota: A lista atual não contém clientes válidos para envio.
                                </p>
                            )}
                        </div>
                    </div>
                )}

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

                {/* STEP 2: SEGMENTAÇÃO (EDITAR LISTA) */}
                <section>
                    <h3 className="text-lg font-bold text-white mb-4 border-b border-white/5 pb-2">2. Segmentação (Público-Alvo)</h3>
                    <div className="bg-black/40 border border-white/5 rounded-2xl p-6 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] uppercase font-black tracking-widest text-[#f2b90d] mb-1">Público Selecionado</p>
                            <div className="flex items-center gap-3">
                                <p className="text-xl font-black italic uppercase text-white">{getSegmentLabel()}</p>
                                <span className="bg-white/10 px-2 py-0.5 rounded text-[10px] font-bold text-white/50">{selectedClientIds.length} selecionados</span>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsListModalOpen(true)}
                            className="bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-xl transition-all flex items-center gap-2 border border-white/5 shadow-lg shadow-black/20"
                        >
                            <span className="material-symbols-outlined text-sm">checklist</span>
                            EDITAR LISTA
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

                {/* STEP 4: INCENTIVO (RECOMPENSA DE FIDELIDADE) */}
                <section>
                    <h3 className="text-lg font-bold text-white mb-4 border-b border-white/5 pb-2">4. Incentivo da Campanha (Opcional)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <button
                            onClick={() => setSelectedIncentive('none')}
                            className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${selectedIncentive === 'none' ? 'bg-[#f2b90d]/5 border-[#f2b90d] text-[#f2b90d]' : 'bg-black/20 border-white/10 text-slate-500'}`}
                        >
                            <span className="material-symbols-outlined italic">block</span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-center">Nenhum Prêmio</span>
                        </button>

                        <button
                            onClick={() => {
                                setSelectedIncentive('service');
                                if (rewardService) {
                                    const textToAdd = ` 🎉 Você terá direito a um(a) ${rewardService.name} grátis!`;
                                    if (!template.includes(rewardService.name)) setTemplate(prev => prev + textToAdd);
                                } else {
                                    alert('Configure um serviço de prêmio no painel de fidelidade primeiro.');
                                }
                            }}
                            disabled={!rewardService}
                            className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 disabled:opacity-30 ${selectedIncentive === 'service' ? 'bg-[#f2b90d]/5 border-[#f2b90d] text-[#f2b90d]' : 'bg-black/20 border-white/10 text-slate-500'}`}
                        >
                            <span className="material-symbols-outlined italic">content_cut</span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-center">
                                {rewardService ? `Serviço: ${rewardService.name}` : 'Sem Serviço de Prêmio'}
                            </span>
                        </button>

                        <button
                            onClick={() => {
                                setSelectedIncentive('product');
                                if (rewardProduct) {
                                    const textToAdd = ` 🎁 Ganhe um(a) ${rewardProduct.name} em sua próxima visita!`;
                                    if (!template.includes(rewardProduct.name)) setTemplate(prev => prev + textToAdd);
                                } else {
                                    alert('Configure um produto de prêmio no painel de fidelidade primeiro.');
                                }
                            }}
                            disabled={!rewardProduct}
                            className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 disabled:opacity-30 ${selectedIncentive === 'product' ? 'bg-[#f2b90d]/5 border-[#f2b90d] text-[#f2b90d]' : 'bg-black/20 border-white/10 text-slate-500'}`}
                        >
                            <span className="material-symbols-outlined italic">shopping_bag</span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-center">
                                {rewardProduct ? `Produto: ${rewardProduct.name}` : 'Sem Produto de Prêmio'}
                            </span>
                        </button>
                    </div>
                </section>

                {/* VISUALIZAÇÃO PRÉVIA */}
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

            {/* MODAL: EDITAR LISTA DE CLIENTES (CIRÚRGICO) */}
            {isListModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-[#121214] border border-white/10 w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-white/5 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-black italic uppercase text-white">Editar Lista: {getSegmentLabel()}</h3>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Selecione quem receberá o disparo desta campanha.</p>
                            </div>
                            <button
                                onClick={() => setIsListModalOpen(false)}
                                className="size-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 transition-all"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-0 max-h-[60vh] overflow-y-auto scrollbar-hide">
                            <div className="p-6 space-y-2">
                                {/* Select All Button */}
                                <div className="flex justify-between items-center px-4 py-3 bg-white/[0.02] border border-white/5 rounded-2xl mb-4">
                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                        Total encontrado: {targetClients.length}
                                    </p>
                                    <button
                                        onClick={toggleAll}
                                        className="text-[#f2b90d] text-[10px] font-black uppercase tracking-widest hover:underline"
                                    >
                                        {selectedClientIds.length === targetClients.length ? 'DESSELECIONAR TUDO' : 'SELECIONAR TUDO'}
                                    </button>
                                </div>

                                {loadingList ? (
                                    <div className="py-12 text-center text-slate-600 animate-pulse">Carregando lista filtrada...</div>
                                ) : targetClients.length === 0 ? (
                                    <div className="py-12 text-center space-y-3 opacity-30">
                                        <span className="material-symbols-outlined text-4xl">person_off</span>
                                        <p className="text-[10px] font-black uppercase tracking-widest">Nenhum cliente atende a estes critérios.</p>
                                    </div>
                                ) : (
                                    targetClients.map(client => (
                                        <div
                                            key={client.id}
                                            onClick={() => toggleClient(client.id)}
                                            className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${selectedClientIds.includes(client.id) ? 'bg-[#f2b90d]/5 border-[#f2b90d]/20' : 'bg-black/20 border-white/5'}`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`size-5 rounded-md border flex items-center justify-center transition-all ${selectedClientIds.includes(client.id) ? 'bg-[#f2b90d] border-[#f2b90d] text-black' : 'bg-white/5 border-white/10 text-transparent'}`}>
                                                    <span className="material-symbols-outlined text-[14px]">check</span>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black uppercase text-white leading-none">{client.name}</p>
                                                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter mt-1">{client.phone}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-bold text-slate-400">R$ {client.total_spent || '0,00'}</p>
                                                <p className="text-[8px] font-black uppercase tracking-widest text-[#f2b90d] opacity-50">LTV</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="p-8 border-t border-white/5 flex gap-4 bg-black/20">
                            <button
                                onClick={() => setIsListModalOpen(false)}
                                className="flex-1 bg-[#f2b90d] text-black font-black uppercase text-[10px] tracking-widest py-4 rounded-2xl transition-all shadow-xl shadow-[#f2b90d]/10"
                            >
                                SALVAR SELEÇÃO ({selectedClientIds.length})
                            </button>
                        </div>
                    </div>
                </div>
            )}
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
