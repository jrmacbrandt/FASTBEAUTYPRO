
import React, { useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

const BookingConfirmation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { slug } = useParams();
  const details = location.state as any;
  
  const theme = useMemo(() => {
    const saved = localStorage.getItem('elite_tenant_theme');
    if (saved) return JSON.parse(saved);
    return {
      primary: '#f2b90d',
      secondary: '#09090b'
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('elite_user');
    sessionStorage.removeItem('elite_sidebar_scroll');
    navigate('/login', { replace: true });
  };

  const isPrimaryLight = ['#ffffff', '#f2b90d', '#fbbf24'].includes(theme.primary.toLowerCase());
  const buttonTextColor = isPrimaryLight ? '#000000' : '#ffffff';

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-6 text-white font-display relative overflow-hidden"
      style={{ 
        backgroundColor: theme.secondary,
        backgroundImage: `radial-gradient(circle at top right, ${theme.primary}15, transparent)` 
      }}
    >
      <div className="max-w-md w-full bg-white/5 backdrop-blur-2xl border border-white/5 p-10 rounded-[3rem] text-center shadow-2xl relative z-10">
        <div className="size-24 rounded-full flex items-center justify-center mx-auto mb-8 relative" style={{ backgroundColor: `${theme.primary}10` }}>
          <div className="absolute inset-0 animate-ping rounded-full opacity-20" style={{ backgroundColor: theme.primary }}></div>
          <span className="material-symbols-outlined text-6xl relative" style={{ color: theme.primary }}>check_circle</span>
        </div>
        
        <h1 className="text-4xl font-black mb-3 italic uppercase tracking-tight leading-none">Agendamento <br/><span style={{ color: theme.primary }}>Confirmado!</span></h1>
        <p className="text-white/40 text-xs font-bold uppercase tracking-widest leading-relaxed mb-10">Sua reserva foi enviada diretamente para o sistema e para o WhatsApp do profissional.</p>

        <div className="bg-black/30 p-8 rounded-[2rem] text-left border border-white/5 space-y-5 mb-10">
          <div className="flex justify-between border-b border-white/5 pb-3">
            <span className="text-white/30 font-black text-[9px] uppercase tracking-widest italic">Serviço</span>
            <span className="font-black italic text-sm">{details?.service || 'Corte de Cabelo'}</span>
          </div>
          <div className="flex justify-between border-b border-white/5 pb-3">
            <span className="text-white/30 font-black text-[9px] uppercase tracking-widest italic">Profissional</span>
            <span className="font-black italic text-sm">{details?.barber || 'James Carter'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/30 font-black text-[9px] uppercase tracking-widest italic">Data & Hora</span>
            <span className="font-black italic text-sm" style={{ color: theme.primary }}>{details?.date || 'Hoje'} às {details?.time || 'Agora'}</span>
          </div>
        </div>

        <div className="space-y-4">
          <button 
            onClick={() => navigate(`/${slug}`)}
            className="w-full font-black py-5 rounded-2xl text-[13px] uppercase tracking-widest transition-all hover:scale-[1.02] shadow-xl italic"
            style={{ 
              backgroundColor: theme.primary, 
              color: buttonTextColor,
              boxShadow: `0 15px 30px ${theme.primary}30`
            }}
          >
            Fazer Novo Agendamento
          </button>
          
          <div className="grid grid-cols-2 gap-3">
             <button 
                onClick={() => window.history.back()}
                className="bg-white/5 border border-white/10 text-white font-black py-4 rounded-xl text-[9px] uppercase tracking-widest transition-all hover:bg-white/10"
              >
                REENVIAR WHATSAPP
              </button>
              <button 
                onClick={handleLogout}
                className="bg-white/5 border border-white/10 text-white font-black py-4 rounded-xl text-[9px] uppercase tracking-widest transition-all hover:bg-white/10"
              >
                SAIR DO SISTEMA
              </button>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-24 -left-24 size-96 blur-[120px] rounded-full opacity-10 pointer-events-none" style={{ backgroundColor: theme.primary }}></div>
    </div>
  );
};

export default BookingConfirmation;
