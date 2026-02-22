"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useProfile } from '@/hooks/useProfile';
import AppointmentEditModal from './AppointmentEditModal';

interface Professional {
    id: string;
    full_name: string;
    avatar_url: string | null;
}

interface Appointment {
    id: string;
    customer_name: string;
    customer_whatsapp: string;
    scheduled_at: string;
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
    const { profile, loading: profileLoading, businessType: hookBusinessType, theme: colors } = useProfile();
    const businessType = hookBusinessType || 'barber';
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>('all');
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const fetchSidebarData = async (tid: string) => {
        const { data } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('tenant_id', tid)
            .eq('role', 'barber')
            .eq('status', 'active');

        if (data) setProfessionals(data);
    };

    const fetchAgenda = async (tid: string) => {
        setLoading(true);
        let query = supabase
            .from('appointments')
            .select('*, services(name, price), profiles!appointments_barber_id_fkey(full_name)')
            .eq('tenant_id', tid)
            .gte('scheduled_at', new Date().toISOString().split('T')[0] + 'T00:00:00')
            .order('scheduled_at', { ascending: true });

        if (selectedProfessionalId !== 'all') {
            query = query.eq('barber_id', selectedProfessionalId);
        }

        const { data, error } = await query;
        if (!error && data) {
            setAppointments(data as any);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (profile?.tenant_id) {
            fetchSidebarData(profile.tenant_id);
        }
    }, [profile]);

    useEffect(() => {
        if (profile?.tenant_id) {
            fetchAgenda(profile.tenant_id);
        }
    }, [profile, selectedProfessionalId]);

    // Ref para capturar a versão mais atual de fetchAgenda (evita stale closure no Realtime/Polling)
    const fetchAgendaRef = React.useRef(fetchAgenda);
    useEffect(() => {
        fetchAgendaRef.current = fetchAgenda;
    });

