"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export default function DynamicBookingPage() {
    const params = useParams();
    const router = useRouter();
    const slug = params.slug as string;

    const [tenant, setTenant] = useState<any>(null);
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(true);
    const [selection, setSelection] = useState({
        service: '',
        barber: '',
        date: '',
        time: '',
        name: '',
        phone: '',
        price: 0
    });

    const [services, setServices] = useState<any[]>([]);
    const [barbers, setBarbers] = useState<any[]>([]);

    useEffect(() => {
        async function init() {
            // Fetch Tenant
            const { data: tenantData } = await supabase
                .from('tenants')
                .select('*')
                .eq('slug', slug)
                .single();

            if (tenantData) {
                setTenant(tenantData);

                // Fetch Services
                const { data: servicesData } = await supabase
                    .from('products')
                    .select('*')
                    .eq('tenant_id', tenantData.id)
                    .eq('category', 'service');

                if (servicesData) setServices(servicesData);

                // Fetch Professionals (Team)
                const { data: teamData } = await supabase
                    .from('team')
                    .select('*')
                    .eq('tenant_id', tenantData.id);

                if (teamData) setBarbers(teamData);
            }
            setLoading(false);
        }
        init();
    }, [slug]);

    const theme = useMemo(() => {
        if (tenant?.config?.theme) return tenant.config.theme;
        return { primary: '#f2b90d', secondary: '#09090b' };
    }, [tenant]);

    const nextStep = () => setStep(step + 1);
    const prevStep = () => setStep(prev => Math.max(1, prev - 1));

    const times = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

    const finishBooking = async () => {
        // In a real scenario, we would insert into 'appointments' table
        // For now, mimicking the legacy behavior with WhatsApp redirect
        const message = `Olá! Gostaria de confirmar meu agendamento: ${selection.service} com ${selection.barber} às ${selection.time}. Nome: ${selection.name}`;
        window.open(`https://wa.me/5500000000000?text=${encodeURIComponent(message)}`, '_blank');

        // Create appointment in DB (Optional/Simulated)
        if (tenant) {
            await supabase.from('appointments').insert([{
                tenant_id: tenant.id,
                client_name: selection.name,
                client_phone: selection.phone,
                service: selection.service,
                professional: selection.barber,
                status: 'pending',
                start_time: `${new Date().toISOString().split('T')[0]}T${selection.time}:00`
            }]);
        }

        router.push(`/${slug}?confirmed=true`);
    };

    if (loading) return (
        <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
        </div>
    );

    if (!tenant) return <div>Tenant not found</div>;

    const primaryColor = theme.primary;
    const isPrimaryLight = ['#ffffff', '#f2b90d', '#fbbf24'].includes(primaryColor.toLowerCase());
    const buttonTextColor = isPrimaryLight ? '#000000' : '#ffffff';

    return (
        <div className="min-h-screen text-white font-display relative overflow-hidden bg-[#09090b]">
            <div className="absolute -top-24 -right-24 size-96 blur-[120px] rounded-full opacity-20 pointer-events-none" style={{ backgroundColor: primaryColor }}></div>

            <header className="p-6 border-b border-white/5 flex justify-between items-center bg-black/20 backdrop-blur-xl sticky top-0 z-50">
                <button onClick={() => router.push(`/${slug}`)} className="text-xl font-black italic tracking-tighter uppercase">
                    FASTBEAUTY <span style={{ color: primaryColor }}>PRO</span>
                </button>
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[14px]" style={{ color: primaryColor }}>location_on</span>
                    <span className="text-[10px] uppercase font-black tracking-widest opacity-60">{tenant.name}</span>
                </div>
            </header>

            <main className="max-w-xl mx-auto p-6 py-12 relative z-10">
                {/* Progress Bar */}
                <div className="flex gap-3 mb-12">
                    {[1, 2, 3, 4].map(s => (
                        <div key={s} className="h-1.5 flex-1 rounded-full transition-all duration-500" style={{ backgroundColor: step >= s ? primaryColor : 'rgba(255,255,255,0.05)', boxShadow: step >= s ? `0 0 10px ${primaryColor}40` : 'none' }}></div>
                    ))}
                </div>

                {/* Step 1: Services */}
                {step === 1 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                        <h2 className="text-4xl font-black italic uppercase tracking-tight">O que vamos <br /> fazer <span style={{ color: primaryColor }}>hoje?</span></h2>
                        <div className="grid gap-4">
                            {services.length > 0 ? services.map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => { setSelection({ ...selection, service: s.name, price: s.price }); nextStep(); }}
                                    className="p-6 rounded-[2rem] border-2 text-left flex justify-between items-center transition-all group bg-white/5 backdrop-blur-md relative overflow-hidden"
                                    style={{ borderColor: selection.service === s.name ? primaryColor : 'rgba(255,255,255,0.05)' }}
                                >
                                    <div className="relative z-10"><span className="font-black text-xl italic uppercase tracking-tighter block">{s.name}</span></div>
                                    <span className="text-2xl font-black italic tracking-tighter relative z-10" style={{ color: primaryColor }}>R$ {s.price}</span>
                                </button>
                            )) : (
                                <p className="opacity-50 italic">Nenhum serviço disponível no momento.</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Step 2: Professionals */}
                {step === 2 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                        <h2 className="text-4xl font-black italic uppercase tracking-tight">Com <br /> <span style={{ color: primaryColor }}>quem?</span></h2>
                        <div className="grid gap-4">
                            {barbers.map(b => (
                                <button
                                    key={b.id}
                                    onClick={() => { setSelection({ ...selection, barber: b.name }); nextStep(); }}
                                    className="p-6 rounded-[2rem] border-2 text-left flex items-center gap-6 transition-all bg-white/5 backdrop-blur-md"
                                    style={{ borderColor: selection.barber === b.name ? primaryColor : 'rgba(255,255,255,0.05)' }}
                                >
                                    <div className="size-16 rounded-full bg-white/10 flex items-center justify-center text-2xl font-black uppercase italic" style={{ color: primaryColor }}>
                                        {b.name[0]}
                                    </div>
                                    <div>
                                        <span className="font-black text-xl italic uppercase tracking-tighter block">{b.name}</span>
                                        <span className="text-xs opacity-50 uppercase font-bold tracking-widest">{b.role}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                        <button onClick={prevStep} className="opacity-50 font-bold uppercase tracking-widest text-xs">Voltar</button>
                    </div>
                )}

                {/* Step 3: Time */}
                {step === 3 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                        <h2 className="text-4xl font-black italic uppercase tracking-tight">Qual <br /> <span style={{ color: primaryColor }}>horário?</span></h2>
                        <div className="grid grid-cols-3 gap-3">
                            {times.map(t => (
                                <button
                                    key={t}
                                    onClick={() => { setSelection({ ...selection, time: t }); nextStep(); }}
                                    className="py-4 rounded-2xl border-2 font-black italic transition-all bg-white/5"
                                    style={{ borderColor: selection.time === t ? primaryColor : 'rgba(255,255,255,0.05)', color: selection.time === t ? primaryColor : 'white' }}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                        <button onClick={prevStep} className="opacity-50 font-bold uppercase tracking-widest text-xs">Voltar</button>
                    </div>
                )}

                {/* Step 4: Contact */}
                {step === 4 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                        <h2 className="text-4xl font-black italic uppercase tracking-tight">Quase <br /> <span style={{ color: primaryColor }}>lá!</span></h2>
                        <div className="space-y-4 bg-white/5 backdrop-blur-md p-8 rounded-[2.5rem] border border-white/5">
                            <input type="text" placeholder="Nome Completo" className="w-full bg-black/40 border-2 border-white/5 rounded-2xl p-5 text-white font-bold focus:outline-none focus:border-white/20 transition-all" value={selection.name} onChange={(e) => setSelection({ ...selection, name: e.target.value })} />
                            <input type="tel" placeholder="WhatsApp" className="w-full bg-black/40 border-2 border-white/5 rounded-2xl p-5 text-white font-bold focus:outline-none focus:border-white/20 transition-all" value={selection.phone} onChange={(e) => setSelection({ ...selection, phone: e.target.value })} />
                        </div>
                        <div className="flex gap-4">
                            <button onClick={prevStep} className="p-6 rounded-[2rem] border-2 border-white/5 font-black uppercase italic">Voltar</button>
                            <button
                                disabled={!selection.name || !selection.phone}
                                onClick={finishBooking}
                                className="flex-1 font-black py-6 rounded-[2rem] text-lg transition-all shadow-2xl uppercase italic tracking-tight disabled:opacity-50"
                                style={{ backgroundColor: primaryColor, color: buttonTextColor, boxShadow: `0 20px 40px ${primaryColor}30` }}
                            >
                                CONFIRMAR
                            </button>
                        </div>
                    </div>
                )}
            </main>

            <footer className="p-12 text-center opacity-20">
                <p className="text-[10px] font-black uppercase tracking-[0.5em]">Powered by FastBeauty Pro</p>
            </footer>
        </div>
    );
}
