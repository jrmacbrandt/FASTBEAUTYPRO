"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getAvailableSlots } from '@/lib/scheduling';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export const dynamic = 'force-dynamic';

export default function ShopLandingPage() {
    const params = useParams();
    const router = useRouter();
    const slug = params.slug as string;

    const [tenant, setTenant] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [step, setStep] = useState(1);

    // Selection State
    const [selection, setSelection] = useState({
        service: null as any,
        barber: null as any,
        date: '',
        time: '',
        clientName: '',
        clientPhone: '',
        birthMonth: ''
    });

    // Data State
    const [services, setServices] = useState<any[]>([]);
    const [barbers, setBarbers] = useState<any[]>([]);
    const [appointments, setAppointments] = useState<any[]>([]);

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            const { data: tenantData } = await supabase
                .from('tenants')
                .select('*')
                .eq('slug', slug)
                .single();

            if (tenantData) {
                setTenant(tenantData);

                // Load Services
                const { data: svs } = await supabase
                    .from('services')
                    .select('*')
                    .eq('tenant_id', tenantData.id)
                    .eq('active', true);
                if (svs) setServices(svs);

                // Load Barbers
                const { data: brbs } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('tenant_id', tenantData.id)
                    .eq('role', 'barber')
                    .eq('status', 'active');
                if (brbs) setBarbers(brbs);
            }
            setLoading(false);
        }
        loadData();
    }, [slug]);

    useEffect(() => {
        if (selection.barber && selection.date) {
            const loadAvailability = async () => {
                const { data } = await supabase
                    .from('appointments')
                    .select('scheduled_at')
                    .eq('barber_id', selection.barber.id)
                    .gte('scheduled_at', `${selection.date}T00:00:00`)
                    .lte('scheduled_at', `${selection.date}T23:59:59`);
                if (data) setAppointments(data);
            };
            loadAvailability();
        }
    }, [selection.barber, selection.date]);

    const theme = useMemo(() => {
        const config = tenant?.config as any;
        return {
            primary: config?.theme?.primary || '#f2b90d',
            secondary: config?.theme?.secondary || '#000000'
        };
    }, [tenant]);

    const availableTimes = useMemo(() => {
        if (!selection.date || !selection.barber || !tenant) return [];

        // 1. Get Logical Slots (Store + Barber Rules)
        const { slots } = getAvailableSlots(
            selection.date,
            tenant.business_hours || null,
            selection.barber.work_hours || null
        );

        // 2. Filter Occupied Appointments (simple string match)
        const occupied = appointments.map(a => {
            if (!a.scheduled_at) return '';
            // "2023-12-12T09:00:00" -> "09:00"
            const parts = a.scheduled_at.split('T');
            if (parts.length > 1) return parts[1].substring(0, 5);
            return '';
        });

        // 3. Remove occupied slots strictly
        return slots.filter(t => !occupied.includes(t));

    }, [selection.date, selection.barber, tenant, appointments]);

    const handleConfirm = async () => {
        if (!selection.barber || !selection.service || !selection.clientName || !selection.clientPhone || !selection.birthMonth || !tenant) {
            alert('Por favor, preencha nome, whatsapp e mês de aniversário.');
            return;
        }

        setLoading(true);

        try {
            // 1. Normalize Phone (assuming clientPhone is collected or prompted)
            const cleanPhone = selection.clientPhone.replace(/\D/g, '');

            // 2. CRM Capture: Upsert Client
            const { data: clientData, error: clientError } = await supabase
                .from('clients')
                .upsert({
                    tenant_id: tenant.id,
                    name: selection.clientName,
                    phone: cleanPhone,
                    last_visit: new Date().toISOString(),
                    metadata: { birth_month: selection.birthMonth }
                }, { onConflict: 'tenant_id,phone' })
                .select()
                .single();

            if (clientError) console.error('CRM Error:', clientError);

            // 3. Create Appointment in DB
            const { error: apptError } = await supabase
                .from('appointments')
                .insert([{
                    tenant_id: tenant.id,
                    client_id: clientData?.id,
                    customer_name: selection.clientName,
                    service_id: selection.service.id,
                    barber_id: selection.barber.id,
                    status: 'pending',
                    scheduled_at: `${selection.date}T${selection.time}:00`
                }]);

            if (apptError) throw apptError;

            // 4. WhatsApp Redirect
            const phoneNumber = `55${selection.barber.phone?.replace(/\D/g, '') || (tenant.phone?.replace(/\D/g, '') || '')}`;
            const message = `Olá ${selection.barber.full_name}! Sou o ${selection.clientName}. Gostaria de confirmar meu agendamento de ${selection.service.name} no dia ${new Date(selection.date).toLocaleDateString('pt-BR')} às ${selection.time}.`;

            const finalLink = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
            window.open(finalLink, '_blank');

            setStep(1); // Reset or show success
            alert('Agendamento realizado com sucesso! Enviando para o WhatsApp...');
        } catch (err: any) {
            alert('Erro ao confirmar: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#f2b90d]"></div>
            </div>
        );
    }

    if (!tenant) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loja não encontrada.</div>;

    const progress = (step / 4) * 100;

    return (
        <div className="min-h-screen relative overflow-hidden font-sans selection:bg-white/10" style={{ backgroundColor: theme.secondary }}>
            {/* Background Effect */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[120px] opacity-20"
                    style={{ background: `radial-gradient(circle, ${theme.primary} 0%, transparent 70%)` }}
                />
            </div>

            {/* Header */}
            <header className="relative z-50 px-8 py-6 flex justify-between items-start">
                <div className="flex items-center gap-4">
                    {tenant.logo_url && (
                        <img src={tenant.logo_url} alt={tenant.name} className="size-12 rounded-xl object-cover border border-white/10" />
                    )}
                    <div>
                        <h1 className="text-white text-xl font-black italic tracking-tighter leading-none uppercase">{tenant.name}</h1>
                        <p className="text-[#f2b90d] text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Premium Excellence</p>
                    </div>
                </div>

                <div className="text-right space-y-1 hidden md:block">
                    <p className="text-white text-[10px] font-bold uppercase tracking-widest leading-none opacity-60">{tenant.address}</p>
                    <p className="text-[#f2b90d] text-xs font-black italic">{tenant.phone}</p>
                </div>
            </header>

            {/* Progress Stepper */}
            <div className="fixed top-0 left-0 w-full bg-black/40 backdrop-blur-md z-[60] py-4 border-b border-white/5">
                <div className="max-w-4xl mx-auto px-6">
                    <div className="flex items-center justify-between relative">
                        {/* Connection Line */}
                        <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-white/10 -translate-y-1/2 -z-10" />
                        <div
                            className="absolute top-1/2 left-0 h-[2px] -translate-y-1/2 -z-10 transition-all duration-700 ease-in-out"
                            style={{
                                width: `${((step - 1) / 4) * 100}%`,
                                backgroundColor: theme.primary,
                                boxShadow: `0 0 10px ${theme.primary}`
                            }}
                        />

                        {/* Steps */}
                        {[
                            { num: 1, label: 'Serviço' },
                            { num: 2, label: 'Profissional' },
                            { num: 3, label: 'Data' },
                            { num: 4, label: 'Horário' },
                            { num: 5, label: 'Confirmar' }
                        ].map((s) => (
                            <div key={s.num} className="flex flex-col items-center gap-2 relative">
                                <div
                                    className={`size-10 md:size-12 rounded-full flex items-center justify-center font-black text-sm md:text-base transition-all duration-500 ${step >= s.num
                                            ? 'scale-110 shadow-lg'
                                            : 'scale-100'
                                        }`}
                                    style={{
                                        backgroundColor: step >= s.num ? theme.primary : 'rgba(255,255,255,0.05)',
                                        color: step >= s.num ? '#000' : 'rgba(255,255,255,0.3)',
                                        border: step === s.num ? `2px solid ${theme.primary}` : '2px solid transparent'
                                    }}
                                >
                                    {step > s.num ? (
                                        <span className="material-symbols-outlined text-lg">check</span>
                                    ) : (
                                        s.num
                                    )}
                                </div>
                                <span
                                    className="text-[9px] md:text-[10px] font-black uppercase tracking-wider hidden md:block transition-all duration-300"
                                    style={{ color: step >= s.num ? theme.primary : 'rgba(255,255,255,0.3)' }}
                                >
                                    {s.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <main className="relative z-10 max-w-4xl mx-auto px-6 pt-12 pb-24 min-h-[calc(100vh-100px)] flex flex-col justify-center">
                {step > 1 && step < 6 && (
                    <button
                        onClick={() => setStep(step - 1)}
                        className="fixed left-6 md:left-[calc((100vw-56rem)/2+1.5rem)] top-[100px] md:top-[110px] size-10 flex items-center justify-center rounded-full hover:opacity-80 transition-all group z-[100] cursor-pointer"
                        style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#ffffff' }}
                    >
                        <span className="material-symbols-outlined text-[20px] group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
                    </button>
                )}
                <div className="mb-20">
                    {step === 1 && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <h2 className="text-6xl md:text-8xl font-black italic uppercase tracking-tighter text-white leading-[0.8] mb-12">
                                O QUE VAMOS <br /><span style={{ color: theme.primary }}>FAZER HOJE?</span>
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {services.map(s => (
                                    <button
                                        key={s.id}
                                        onClick={() => { setSelection({ ...selection, service: s }); setStep(2); }}
                                        className="p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/5 hover:border-[#f2b90d]/30 transition-all text-left group active:scale-[0.98]"
                                        style={{ borderColor: selection.service?.id === s.id ? theme.primary : '' }}
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className="text-white text-2xl font-black italic uppercase tracking-tighter group-hover:text-[#f2b90d] transition-colors">{s.name}</span>
                                            <span className="text-2xl font-black italic text-[#f2b90d]">R$ {s.price}</span>
                                        </div>
                                        <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-2">Duração: {s.duration_minutes} min</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="animate-in fade-in slide-in-from-right-8 duration-700 relative">


                            <h2 className="text-6xl md:text-8xl font-black italic uppercase tracking-tighter text-white leading-[0.8] mb-12">
                                COM <span style={{ color: theme.primary }}>QUEM?</span>
                            </h2>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                {barbers.map(b => (
                                    <button
                                        key={b.id}
                                        onClick={() => { setSelection({ ...selection, barber: b }); setStep(3); }}
                                        className="flex flex-col items-center group active:scale-[0.98]"
                                    >
                                        <div className="size-32 rounded-[2.5rem] overflow-hidden border-2 border-white/5 group-hover:border-[#f2b90d]/50 transition-all mb-4 relative"
                                            style={{ borderColor: selection.barber?.id === b.id ? theme.primary : '' }}>
                                            {b.avatar_url ? (
                                                <img src={b.avatar_url} alt={b.full_name} className="size-full object-cover grayscale group-hover:grayscale-0 transition-all" />
                                            ) : (
                                                <div className="size-full bg-white/5 flex items-center justify-center text-white/20">
                                                    <span className="material-symbols-outlined text-4xl">person</span>
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-white font-black italic uppercase tracking-tight group-hover:text-[#f2b90d] transition-colors">{b.full_name}</span>
                                        <span className="text-[9px] text-white/40 font-bold uppercase tracking-widest mt-1 italic">Barbeiro Specialist</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="animate-in fade-in slide-in-from-right-8 duration-700 relative">
                            <h2 className="text-6xl md:text-8xl font-black italic uppercase tracking-tighter text-white leading-[0.8] mb-12">
                                QUAL O <br /><span style={{ color: theme.primary }}>MELHOR DIA?</span>
                            </h2>
                            <DateSelector
                                onSelect={(date) => {
                                    setSelection({ ...selection, date });
                                    setStep(4);
                                }}
                                theme={theme}
                            />
                        </div>
                    )}

                    {step === 4 && (
                        <div className="animate-in fade-in slide-in-from-right-8 duration-700 relative">


                            <h2 className="text-6xl md:text-8xl font-black italic uppercase tracking-tighter text-white leading-[0.8] mb-12">
                                ESCOLHA O <span style={{ color: theme.primary }}>HORÁRIO</span>
                            </h2>
                            <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                                {availableTimes.map(t => (
                                    <button
                                        key={t}
                                        onClick={() => { setSelection({ ...selection, time: t }); setStep(5); }}
                                        className="py-6 rounded-2xl md:rounded-3xl bg-white/[0.03] border border-white/5 text-white font-black italic text-xl hover:border-[#f2b90d]/50 transition-all active:scale-[0.98]"
                                        style={{ borderColor: selection.time === t ? theme.primary : '', color: selection.time === t ? theme.primary : '' }}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 5 && (
                        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 max-w-lg mx-auto relative">


                            <div className="text-center mb-12">
                                <div className="inline-flex size-20 rounded-[2rem] bg-[#f2b90d]/10 items-center justify-center text-[#f2b90d] mb-6 border border-[#f2b90d]/20 ring-4 ring-[#f2b90d]/5">
                                    <span className="material-symbols-outlined text-4xl">check_circle</span>
                                </div>
                                <h2 className="text-4xl font-black italic uppercase text-white tracking-tighter">Resumo do Agendamento</h2>
                                <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mt-2">{tenant.name}</p>
                            </div>

                            <div className="bg-white/[0.03] border border-white/5 rounded-[3rem] p-10 space-y-6 mb-12 shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                                    <span className="material-symbols-outlined text-8xl" style={{ color: theme.primary }}>content_cut</span>
                                </div>
                                <div className="flex justify-between items-end border-b border-white/5 pb-4">
                                    <div>
                                        <p className="text-[#f2b90d] text-[9px] font-black uppercase tracking-widest">Serviço</p>
                                        <p className="text-white text-xl font-black italic uppercase">{selection.service?.name}</p>
                                    </div>
                                    <p className="text-white font-black italic text-xl">R$ {selection.service?.price}</p>
                                </div>
                                <div>
                                    <p className="text-[#f2b90d] text-[9px] font-black uppercase tracking-widest">Profissional</p>
                                    <p className="text-white text-xl font-black italic uppercase">{selection.barber?.full_name}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-[#f2b90d] text-[10px] font-black uppercase tracking-widest">Data</p>
                                        <p className="text-white text-lg font-black italic">{new Date(selection.date).toLocaleDateString('pt-BR')}</p>
                                    </div>
                                    <div>
                                        <p className="text-[#f2b90d] text-[10px] font-black uppercase tracking-widest">Horário</p>
                                        <p className="text-white text-lg font-black italic">{selection.time}</p>
                                    </div>
                                </div>

                                <div className="pt-6 space-y-4">
                                    <input
                                        type="text"
                                        placeholder="SEU NOME"
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white font-black italic focus:border-[#f2b90d] transition-all"
                                        value={selection.clientName}
                                        onChange={(e) => setSelection({ ...selection, clientName: e.target.value })}
                                    />
                                    <input
                                        type="tel"
                                        placeholder="SEU WHATSAPP (DDD + NÚMERO)"
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white font-black italic focus:border-[#f2b90d] transition-all"
                                        value={selection.clientPhone}
                                        onChange={(e) => setSelection({ ...selection, clientPhone: e.target.value })}
                                    />
                                    <select
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white font-black italic focus:border-[#f2b90d] transition-all appearance-none cursor-pointer"
                                        value={selection.birthMonth}
                                        onChange={(e) => setSelection({ ...selection, birthMonth: e.target.value })}
                                    >
                                        <option value="" disabled className="bg-zinc-900">MÊS DE ANIVERSÁRIO (OBRIGATÓRIO)</option>
                                        {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].map(m => (
                                            <option key={m} value={m} className="bg-zinc-900">{m.toUpperCase()}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="pt-4">
                                    <VerificationBadge tenantId={tenant.id} phone={selection.clientPhone} />
                                </div>
                            </div>

                            <button
                                onClick={handleConfirm}
                                disabled={!selection.clientName || !selection.clientPhone || !selection.birthMonth}
                                className="w-full bg-[#f2b90d] text-black font-black py-6 md:py-7 rounded-[2.5rem] uppercase italic tracking-widest text-sm md:text-lg shadow-[0_20px_40px_rgba(242,185,13,0.3)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 md:gap-4 disabled:opacity-30"
                            >
                                <span className="material-symbols-outlined text-2xl md:text-3xl">chat</span>
                                ENVIAR NO WHATSAPP
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-center gap-4 opacity-10">
                    <p className="text-white text-[8px] font-black uppercase tracking-[0.5em]">POWERED BY FASTBEAUTY PRO</p>
                </div>
            </main>
        </div>
    );
}

// Sub-component to handle async checks without cluttering main component
const VerificationBadge = ({ tenantId, phone }: { tenantId: string, phone: string }) => {
    const [status, setStatus] = useState<'loading' | 'vip' | 'loyalty' | null>(null);

    useEffect(() => {
        if (!phone || phone.length < 8) {
            setStatus(null);
            return;
        }

        const check = async () => {
            const { LoyaltyService } = await import('@/lib/loyalty');
            const cleanPhone = phone.replace(/\D/g, '');

            // Check VIP first
            const sub = await LoyaltyService.checkSubscription(tenantId, cleanPhone);
            if (sub) {
                setStatus('vip');
                return;
            }

            // Check Loyalty
            const hasReward = await LoyaltyService.checkReward(tenantId, cleanPhone);
            if (hasReward) {
                setStatus('loyalty');
                return;
            }
            setStatus(null);
        };
        const timeout = setTimeout(check, 1000); // Debounce
        return () => clearTimeout(timeout);
    }, [tenantId, phone]);

    if (status === 'vip') return (
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/30 text-[10px] font-black uppercase tracking-widest animate-in zoom-in w-full justify-center">
            <span className="material-symbols-outlined text-sm">workspace_premium</span>
            Cliente VIP Detectado
        </span>
    );

    if (status === 'loyalty') return (
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 text-[10px] font-black uppercase tracking-widest animate-in zoom-in w-full justify-center">
            <span className="material-symbols-outlined text-sm">redeem</span>
            Recompensa Disponível (Grátis)
        </span>
    );

    return null;
};

// Custom Date Selector Component
const DateSelector = ({ onSelect, theme }: { onSelect: (date: string) => void, theme: any }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const dayNames = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days: (number | null)[] = [];

        // Add empty slots for days before the first day of the month
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
        }

        // Add all days of the month
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(i);
        }

        return days;
    };

    const handleDateClick = (day: number) => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const selected = new Date(year, month, day);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (selected >= today) {
            setSelectedDate(selected);
            const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            onSelect(formattedDate);
        }
    };

    const changeMonth = (delta: number) => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + delta, 1));
    };

    const days = getDaysInMonth(currentMonth);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (
        <div className="w-full max-w-md mx-auto bg-white/[0.03] border-2 border-white/5 rounded-[2.5rem] p-6 md:p-8">
            {/* Header with month/year navigation */}
            <div className="flex items-center justify-between mb-6">
                <button
                    onClick={() => changeMonth(-1)}
                    className="size-10 flex items-center justify-center rounded-full hover:bg-white/5 transition-all group"
                >
                    <span className="material-symbols-outlined text-white group-hover:text-[#f2b90d]">chevron_left</span>
                </button>
                <h3 className="text-white text-xl md:text-2xl font-black italic uppercase">
                    {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </h3>
                <button
                    onClick={() => changeMonth(1)}
                    className="size-10 flex items-center justify-center rounded-full hover:bg-white/5 transition-all group"
                >
                    <span className="material-symbols-outlined text-white group-hover:text-[#f2b90d]">chevron_right</span>
                </button>
            </div>

            {/* Day names */}
            <div className="grid grid-cols-7 gap-2 mb-4">
                {dayNames.map((day, i) => (
                    <div key={i} className="text-center text-white/40 text-xs font-black uppercase">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-2">
                {days.map((day, index) => {
                    if (day === null) {
                        return <div key={`empty-${index}`} className="aspect-square" />;
                    }

                    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                    const isPast = date < today;
                    const isSelected = selectedDate &&
                        date.getDate() === selectedDate.getDate() &&
                        date.getMonth() === selectedDate.getMonth() &&
                        date.getFullYear() === selectedDate.getFullYear();

                    return (
                        <button
                            key={day}
                            onClick={() => !isPast && handleDateClick(day)}
                            disabled={isPast}
                            className={`aspect-square rounded-xl flex items-center justify-center font-black italic text-lg transition-all ${isPast
                                ? 'text-white/10 cursor-not-allowed'
                                : isSelected
                                    ? 'bg-[#f2b90d] text-black scale-110 shadow-lg'
                                    : 'text-white hover:bg-white/10 hover:scale-105 active:scale-95'
                                }`}
                            style={isSelected ? { backgroundColor: theme.primary } : {}}
                        >
                            {day}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
