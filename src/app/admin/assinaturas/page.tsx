
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function SubscriptionsPage() {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'plans' | 'subscribers'>('plans');
    const [plans, setPlans] = useState<any[]>([]);
    const [subscribers, setSubscribers] = useState<any[]>([]);

    // Form States
    const [isEditing, setIsEditing] = useState(false);
    const [currentPlan, setCurrentPlan] = useState<any>({ name: '', price: '', description: '', benefits: { cuts: 'Ilimitado' } });

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        if (activeTab === 'plans') {
            const { data } = await supabase
                .from('subscription_plans')
                .select('*')
                .eq('tenant_id', user.user_metadata.tenant_id)
                .order('created_at');
            setPlans(data || []);
        } else {
            const { data } = await supabase
                .from('client_subscriptions')
                .select(`
                    *,
                    clients (name, phone),
                    subscription_plans (name, price)
                `)
                .eq('tenant_id', user.user_metadata.tenant_id)
                .eq('status', 'active');
            setSubscribers(data || []);
        }
        setLoading(false);
    };

    const handleSavePlan = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const payload = {
            tenant_id: user.user_metadata.tenant_id,
            name: currentPlan.name,
            price: parseFloat(currentPlan.price),
            description: currentPlan.description,
            benefits: currentPlan.benefits
        };

        const { error } = await supabase.from('subscription_plans').insert(payload);

        if (error) {
            alert('Erro ao salvar plano: ' + error.message);
        } else {
            alert('Plano salvo com sucesso!');
            setIsEditing(false);
            setCurrentPlan({ name: '', price: '', description: '', benefits: { cuts: 'Ilimitado' } });
            fetchData();
        }
    };

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-700 max-w-7xl mx-auto">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
                <div>
                    <h1 className="text-3xl font-black italic tracking-tighter text-white uppercase">
                        Clube <span className="text-[#f2b90d]">VIP</span>
                    </h1>
                    <p className="text-sm text-slate-400 font-medium tracking-wide">
                        Gestão de Assinaturas e Planos Recorrentes
                    </p>
                </div>

                <div className="flex gap-2 bg-black/40 p-1 rounded-xl border border-white/5">
                    <button
                        onClick={() => setActiveTab('plans')}
                        className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'plans' ? 'bg-[#f2b90d] text-black shadow-lg' : 'text-slate-500 hover:text-white'}`}
                    >
                        Planos
                    </button>
                    <button
                        onClick={() => setActiveTab('subscribers')}
                        className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'subscribers' ? 'bg-[#f2b90d] text-black shadow-lg' : 'text-slate-500 hover:text-white'}`}
                    >
                        Assinantes
                    </button>
                </div>
            </header>

            {loading ? (
                <div className="text-center py-20 opacity-50 animate-pulse">
                    <span className="material-symbols-outlined text-4xl text-[#f2b90d]">diamond</span>
                </div>
            ) : (
                <>
                    {/* PLANS TAB */}
                    {activeTab === 'plans' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Create New Card */}
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="border-2 border-dashed border-white/10 rounded-3xl p-8 flex flex-col items-center justify-center gap-4 hover:bg-white/5 transition-all group min-h-[250px]"
                                >
                                    <div className="size-16 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-[#f2b90d]/20 transition-colors">
                                        <span className="material-symbols-outlined text-3xl text-slate-500 group-hover:text-[#f2b90d]">add</span>
                                    </div>
                                    <span className="text-xs font-black uppercase tracking-widest text-slate-500 group-hover:text-white">Criar Novo Plano</span>
                                </button>

                                {/* List Plans */}
                                {plans.map(plan => (
                                    <div key={plan.id} className="bg-[#18181b] border border-[#f2b90d]/20 rounded-3xl p-8 relative overflow-hidden group hover:border-[#f2b90d]/50 transition-all">
                                        <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                                            <span className="material-symbols-outlined text-8xl text-[#f2b90d]">workspace_premium</span>
                                        </div>

                                        <div className="relative z-10 space-y-4">
                                            <div>
                                                <h3 className="text-2xl font-black italic text-white">{plan.name}</h3>
                                                <p className="text-[#f2b90d] font-bold text-lg">R$ {plan.price.toFixed(2)}<span className="text-xs text-slate-500 font-normal">/mês</span></p>
                                            </div>

                                            <div className="space-y-2">
                                                {Object.entries(plan.benefits || {}).map(([key, value]: any) => (
                                                    <div key={key} className="flex items-center gap-2 text-xs text-slate-300">
                                                        <span className="material-symbols-outlined text-[14px] text-emerald-500">check_circle</span>
                                                        <span className="uppercase font-bold opacity-70">{key}:</span>
                                                        <span className="font-bold">{value}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            <p className="text-xs text-slate-500 line-clamp-2">{plan.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Modal / Form */}
                            {isEditing && (
                                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                                    <div className="bg-[#121214] border border-white/10 rounded-3xl p-8 max-w-lg w-full space-y-6 animate-in zoom-in-95">
                                        <h3 className="text-xl font-black italic text-white">Novo Plano VIP</h3>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest pl-1">Nome do Plano</label>
                                                <input
                                                    type="text"
                                                    value={currentPlan.name}
                                                    onChange={e => setCurrentPlan({ ...currentPlan, name: e.target.value })}
                                                    placeholder="Ex: King Club"
                                                    className="w-full bg-black border border-white/10 rounded-xl p-3 text-white focus:border-[#f2b90d] outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest pl-1">Preço Mensal (R$)</label>
                                                <input
                                                    type="number"
                                                    value={currentPlan.price}
                                                    onChange={e => setCurrentPlan({ ...currentPlan, price: e.target.value })}
                                                    placeholder="89.90"
                                                    className="w-full bg-black border border-white/10 rounded-xl p-3 text-white focus:border-[#f2b90d] outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest pl-1">Descrição</label>
                                                <textarea
                                                    value={currentPlan.description}
                                                    onChange={e => setCurrentPlan({ ...currentPlan, description: e.target.value })}
                                                    placeholder="Benefícios e regras..."
                                                    className="w-full bg-black border border-white/10 rounded-xl p-3 text-white focus:border-[#f2b90d] outline-none h-24 resize-none"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex gap-3 pt-4">
                                            <button onClick={() => setIsEditing(false)} className="flex-1 py-3 rounded-xl font-bold text-slate-400 hover:bg-white/5 transition-colors">CANCELAR</button>
                                            <button onClick={handleSavePlan} className="flex-1 py-3 rounded-xl font-black bg-[#f2b90d] text-black hover:bg-[#d9a50b] transition-colors">SALVAR PLANO</button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* SUBSCRIBERS TAB */}
                    {activeTab === 'subscribers' && (
                        <div className="bg-[#18181b] border border-white/5 rounded-3xl overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-black/20 border-b border-white/5">
                                    <tr>
                                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Cliente</th>
                                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Plano</th>
                                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Validade</th>
                                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {subscribers.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="p-10 text-center text-slate-500 text-sm italic">Nenhum assinante ativo encontrado.</td>
                                        </tr>
                                    ) : (
                                        subscribers.map((sub) => (
                                            <tr key={sub.id} className="hover:bg-white/5 transition-colors">
                                                <td className="p-6">
                                                    <p className="font-bold text-white">{sub.clients?.name}</p>
                                                    <p className="text-xs text-slate-500">{sub.clients?.phone}</p>
                                                </td>
                                                <td className="p-6">
                                                    <span className="text-[#f2b90d] font-black italic">{sub.subscription_plans?.name}</span>
                                                </td>
                                                <td className="p-6 text-sm text-slate-400 font-medium">
                                                    {new Date(sub.expires_at).toLocaleDateString()}
                                                </td>
                                                <td className="p-6">
                                                    <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[9px] font-black uppercase tracking-widest border border-emerald-500/20">
                                                        {sub.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
