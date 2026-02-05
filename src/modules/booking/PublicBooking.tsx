
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const PublicBooking: React.FC<{ businessType: 'barber' | 'salon' }> = ({ businessType }) => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const isSalon = businessType === 'salon';
  
  const theme = useMemo(() => {
    const saved = localStorage.getItem('elite_tenant_theme');
    if (saved) return JSON.parse(saved);
    return { primary: isSalon ? '#86198f' : '#f2b90d', secondary: '#09090b' };
  }, [isSalon]);

  const [selection, setSelection] = useState({ service: '', barber: '', date: '', time: '', name: '', phone: '' });
  const services = [{ id: 's1', name: isSalon ? 'Corte & Escova' : 'Corte Clássico', price: 45 }, { id: 's2', name: isSalon ? 'Coloração Global' : 'Barba & Modelagem', price: 120 }, { id: 's3', name: isSalon ? 'Spa Capilar Orchid' : 'Experiência Elite (Combo)', price: 90 }];
  const barbers = [{ id: 'b1', name: isSalon ? 'Clara Smith' : 'James Carter', role: isSalon ? 'Stylist Senior' : 'Barbeiro Master' }, { id: 'b2', name: isSalon ? 'Helena Rossi' : 'Leo Miller', role: isSalon ? 'Esteticista' : 'Estilista' }];
  const times = ['09:00', '10:30', '13:00', '15:00', '16:30'];

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  const finishBooking = () => {
    const message = `Olá! Gostaria de confirmar meu agendamento: ${selection.service} com ${selection.barber} no dia ${selection.date} às ${selection.time}. Nome: ${selection.name}`;
    window.open(`https://wa.me/5500000000000?text=${encodeURIComponent(message)}`, '_blank');
    navigate(`/${slug}/confirmed`, { state: selection });
  };

  const isPrimaryLight = ['#ffffff', '#f2b90d', '#fbbf24'].includes(theme.primary.toLowerCase());
  const buttonTextColor = isPrimaryLight ? '#000000' : '#ffffff';

  return (
    <div className="min-h-screen text-white font-display relative overflow-hidden" style={{ backgroundColor: theme.secondary, backgroundImage: `radial-gradient(circle at top right, ${theme.primary}20, transparent), radial-gradient(circle at bottom left, ${theme.primary}10, transparent)` }}>
      <div className="absolute -top-24 -right-24 size-96 blur-[120px] rounded-full opacity-20 pointer-events-none" style={{ backgroundColor: theme.primary }}></div>
      <header className="p-6 border-b border-white/5 flex justify-between items-center bg-black/20 backdrop-blur-xl sticky top-0 z-50">
        <h1 className="text-xl font-black italic tracking-tighter uppercase">
          FASTBEAUTY <span style={{ color: theme.primary }}>PRO</span>
        </h1>
        <div className="flex items-center gap-2">
           <span className="material-symbols-outlined text-[14px]" style={{ color: theme.primary }}>location_on</span>
           <span className="text-[10px] uppercase font-black tracking-widest opacity-60">Unidade {slug?.replace('-', ' ')}</span>
        </div>
      </header>
      <main className="max-w-xl mx-auto p-6 py-12 relative z-10">
        <div className="flex gap-3 mb-12">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className="h-1.5 flex-1 rounded-full transition-all duration-500" style={{ backgroundColor: step >= s ? theme.primary : 'rgba(255,255,255,0.05)', boxShadow: step >= s ? `0 0 10px ${theme.primary}40` : 'none' }}></div>
          ))}
        </div>
        {step === 1 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <h2 className="text-4xl font-black italic uppercase tracking-tight">O que vamos <br/> fazer <span style={{ color: theme.primary }}>hoje?</span></h2>
            <div className="grid gap-4">
              {services.map(s => (
                <button key={s.id} onClick={() => { setSelection({ ...selection, service: s.name }); nextStep(); }} className="p-6 rounded-[2rem] border-2 text-left flex justify-between items-center transition-all group bg-white/5 backdrop-blur-md relative overflow-hidden" style={{ borderColor: selection.service === s.name ? theme.primary : 'rgba(255,255,255,0.05)' }}>
                  <div className="relative z-10"><span className="font-black text-xl italic uppercase tracking-tighter block">{s.name}</span></div>
                  <span className="text-2xl font-black italic tracking-tighter relative z-10" style={{ color: theme.primary }}>R$ {s.price}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {step === 4 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <h2 className="text-4xl font-black italic uppercase tracking-tight">Quase <br/> <span style={{ color: theme.primary }}>lá!</span></h2>
            <div className="space-y-4 bg-white/5 backdrop-blur-md p-8 rounded-[2.5rem] border border-white/5">
              <input type="text" placeholder="Nome Completo" className="w-full bg-black/40 border-2 border-white/5 rounded-2xl p-5 text-white font-bold focus:outline-none focus:border-white/20 transition-all placeholder:text-white/20" value={selection.name} onChange={(e) => setSelection({ ...selection, name: e.target.value })} />
              <input type="tel" placeholder="WhatsApp" className="w-full bg-black/40 border-2 border-white/5 rounded-2xl p-5 text-white font-bold focus:outline-none focus:border-white/20 transition-all placeholder:text-white/20" value={selection.phone} onChange={(e) => setSelection({ ...selection, phone: e.target.value })} />
            </div>
            <button disabled={!selection.name || !selection.phone} onClick={finishBooking} className="w-full font-black py-6 rounded-[2rem] text-lg transition-all shadow-2xl active:scale-95 flex items-center justify-center gap-3 uppercase italic tracking-tight" style={{ backgroundColor: theme.primary, color: buttonTextColor, boxShadow: `0 20px 40px ${theme.primary}30` }}>FINALIZAR AGENDAMENTO</button>
          </div>
        )}
        {/* Adicionado step 2 e 3 simplificados para manter lógica funcional */}
        {(step === 2 || step === 3) && <button onClick={nextStep} className="w-full bg-primary py-4 rounded-xl font-bold uppercase">PRÓXIMO PASSO</button>}
      </main>
      <footer className="p-12 text-center opacity-20 mt-auto">
         <p className="text-[10px] font-black uppercase tracking-[0.5em]">Powered by FastBeauty Pro</p>
      </footer>
    </div>
  );
};

export default PublicBooking;
