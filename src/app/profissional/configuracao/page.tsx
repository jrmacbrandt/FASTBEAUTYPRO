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
        <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-20 px-4 md:px-0">
            <div className="bg-[#121214] p-6 md:p-10 rounded-[2.5rem] border border-white/5 shadow-2xl">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 md:mb-10">
                    <div>
                        <h3 className="text-xl text-white font-black italic uppercase tracking-tight leading-none mb-1">Disponibilidade</h3>
                        <p className="text-slate-500 text-[9px] md:text-[10px] font-bold uppercase tracking-widest italic opacity-60">Seu horário de atendimento</p>
                    </div>
                    <button className="w-full sm:w-auto bg-[#f2b90d] text-black px-8 py-3.5 rounded-xl font-black text-xs uppercase italic shadow-lg shadow-[#f2b90d]/20 active:scale-95 transition-all">
                        SALVAR ALTERAÇÕES
                    </button>
                </div>

                <div className="space-y-3">
                    {schedule.map((item, idx) => (
                        <div
                            key={idx}
                            className={`p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border transition-all flex flex-col sm:flex-row items-center justify-between gap-4 md:gap-6 ${item.active
                                ? 'bg-white/5 border-[#f2b90d]/10'
                                : 'bg-transparent border-white/5 opacity-40 grayscale'
                                } shadow-md`}
                        >
                            <div className="flex items-center gap-3 md:gap-4 w-full sm:w-48">
                                <button
                                    onClick={() => toggleDay(idx)}
                                    className={`size-10 md:size-12 rounded-xl md:rounded-2xl flex items-center justify-center transition-all shrink-0 ${item.active ? 'bg-[#f2b90d] text-black shadow-lg shadow-[#f2b90d]/10' : 'bg-white/10 text-slate-500'
                                        }`}
                                >
                                    <span className="material-symbols-outlined text-xl md:text-2xl">
                                        {item.active ? 'check_circle' : 'do_not_disturb_on'}
                                    </span>
                                </button>
                                <span className="font-black text-base md:text-lg text-white italic uppercase tracking-tight truncate">{item.day}</span>
                            </div>

                            {item.active ? (
                                <div className="flex items-center gap-2 md:gap-3 w-full sm:w-auto">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[8px] md:text-[9px] font-black uppercase text-slate-500 mb-1 ml-1 tracking-widest italic opacity-40">Início</p>
                                        <input
                                            type="time"
                                            value={item.start}
                                            onChange={(e) => updateTime(idx, 'start', e.target.value)}
                                            className="w-full bg-black border border-white/10 p-2.5 md:p-3 rounded-lg md:rounded-xl font-bold text-xs md:text-sm text-white outline-none focus:border-[#f2b90d] [color-scheme:dark]"
                                        />
                                    </div>
                                    <div className="size-1.5 md:size-2 rounded-full bg-[#f2b90d]/40 mt-5 md:mt-6 shrink-0"></div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[8px] md:text-[9px] font-black uppercase text-slate-500 mb-1 ml-1 tracking-widest italic opacity-40">Término</p>
                                        <input
                                            type="time"
                                            value={item.end}
                                            onChange={(e) => updateTime(idx, 'end', e.target.value)}
                                            className="w-full bg-black border border-white/10 p-2.5 md:p-3 rounded-lg md:rounded-xl font-bold text-xs md:text-sm text-white outline-none focus:border-[#f2b90d] [color-scheme:dark]"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="text-slate-600 font-black text-[10px] md:text-xs uppercase tracking-[0.4em] italic opacity-40 py-2 sm:py-0">Indisponível</div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
