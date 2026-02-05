
import React, { useState } from 'react';
import Layout from '../../components/Layout';

type SendStatus = 'idle' | 'sending' | 'success' | 'error';

const TeamMessages: React.FC<{ businessType: 'barber' | 'salon' }> = ({ businessType }) => {
  const isSalon = businessType === 'salon';
  const [recipient, setRecipient] = useState('all');
  const [messageText, setMessageText] = useState('');
  const [status, setStatus] = useState<SendStatus>('idle');

  const team = [
    { id: 'all', name: 'Toda a Equipe' },
    { id: 'b1', name: isSalon ? 'Clara Profissional' : 'James Carter' },
    { id: 'b2', name: isSalon ? 'Sarah Connor' : 'Leo Miller' },
  ];

  const handleSendMessage = () => {
    if (!messageText.trim()) return;
    
    setStatus('sending');
    
    // Simula envio e dispara evento para o Layout ouvir (simulando backend real)
    setTimeout(() => {
      try {
        // Simulação de chance de erro (ex: 5% de chance)
        const isError = Math.random() < 0.05;
        
        if (isError) throw new Error("Falha na conexão");

        const event = new CustomEvent('new_elite_message', {
          detail: {
            id: Date.now().toString(),
            sender: 'Administração',
            text: messageText,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            read: false
          }
        });
        window.dispatchEvent(event);
        
        setStatus('success');
        setMessageText('');

        // Remove a mensagem de sucesso após 3 segundos
        setTimeout(() => setStatus('idle'), 3000);
      } catch (err) {
        setStatus('error');
        // Remove a mensagem de erro após 3 segundos
        setTimeout(() => setStatus('idle'), 3000);
      }
    }, 1200);
  };

  return (
    <Layout title="Mensagens da Equipe">
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
        
        {/* Feedback de Sucesso/Erro no Centro da Tela */}
        {(status === 'success' || status === 'error') && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none p-6">
            <div className={`
              ${status === 'success' ? 'bg-emerald-500 shadow-emerald-500/30' : 'bg-red-500 shadow-red-500/30'} 
              text-white px-10 py-8 rounded-[2.5rem] shadow-2xl animate-in zoom-in duration-300 flex flex-col items-center gap-4 pointer-events-auto
            `}>
              <div className="size-20 bg-white/20 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-5xl font-bold">
                  {status === 'success' ? 'check' : 'close'}
                </span>
              </div>
              <div className="text-center">
                <h4 className="text-xl font-black italic uppercase tracking-tighter">
                  {status === 'success' ? 'Enviado com Sucesso' : 'Falha no Envio'}
                </h4>
                <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest mt-1">
                  {status === 'success' ? 'Comunicado registrado no sistema' : 'Tente novamente em instantes'}
                </p>
              </div>
              <button 
                onClick={() => setStatus('idle')}
                className="mt-2 text-[9px] font-black uppercase tracking-widest bg-black/20 px-4 py-2 rounded-full hover:bg-black/30 transition-all"
              >
                FECHAR
              </button>
            </div>
          </div>
        )}

        <div className={`${isSalon ? 'bg-white shadow-xl' : 'bg-background-card'} p-8 md:p-12 rounded-[2.5rem] border border-slate-500/10`}>
          <div className="flex items-center gap-4 mb-10">
            <div className="size-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-3xl">chat_bubble</span>
            </div>
            <div>
              <h3 className="text-2xl font-black italic uppercase tracking-tight">Novo Comunicado</h3>
              <p className="text-text-muted text-[10px] font-bold uppercase tracking-widest italic">Envie orientações ou avisos para seus colaboradores</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-text-muted ml-2 tracking-widest italic">Destinatário</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-5 top-4 text-primary opacity-60">person_search</span>
                <select 
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  disabled={status === 'sending'}
                  className={`w-full ${isSalon ? 'bg-slate-50 border-slate-200' : 'bg-black border-white/10'} border rounded-2xl py-4 pl-14 pr-6 focus:outline-none focus:border-primary transition-all font-bold appearance-none cursor-pointer disabled:opacity-50`}
                >
                  {team.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-5 top-4 text-text-muted pointer-events-none">expand_more</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-text-muted ml-2 tracking-widest italic">Mensagem</label>
              <textarea 
                rows={6}
                placeholder="Digite o conteúdo da mensagem aqui..."
                value={messageText}
                disabled={status === 'sending'}
                onChange={(e) => setMessageText(e.target.value)}
                className={`w-full ${isSalon ? 'bg-slate-50 border-slate-200' : 'bg-black border-white/10'} border rounded-3xl p-6 focus:outline-none focus:border-primary transition-all font-medium leading-relaxed resize-none disabled:opacity-50`}
              />
            </div>

            <div className="pt-4">
              <button 
                onClick={handleSendMessage}
                disabled={status === 'sending' || !messageText.trim()}
                className={`w-full bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-black py-6 rounded-[1.8rem] text-lg shadow-2xl shadow-primary/20 transition-all flex items-center justify-center gap-3 uppercase italic tracking-tight active:scale-95`}
              >
                {status === 'sending' ? (
                  <span className="animate-spin material-symbols-outlined">progress_activity</span>
                ) : (
                  <>
                    ENVIAR COMUNICADO
                    <span className="material-symbols-outlined">send</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Dicas de Uso */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {[
             { icon: 'notifications_active', title: 'Notificação Imediata', desc: 'O profissional verá uma bolinha vermelha no sininho instantaneamente.' },
             { icon: 'history', title: 'Histórico de Envios', desc: 'As mensagens ficam salvas no painel do colaborador para consulta posterior.' },
             { icon: 'verified', title: 'Confirmação', desc: 'Garanta que toda a equipe esteja alinhada com os objetivos da barbearia.' }
           ].map((tip, i) => (
             <div key={i} className={`${isSalon ? 'bg-white' : 'bg-background-card/40'} p-6 rounded-[2rem] border border-slate-500/10 text-center`}>
                <span className="material-symbols-outlined text-primary text-3xl mb-3">{tip.icon}</span>
                <h4 className="text-xs font-black uppercase italic mb-1">{tip.title}</h4>
                <p className="text-[10px] text-text-muted font-bold leading-tight">{tip.desc}</p>
             </div>
           ))}
        </div>
      </div>
    </Layout>
  );
};

export default TeamMessages;
