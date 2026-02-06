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
        <div className="min-h-screen text-white font-display relative overflow-hidden bg-[#09090b] selection:bg-yellow-500/30">
            {/* Decorative background */}
            <div className="absolute -top-24 -right-24 size-96 blur-[120px] rounded-full opacity-20 pointer-events-none transition-all duration-1000" style={{ backgroundColor: primaryColor }}></div>
            <div className="absolute bottom-0 -left-24 size-96 blur-[150px] rounded-full opacity-10 pointer-events-none" style={{ backgroundColor: primaryColor }}></div>

            <header className="px-4 md:px-8 py-4 md:py-6 border-b border-white/5 flex justify-between items-center bg-black/40 backdrop-blur-2xl sticky top-0 z-50">
                <button onClick={() => router.push(`/${slug}`)} className="text-lg md:text-xl font-black italic tracking-tighter uppercase transition-all hover:opacity-70 active:scale-95">
                    FASTBEAUTY <span style={{ color: primaryColor }}>PRO</span>
                </button>
                <div className="flex items-center gap-2 max-w-[50%]">
                    <span className="material-symbols-outlined text-sm md:text-base hidden sm:block" style={{ color: primaryColor }}>location_on</span>
                    <span className="text-[8px] md:text-[10px] uppercase font-black tracking-widest opacity-60 truncate">{tenant.name}</span>
                </div>
            </header>

            <main className="max-w-xl mx-auto px-4 sm:px-6 py-8 md:py-12 relative z-10 min-h-[calc(100vh-80px)] flex flex-col">
                {/* Progress Bar */}
                <div className="flex gap-2.5 md:gap-3 mb-10 md:mb-14">
                    {[1, 2, 3, 4].map(s => (
                        <div key={s} className="h-1.5 flex-1 rounded-full transition-all duration-700 ease-out" style={{ backgroundColor: step >= s ? primaryColor : 'rgba(255,255,255,0.05)', boxShadow: step >= s ? `0 0 15px ${primaryColor}40` : 'none' }}></div>
                    ))}
                </div>

                <div className="flex-1">
                    {/* Step 1: Services */}
                    {step === 1 && (
                        <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-right-8 duration-700 ease-out">
                            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black italic uppercase tracking-tight leading-[0.9]">O que vamos <br /> fazer <span style={{ color: primaryColor }}>hoje?</span></h2>
                            <div className="grid gap-3 md:gap-4">
                                {services.length > 0 ? services.map(s => (
                                    <button
                                        key={s.id}
                                        onClick={() => { setSelection({ ...selection, service: s.name, price: s.price }); nextStep(); }}
                                        className="p-4 md:p-6 rounded-[1.8rem] md:rounded-[2.5rem] border-2 text-left flex justify-between items-center transition-all group bg-white/[0.03] backdrop-blur-md active:scale-[0.98]"
                                        style={{ borderColor: selection.service === s.name ? primaryColor : 'rgba(255,255,255,0.05)' }}
                                    >
                                        <div className="min-w-0 pr-4">
                                            <span className="font-black text-lg md:text-xl italic uppercase tracking-tighter block truncate group-hover:text-yellow-500/80 transition-colors">{s.name}</span>
                                        </div>
                                        <div className="shrink-0 text-right">
                                            <span className="text-xl md:text-2xl font-black italic tracking-tighter" style={{ color: primaryColor }}>RS {s.price}</span>
                                        </div>
                                    </button>
                                )) : (
                                    <div className="py-12 text-center bg-white/5 rounded-[2rem] border border-white/5 opacity-50">
                                        <span className="material-symbols-outlined text-4xl mb-2 opacity-30">inventory_2</span>
                                        <p className="text-xs font-bold uppercase tracking-widest italic">Nenhum serviço disponível</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Step 2: Professionals */}
                    {step === 2 && (
                        <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-right-8 duration-700 ease-out">
                            <div className="flex items-center justify-between">
                                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black italic uppercase tracking-tight leading-[0.9]">Com <br /> <span style={{ color: primaryColor }}>quem?</span></h2>
                                <button onClick={prevStep} className="size-8 rounded-full flex items-center justify-center transition-all active:scale-95 group hover:bg-white/10" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                                </button>
                            </div>
                            <div className="grid gap-3 md:gap-4">
                                {barbers.map(b => (
                                    <button
                                        key={b.id}
                                        onClick={() => { setSelection({ ...selection, barber: b.name }); nextStep(); }}
                                        className="p-4 md:p-6 rounded-[1.8rem] md:rounded-[2.5rem] border-2 text-left flex items-center gap-4 md:gap-6 transition-all bg-white/[0.03] backdrop-blur-md active:scale-[0.98]"
                                        style={{ borderColor: selection.barber === b.name ? primaryColor : 'rgba(255,255,255,0.05)' }}
                                    >
                                        <div className="size-14 md:size-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xl md:text-2xl font-black uppercase italic shrink-0" style={{ color: primaryColor }}>
                                            {b.name[0]}
                                        </div>
                                        <div className="min-w-0">
                                            <span className="font-black text-lg md:text-xl italic uppercase tracking-tighter block truncate leading-none mb-1">{b.name}</span>
                                            <span className="text-[8px] md:text-[10px] opacity-40 uppercase font-black tracking-[0.2em]">{b.role}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 3: Time */}
                    {step === 3 && (
                        <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-right-8 duration-700 ease-out">
                            <div className="flex items-center justify-between">
                                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black italic uppercase tracking-tight leading-[0.9]">Qual <br /> <span style={{ color: primaryColor }}>horário?</span></h2>
                                <button onClick={prevStep} className="size-8 rounded-full flex items-center justify-center transition-all active:scale-95 group hover:bg-white/10" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                                </button>
                            </div>
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 md:gap-3">
                                {times.map(t => (
                                    <button
                                        key={t}
                                        onClick={() => { setSelection({ ...selection, time: t }); nextStep(); }}
                                        className="py-3.5 md:py-5 rounded-2xl md:rounded-[1.5rem] border-2 font-black italic transition-all bg-white/[0.03] active:scale-95"
                                        style={{
                                            borderColor: selection.time === t ? primaryColor : 'rgba(255,255,255,0.05)',
                                            color: selection.time === t ? primaryColor : 'white',
                                            backgroundColor: selection.time === t ? `${primaryColor}10` : 'rgba(255,255,255,0.03)'
                                        }}
                                    >
                                        <span className="text-sm md:text-base">{t}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 4: Contact */}
                    {step === 4 && (
                        <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-right-8 duration-700 ease-out">
                            <div className="flex items-center justify-between">
                                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black italic uppercase tracking-tight leading-[0.9]">Quase <br /> <span style={{ color: primaryColor }}>lá!</span></h2>
                                <button onClick={prevStep} className="size-8 rounded-full flex items-center justify-center transition-all active:scale-95 group hover:bg-white/10" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                                </button>
                            </div>
                            <div className="space-y-4 bg-white/[0.03] backdrop-blur-3xl p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-white/5 shadow-2xl">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 ml-2">Seu Nome</label>
                                    <input type="text" placeholder="Ex: Roberto Carlos" className="w-full bg-black/40 border-2 border-white/5 rounded-xl md:rounded-2xl p-4 md:p-5 text-white font-black italic focus:outline-none focus:border-[#f2b90d]/30 transition-all placeholder:opacity-20 text-sm md:text-base" value={selection.name} onChange={(e) => setSelection({ ...selection, name: e.target.value })} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 ml-2">Seu WhatsApp</label>
                                    <input type="tel" placeholder="(00) 00000-0000" className="w-full bg-black/40 border-2 border-white/5 rounded-xl md:rounded-2xl p-4 md:p-5 text-white font-black italic focus:outline-none focus:border-[#f2b90d]/30 transition-all placeholder:opacity-20 text-sm md:text-base" value={selection.phone} onChange={(e) => setSelection({ ...selection, phone: e.target.value })} />
                                </div>
                            </div>
                            <div className="pt-2">
                                <button
                                    disabled={!selection.name || !selection.phone}
                                    onClick={finishBooking}
                                    className="w-full font-black py-5 md:py-7 rounded-[1.8rem] md:rounded-[2.5rem] text-lg md:text-2xl transition-all shadow-2xl uppercase italic tracking-tighter disabled:opacity-30 active:scale-95 flex items-center justify-center gap-3"
                                    style={{ backgroundColor: primaryColor, color: buttonTextColor, boxShadow: `0 20px 40px ${primaryColor}30` }}
                                >
                                    <span>CONFIRMAR AGENDAMENTO</span>
                                    <span className="material-symbols-outlined font-bold">check_circle</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <footer className="py-12 mt-auto text-center opacity-20">
                    <div className="flex flex-col items-center gap-2">
                        <p className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.4em]">Powered by FastBeauty Pro</p>
                        <div className="h-px w-8 bg-white/20" />
                    </div>
                </footer>
            </main>
        </div>
    );
}
