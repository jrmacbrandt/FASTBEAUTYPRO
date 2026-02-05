
import React from 'react';
import { useNavigate } from 'react-router-dom';

interface LandingPageProps {
  onSelectType: (type: 'barber' | 'salon') => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onSelectType }) => {
  const navigate = useNavigate();

  const handleChoice = (type: 'barber' | 'salon') => {
    onSelectType(type);
    navigate('/sistema');
  };

  const colors = {
    amber: '#f2b90d',
    purple: '#7b438e',
    darkBg: '#09090b',
    cardDark: '#18181b'
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center transition-colors duration-700" style={{ backgroundColor: colors.darkBg }}>
      <div className="max-w-4xl w-full">
        <h1 className="text-5xl md:text-8xl font-black text-white mb-6 tracking-tighter italic uppercase leading-none">
          FASTBEAUTY <span style={{ color: colors.amber }} className="italic">PRO</span>
        </h1>
        <p className="text-lg md:text-xl text-slate-400 mb-16 max-w-2xl mx-auto leading-relaxed font-bold">
          Escolha o nicho do seu estabelecimento para iniciar a experiência personalizada.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          <button onClick={() => handleChoice('barber')} className="group relative border-2 border-transparent hover:border-[#f2b90d] p-10 rounded-[2.5rem] transition-all duration-500 shadow-2xl overflow-hidden text-left" style={{ backgroundColor: colors.cardDark }}>
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
              <span className="material-symbols-outlined text-8xl" style={{ color: colors.amber }}>content_cut</span>
            </div>
            <h3 className="text-2xl font-black italic mb-3 uppercase tracking-tight" style={{ color: colors.amber }}>Barbearia</h3>
            <p className="text-slate-500 font-bold text-sm mb-8 leading-snug">Contraste Dark, Amber e gestão robusta de equipe.</p>
            <span className="inline-block px-8 py-3 rounded-xl font-black text-xs transition-transform group-hover:scale-105 active:scale-95" style={{ backgroundColor: colors.amber, color: colors.darkBg }}>SELECIONAR</span>
          </button>
          <button onClick={() => handleChoice('salon')} className="group relative bg-white border-2 border-transparent hover:border-[#7b438e] p-10 rounded-[2.5rem] transition-all duration-500 shadow-2xl overflow-hidden text-left">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
              <span className="material-symbols-outlined text-8xl" style={{ color: colors.purple }}>spa</span>
            </div>
            <h3 className="text-2xl font-black italic mb-3 uppercase tracking-tight" style={{ color: colors.purple }}>Salão & Spa</h3>
            <p className="text-slate-400 font-bold text-sm mb-8 leading-snug">Estética SpaLab, Roxo Ametista e design minimalista.</p>
            <span className="inline-block px-8 py-3 rounded-xl font-black text-xs text-white transition-transform group-hover:scale-105 active:scale-95" style={{ backgroundColor: colors.purple }}>SELECIONAR</span>
          </button>
        </div>
      </div>
      <div className="mt-20 opacity-20">
         <div className="w-12 h-1 rounded-full bg-white/20"></div>
      </div>
    </div>
  );
};

export default LandingPage;
