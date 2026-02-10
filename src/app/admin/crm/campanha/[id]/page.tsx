'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Campaign, CampaignItem } from '@/lib/campaigns';
import { useParams, useRouter } from 'next/navigation';

export default function CampaignDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [campaign, setCampaign] = useState<Campaign | null>(null);
    const [items, setItems] = useState<CampaignItem[]>([]);

    useEffect(() => {
        if (params.id) fetchCampaignDetails();
    }, [params.id]);

    const fetchCampaignDetails = async () => {
        setLoading(true);
        try {
            // 1. Fetch Campaign
            const { data: camp, error: campError } = await supabase
                .from('campaigns')
                .select('*')
                .eq('id', params.id)
                .single();

            if (campError) throw campError;
            setCampaign(camp);

            // 2. Fetch Items
            const { data: list, error: listError } = await supabase
                .from('campaign_items')
                .select('*')
                .eq('campaign_id', params.id)
                .order('status', { ascending: true }); // PENDING first

            if (listError) throw listError;
            setItems(list as CampaignItem[]);

        } catch (error) {
            console.error('Error details:', error);
            alert('Erro ao carregar campanha.');
        } finally {
            setLoading(false);
        }
    };

    const handleSendClick = async (itemId: string, url: string) => {
        // 1. Abrir WhatsApp
        window.open(url, '_blank');

        // 2. Atualizar status para SENT
        const { error } = await supabase
            .from('campaign_items')
            .update({ status: 'SENT', sent_at: new Date().toISOString() })
            .eq('id', itemId);

        if (!error) {
            setItems(prev => prev.map(item =>
                item.id === itemId ? { ...item, status: 'SENT' } : item
            ));
        }
    };

    if (loading) return <div className="p-8 text-white">Carregando...</div>;
    if (!campaign) return <div className="p-8 text-white">Campanha não encontrada.</div>;

    const progress = Math.round((items.filter(i => i.status === 'SENT').length / items.length) * 100) || 0;

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-8 text-slate-100 animate-in fade-in duration-700">
            <header>
                <button onClick={() => router.push('/admin/crm')} className="text-sm text-slate-400 hover:text-white mb-4 flex items-center gap-2">
                    ← Voltar ao CRM
                </button>
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-black italic tracking-tighter text-white uppercase">
                            {campaign.name}
                        </h1>
                        <p className="text-sm text-slate-400 mt-1">
                            Criada em {new Date(campaign.created_at).toLocaleDateString()}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-4xl font-black text-[#f2b90d]">{progress}%</p>
                        <p className="text-xs uppercase tracking-widest text-slate-500">Concluído</p>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 bg-white/10 rounded-full mt-4 overflow-hidden">
                    <div className="h-full bg-[#f2b90d] transition-all duration-500" style={{ width: `${progress}%` }}></div>
                </div>
            </header>

            <div className="bg-[#18181b] border border-white/5 rounded-2xl overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-white/5 text-slate-400 text-xs uppercase tracking-widest font-bold">
                        <tr>
                            <th className="p-4">Cliente</th>
                            <th className="p-4">Telefone</th>
                            <th className="p-4 text-center">Status</th>
                            <th className="p-4 text-right">Ação</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {items.map(item => (
                            <tr key={item.id} className="hover:bg-white/5 transition-colors">
                                <td className="p-4 font-bold text-white">{item.client_name}</td>
                                <td className="p-4 text-slate-400 font-mono text-sm">{item.client_phone}</td>
                                <td className="p-4 text-center">
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide ${item.status === 'SENT'
                                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                            : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                                        }`}>
                                        {item.status === 'SENT' ? 'ENVIADO' : 'PENDENTE'}
                                    </span>
                                </td>
                                <td className="p-4 text-right">
                                    {item.status !== 'SENT' && (
                                        <button
                                            onClick={() => handleSendClick(item.id, item.generated_url)}
                                            className="bg-[#25D366] hover:bg-[#128C7E] text-white text-xs font-bold uppercase px-4 py-2 rounded-lg flex items-center gap-2 ml-auto transition-all shadow-lg shadow-[#25D366]/20 active:scale-95"
                                        >
                                            <span className="material-symbols-outlined text-sm">send</span>
                                            Enviar
                                        </button>
                                    )}
                                    {item.status === 'SENT' && (
                                        <span className="text-slate-500 text-xs italic flex items-center justify-end gap-1">
                                            <span className="material-symbols-outlined text-sm">check_circle</span>
                                            Enviado
                                        </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {items.length === 0 && (
                    <div className="p-10 text-center text-slate-500 italic">
                        Nenhum cliente encontrado para esta campanha.
                    </div>
                )}
            </div>
        </div>
    );
}
