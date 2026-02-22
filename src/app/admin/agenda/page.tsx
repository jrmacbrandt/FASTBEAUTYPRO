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

    const [currentTab, setCurrentTab] = useState<'ativos' | 'ausentes'>('ativos');

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
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        let query = supabase
            .from('appointments')
            .select('*, services(name, price), profiles!appointments_barber_id_fkey(full_name)')
            .eq('tenant_id', tid)
            .gte('scheduled_at', thirtyDaysAgo.toISOString().split('T')[0] + 'T00:00:00')
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

    const handleToggleStatus = async (id: string, newStatus: 'scheduled' | 'absent') => {
        if (!profile?.tenant_id) return;
        setLoading(true);
        if (newStatus === 'absent') {
            await supabase.rpc('mark_appointment_no_show', {
                p_appointment_id: id,
                p_tenant_id: profile.tenant_id
            });
        } else {
            await supabase.from('appointments').update({ status: 'scheduled' }).eq('id', id);
        }
        await fetchAgenda(profile.tenant_id);
    };

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

    const activeItems = appointments.filter(a => a.status === 'scheduled');
    const absentItems = appointments.filter(a => a.status === 'absent').sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at));

    const todayDate = new Date();
    const todayStr = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;
    const todayItems = activeItems.filter(a => a.scheduled_at.startsWith(todayStr));
    const upcomingItems = activeItems.filter(a => !a.scheduled_at.startsWith(todayStr) && a.scheduled_at > todayStr);

    return (
        <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-10">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black italic tracking-tighter uppercase" style={{ color: colors.text }}>
                        AGENDA <span style={{ color: colors.primary }}>GERAL</span>
                    </h1>
                    <p className="text-xs md:text-sm font-bold uppercase tracking-widest mt-1" style={{ color: colors.textMuted }}>Visualize e gerencie todos os agendamentos da unidade.</p>
                </div>

                <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                    <div className="flex bg-black/40 p-1.5 rounded-2xl gap-1 border border-white/5 w-full md:w-auto">
                        <button
                            onClick={() => setCurrentTab('ativos')}
                            className={`flex-1 md:px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${currentTab === 'ativos' ? 'bg-primary text-black' : 'text-slate-400 hover:text-white'}`}
                            style={currentTab === 'ativos' ? { backgroundColor: colors.primary } : {}}
                        >
                            Ativos ({activeItems.length})
                        </button>
                        <button
                            onClick={() => setCurrentTab('ausentes')}
                            className={`flex-1 md:px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${currentTab === 'ausentes' ? 'bg-primary text-black' : 'text-slate-400 hover:text-white'}`}
                            style={currentTab === 'ausentes' ? { backgroundColor: colors.primary } : {}}
                        >
                            Ausentes ({absentItems.length})
                        </button>
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
                </div>
            </header>

            <div className="space-y-12">
                {currentTab === 'ativos' ? (
                    <>
                        {/* TODAY SECTION */}
                        {todayItems.length > 0 && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 px-2">
                                    <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                    <h2 className="text-sm font-black uppercase tracking-widest opacity-60" style={{ color: colors.text }}>Agenda de Hoje</h2>
                                </div>
                                <div className="grid gap-4">
                                    {todayItems.map(item => (
                                        <AdminAgendaCard key={item.id} item={item} colors={colors} isToday onEdit={(appt) => { setSelectedAppointment(appt); setIsEditModalOpen(true); }} onToggleStatus={handleToggleStatus} />
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
                                        <AdminAgendaCard key={item.id} item={item} colors={colors} onEdit={(appt) => { setSelectedAppointment(appt); setIsEditModalOpen(true); }} onToggleStatus={handleToggleStatus} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {!loading && todayItems.length === 0 && upcomingItems.length === 0 && (
                            <div className="text-center py-24 rounded-[3rem] border border-dashed" style={{ backgroundColor: `${colors.cardBg}80`, borderColor: `${colors.text}10` }}>
                                <span className="material-symbols-outlined text-6xl opacity-10 mb-4" style={{ color: colors.text }}>calendar_today</span>
                                <h3 className="text-xl font-black italic uppercase opacity-40" style={{ color: colors.textMuted }}>Nenhum compromisso ativo</h3>
                                <p className="text-xs font-bold opacity-20 uppercase tracking-widest mt-2" style={{ color: colors.textMuted }}>Não há agendamentos futuros para os filtros selecionados.</p>
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        {/* ABSENT SECTION */}
                        {absentItems.length > 0 ? (
                            <div className="space-y-4">
                                <div className="grid gap-4">
                                    {absentItems.map(item => (
                                        <AdminAgendaCard key={item.id} item={item} colors={colors} onEdit={(appt) => { setSelectedAppointment(appt); setIsEditModalOpen(true); }} onToggleStatus={handleToggleStatus} />
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-24 rounded-[3rem] border border-dashed" style={{ backgroundColor: `${colors.cardBg}80`, borderColor: `${colors.text}10` }}>
                                <span className="material-symbols-outlined text-6xl opacity-10 mb-4 text-rose-500">person_off</span>
                                <h3 className="text-xl font-black italic uppercase opacity-40 text-rose-500">Nenhum Ausente</h3>
                                <p className="text-xs font-bold opacity-20 uppercase tracking-widest mt-2" style={{ color: colors.textMuted }}>O histórico de falhas de comparecimento está limpo.</p>
                            </div>
                        )}
                    </>
                )}

                {isEditModalOpen && selectedAppointment && (
                    <AppointmentEditModal
                        appointment={selectedAppointment}
                        onClose={() => { setIsEditModalOpen(false); setSelectedAppointment(null); }}
                        onSave={() => fetchAgenda(profile?.tenant_id || '')}
                        colors={colors}
                    />
                )}
            </div>
        </div>
    );
}

const AdminAgendaCard = ({ item, colors, isToday, onEdit, onToggleStatus }: { item: Appointment, colors: any, isToday?: boolean, onEdit: (appt: Appointment) => void, onToggleStatus: (id: string, s: 'scheduled' | 'absent') => void }) => {
    const status = item.status;
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
                <div className="flex items-center gap-2 bg-black/20 p-2 rounded-xl border border-white/5 mr-2">
                    <span className={`text-[8px] font-black uppercase tracking-widest ${status === 'scheduled' ? 'text-primary' : 'text-slate-500'}`}>Confirmado</span>
                    <button
                        onClick={() => onToggleStatus(item.id, status === 'scheduled' ? 'absent' : 'scheduled')}
                        className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${status === 'scheduled' ? 'bg-primary/20' : 'bg-rose-500/20'}`}
                    >
                        <div className={`absolute top-0.5 bottom-0.5 w-4 rounded-full transition-all ${status === 'scheduled' ? 'left-0.5 bg-primary' : 'right-0.5 bg-rose-500'}`}></div>
                    </button>
                    <span className={`text-[8px] font-black uppercase tracking-widest ${status === 'absent' ? 'text-rose-500' : 'text-slate-500'}`}>Ausente</span>
                </div>
                <button
                    onClick={() => onEdit(item)}
                    className="size-10 md:size-12 rounded-xl flex items-center justify-center transition-all shrink-0 hover:bg-black/5 ml-2"
                    style={{ backgroundColor: `${colors.text}0d`, color: `${colors.text}60` }}
                >
                    <span className="material-symbols-outlined text-[20px]">edit</span>
                </button>
            </div>
        </div>
    );
}
