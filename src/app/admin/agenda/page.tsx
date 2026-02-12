"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface Professional {
    id: string;
    full_name: string;
    avatar_url: string | null;
}

interface Appointment {
    id: string;
    customer_name: string;
    appointment_time: string;
    status: string;
    barber_id: string;
    services: {
        name: string;
        price: number;
    } | null;
    profiles: {
        full_name: string;
    } | null;
}

export default function AdminAgendaPage() {
    const [businessType, setBusinessType] = useState<'barber' | 'salon'>('barber');
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>('all');
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const savedType = localStorage.getItem('elite_business_type') as 'barber' | 'salon';
        if (savedType) setBusinessType(savedType);
        fetchSidebarData();
    }, []);

    useEffect(() => {
        fetchAgenda();
    }, [selectedProfessionalId]);

    const colors = businessType === 'salon'
        ? { primary: '#7b438e', bg: '#faf8f5', text: '#1e1e1e', textMuted: '#6b6b6b', cardBg: '#ffffff', border: '#e2e8f0' }
        : { primary: '#f2b90d', bg: '#000000', text: '#f8fafc', textMuted: '#64748b', cardBg: '#121214', border: '#27272a' };

    const fetchSidebarData = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data: profile } = await supabase
            .from('profiles')
            .select('tenant_id')
            .eq('id', session.user.id)
            .single();

        if (profile?.tenant_id) {
            const { data } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url')
                .eq('tenant_id', profile.tenant_id)
                .eq('role', 'barber')
                .eq('status', 'active');

            if (data) setProfessionals(data);
        }
    };

    const fetchAgenda = async () => {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data: profile } = await supabase
            .from('profiles')
            .select('tenant_id')
            .eq('id', session.user.id)
            .single();

        if (profile?.tenant_id) {
            let query = supabase
                .from('appointments')
                .select('*, services(name, price), profiles!appointments_barber_id_fkey(full_name)')
                .eq('tenant_id', profile.tenant_id)
                .gte('appointment_time', new Date().toISOString().split('T')[0])
                .order('appointment_time', { ascending: true });

            if (selectedProfessionalId !== 'all') {
                query = query.eq('barber_id', selectedProfessionalId);
            }

            const { data, error } = await query;

            if (!error && data) {
                setAppointments(data as any);
            }
        }
        setLoading(false);
    };

    return (
        <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-10">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black italic tracking-tighter text-white uppercase">
                        AGENDA <span style={{ color: colors.primary }}>GERAL</span>
                    </h1>
                    <p className="text-xs md:text-sm text-slate-500 font-bold uppercase tracking-widest mt-1">Visualize e gerencie todos os agendamentos da unidade.</p>
                </div>

                <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5 w-full md:w-auto overflow-x-auto no-scrollbar">
                    <button
                        onClick={() => setSelectedProfessionalId('all')}
                        className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all italic whitespace-nowrap ${selectedProfessionalId === 'all' ? 'shadow-lg' : 'opacity-40 hover:opacity-100'}`}
                        style={selectedProfessionalId === 'all' ? { backgroundColor: colors.primary, color: businessType === 'salon' ? 'white' : 'black' } : { color: colors.text }}
                    >
                        TODOS
                    </button>
                    {professionals.map(pro => (
                        <button
                            key={pro.id}
                            onClick={() => setSelectedProfessionalId(pro.id)}
                            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all italic whitespace-nowrap ${selectedProfessionalId === pro.id ? 'shadow-lg' : 'opacity-40 hover:opacity-100'}`}
                            style={selectedProfessionalId === pro.id ? { backgroundColor: colors.primary, color: businessType === 'salon' ? 'white' : 'black' } : { color: colors.text }}
                        >
                            {pro.full_name.split(' ')[0]}
                        </button>
                    ))}
                </div>
            </header>

            <div className="grid gap-4">
                {loading ? (
                    <div className="py-20 text-center opacity-40">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 mx-auto mb-4" style={{ borderColor: colors.primary }}></div>
                        <p className="text-[10px] font-black uppercase tracking-widest">Sincronizando Agenda...</p>
                    </div>
                ) : appointments.length > 0 ? (
                    appointments.map(item => (
                        <div key={item.id} className="group border p-5 md:p-6 rounded-[2rem] transition-all hover:border-white/20 flex flex-col md:flex-row items-center justify-between gap-4" style={{ backgroundColor: colors.cardBg, borderColor: `${colors.text}0d` }}>
                            <div className="flex items-center gap-5 w-full md:w-auto">
                                <div className="size-12 md:size-16 rounded-2xl flex flex-col items-center justify-center font-black shrink-0 border transition-transform group-hover:scale-105 shadow-lg" style={{ backgroundColor: `${colors.primary}1a`, color: colors.primary, borderColor: `${colors.primary}33` }}>
                                    <span className="text-xs md:text-sm">{item.appointment_time.split('T')[1].substring(0, 5)}</span>
                                    <span className="text-[8px] opacity-60 uppercase">Hoje</span>
                                </div>
                                <div className="min-w-0">
                                    <h4 className="font-bold text-base md:text-xl truncate" style={{ color: colors.text }}>{item.customer_name}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest opacity-60" style={{ color: colors.textMuted }}>{item.services?.name || 'Serviço'}</span>
                                        <span className="size-1 rounded-full bg-white/10"></span>
                                        <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest" style={{ color: colors.primary }}>{item.profiles?.full_name || 'Profissional'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 w-full md:w-auto">
                                <div className="flex flex-col items-end mr-4 hidden md:flex">
                                    <span className="text-[9px] font-black uppercase tracking-widest opacity-40 italic">Valor</span>
                                    <span className="text-lg font-black italic tracking-tighter" style={{ color: colors.text }}>R$ {Number(item.services?.price || 0).toFixed(2)}</span>
                                </div>
                                <div className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border text-center w-full md:w-32 ${item.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                        item.status === 'absent' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                                            item.status === 'paid' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                                'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                    }`}>
                                    {item.status === 'completed' ? 'REALIZADO' :
                                        item.status === 'absent' ? 'AUSENTE' :
                                            item.status === 'paid' ? 'PAGO' :
                                                'AGENDADO'}
                                </div>
                                <Link href="/admin/caixa" className="size-10 md:size-12 rounded-xl flex items-center justify-center bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all shrink-0">
                                    <span className="material-symbols-outlined text-[20px]">more_vert</span>
                                </Link>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-24 bg-black/20 rounded-[3rem] border border-dashed border-white/5">
                        <span className="material-symbols-outlined text-6xl opacity-10 mb-4" style={{ color: colors.text }}>calendar_today</span>
                        <h3 className="text-xl font-black italic uppercase opacity-40">Nenhum compromisso</h3>
                        <p className="text-xs font-bold opacity-20 uppercase tracking-widest mt-2">Nenhum agendamento encontrado para os filtros selecionados.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
