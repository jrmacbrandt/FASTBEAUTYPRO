import React, { useState } from 'react';
// @ts-ignore - Ignoring layout import if it's migrating
import Layout from '../../components/Layout';
import { maskPercent } from '@/lib/masks';

interface ProfessionalCommission {
  id: string;
  name: string;
  role: string;
  serviceType: 'percentage' | 'fixed';
  serviceValue: string;
  productType: 'percentage' | 'fixed';
  productValue: string;
}

const CommissionManagement: React.FC<{ businessType: 'barber' | 'salon' }> = ({ businessType }) => {
  const isSalon = businessType === 'salon';
  const [professionals, setProfessionals] = useState<ProfessionalCommission[]>([
    { id: '1', name: isSalon ? 'Clara Smith' : 'James Carter', role: isSalon ? 'Stylist' : 'Barbeiro Master', serviceType: 'percentage', serviceValue: '50', productType: 'percentage', productValue: '10' },
    { id: '2', name: isSalon ? 'Helena Rossi' : 'Leo Miller', role: isSalon ? 'Esteticista' : 'Estilista', serviceType: 'percentage', serviceValue: '40', productType: 'fixed', productValue: '5' }
  ]);

  const updateCommission = (id: string, field: keyof ProfessionalCommission, value: string) => {
    setProfessionals(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleSaveAll = () => {
    alert('Comissões atualizadas com sucesso!');
  };

  return (
    <Layout title="Gestão de Comissões">
      <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto pb-20">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-black italic uppercase tracking-tight">Taxas de Repasse</h3>
            <p className="text-text-muted text-[10px] font-bold uppercase tracking-widest italic">Ajuste os ganhos da sua equipe por serviço ou venda</p>
          </div>
          <button onClick={handleSaveAll} className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-xl font-black text-xs uppercase italic shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">save</span>
            SALVAR TUDO
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {professionals.map(pro => (
            <div key={pro.id} className={`${isSalon ? 'bg-white shadow-xl' : 'bg-background-card'} p-8 rounded-[2.5rem] border border-white/5 space-y-6 relative overflow-hidden group`}>
              <div className="absolute top-0 right-0 w-24 h-1 bg-primary/20 group-hover:bg-primary transition-all"></div>

              <div className="flex items-center gap-4 mb-4">
                <div className="size-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner">
                  <span className="material-symbols-outlined text-3xl">person_pin</span>
                </div>
                <div>
                  <h4 className="text-lg font-black italic uppercase tracking-tight text-text-main">{pro.name}</h4>
                  <p className="text-text-muted text-[9px] font-bold uppercase tracking-widest italic">{pro.role}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {/* Comissões de Serviços */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h5 className="text-[10px] font-black uppercase text-text-muted tracking-widest italic">Comissão sobre Serviços</h5>
                    <div className="flex p-1 bg-background-deep rounded-lg border border-white/5">
                      <button onClick={() => updateCommission(pro.id, 'serviceType', 'percentage')} className={`px-3 py-1 rounded-md text-[9px] font-black italic ${pro.serviceType === 'percentage' ? 'bg-primary text-white shadow-md' : 'text-text-muted'}`}>%</button>
                      <button onClick={() => updateCommission(pro.id, 'serviceType', 'fixed')} className={`px-3 py-1 rounded-md text-[9px] font-black italic ${pro.serviceType === 'fixed' ? 'bg-primary text-white shadow-md' : 'text-text-muted'}`}>R$</button>
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={pro.serviceValue}
                      onChange={e => updateCommission(pro.id, 'serviceValue', maskPercent(e.target.value))}
                      className={`w-full ${isSalon ? 'bg-slate-50' : 'bg-black'} border border-slate-500/10 rounded-2xl p-4 pl-10 font-black text-xl outline-none focus:border-primary transition-all`}
                      placeholder="0"
                    />
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-black opacity-50">{pro.serviceType === 'percentage' ? '%' : 'R$'}</span>
                  </div>
                </div>

                {/* Comissões de Produtos */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h5 className="text-[10px] font-black uppercase text-text-muted tracking-widest italic">Comissão sobre Produtos</h5>
                    <div className="flex p-1 bg-background-deep rounded-lg border border-white/5">
                      <button onClick={() => updateCommission(pro.id, 'productType', 'percentage')} className={`px-3 py-1 rounded-md text-[9px] font-black italic ${pro.productType === 'percentage' ? 'bg-primary text-white shadow-md' : 'text-text-muted'}`}>%</button>
                      <button onClick={() => updateCommission(pro.id, 'productType', 'fixed')} className={`px-3 py-1 rounded-md text-[9px] font-black italic ${pro.productType === 'fixed' ? 'bg-primary text-white shadow-md' : 'text-text-muted'}`}>R$</button>
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={pro.productValue}
                      onChange={e => updateCommission(pro.id, 'productValue', maskPercent(e.target.value))}
                      className={`w-full ${isSalon ? 'bg-slate-50' : 'bg-black'} border border-slate-500/10 rounded-2xl p-4 pl-10 font-black text-xl outline-none focus:border-primary transition-all`}
                      placeholder="0"
                    />
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-black opacity-50">{pro.productType === 'percentage' ? '%' : 'R$'}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default CommissionManagement;
