
import React, { useState } from 'react';
import Layout from '../../components/Layout';

const MasterDashboard: React.FC = () => {
  const [tenants, setTenants] = useState([
    { id: '1', name: 'Barbearia FastBeauty', slug: 'fast-barber', owner: 'admin@fastbeauty.pro', status: 'active', created_at: '2024-01-10' },
  ]);

  const metrics = [
    { label: 'Unidades Ativas', val: '1,240', trend: '+12%', icon: 'storefront' },
    { label: 'Status FastBeauty Pro', val: '99.9%', trend: 'Optimum', icon: 'check_circle' }
  ];

  return (
    <Layout title="Gestão Global FastBeauty Pro">
      <div className="space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {metrics.map((m, i) => (
            <div key={i} className="bg-background-elite/60 p-8 rounded-[2rem] border border-white/5 relative group hover:border-primary/40 transition-all">
              <span className="material-symbols-outlined absolute top-8 right-8 text-primary/10 text-6xl group-hover:text-primary/20 transition-all">{m.icon}</span>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1 italic">{m.label}</p>
              <h4 className="text-white text-4xl font-black italic tracking-tighter mb-4">{m.val}</h4>
            </div>
          ))}
        </div>
        <div className="bg-background-card rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
          <div className="p-10 border-b border-white/5 flex justify-between items-center">
             <h3 className="text-white text-2xl font-black italic tracking-tight uppercase">Inquilinos FastBeauty Pro</h3>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default MasterDashboard;