    // 🔴 REALTIME: Canal Supabase + polling de segurança como fallback
    useEffect(() => {
        if (!profile?.tenant_id) return;

        const tid = profile.tenant_id;
        let pollInterval: ReturnType<typeof setInterval> | null = null;

        const channel = supabase
            .channel(`admin-agenda-${tid}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'appointments',
                    filter: `tenant_id=eq.${tid}`
                },
                (payload) => {
                    console.log('[Realtime Admin] appointments change:', payload.eventType);
                    fetchAgendaRef.current(tid);
                }
            )
            .subscribe((status) => {
                console.log('[Realtime Admin] status:', status);
            });

        // Polling a cada 15s como fallback caso Realtime não esteja com Replication ativa
        pollInterval = setInterval(() => {
            fetchAgendaRef.current(tid);
        }, 15000);

        return () => {
            supabase.removeChannel(channel);
            if (pollInterval) clearInterval(pollInterval);
        };
    }, [profile?.tenant_id]);

    if (profileLoading) return <div className="text-center py-20 opacity-40">Carregando agenda...</div>;

    const todayDate = new Date();
    const todayStr = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;
    const todayItems = appointments.filter(a => a.scheduled_at.startsWith(todayStr));
    const upcomingItems = appointments.filter(a => !a.scheduled_at.startsWith(todayStr));

    return (
        <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-10">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black italic tracking-tighter uppercase" style={{ color: colors.text }}>
                        AGENDA <span style={{ color: colors.primary }}>GERAL</span>
                    </h1>
                    <p className="text-xs md:text-sm font-bold uppercase tracking-widest mt-1" style={{ color: colors.textMuted }}>Visualize e gerencie todos os agendamentos da unidade.</p>
                </div>

                <div className="relative w-full md:w-64">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[18px] opacity-50 pointer-events-none" style={{ color: colors.text }}>filter_list</span>
                    <select
                        value={selectedProfessionalId}
                        onChange={(e) => setSelectedProfessionalId(e.target.value)}
                        className="w-full appearance-none pl-12 pr-10 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all italic border outline-none cursor-pointer hover:opacity-80"
                        style={{
                            backgroundColor: colors.cardBg,
                            color: colors.text,
                            borderColor: colors.border
                        }}
                    >
                        <option value="all">Todos os Profissionais</option>
                        {professionals.map(pro => (
                            <option key={pro.id} value={pro.id}>
                                {pro.full_name}
                            </option>
                        ))}
                    </select>
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[18px] opacity-50 pointer-events-none" style={{ color: colors.text }}>expand_more</span>
                </div>
            </header>

            <div className="space-y-12">
                {/* TODAY SECTION */}
                {todayItems.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 px-2">
                            <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <h2 className="text-sm font-black uppercase tracking-widest opacity-60" style={{ color: colors.text }}>Agenda de Hoje</h2>
                        </div>
                        <div className="grid gap-4">
                            {todayItems.map(item => (
                                <AdminAgendaCard key={item.id} item={item} colors={colors} isToday onEdit={(appt) => { setSelectedAppointment(appt); setIsEditModalOpen(true); }} />
                            ))}
                        </div>
                    </div>
                )}

                {/* UPCOMING SECTION */}
                {upcomingItems.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 px-2">
                            <span className="size-2 rounded-full bg-amber-500"></span>
                            <h2 className="text-sm font-black uppercase tracking-widest opacity-60" style={{ color: colors.text }}>Próximos Agendamentos</h2>
                        </div>
                        <div className="grid gap-4">
                            {upcomingItems.map(item => (
                                <AdminAgendaCard key={item.id} item={item} colors={colors} onEdit={(appt) => { setSelectedAppointment(appt); setIsEditModalOpen(true); }} />
                            ))}
                        </div>
                    </div>
                )}

                {!loading && appointments.length === 0 && (
                    <div className="text-center py-24 rounded-[3rem] border border-dashed" style={{ backgroundColor: `${colors.cardBg}80`, borderColor: `${colors.text}10` }}>
                        <span className="material-symbols-outlined text-6xl opacity-10 mb-4" style={{ color: colors.text }}>calendar_today</span>
                        <h3 className="text-xl font-black italic uppercase opacity-40" style={{ color: colors.textMuted }}>Nenhum compromisso</h3>
                        <p className="text-xs font-bold opacity-20 uppercase tracking-widest mt-2" style={{ color: colors.textMuted }}>Nenhum agendamento encontrado para os filtros selecionados.</p>
                    </div>
                )}
            </div>

            {isEditModalOpen && selectedAppointment && (
                <AppointmentEditModal
                    appointment={selectedAppointment}
                    onClose={() => { setIsEditModalOpen(false); setSelectedAppointment(null); }}
                    onSave={() => fetchAgenda(profile?.tenant_id || '')}
                    colors={colors}
                />
            )}
        </div>
    );
}

const AdminAgendaCard = ({ item, colors, isToday, onEdit }: { item: Appointment, colors: any, isToday?: boolean, onEdit: (appt: Appointment) => void }) => {
    return (
        <div className="group border p-5 md:p-6 rounded-[2rem] transition-all flex flex-col md:flex-row items-center justify-between gap-4 hover:shadow-lg" style={{ backgroundColor: colors.cardBg, borderColor: `${colors.text}0d` }}>
            <div className="flex items-center gap-5 w-full md:w-auto">
                <div className="size-14 md:size-20 rounded-2xl flex flex-col items-center justify-center font-black shrink-0 border transition-transform group-hover:scale-105 shadow-lg gap-0.5" style={{ backgroundColor: `${colors.primary}1a`, color: colors.primary, borderColor: `${colors.primary}33` }}>
                    <span className="text-sm md:text-2xl text-white opacity-90 uppercase tracking-tighter leading-none">{isToday ? 'Hoje' : new Date(item.scheduled_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                    <span className="text-[10px] md:text-xs opacity-60 leading-none tracking-widest">{item.scheduled_at?.split('T')[1]?.substring(0, 5) || '00:00'}</span>
                </div>
                <div className="min-w-0">
                    <h4 className="font-bold text-base md:text-xl truncate" style={{ color: colors.text }}>{item.customer_name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest opacity-60" style={{ color: colors.textMuted }}>{item.services?.name || 'Serviço'}</span>
                        <span className="size-1 rounded-full" style={{ backgroundColor: `${colors.text}20` }}></span>
                        <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest" style={{ color: colors.primary }}>{item.profiles?.full_name || 'Profissional'}</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="flex flex-col items-end mr-4 hidden md:flex">
                    <span className="text-[9px] font-black uppercase tracking-widest opacity-40 italic" style={{ color: colors.textMuted }}>Valor</span>
                    <span className="text-lg font-black italic tracking-tighter" style={{ color: colors.text }}>R$ {Number(item.services?.price || 0).toFixed(2)}</span>
                </div>
                <div className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border text-center w-full md:w-32 ${item.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                    item.status === 'absent' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                        item.status === 'paid' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                            item.status === 'cancelled' ? 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20' :
                                'bg-amber-500/10 text-amber-500 border-amber-500/20'
                    }`}>
                    {item.status === 'completed' ? 'REALIZADO' :
                        item.status === 'absent' ? 'AUSENTE' :
                            item.status === 'paid' ? 'PAGO' :
                                item.status === 'cancelled' ? 'CANCELADO' :
                                    'AGENDADO'}
                </div>
                <button
                    onClick={() => onEdit(item)}
                    className="size-10 md:size-12 rounded-xl flex items-center justify-center transition-all shrink-0 hover:bg-black/5"
                    style={{ backgroundColor: `${colors.text}0d`, color: `${colors.text}60` }}
                >
                    <span className="material-symbols-outlined text-[20px]">edit</span>
                </button>
            </div>
        </div>
    );
}
