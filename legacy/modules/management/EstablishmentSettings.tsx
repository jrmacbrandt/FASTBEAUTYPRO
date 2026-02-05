
import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';

type CouponType = 'percentage' | 'fixed';
type CouponScope = 'services' | 'products' | 'both';

interface Coupon {
  id: string;
  code: string;
  type: CouponType;
  scope: CouponScope;
  value: string;
  status: string;
  usage: number;
}

const EstablishmentSettings: React.FC<{ businessType: 'barber' | 'salon' }> = ({ businessType }) => {
  const isSalon = businessType === 'salon';
  const [activeTab, setActiveTab] = useState<'general' | 'finance' | 'hours' | 'automation' | 'coupons'>('general');
  const [isSaving, setIsSaving] = useState(false);

  // Estados de Configuração Global
  const [ownerData, setOwnerData] = useState({
    ownerName: isSalon ? 'Helena Smith' : 'Michael Carter',
    ownerCpfCnpj: '12.345.678/0001-99',
    unitName: isSalon ? "FastBeauty Salon Unit" : "FastBeauty Barber Unit",
    whatsapp: '(11) 99999-9999',
    slug: isSalon ? 'salon-unit' : 'barber-unit',
    pixKey: 'financeiro@fastbeauty.pro',
    bookingPrimaryColor: '',
    bookingSecondaryColor: '',
    logoUrl: ''
  });

  const [paymentFees, setPaymentFees] = useState({ pix: '0.00', cash: '0.00', credit: '4.99', debit: '1.99' });
  const [shopHours, setShopHours] = useState([{ day: 'Segunda-feira', active: true, start: '09:00', end: '19:00' }, { day: 'Terça-feira', active: true, start: '09:00', end: '19:00' }, { day: 'Quarta-feira', active: true, start: '09:00', end: '19:00' }, { day: 'Quinta-feira', active: true, start: '09:00', end: '19:00' }, { day: 'Sexta-feira', active: true, start: '09:00', end: '20:00' }, { day: 'Sábado', active: true, start: '08:00', end: '18:00' }, { day: 'Domingo', active: false, start: '00:00', end: '00:00' }]);
  const [manualBooking, setManualBooking] = useState({ clientName: '', clientPhone: '', serviceId: '', barberId: '', date: '', time: '', template: 'Olá [nome_Profissional]! Meu nome é [nome-cliente] e acabei de realizar um agendamento via telefone do [nome-estabelecimento]. Gostaria de confirmar contigo o [Serviço] para o horário das [hh:mm]h do dia [dd/mm/aa]. Aguardo seu contato.' });
  const [coupons, setCoupons] = useState<Coupon[]>([{ id: '1', code: 'PROMO10', type: 'percentage', scope: 'both', value: '10', status: 'active', usage: 12 }]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('elite_tenant_theme');
    if (savedTheme) {
      const theme = JSON.parse(savedTheme);
      setOwnerData(prev => ({ ...prev, bookingPrimaryColor: theme.primary, bookingSecondaryColor: theme.secondary || (isSalon ? '#f1f5f9' : '#09090b') }));
    } else {
      setOwnerData(prev => ({ ...prev, bookingPrimaryColor: isSalon ? '#86198f' : '#f2b90d', bookingSecondaryColor: isSalon ? '#f1f5f9' : '#09090b' }));
    }
  }, [isSalon]);

  const handleSave = () => {
    setIsSaving(true);
    localStorage.setItem('elite_tenant_theme', JSON.stringify({ primary: ownerData.bookingPrimaryColor, secondary: ownerData.bookingSecondaryColor }));
    setTimeout(() => { setIsSaving(false); alert('Configurações salvas!'); }, 1000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Link copiado!');
  };

  const getRenderedMessage = () => {
    const barber = "[Profissional]";
    const client = manualBooking.clientName || "[nome-cliente]";
    const shop = ownerData.unitName || "[FastBeauty Pro]";
    return manualBooking.template.replace(/\[nome_Profissional\]/g, barber).replace(/\[nome-cliente\]/g, client).replace(/\[nome-estabelecimento\]/g, shop);
  };

  return (
    <Layout title="Configurações de Estabelecimento">
      <div className="space-y-8 max-w-6xl mx-auto pb-20">
        <div className={`flex flex-wrap p-2 rounded-[2rem] ${isSalon ? 'bg-white shadow-sm' : 'bg-background-card border-white/5 border'} gap-2`}>
          {[{ id: 'general', label: 'Estabelecimento', icon: 'storefront' }, { id: 'finance', label: 'Pagamentos/Taxas', icon: 'payments' }, { id: 'hours', label: 'Horários', icon: 'schedule' }, { id: 'automation', label: 'Agendamento Direto', icon: 'bolt' }].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all italic ${activeTab === tab.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-text-muted hover:bg-primary/5 hover:text-text-main'}`}>
              <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>{tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'general' && (
          <div className={`${isSalon ? 'bg-white shadow-xl' : 'bg-background-card'} p-10 rounded-[3rem] border border-white/5 space-y-8 animate-in fade-in`}>
            <h4 className="text-xl font-black italic uppercase text-text-main">Dados do Estabelecimento</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <input type="text" className={`w-full ${isSalon ? 'bg-slate-50' : 'bg-black'} border border-slate-500/10 rounded-2xl p-4 font-bold`} value={ownerData.unitName} onChange={e => setOwnerData({...ownerData, unitName: e.target.value})} />
              <div className="relative">
                <span className="absolute left-4 top-4 text-primary font-black opacity-40">fastbeauty.pro/</span>
                <input type="text" className={`w-full ${isSalon ? 'bg-slate-50' : 'bg-black'} border border-slate-500/10 rounded-2xl p-4 pl-[125px] font-bold`} value={ownerData.slug} onChange={e => setOwnerData({...ownerData, slug: e.target.value})} />
                <button onClick={() => copyToClipboard(`fastbeauty.pro/${ownerData.slug}`)} className="absolute right-4 top-3.5 size-10 flex items-center justify-center text-primary"><span className="material-symbols-outlined">content_copy</span></button>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-center pt-10">
          <button onClick={handleSave} disabled={isSaving} className="bg-emerald-500 hover:bg-emerald-600 text-white px-16 py-6 rounded-[1.8rem] text-[15px] font-black uppercase tracking-widest italic shadow-2xl shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-4">
            <span className="material-symbols-outlined text-[24px]">save</span>{isSaving ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default EstablishmentSettings;
