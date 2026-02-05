
import React, { useState } from 'react';
import Layout from '../../components/Layout';

const BarberSettings: React.FC<{ businessType: 'barber' | 'salon' }> = ({ businessType }) => {
  const isSalon = businessType === 'salon';
  
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
    <Layout title="Minha Disponibilidade">
      <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
        <div className={`${isSalon ? 'bg-white shadow-xl' : 'bg-background-card'} p-8 rounded-[2.5rem] border border-white/5`}>
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="text-xl font-black italic uppercase tracking-tight">Horários de Atendimento</h3>
              <p className="text-text-muted text-[10px] font-bold uppercase tracking-widest">Defina quando você estará disponível para agendamentos</p>
            </div>
            <button className="bg-primary text-white px-8 py-3 rounded-xl font-black text-xs uppercase italic shadow-lg shadow-primary/20">
              SALVAR CONFIGURAÇÕES
            </button>
          </div>

          <div className="space-y-4">
            {schedule.map((item, idx) => (
              <div 
                key={idx} 
                className={`p-6 rounded-[2rem] border transition-all flex flex-col md:flex-row items-center justify-between gap-6 ${
                  item.active 
                  ? (isSalon ? 'bg-primary/5 border-primary/20 shadow-sm' : 'bg-background-elite/40 border-primary/10') 
                  : 'bg-transparent border-slate-500/10 opacity-60 grayscale'
                }`}
              >
                <div className="flex items-center gap-4 w-full md:w-48">
                   <button 
                    onClick={() => toggleDay(idx)}
                    className={`size-12 rounded-2xl flex items-center justify-center transition-all ${
                      item.active ? 'bg-primary text-white' : 'bg-slate-500/20 text-text-muted'
                    }`}
                   >
                     <span className="material-symbols-outlined">
                        {item.active ? 'check_circle' : 'do_not_disturb_on'}
                     </span>
                   </button>
                   <span className="font-bold text-lg italic uppercase tracking-tighter">{item.day}</span>
                </div>

                {item.active ? (
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="flex-1">
                       <p className="text-[9px] font-black uppercase text-text-muted mb-1 ml-1 tracking-widest">Início</p>
                       <input 
                        type="time" 
                        value={item.start}
                        onChange={(e) => updateTime(idx, 'start', e.target.value)}
                        className={`w-full bg-background-deep border border-slate-500/20 p-3 rounded-xl font-bold text-sm focus:border-primary outline-none ${isSalon ? '[color-scheme:light]' : '[color-scheme:dark]'}`}
                       />
                    </div>
                    <div className="size-2 rounded-full bg-primary/40 mt-6 shrink-0"></div>
                    <div className="flex-1">
                       <p className="text-[9px] font-black uppercase text-text-muted mb-1 ml-1 tracking-widest">Término</p>
                       <input 
                        type="time" 
                        value={item.end}
                        onChange={(e) => updateTime(idx, 'end', e.target.value)}
                        className={`w-full bg-background-deep border border-slate-500/20 p-3 rounded-xl font-bold text-sm focus:border-primary outline-none ${isSalon ? '[color-scheme:light]' : '[color-scheme:dark]'}`}
                       />
                    </div>
                  </div>
                ) : (
                  <div className="text-text-muted font-black text-xs uppercase tracking-[0.4em] italic">Indisponível</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default BarberSettings;
