
import React, { useState } from 'react';
import Layout from '../../components/Layout';

const TeamManagement: React.FC<{ businessType: 'barber' | 'salon' }> = ({ businessType }) => {
  const isSalon = businessType === 'salon';
  const [barbers, setBarbers] = useState([
    { id: '1', name: 'James Carter', email: 'james@elite.com', role: 'Barbeiro Master', status: 'active', commission: 50 },
    { id: '2', name: 'Leo Miller', email: 'leo@elite.com', role: 'Estilista', status: 'active', commission: 40 },
    { id: '3', name: 'Sarah Connor', email: 'sarah@elite.com', role: 'Barbeira', status: 'pending', commission: 45 },
  ]);

  const [activeTab, setActiveTab] = useState<'team' | 'pending'>('team');

  const handleAction = (id: string, action: 'approve' | 'suspend' | 'delete') => {
    setBarbers(barbers.map(b => {
      if (b.id !== id) return b;
      if (action === 'approve') return { ...b, status: 'active' };
      if (action === 'suspend') return { ...b, status: b.status === 'active' ? 'suspended' : 'active' };
      return b;
    }).filter(b => action === 'delete' ? b.id !== id : true));
  };

  const pendingCount = barbers.filter(b => b.status === 'pending').length;

  return (
    <Layout title="Equipe & Colaboradores">
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className={`flex p-1.5 rounded-2xl ${isSalon ? 'bg-slate-100' : 'bg-black/50'} border border-white/5`}>
            <button 
              onClick={() => setActiveTab('team')}
              className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all italic ${activeTab === 'team' ? 'bg-primary text-white shadow-lg' : 'text-text-muted hover:text-text-main'}`}
            >
              ATIVOS
            </button>
            <button 
              onClick={() => setActiveTab('pending')}
              className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all italic flex items-center gap-2 ${activeTab === 'pending' ? 'bg-primary text-white shadow-lg' : 'text-text-muted hover:text-text-main'}`}
            >
              SOLICITAÇÕES {pendingCount > 0 && <span className="bg-red-500 text-white size-5 flex items-center justify-center rounded-full text-[9px]">{pendingCount}</span>}
            </button>
          </div>
          <button className="bg-primary text-white px-8 py-4 rounded-xl font-black text-xs shadow-lg shadow-primary/20 uppercase italic tracking-tight">
            CADASTRAR PROFISSIONAL
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {barbers.filter(b => activeTab === 'team' ? b.status !== 'pending' : b.status === 'pending').map(barber => (
            <div key={barber.id} className={`${isSalon ? 'bg-white border-slate-100 shadow-sm' : 'bg-background-card border-white/5'} p-6 rounded-[2rem] border flex flex-col md:flex-row items-center justify-between gap-6 group hover:border-primary/20 transition-all`}>
              <div className="flex items-center gap-4">
                <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-inner">
                  <span className="material-symbols-outlined text-4xl">person_pin</span>
                </div>
                <div>
                  <h4 className="font-bold text-lg">{barber.name}</h4>
                  <p className="text-text-muted text-[10px] font-black uppercase tracking-widest">{barber.email}</p>
                  <div className="flex gap-2 mt-2">
                    <span className="bg-white/5 text-text-muted text-[9px] font-black uppercase px-3 py-1 rounded-full border border-slate-500/10">
                      {barber.role}
                    </span>
                    <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full border ${
                      barber.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                      'bg-red-500/10 text-red-500 border-red-500/20'
                    }`}>
                      {barber.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:items-end gap-2">
                <div className="text-right mb-2">
                  <p className="text-text-muted text-[9px] font-black uppercase tracking-[0.2em] italic">Comissão Base</p>
                  <p className="text-primary text-3xl font-black italic tracking-tighter">{barber.commission}%</p>
                </div>
                <div className="flex gap-2">
                  {barber.status === 'pending' ? (
                    <>
                      <button onClick={() => handleAction(barber.id, 'approve')} className="bg-emerald-500 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-emerald-500/20">APROVAR</button>
                      <button onClick={() => handleAction(barber.id, 'delete')} className="bg-red-500/10 text-red-500 px-6 py-2 rounded-xl text-[10px] font-black uppercase">REJEITAR</button>
                    </>
                  ) : (
                    <>
                      <button className="p-2 text-text-muted hover:text-primary transition-colors"><span className="material-symbols-outlined">edit</span></button>
                      <button onClick={() => handleAction(barber.id, 'suspend')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${barber.status === 'active' ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                        {barber.status === 'active' ? 'SUSPENDER' : 'REATIVAR'}
                      </button>
                      <button onClick={() => handleAction(barber.id, 'delete')} className="p-2 text-text-muted hover:text-red-500 transition-colors"><span className="material-symbols-outlined">delete</span></button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
          {barbers.filter(b => activeTab === 'team' ? b.status !== 'pending' : b.status === 'pending').length === 0 && (
            <div className="text-center py-20 opacity-40">
              <span className="material-symbols-outlined text-6xl mb-4 italic">groups</span>
              <p className="font-black uppercase text-xs tracking-[0.4em]">Nenhum registro encontrado</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default TeamManagement;
