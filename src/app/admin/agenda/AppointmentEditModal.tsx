"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { maskCurrency } from '@/lib/masks';
import CustomDatePicker from '@/components/CustomDatePicker';

interface AppointmentEditModalProps {
    appointment: any;
    onClose: () => void;
    onSave: () => void;
    colors: any;
}

export default function AppointmentEditModal({ appointment, onClose, onSave, colors }: AppointmentEditModalProps) {
    const [professionals, setProfessionals] = useState<any[]>([]);
    const [services, setServices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        barber_id: appointment.barber_id,
        service_id: appointment.service_id,
        price: (appointment.price || appointment.services?.price || 0).toString().replace('.', ','),
        date: appointment.scheduled_at.split('T')[0],
        time: appointment.scheduled_at.split('T')[1].substring(0, 5),
        status: appointment.status
    });

    useEffect(() => {
        const fetchData = async () => {
            const { data: pros } = await supabase
                .from('profiles')
                .select('id, full_name')
                .eq('tenant_id', appointment.tenant_id)
                .eq('role', 'barber')
                .eq('status', 'active');

            const { data: servs } = await supabase
                .from('services')
                .select('id, name, price')
                .eq('tenant_id', appointment.tenant_id);

            if (pros) setProfessionals(pros);
            if (servs) setServices(servs);
            setLoading(false);
        };
        fetchData();
    }, [appointment.tenant_id]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const priceNum = parseFloat(formData.price.replace(',', '.'));
            const scheduledAt = `${formData.date}T${formData.time}:00`;

            const { error } = await supabase
                .from('appointments')
                .update({
                    barber_id: formData.barber_id,
                    service_id: formData.service_id,
                    price: priceNum,
                    scheduled_at: scheduledAt,
                    status: formData.status
                })
                .eq('id', appointment.id);

            if (error) throw error;
            onSave();
            onClose();
        } catch (err: any) {
            alert('Erro ao salvar: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleCancelAppointment = async () => {
        if (!confirm('Tem certeza que deseja cancelar este agendamento?')) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('appointments')
                .update({ status: 'cancelled' })
                .eq('id', appointment.id);

            if (error) throw error;
            onSave();
            onClose();
        } catch (err: any) {
            alert('Erro ao cancelar: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#18181b] border border-white/10 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-8">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h3 className="text-2xl font-black italic uppercase text-white tracking-tighter">EDITAR AGENDAMENTO</h3>
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Cliente: {appointment.customer_name}</p>
                        </div>
                        <button onClick={onClose} className="size-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                            <span className="material-symbols-outlined text-zinc-400">close</span>
                        </button>
                    </div>

                    <form onSubmit={handleSave} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase text-zinc-500 ml-1 tracking-[0.1em]">PROFISSIONAL</label>
                            <select
                                value={formData.barber_id}
                                onChange={e => setFormData({ ...formData, barber_id: e.target.value })}
                                className="w-full bg-black border border-white/5 rounded-2xl p-4 text-sm font-bold text-white focus:border-[#f2b90d] focus:outline-none transition-all"
                            >
                                {professionals.map(p => (
                                    <option key={p.id} value={p.id}>{p.full_name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase text-zinc-500 ml-1 tracking-[0.1em]">SERVIÇO</label>
                                <select
                                    value={formData.service_id}
                                    onChange={e => {
                                        const s = services.find(sv => sv.id === e.target.value);
                                        setFormData({
                                            ...formData,
                                            service_id: e.target.value,
                                            price: s ? s.price.toString().replace('.', ',') : formData.price
                                        });
                                    }}
                                    className="w-full bg-black border border-white/5 rounded-2xl p-4 text-sm font-bold text-white focus:border-[#f2b90d] focus:outline-none transition-all"
                                >
                                    {services.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase text-zinc-500 ml-1 tracking-[0.1em]">VALOR (R$)</label>
                                <input
                                    type="text"
                                    value={formData.price}
                                    onChange={e => setFormData({ ...formData, price: maskCurrency(e.target.value) })}
                                    className="w-full bg-black border border-white/5 rounded-2xl p-4 text-sm font-bold text-white focus:border-[#f2b90d] focus:outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase text-zinc-500 ml-1 tracking-[0.1em]">DATA</label>
                                <CustomDatePicker
                                    value={formData.date}
                                    onChange={val => setFormData({ ...formData, date: val })}
                                    className="w-full bg-black border border-white/5 rounded-2xl p-4 text-sm"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase text-zinc-500 ml-1 tracking-[0.1em]">HORÁRIO</label>
                                <input
                                    type="time"
                                    value={formData.time}
                                    onChange={e => setFormData({ ...formData, time: e.target.value })}
                                    className="w-full bg-black border border-white/5 rounded-2xl p-4 text-sm font-bold text-white focus:border-[#f2b90d] focus:outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div className="pt-4 space-y-3">
                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full bg-[#f2b90d] hover:bg-[#ffc82a] text-black font-black py-4 rounded-xl uppercase tracking-widest transition-all shadow-xl active:scale-95 text-xs"
                            >
                                {saving ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}
                            </button>
                            <button
                                type="button"
                                onClick={handleCancelAppointment}
                                disabled={saving}
                                className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold py-4 rounded-xl uppercase tracking-widest transition-all text-[10px] border border-red-500/20"
                            >
                                CANCELAR AGENDAMENTO
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
