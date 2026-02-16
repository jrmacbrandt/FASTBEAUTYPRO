'use client';

import { useEffect, useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getSegmentedClients } from '@/lib/crm';

import { useProfile } from '@/hooks/useProfile';

function CRMContent() {
    const { profile, loading: profileLoading, businessType, theme: colors } = useProfile();

    const [loading, setLoading] = useState(true);
    const [tenant, setTenant] = useState<any>(null);
    const [stats, setStats] = useState({
        totalClients: 0,
        churnRisk: 0,
        vipClients: 0,
        birthdays: 0,
        loyaltyPending: 0
    });
    const [savingLoyalty, setSavingLoyalty] = useState(false);
    const [selectedLoyaltyTarget, setSelectedLoyaltyTarget] = useState<number | null>(null);
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);
    const [clientsList, setClientsList] = useState<any[]>([]);
    const [selectedClients, setSelectedClients] = useState<string[]>([]);
    const [isDeleting, setIsDeleting] = useState(false);

    // CRM v4.5 State 
    const [activeFilter, setActiveFilter] = useState<'all' | 'churn' | 'vip' | 'birthdays' | 'loyalty'>('all');
    const [engagementData, setEngagementData] = useState<{ [key: string]: any[] }>({
        all: [],
        churn: [],
        vip: [],
        birthdays: [],
        loyalty: []
    });
    const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
    const [campaignClient, setCampaignClient] = useState<any>(null);
    const [campaignMessage, setCampaignMessage] = useState('');
    const [updatingContact, setUpdatingContact] = useState<string | null>(null);

    // CRM v5.0 Queue State
    const [queue, setQueue] = useState<any[]>([]);
    const [isQueueActive, setIsQueueActive] = useState(false);
    const [currentQueueIndex, setCurrentQueueIndex] = useState(0);
    const [queueFinished, setQueueFinished] = useState(false);
    const [isNextLoading, setIsNextLoading] = useState(false);
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [campaignDetailsItems, setCampaignDetailsItems] = useState<any[]>([]);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [isDeletingCampaign, setIsDeletingCampaign] = useState<string | null>(null);
    const [isClearingHistory, setIsClearingHistory] = useState(false);

    const searchParams = useSearchParams();

    // CRM v5.1: Efeito para disparo automático vindo da criação de campanha
    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        const startNow = searchParams.get('start_queue');
        const filterParam = searchParams.get('filter') as any;

        if (startNow === 'true' && !loading && Object.keys(engagementData).length > 0) {
            const targetFilter = filterParam || activeFilter;
            const list = engagementData[targetFilter] || [];

            if (list.length > 0) {
                setActiveFilter(targetFilter);
                setQueue(list);
                setCurrentQueueIndex(0);
                setIsQueueActive(true);
                setQueueFinished(false);

                // Limpar parâmetros da URL sem recarregar (opcional, mas bom UX)
                window.history.replaceState({}, '', '/admin/crm');
            }
        }
    }, [searchParams, loading, engagementData]);



    useEffect(() => {
        if (profile?.tenant_id) {
            fetchData(profile.tenant_id);
        }
    }, [profile]);

    const fetchData = async (tid: string) => {
        if (!tid) return;
        setLoading(true);
        try {
            // optimized fetchData using Promise.all for parallel performance
            const [
                { data: tenantData },
                { count: total },
                churnClients,
                vipClients,
                bdayClients,
                { data: appointments },
                { data: allClients }
            ] = await Promise.all([
                supabase.from('tenants').select('id, loyalty_target, name, business_type, phone').eq('id', tid).single(),
                supabase.from('clients').select('*', { count: 'exact', head: true }).eq('tenant_id', tid),
                getSegmentedClients(tid, { days_inactive: 45 }),
                getSegmentedClients(tid, { min_spent: 500 }),
                getSegmentedClients(tid, { birth_month: new Date().getMonth() + 1 }),
                supabase.from('appointments').select('client_id').eq('tenant_id', tid).eq('status', 'paid'),
                supabase.from('clients').select('*').eq('tenant_id', tid).order('name')
            ]);

            const currentTarget = tenantData?.loyalty_target || 5;
            if (tenantData) {
                setTenant(tenantData);
                setSelectedLoyaltyTarget(currentTarget);
            }

            const countsMap: Record<string, number> = {};
            if (appointments) {
                appointments.forEach(ap => {
                    if (ap.client_id) {
                        countsMap[ap.client_id] = (countsMap[ap.client_id] || 0) + 1;
                    }
                });
            }

            const threshold = Math.ceil(currentTarget * 0.7);
            const loyaltyClientsList: any[] = [];
            (allClients || []).forEach(c => {
                const count = countsMap[c.id] || 0;
                if (count >= threshold && count < currentTarget) {
                    loyaltyClientsList.push({ ...c, stamps_count: count });
                }
            });

            setEngagementData({
                all: allClients || [],
                churn: churnClients,
                vip: vipClients,
                birthdays: bdayClients,
                loyalty: loyaltyClientsList
            });

            setStats({
                totalClients: total || 0,
                churnRisk: churnClients.length,
                vipClients: vipClients.length,
                birthdays: bdayClients.length,
                loyaltyPending: loyaltyClientsList.length
            });

            // 7. Fetch Campaign History
            const { data: campaignData } = await supabase
                .from('campaigns')
                .select(`
                    *,
                    campaign_items!campaign_id (count)
                `)
                .eq('tenant_id', tid)
                .order('created_at', { ascending: false });

            setCampaigns(campaignData || []);

        } catch (error) {
            console.error('Error fetching CRM stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveLoyalty = async () => {
        if (!tenant || selectedLoyaltyTarget === null) return;

        setSavingLoyalty(true);
        try {
            const { error } = await supabase
                .from('tenants')
                .update({ loyalty_target: selectedLoyaltyTarget })
                .eq('id', tenant.id);

            if (!error) {
                setTenant((prev: any) => ({ ...prev, loyalty_target: selectedLoyaltyTarget }));
                alert('Configurações de fidelidade salvas com sucesso!');
                // Re-fetch to update the pending rewards based on new target
                fetchData(tenant.id);
            } else {
                throw error;
            }
        } catch (err: any) {
            console.error('Save loyalty target failed:', err);
            alert('Erro ao salvar: ' + err.message);
        } finally {
            setSavingLoyalty(false);
        }
    };

    const handleDeleteClients = async () => {
        if (selectedClients.length === 0) return;
        if (!confirm(`Deseja realmente excluir ${selectedClients.length} cliente(s)? Esta ação é irreversível.`)) return;

        setIsDeleting(true);
        try {
            const { error } = await supabase
                .from('clients')
                .delete()
                .in('id', selectedClients);

            if (error) throw error;

            alert('Clientes excluídos com sucesso.');
            setSelectedClients([]);
            if (profile?.tenant_id) fetchData(profile.tenant_id); // Refresh counts
            if (isClientModalOpen) {
                // Refresh list if modal still open
                const { data } = await supabase
                    .from('clients')
                    .select('*')
                    .eq('tenant_id', tenant.id)
                    .order('name');
                setClientsList(data || []);
            }
        } catch (error: any) {
            console.error('Delete clients failed:', error);
            alert('Erro ao excluir: ' + error.message);
        } finally {
            setIsDeleting(false);
        }
    };

    const openClientManager = async () => {
        setIsClientModalOpen(true);
        if (!tenant) return;

        try {
            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .eq('tenant_id', tenant.id)
                .order('name');

            if (error) throw error;
            setClientsList(data || []);
        } catch (err) {
            console.error('Load clients failed:', err);
        }
    };

    const openCampaignModal = (client: any, type: 'recovery' | 'birthday' | 'loyalty' | 'manual') => {
        setCampaignClient(client);
        let template = '';
        const firstName = client.name.split(' ')[0];
        const storeName = tenant?.name || 'nossa loja';

        if (type === 'recovery') {
            template = `Olá, ${firstName}! 👋 Sentimos sua falta aqui na ${storeName}. Preparamos uma condição especial para você voltar a cuidar do seu visual esta semana. Que tal um horário? ✂️`;
        } else if (type === 'birthday') {
            template = `Parabéns, ${firstName}! 🎉 A equipe da ${storeName} te deseja o melhor. Como presente, você ganhou um benefício exclusivo no seu próximo serviço conosco. Vamos agendar? 🎁`;
        } else if (type === 'loyalty') {
            const stamps = client.stamps_count || 0;
            template = `Oi, ${firstName}! 🌟 Passando para avisar que você já tem ${stamps} selos no seu cartão fidelidade! Falta muito pouco para o seu prêmio. Garanta seu horário e complete seu cartão! 🏆`;
        }

        setCampaignMessage(template);
        setIsCampaignModalOpen(true);
    };

    const openCampaignDetails = async (campaign: any) => {
        setSelectedCampaign(campaign);
        setIsDetailsModalOpen(true);
        setLoadingDetails(true);
        try {
            const { data } = await supabase
                .from('campaign_items')
                .select('*')
                .eq('campaign_id', campaign.id)
                .order('client_name');
            setCampaignDetailsItems(data || []);
        } catch (error) {
            console.error('Error fetching campaign items:', error);
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleDeleteCampaign = async (id: string, name: string) => {
        if (!confirm(`Deseja realmente excluir a campanha "${name}"? Esta ação removerá permanentemente todos os registros de envios associados.`)) return;

        setIsDeletingCampaign(id);
        try {
            // Primeiro removemos os itens (garante limpeza mesmo sem cascade configurado no banco)
            await supabase.from('campaign_items').delete().eq('campaign_id', id);

            // Depois removemos a campanha
            const { error } = await supabase.from('campaigns').delete().eq('id', id);

            if (error) throw error;

            setCampaigns(prev => prev.filter(c => c.id !== id));
        } catch (err: any) {
            console.error('Delete campaign failed:', err);
            alert('Erro ao excluir: ' + err.message);
        } finally {
            setIsDeletingCampaign(null);
        }
    };

    const handleClearHistory = async () => {
        if (!tenant) return;
        if (!confirm('🚨 ATENÇÃO: Deseja realmente LIMPAR TODO O HISTÓRICO? Esta ação é irreversível e excluirá todos os registros de campanhas e envios manuais de sua unidade.')) return;

        setIsClearingHistory(true);
        try {
            // Buscamos os IDs das campanhas do tenant para limpar os itens
            const { data: campaignIds } = await supabase
                .from('campaigns')
                .select('id')
                .eq('tenant_id', tenant.id);

            if (campaignIds && campaignIds.length > 0) {
                const ids = campaignIds.map(c => c.id);
                // Limpa itens órfãos se não houver cascade
                await supabase.from('campaign_items').delete().in('campaign_id', ids);
                // Limpa as campanhas
                const { error } = await supabase.from('campaigns').delete().eq('tenant_id', tenant.id);
                if (error) throw error;
            }

            setCampaigns([]);
            alert('Histórico esvaziado com sucesso.');
        } catch (err: any) {
            console.error('Clear history failed:', err);
            alert('Erro ao limpar histórico: ' + err.message);
        } finally {
            setIsClearingHistory(false);
        }
    };

    const logManualSend = async (client: any, message: string) => {
        if (!tenant) return;
        const today = new Date().toISOString().split('T')[0];
        const campaignName = `Envios Manuais - ${today}`;

        try {
            // 1. Tentar encontrar a campanha de hoje
            let { data: campaign } = await supabase
                .from('campaigns')
                .select('id')
                .eq('tenant_id', tenant.id)
                .eq('name', campaignName)
                .maybeSingle();

            if (!campaign) {
                const { data: newCampaign, error: cError } = await supabase
                    .from('campaigns')
                    .insert({
                        tenant_id: tenant.id,
                        name: campaignName,
                        status: 'COMPLETED',
                        filters: {},
                        message_template: 'Manual'
                    })
                    .select()
                    .single();
                if (cError) throw cError;
                campaign = newCampaign;
            }

            // 2. Registrar o item
            await supabase
                .from('campaign_items')
                .insert({
                    campaign_id: campaign.id,
                    client_name: client.name,
                    client_phone: client.phone,
                    status: 'SENT',
                    generated_url: 'whatsapp://manual'
                });

            // Recarregar histórico discretamente
            const { data: refreshedCampaigns } = await supabase
                .from('campaigns')
                .select('*, campaign_items!campaign_id (count)')
                .eq('tenant_id', tenant.id)
                .order('created_at', { ascending: false });
            setCampaigns(refreshedCampaigns || []);

        } catch (err) {
            console.error('Error logging manual send:', err);
        }
    };

    const handleWhatsAppSend = async () => {
        if (!campaignClient) return;

        setUpdatingContact(campaignClient.id);
        try {
            // Update last_contact_at
            await supabase
                .from('clients')
                .update({ last_contact_at: new Date().toISOString() })
                .eq('id', campaignClient.id);

            const phone = campaignClient.phone.replace(/\D/g, '');
            const encodedMsg = encodeURIComponent(campaignMessage);
            const url = `https://wa.me/${phone}?text=${encodedMsg}`;

            window.open(url, '_blank');
            setIsCampaignModalOpen(false);

            // Log the communication
            await logManualSend(campaignClient, campaignMessage);

            fetchData(); // Refresh to update "Último Contato" status
        } catch (error) {
            console.error('Update contact failed:', error);
        } finally {
            setUpdatingContact(null);
        }
    };

    // CRM v5.0 Queue Functions
    const startQueue = () => {
        const list = engagementData[activeFilter] || [];
        if (list.length === 0) return;
        setQueue(list);
        setCurrentQueueIndex(0);
        setIsQueueActive(true);
        setQueueFinished(false);
    };

    const handleQueueSend = async () => {
        const client = queue[currentQueueIndex];
        if (!client) return;

        setIsNextLoading(true);
        try {
            // Log contact
            await supabase
                .from('clients')
                .update({ last_contact_at: new Date().toISOString() })
                .eq('id', client.id);

            // Generate message based on activeFilter
            let msg = '';
            const firstName = client.name.split(' ')[0];
            const storeName = tenant?.name || 'nossa loja';

            if (activeFilter === 'churn') {
                msg = `Olá, ${firstName}! 👋 Sentimos sua falta aqui na ${storeName}. Preparamos uma condição especial para você voltar a cuidar do seu visual esta semana. Que tal um horário? ✂️`;
            } else if (activeFilter === 'birthdays') {
                msg = `Parabéns, ${firstName}! 🎉 A equipe da ${storeName} te deseja o melhor. Como presente, você ganhou um benefício exclusivo no seu próximo serviço conosco. Vamos agendar? 🎁`;
            } else if (activeFilter === 'vip') {
                msg = `Olá, ${firstName}! 🌟 Passando para agradecer sua fidelidade à ${storeName}. Você é um cliente muito especial para nós e preparamos um mimo para sua próxima visita. Vamos marcar? 💎`;
            } else if (activeFilter === 'loyalty') {
                msg = `Oi, ${firstName}! 🌟 Passando para avisar que falta muito pouco para o seu prêmio do cartão fidelidade da ${storeName}. Garanta seu horário e complete seu cartão! 🏆`;
            } else {
                msg = `Olá, ${firstName}! 👋 Como você está? Passando para convidar você para uma nova visita à ${storeName}. Temos horários disponíveis para esta semana! ✂️`;
            }

            const phone = client.phone.replace(/\D/g, '');
            const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;

            window.open(url, '_blank');

            // Log the communication
            await logManualSend(client, msg);

            // Wait 2 seconds before allowing next (anti-spam visual delay)
            setTimeout(() => {
                if (currentQueueIndex < queue.length - 1) {
                    setCurrentQueueIndex(prev => prev + 1);
                } else {
                    setQueueFinished(true);
                }
                setIsNextLoading(false);
            }, 2000);

        } catch (error) {
            console.error('Queue send failed:', error);
            setIsNextLoading(false);
        }
    };

    const skipQueueClient = () => {
        if (currentQueueIndex < queue.length - 1) {
            setCurrentQueueIndex(prev => prev + 1);
        } else {
            setQueueFinished(true);
        }
    };

    // Correcting the change detection: ensure we check the exact values
    const hasChanges = tenant && Number(selectedLoyaltyTarget) !== Number(tenant.loyalty_target);

    const loyaltyPreviewCircles = useMemo(() => {
        const count = selectedLoyaltyTarget || 5;
        return Array.from({ length: count });
    }, [selectedLoyaltyTarget]);

    if (loading && !tenant) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="size-12 border-4 border-[#f2b90d]/20 border-t-[#f2b90d] rounded-full animate-spin"></div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Sincronizando CRM Real-Time...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 space-y-8 pb-24" style={{ color: colors?.text }}>
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center pb-8 gap-4">
                <div className="relative">
                    <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-12 rounded-full blur-sm opacity-50" style={{ backgroundColor: colors?.primary || '#f2b90d' }}></div>
                    <h1 className="text-4xl font-black italic tracking-tighter uppercase leading-none" style={{ color: colors?.text }}>
                        CRM <span style={{ color: colors?.primary || '#f2b90d' }}>Intelligence</span>
                    </h1>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] mt-2 flex items-center gap-2" style={{ color: colors?.textMuted }}>
                        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Gestão de Relacionamento & Fidelidade v4.0
                    </p>
                </div>
                <button
                    onClick={() => window.location.href = '/admin/crm/nova-campanha'}
                    className="w-full md:w-auto text-black font-black uppercase text-[10px] tracking-[0.2em] px-8 py-4 rounded-2xl transition-all shadow-2xl active:scale-95 flex items-center justify-center gap-3 group"
                    style={{ backgroundColor: colors?.primary || '#f2b90d', color: businessType === 'salon' ? '#fff' : '#000' }}
                >
                    <span className="material-symbols-outlined text-lg group-hover:rotate-90 transition-transform">add</span>
                    Lançar Nova Campanha
                </button>
            </header>

            {/* KPI CARDS - Premium Refined with Real Data */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
                <MetricCard
                    title="Base Ativa"
                    value={stats.totalClients}
                    icon="groups"
                    color="text-amber-400"
                    desc="Clientes Reais"
                    onAction={openClientManager}
                    actionLabel="EDITAR"
                    isActive={activeFilter === 'all'}
                    onClick={() => setActiveFilter('all')}
                    colors={colors}
                />
                <MetricCard
                    title="Risco de Evasão"
                    value={stats.churnRisk}
                    icon="person_cancel"
                    color="text-rose-500"
                    desc="+45 dias sem visita"
                    alert={stats.churnRisk > 0}
                    isActive={activeFilter === 'churn'}
                    onClick={() => setActiveFilter('churn')}
                    colors={colors}
                />
                <MetricCard
                    title="Aniversariantes"
                    value={stats.birthdays}
                    icon="cake"
                    color="text-pink-500"
                    desc="No mês atual"
                    alert={stats.birthdays > 0}
                    isActive={activeFilter === 'birthdays'}
                    onClick={() => setActiveFilter('birthdays')}
                    colors={colors}
                />
                <MetricCard
                    title="Clientes VIP"
                    value={stats.vipClients}
                    icon="auto_awesome"
                    color="text-emerald-400"
                    desc="LTV > R$ 500"
                    isActive={activeFilter === 'vip'}
                    onClick={() => setActiveFilter('vip')}
                    colors={colors}
                />
                <MetricCard
                    title="Próximos Prêmios"
                    value={stats.loyaltyPending}
                    icon="rewarded_ads"
                    color="text-cyan-400"
                    desc="> 70% da meta"
                    alert={stats.loyaltyPending > 0}
                    isActive={activeFilter === 'loyalty'}
                    onClick={() => setActiveFilter('loyalty')}
                    colors={colors}
                />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 md:gap-8">
                {/* FIDELITY CENTER - State of the Art UI */}
                <div className="xl:col-span-5 space-y-6">
                    <div className="rounded-[2.5rem] p-8 md:p-10 relative overflow-hidden group transition-all shadow-2xl"
                        style={{ backgroundColor: colors?.cardBg }}
                    >
                        {/* Background Decoration */}
                        <div className="absolute -top-12 -right-12 size-40 rounded-full blur-3xl pointer-events-none transition-all"
                            style={{ backgroundColor: `${colors?.primary}0d` }}></div>

                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-xl font-black italic uppercase mb-1" style={{ color: colors?.text }}>Cartão Fidelidade</h3>
                                    <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: colors?.textMuted }}>Configuração de Recompensa</p>
                                </div>
                                <div className="size-12 rounded-2xl flex items-center justify-center group-hover:rotate-12 transition-transform"
                                    style={{ backgroundColor: `${colors?.text}0d` }}
                                >
                                    <span className="material-symbols-outlined" style={{ color: colors?.primary }}>loyalty</span>
                                </div>
                            </div>

                            {/* Fidelity Target Selector */}
                            <div className="space-y-4 mb-10">
                                <label className="text-[9px] font-black uppercase tracking-widest ml-1" style={{ color: colors?.primary }}>Meta de Selos para o Prêmio</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {[5, 8, 10].map((val) => (
                                        <button
                                            key={val}
                                            disabled={loading || !tenant}
                                            onClick={() => setSelectedLoyaltyTarget(Number(val))}
                                            className={`py-5 rounded-[1.5rem] border-2 font-black italic uppercase tracking-tighter text-lg transition-all flex flex-col items-center justify-center gap-1 active:scale-[0.97] disabled:opacity-30 disabled:cursor-not-allowed`}
                                            style={{
                                                backgroundColor: Number(selectedLoyaltyTarget) === Number(val) ? colors?.primary : `${colors?.cardBg}40`,
                                                borderColor: Number(selectedLoyaltyTarget) === Number(val) ? colors?.primary : `${colors?.border}40`,
                                                color: Number(selectedLoyaltyTarget) === Number(val) ? (businessType === 'salon' ? '#fff' : '#000') : colors?.textMuted,
                                                boxShadow: Number(selectedLoyaltyTarget) === Number(val) ? `0 10px 30px -10px ${colors?.primary}60` : undefined
                                            }}
                                        >
                                            <span>{val}</span>
                                            <span className="text-[7px] font-black tracking-[0.2em] opacity-60 uppercase">Selos</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Intelligence Audit Preview */}
                            <div className="rounded-3xl p-6 relative overflow-hidden mb-8" style={{ backgroundColor: `${colors?.secondaryBg}40` }}>
                                <p className="text-[8px] font-black uppercase tracking-widest mb-4 opacity-70" style={{ color: colors?.textMuted }}>Visualização do App do Cliente</p>
                                <div className="flex flex-wrap gap-2.5 justify-center py-4">
                                    {loyaltyPreviewCircles.map((_, i) => (
                                        <div
                                            key={i}
                                            className={`size-10 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${i === 0 ? 'scale-110' : ''}`}
                                            style={{
                                                backgroundColor: i === 0 ? `${colors?.primary}20` : `${colors?.cardBg}40`,
                                                borderColor: i === 0 ? colors?.primary : `${colors?.border}40`,
                                                color: i === 0 ? colors?.primary : `${colors?.text}20`,
                                                boxShadow: i === 0 ? `0 0 0 4px ${colors?.primary}10` : undefined
                                            }}
                                        >
                                            <span className="material-symbols-outlined text-[18px]">{i === 0 ? 'verified_user' : 'circle'}</span>
                                        </div>
                                    ))}
                                    {/* Reward slot */}
                                    <div className="size-10 rounded-full border-2 border-dashed flex items-center justify-center"
                                        style={{ borderColor: `${colors?.primary}40`, backgroundColor: `${colors?.primary}0d`, color: `${colors?.primary}60` }}
                                    >
                                        <span className="material-symbols-outlined text-[18px]">redeem</span>
                                    </div>
                                </div>
                                <p className="text-[9px] text-center mt-4 italic font-medium" style={{ color: colors?.textMuted }}>Recompensa: 1 {tenant?.business_type === 'barber' ? 'Corte' : 'Serviço'} Grátis</p>
                            </div>

                            {/* Unificado: Botão SALVAR - Sempre Ativo e Visível */}
                            <div className="mt-8">
                                <button
                                    onClick={handleSaveLoyalty}
                                    className="w-full bg-[#f2b90d] hover:bg-[#d9a50b] text-black font-black italic uppercase text-xs tracking-widest py-5 rounded-2xl shadow-2xl shadow-[#f2b90d]/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                                >
                                    <span className="material-symbols-outlined text-lg">{savingLoyalty ? 'sync' : 'save'}</span>
                                    {savingLoyalty ? 'SALVANDO...' : 'SALVAR'}
                                </button>
                            </div>
                        </div>

                        {/* Status Footer */}
                        <div className="mt-8 pt-6 flex items-center justify-between opacity-60">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-xs text-emerald-500">lock_open</span>
                                <span className="text-[8px] font-black uppercase tracking-widest text-white">Status: Ativo</span>
                            </div>
                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">FastBeauty Loyalty Engine</span>
                        </div>
                    </div>
                </div>

                {/* CAMPAIGN CENTER & ANNOTATIONS */}
                <div className="xl:col-span-7 space-y-6">
                    <div className="rounded-[2.5rem] p-8 md:p-10 h-full flex flex-col shadow-2xl"
                        style={{ backgroundColor: colors?.cardBg }}
                    >
                        <div className="flex items-center justify-between mb-10">
                            <div className="flex items-center gap-6">
                                <div>
                                    <h3 className="text-xl font-black italic uppercase mb-1" style={{ color: colors?.text }}>Central de Engajamento</h3>
                                    <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: colors?.textMuted }}>Motor de Retenção Ativo</p>
                                </div>
                                <button
                                    onClick={() => window.location.href = `/admin/crm/nova-campanha?segment=${activeFilter}`}
                                    className="bg-[#f2b90d] hover:bg-[#d9a50b] text-black font-black uppercase text-[9px] tracking-widest px-4 py-2 rounded-xl transition-all shadow-lg active:scale-95"
                                >
                                    CRIAR ESTA CAMPANHA
                                </button>
                            </div>
                            <div className="flex gap-4">

                                <div className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[8px] font-black uppercase tracking-widest flex items-center gap-2">
                                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    Filtros Dinâmicos OK
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-x-auto">
                            <table className="w-full text-left border-separate border-spacing-y-2">
                                <thead>
                                    <tr className="text-[8px] font-black uppercase tracking-widest text-slate-500">
                                        <th className="px-6 py-2">Cliente</th>
                                        <th className="px-6 py-2 text-center">Última Visita</th>
                                        <th className="px-6 py-2 text-center">Último Contato</th>
                                        <th className="px-6 py-2 text-right">Ação</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(engagementData[activeFilter] || []).length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="py-12 text-center opacity-30">
                                                <span className="material-symbols-outlined text-4xl mb-2 block">person_search</span>
                                                <p className="text-[10px] font-black uppercase tracking-widest">Nenhum cliente neste filtro</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        engagementData[activeFilter].slice(0, 5).map((client) => (
                                            <tr key={client.id} className="group/row transition-all"
                                                style={{ backgroundColor: `${colors?.cardBg}40` }}
                                            >
                                                <td className="px-6 py-4 rounded-l-2xl">
                                                    <div className="flex items-center gap-3">
                                                        <div className="size-8 rounded-full flex items-center justify-center text-[10px] font-black italic"
                                                            style={{ backgroundColor: `${colors?.text}0d`, color: colors?.primary }}
                                                        >
                                                            {client.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="text-[11px] font-black uppercase italic leading-none" style={{ color: colors?.text }}>{client.name}</p>
                                                            <p className="text-[8px] font-bold mt-1 uppercase tracking-tighter" style={{ color: colors?.textMuted }}>LTV: R$ {client.total_spent || '0,00'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <p className="text-[10px] font-bold" style={{ color: colors?.textMuted }}>
                                                        {client.last_visit ? new Date(client.last_visit).toLocaleDateString() : '--'}
                                                    </p>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <span className={`text-[8px] font-black uppercase tracking-tighter ${client.last_contact_at ? 'text-emerald-500' : ''}`} style={{ color: client.last_contact_at ? undefined : colors?.textMuted }}>
                                                            {client.last_contact_at ? 'Abordado' : 'Aguardando'}
                                                        </span>
                                                        <span className="text-[7px]" style={{ color: colors?.textMuted }}>
                                                            {client.last_contact_at ? new Date(client.last_contact_at).toLocaleDateString() : 'NUNCA'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 rounded-r-2xl text-right">
                                                    <button
                                                        onClick={() => openCampaignModal(client, (activeFilter === 'churn' ? 'recovery' : activeFilter === 'loyalty' ? 'loyalty' : 'manual'))}
                                                        disabled={updatingContact === client.id}
                                                        className="size-9 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white transition-all flex items-center justify-center group/btn active:scale-90 disabled:opacity-30"
                                                    >
                                                        <span className="material-symbols-outlined text-lg">{updatingContact === client.id ? 'sync' : 'chat'}</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                            {engagementData[activeFilter].length > 5 && (
                                <p className="text-center text-[8px] font-black uppercase tracking-widest mt-4 italic" style={{ color: colors?.textMuted }}>+ {engagementData[activeFilter].length - 5} clientes ocultos. Use filtros para refinar.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* CAMPAIGN HISTORY - v6.0 New Feature */}
            <div className="border rounded-[2.5rem] p-8 md:p-10 shadow-2xl space-y-8"
                style={{ backgroundColor: colors?.cardBg, borderColor: `${colors?.border}40` }}
            >
                <div className="flex items-center justify-between border-b pb-6" style={{ borderColor: `${colors?.border}40` }}>
                    <div>
                        <h3 className="text-xl font-black italic uppercase mb-1" style={{ color: colors?.text }}>Histórico de Campanhas</h3>
                        <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: colors?.textMuted }}>Acompanhamento de disparos e engajamento</p>
                    </div>
                    <div className="flex items-center gap-4">
                        {campaigns.length > 0 && (
                            <button
                                onClick={handleClearHistory}
                                disabled={isClearingHistory}
                                className="bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white text-[8px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all border border-rose-500/20 flex items-center gap-2 group"
                            >
                                <span className="material-symbols-outlined text-[14px] group-hover:rotate-12 transition-transform">{isClearingHistory ? 'sync' : 'delete_sweep'}</span>
                                {isClearingHistory ? 'LIMPANDO...' : 'LIMPAR TUDO'}
                            </button>
                        )}
                        <span className="material-symbols-outlined" style={{ color: colors?.textMuted }}>history</span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-separate border-spacing-y-2">
                        <thead>
                            <tr className="text-[8px] font-black uppercase tracking-widest" style={{ color: colors?.textMuted }}>
                                <th className="px-6 py-2">Data / Campanha</th>
                                <th className="px-6 py-2 text-center">Tipo</th>
                                <th className="px-6 py-2 text-center">Volume</th>
                                <th className="px-6 py-2 text-center">Status</th>
                                <th className="px-6 py-2 text-right">Ação</th>
                            </tr>
                        </thead>
                        <tbody>
                            {campaigns.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center opacity-30">
                                        <span className="material-symbols-outlined text-4xl mb-2 block" style={{ color: colors?.text }}>campaign</span>
                                        <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: colors?.textMuted }}>Nenhuma campanha registrada</p>
                                    </td>
                                </tr>
                            ) : (
                                campaigns.map((campaign) => (
                                    <tr key={campaign.id} className="group transition-all border"
                                        style={{ backgroundColor: `${colors?.secondaryBg}40`, borderColor: `${colors?.border}20` }}
                                    >
                                        <td className="px-6 py-4 rounded-l-2xl border-y border-l" style={{ borderColor: `${colors?.border}20` }}>
                                            <div>
                                                <p className="text-[11px] font-black uppercase italic leading-none mb-1" style={{ color: colors?.text }}>{campaign.name}</p>
                                                <p className="text-[8px] font-bold uppercase tracking-tighter" style={{ color: colors?.textMuted }}>
                                                    Criada em: {new Date(campaign.created_at).toLocaleDateString()} às {new Date(campaign.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 border-y text-center" style={{ borderColor: `${colors?.border}20` }}>
                                            <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-md border ${campaign.name.includes('Envios Manuais') ? 'border-amber-500/20 text-amber-500 bg-amber-500/5' : 'border-indigo-500/20 text-indigo-500 bg-indigo-500/5'}`}>
                                                {campaign.name.includes('Envios Manuais') ? 'Manual' : 'Segmentada'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 border-y text-center" style={{ borderColor: `${colors?.border}20` }}>
                                            <div className="flex flex-col items-center">
                                                <span className="text-[10px] font-black" style={{ color: colors?.text }}>{campaign.campaign_items?.[0]?.count || 0}</span>
                                                <span className="text-[7px] uppercase font-black" style={{ color: colors?.textMuted }}>Impactos</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 border-y text-center" style={{ borderColor: `${colors?.border}20` }}>
                                            <div className="flex items-center justify-center gap-1.5">
                                                <span className="size-1.5 rounded-full bg-emerald-500"></span>
                                                <span className="text-[8px] font-black uppercase text-emerald-500">Concluída</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 rounded-r-2xl border-y border-r border-white/5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openCampaignDetails(campaign)}
                                                    className="bg-white/5 hover:bg-white/10 text-white text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all border border-white/5 whitespace-nowrap"
                                                >
                                                    Ver Detalhes
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteCampaign(campaign.id, campaign.name)}
                                                    disabled={isDeletingCampaign === campaign.id}
                                                    className="size-8 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white transition-all flex items-center justify-center shrink-0 border border-rose-500/20 active:scale-90"
                                                    title="Excluir Campanha"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">
                                                        {isDeletingCampaign === campaign.id ? 'sync' : 'delete'}
                                                    </span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL: GESTÃO DE CLIENTES (CIRÚRGICO) */}
            {isClientModalOpen && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="border w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300"
                        style={{ backgroundColor: colors?.cardBg, borderColor: `${colors?.border}20` }}
                    >
                        <div className="p-8 border-b flex items-center justify-between" style={{ borderColor: `${colors?.border}20` }}>
                            <div>
                                <h3 className="text-xl font-black italic uppercase" style={{ color: colors?.text }}>Gestão da Base</h3>
                                <p className="text-[10px] font-bold uppercase tracking-widest mt-1" style={{ color: colors?.textMuted }}>Excluir ou Sincronizar Clientes</p>
                            </div>
                            <button
                                onClick={() => setIsClientModalOpen(false)}
                                className="size-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all"
                                style={{ color: colors?.textMuted }}
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-6 max-h-[50vh] overflow-y-auto scrollbar-hide">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 mb-4">
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            className="size-5 rounded-lg border-white/10 bg-white/5 checked:bg-[#f2b90d] transition-all"
                                            checked={clientsList.length > 0 && selectedClients.length === clientsList.length}
                                            onChange={(e) => {
                                                if (e.target.checked) setSelectedClients(clientsList.map(c => c.id));
                                                else setSelectedClients([]);
                                            }}
                                        />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-[#f2b90d]">Selecionar Todos ({clientsList.length})</span>
                                    </label>
                                </div>

                                {clientsList.length === 0 ? (
                                    <div className="text-center py-10">
                                        <span className="material-symbols-outlined text-4xl text-slate-700 mb-4 block">person_search</span>
                                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Nenhum cliente cadastrado ainda</p>
                                    </div>
                                ) : (
                                    clientsList.map((client) => (
                                        <div key={client.id} className="flex items-center justify-between p-4 rounded-2xl border transition-all group"
                                            style={{ backgroundColor: `${colors?.secondaryBg}40`, borderColor: `${colors?.border}20` }}
                                        >
                                            <div className="flex items-center gap-4">
                                                <input
                                                    type="checkbox"
                                                    className="size-5 rounded-lg border-white/10 bg-white/5 checked:bg-[#f2b90d] transition-all"
                                                    checked={selectedClients.includes(client.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) setSelectedClients(prev => [...prev, client.id]);
                                                        else setSelectedClients(prev => prev.filter(uid => uid !== client.id));
                                                    }}
                                                />
                                                <div>
                                                    <p className="text-xs font-black uppercase italic leading-none" style={{ color: colors?.text }}>{client.name}</p>
                                                    <p className="text-[9px] font-bold mt-1" style={{ color: colors?.textMuted }}>{client.phone}</p>
                                                </div>
                                            </div>
                                            <div className="text-right flex flex-col items-end">
                                                <p className="text-[10px] font-black" style={{ color: colors?.primary }}>R$ {Number(client.total_spent || 0).toFixed(2)}</p>
                                                <p className="text-[7px] uppercase font-black tracking-tighter" style={{ color: colors?.textMuted }}>Gasto Total</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="p-8 border-t border-white/5 flex gap-4">
                            <button
                                onClick={() => setIsClientModalOpen(false)}
                                className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 font-black uppercase text-[10px] tracking-widest py-4 rounded-2xl transition-all"
                            >
                                CANCELAR
                            </button>
                            <button
                                onClick={handleDeleteClients}
                                disabled={selectedClients.length === 0 || isDeleting}
                                className="flex-1 bg-rose-500 hover:bg-rose-600 disabled:opacity-30 disabled:grayscale text-white font-black uppercase text-[10px] tracking-widest py-4 rounded-2xl transition-all shadow-xl shadow-rose-500/20 flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-lg">{isDeleting ? 'sync' : 'delete_forever'}</span>
                                {isDeleting ? 'EXCLUINDO...' : `EXCLUIR SELECIONADOS (${selectedClients.length})`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: CAMPANHA WHATSAPP (TEMPLATES INTELIGENTES) */}
            {isCampaignModalOpen && campaignClient && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="border w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300"
                        style={{ backgroundColor: colors?.cardBg, borderColor: `${colors?.border}20` }}
                    >
                        <div className="p-8 border-b flex items-center justify-between" style={{ borderColor: `${colors?.border}20` }}>
                            <div>
                                <h3 className="text-xl font-black italic uppercase leading-none mb-1" style={{ color: colors?.text }}>Engajar Cliente</h3>
                                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: colors?.textMuted }}>{campaignClient.name}</p>
                            </div>
                            <button onClick={() => setIsCampaignModalOpen(false)} className="size-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center" style={{ color: colors?.textMuted }}>
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-3 gap-3">
                                <button
                                    onClick={() => openCampaignModal(campaignClient, 'recovery')}
                                    className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white transition-all flex flex-col items-center gap-1 group"
                                >
                                    <span className="material-symbols-outlined group-hover:scale-110 transition-transform">person_remove</span>
                                    <span className="text-[8px] font-black uppercase">Recuperar</span>
                                </button>
                                <button
                                    onClick={() => openCampaignModal(campaignClient, 'birthday')}
                                    className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all flex flex-col items-center gap-1 group"
                                >
                                    <span className="material-symbols-outlined group-hover:scale-110 transition-transform">celebration</span>
                                    <span className="text-[8px] font-black uppercase">Aniversário</span>
                                </button>
                                <button
                                    onClick={() => openCampaignModal(campaignClient, 'loyalty')}
                                    className="p-3 rounded-2xl bg-[#f2b90d]/10 border border-[#f2b90d]/20 text-[#f2b90d] hover:bg-[#f2b90d] hover:text-black transition-all flex flex-col items-center gap-1 group"
                                >
                                    <span className="material-symbols-outlined group-hover:scale-110 transition-transform">loyalty</span>
                                    <span className="text-[8px] font-black uppercase">Fidelidade</span>
                                </button>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-1">Mensagem do WhatsApp</label>
                                <textarea
                                    value={campaignMessage}
                                    onChange={(e) => setCampaignMessage(e.target.value)}
                                    rows={5}
                                    className="w-full border rounded-2xl p-4 text-xs placeholder:text-slate-700 focus:outline-none transition-all resize-none"
                                    style={{
                                        backgroundColor: `${colors?.secondaryBg}80`,
                                        borderColor: `${colors?.border}40`,
                                        color: colors?.text,
                                        boxShadow: `0 0 0 1px ${colors?.border}20`
                                    }}
                                />
                                <div className="flex items-center gap-2 px-1">
                                    <span className="size-1.5 rounded-full bg-[#f2b90d] animate-pulse"></span>
                                    <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest italic">Variáveis ativas: {campaignClient.name.split(' ')[0]} | {tenant?.name}</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 border-t border-white/5 flex gap-4 bg-black/20">
                            <button
                                onClick={() => setIsCampaignModalOpen(false)}
                                className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 font-black uppercase text-[10px] tracking-widest py-4 rounded-2xl transition-all"
                            >
                                CANCELAR
                            </button>
                            <button
                                onClick={handleWhatsAppSend}
                                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-black font-black uppercase text-[10px] tracking-widest py-4 rounded-2xl transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-3"
                            >
                                <span className="material-symbols-outlined text-lg">send</span>
                                DISPARAR AGORA
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: DETALHES DA CAMPANHA */}
            {isDetailsModalOpen && selectedCampaign && (
                <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="border w-full max-w-3xl rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]"
                        style={{ backgroundColor: colors?.cardBg, borderColor: `${colors?.border}20` }}
                    >
                        <div className="p-8 border-b flex items-center justify-between shrink-0" style={{ borderColor: `${colors?.border}20` }}>
                            <div>
                                <h3 className="text-xl font-black italic uppercase leading-none mb-1" style={{ color: colors?.text }}>Detalhes da Campanha</h3>
                                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: colors?.primary }}>{selectedCampaign.name}</p>
                            </div>
                            <button
                                onClick={() => setIsDetailsModalOpen(false)}
                                className="size-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all"
                                style={{ color: colors?.textMuted }}
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="flex-1 p-8 overflow-y-auto scrollbar-hide space-y-8">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="border p-4 rounded-2xl" style={{ backgroundColor: `${colors?.secondaryBg}40`, borderColor: `${colors?.border}20` }}>
                                    <p className="text-[8px] font-black uppercase mb-1" style={{ color: colors?.textMuted }}>Total Cliques/Envios</p>
                                    <p className="text-xl font-black" style={{ color: colors?.text }}>{campaignDetailsItems.length}</p>
                                </div>
                                <div className="border p-4 rounded-2xl" style={{ backgroundColor: `${colors?.secondaryBg}40`, borderColor: `${colors?.border}20` }}>
                                    <p className="text-[8px] font-black uppercase mb-1" style={{ color: colors?.textMuted }}>Data</p>
                                    <p className="text-xs font-black" style={{ color: colors?.text }}>{new Date(selectedCampaign.created_at).toLocaleDateString()}</p>
                                </div>
                                <div className="border p-4 rounded-2xl col-span-2" style={{ backgroundColor: `${colors?.secondaryBg}40`, borderColor: `${colors?.border}20` }}>
                                    <p className="text-[8px] font-black uppercase mb-1" style={{ color: colors?.textMuted }}>Mensagem Base</p>
                                    <p className="text-[10px] font-bold italic truncate" title={selectedCampaign.message_template} style={{ color: colors?.textMuted }}>
                                        {selectedCampaign.message_template}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Público Impactado</h4>
                                <div className="space-y-2">
                                    {loadingDetails ? (
                                        <div className="py-12 text-center text-slate-600 animate-pulse">Carregando impactos...</div>
                                    ) : campaignDetailsItems.length === 0 ? (
                                        <p className="text-center py-6 text-[10px] font-black uppercase text-slate-700">Nenhum registro individual encontrado</p>
                                    ) : (
                                        campaignDetailsItems.map((item: any, idx: number) => (
                                            <div key={idx} className="flex items-center justify-between p-4 rounded-xl border"
                                                style={{ backgroundColor: `${colors?.secondaryBg}20`, borderColor: `${colors?.border}20` }}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="size-8 rounded-full flex items-center justify-center text-[10px] font-black"
                                                        style={{ backgroundColor: `${colors?.text}0d`, color: colors?.primary }}
                                                    >
                                                        {item.client_name?.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-[11px] font-black uppercase leading-none" style={{ color: colors?.text }}>{item.client_name}</p>
                                                        <p className="text-[8px] font-bold mt-1" style={{ color: colors?.textMuted }}>{item.client_phone}</p>
                                                    </div>
                                                </div>
                                                <div className="px-3 py-1 rounded-full bg-emerald-500/5 border border-emerald-500/20 text-emerald-500 text-[8px] font-black uppercase">
                                                    Enviado
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-8 border-t border-white/5 bg-black/20 shrink-0">
                            <button
                                onClick={() => setIsDetailsModalOpen(false)}
                                className="w-full bg-[#f2b90d] hover:bg-[#d9a50b] text-black font-black uppercase text-[10px] tracking-widest py-4 rounded-2xl transition-all shadow-xl shadow-[#f2b90d]/10"
                            >
                                FECHAR DETALHES
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: FILA DE DISPARO RÁPIDO (CRM v5.0) */}
            {isQueueActive && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="w-full max-w-xl border rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(242,185,13,0.1)]"
                        style={{ backgroundColor: colors?.cardBg || '#0a0a0b', borderColor: `${colors?.border}20` }}
                    >
                        {/* Progress Bar */}
                        <div className="h-1 bg-white/5 w-full">
                            <div
                                className="h-full bg-[#f2b90d] transition-all duration-700"
                                style={{ width: `${((currentQueueIndex + (queueFinished ? 1 : 0)) / queue.length) * 100}%` }}
                            ></div>
                        </div>

                        {queueFinished ? (
                            <div className="p-12 text-center space-y-6">
                                <div className="size-24 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4 animate-bounce">
                                    <span className="material-symbols-outlined text-5xl text-emerald-500">task_alt</span>
                                </div>
                                <h3 className="text-3xl font-black italic uppercase text-white">Missão Cumprida!</h3>
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] max-w-xs mx-auto">
                                    Parabéns! Você entrou em contato com {queue.length} clientes de forma recorde.
                                </p>
                                <button
                                    onClick={() => { setIsQueueActive(false); fetchData(); }}
                                    className="w-full bg-[#f2b90d] py-5 rounded-3xl text-black font-black uppercase tracking-widest transition-all hover:scale-105"
                                >
                                    FECHAR RELATÓRIO
                                </button>
                            </div>
                        ) : (
                            <div className="p-10 space-y-8">
                                <header className="flex justify-between items-start">
                                    <div>
                                        <p className="text-[#f2b90d] font-black uppercase text-[10px] tracking-widest mb-2 flex items-center gap-2">
                                            <span className="size-2 rounded-full bg-[#f2b90d] animate-ping"></span>
                                            Fila de Disparo Ativa
                                        </p>
                                        <h3 className="text-2xl font-black italic uppercase text-white">
                                            {queue[currentQueueIndex]?.name}
                                        </h3>
                                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-tighter">
                                            Cliente {currentQueueIndex + 1} de {queue.length} • {queue[currentQueueIndex]?.phone}
                                        </p>
                                    </div>
                                    <button onClick={() => setIsQueueActive(false)} className="text-slate-500 hover:text-white transition-colors">
                                        <span className="material-symbols-outlined">close</span>
                                    </button>
                                </header>

                                <div className="border rounded-3xl p-6 relative" style={{ backgroundColor: `${colors?.secondaryBg}80`, borderColor: `${colors?.border}20` }}>
                                    <div className="absolute -top-3 left-6 px-3 py-1 bg-[#075e54] rounded-full text-[8px] font-black uppercase tracking-widest text-white ring-4" style={{ ringColor: colors?.cardBg }}>Preview WhatsApp</div>
                                    <p className="text-sm italic pt-2" style={{ color: colors?.textMuted }}>
                                        {activeFilter === 'churn' ? `Olá, ${queue[currentQueueIndex]?.name.split(' ')[0]}! 👋 Sentimos sua falta...` :
                                            activeFilter === 'birthdays' ? `Parabéns, ${queue[currentQueueIndex]?.name.split(' ')[0]}! 🎉 Temos um presente...` :
                                                `Olá, ${queue[currentQueueIndex]?.name.split(' ')[0]}! 👋 Como você está?`}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={skipQueueClient}
                                        className="py-5 rounded-3xl bg-white/5 border border-white/10 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                                    >
                                        PULAR
                                        <span className="material-symbols-outlined text-sm">skip_next</span>
                                    </button>
                                    <button
                                        onClick={handleQueueSend}
                                        disabled={isNextLoading}
                                        className="py-5 rounded-3xl bg-emerald-500 hover:bg-emerald-600 text-black font-black uppercase text-[10px] tracking-widest transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                                    >
                                        <span className="material-symbols-outlined text-xl">{isNextLoading ? 'sync' : 'send_and_archive'}</span>
                                        {isNextLoading ? 'ENVIANDO...' : 'ENVIAR & PRÓXIMO'}
                                    </button>
                                </div>

                                <div className="flex items-center justify-center gap-2">
                                    <span className="size-1.5 rounded-full bg-slate-700"></span>
                                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-600">Anti-Spam Manual Ativo • Siga as Normas do WhatsApp</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function CRMDashboard() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="size-12 border-4 border-[#f2b90d]/20 border-t-[#f2b90d] rounded-full animate-spin"></div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Iniciando Motor CRM...</p>
                </div>
            </div>
        }>
            <CRMContent />
        </Suspense>
    );
}


function MetricCard({ title, value, icon, color, desc, alert, onAction, actionLabel, isActive, onClick, colors }: any) {
    return (
        <div
            onClick={onClick}
            className={`p-6 rounded-[2rem] transition-all group hover:translate-y-[-4px] shadow-xl overflow-hidden relative ${onClick ? 'cursor-pointer' : ''}`}
            style={{
                backgroundColor: colors?.cardBg || '#121214',
                border: '1px solid',
                borderColor: isActive ? (colors?.primary || '#f2b90d') : (alert ? '#ef44444d' : `${colors?.border || '#27272a'}1a`),
                boxShadow: isActive ? `0 0 0 4px ${colors?.primary || '#f2b90d'}1a` : undefined
            }}
        >
            {/* Action Icon (Quick Action Indicator) */}
            <div className={`absolute top-4 right-4 text-[18px] opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 ${color}`}>
                <span className="material-symbols-outlined">north_east</span>
            </div>

            {/* Decoration */}
            <div className={`absolute -bottom-4 -right-4 size-20 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity ${color.replace('text-', 'bg-')}`}>
                <span className="material-symbols-outlined text-8xl absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">{icon}</span>
            </div>

            <div className="relative z-10 flex flex-col h-full justify-between">
                <div className="flex items-center justify-between mb-4">
                    <span className={`material-symbols-outlined ${color} text-2xl group-hover:scale-110 transition-transform duration-500`}>{icon}</span>
                    {onAction && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onAction(); }}
                            className="bg-black/5 hover:text-black hover:bg-opacity-100 border text-[8px] font-black uppercase px-3 py-1.5 rounded-full transition-all"
                            style={{ borderColor: `${colors?.border || '#27272a'}60`, color: colors?.textMuted || '#64748b' }}
                        >
                            {actionLabel}
                        </button>
                    )}
                </div>
                <div>
                    <h2 className="text-4xl font-black italic tracking-tighter mb-1 transition-all group-hover:opacity-90" style={{ color: colors?.text || '#fff' }}>
                        {value}
                    </h2>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] opacity-40 mb-1 group-hover:opacity-60 transition-opacity" style={{ color: colors?.text || '#fff' }}>{title}</p>
                    <p className={`text-[7px] font-black uppercase tracking-widest ${alert ? 'text-rose-500' : ''}`} style={{ color: alert ? undefined : (colors?.textMuted || '#64748b') }}>
                        {desc}
                    </p>
                </div>
            </div>
        </div>
    );
}
