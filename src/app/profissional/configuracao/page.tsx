"use client";

import React, { useState } from 'react';

export default function ProfessionalSettingsPage() {
    const [schedule, setSchedule] = useState([
        { day: 'Segunda-feira', active: true, start: '09:00', end: '19:00' },
        { day: 'Terça-feira', active: true, start: '09:00', end: '19:00' },
        { day: 'Quarta-feira', active: true, start: '09:00', end: '19:00' },
        { day: 'Quinta-feira', active: true, start: '09:00', end: '19:00' },
        { day: 'Sexta-feira', active: true, start: '09:00', end: '20:00' },
        { day: 'Sábado', active: true, start: '08:00', end: '18:00' },
        { day: 'Domingo', active: false, start: '00:00', end: '00:00' },
    ]);

    const toggleDay = (idx: number) => {
        const newSchedule = [...schedule];
        newSchedule[idx].active = !newSchedule[idx].active;
        setSchedule(newSchedule);
    };

    const updateTime = (idx: number, type: 'start' | 'end', val: string) => {
        const newSchedule = [...schedule];
        newSchedule[idx][type] = val;
        setSchedule(newSchedule);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-20">
            <div className="bg-[#121214] p-8 rounded-[2.5rem] border border-white/5">
                <div className="flex items-center justify-between mb-10">
                    <div>
                        <h3 className="text-xl text-white font-black italic uppercase tracking-tight">Minha Disponibilidade</h3>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Defina seu horário de atendimento</p>
                    </div>
                    <button className="bg-[#f2b90d] text-black px-8 py-3 rounded-xl font-black text-xs uppercase italic shadow-lg shadow-[#f2b90d]/20 active:scale-95 transition-all">
                        SALVAR CONFIGURAÇÕES
                    </button>
                </div>

                <div className="space-y-4">
                    {schedule.map((item, idx) => (
                        <div
                            key={idx}
                            className={`p-6 rounded-[2rem] border transition-all flex flex-col md:flex-row items-center justify-between gap-6 ${item.active
                                    ? 'bg-white/5 border-[#f2b90d]/10'
                                    : 'bg-transparent border-white/5 opacity-40 grayscale'
                                }`}
                        >
                            <div className="flex items-center gap-4 w-full md:w-48">
                                <button
                                    onClick={() => toggleDay(idx)}
                                    className={`size-12 rounded-2xl flex items-center justify-center transition-all ${item.active ? 'bg-[#f2b90d] text-black' : 'bg-white/10 text-slate-500'
                                        }`}
                                >
                                    <span className="material-symbols-outlined">
                                        {item.active ? 'check_circle' : 'do_not_disturb_on'}
                                    </span>
                                </button>
                                <span className="font-bold text-lg text-white italic uppercase">{item.day}</span>
                            </div>

                            {item.active ? (
                                <div className="flex items-center gap-3 w-full md:w-auto">
                                    <div className="flex-1">
                                        <p className="text-[9px] font-black uppercase text-slate-500 mb-1 ml-1 tracking-widest italic">Início</p>
                                        <input
                                            type="time"
                                            value={item.start}
                                            onChange={(e) => updateTime(idx, 'start', e.target.value)}
                                            className="w-full bg-black border border-white/10 p-3 rounded-xl font-bold text-sm text-white outline-none focus:border-[#f2b90d] [color-scheme:dark]"
                                        />
                                    </div>
                                    <div className="size-2 rounded-full bg-[#f2b90d]/40 mt-6 shrink-0"></div>
                                    <div className="flex-1">
                                        <p className="text-[9px] font-black uppercase text-slate-500 mb-1 ml-1 tracking-widest italic">Término</p>
                                        <input
                                            type="time"
                                            value={item.end}
                                            onChange={(e) => updateTime(idx, 'end', e.target.value)}
                                            className="w-full bg-black border border-white/10 p-3 rounded-xl font-bold text-sm text-white outline-none focus:border-[#f2b90d] [color-scheme:dark]"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="text-slate-600 font-black text-xs uppercase tracking-[0.4em] italic">Indisponível</div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
