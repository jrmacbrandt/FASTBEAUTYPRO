
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
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
    async function loadTenantData() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', session.user.id).single();
      if (!profile?.tenant_id) return;

      const { data: tenant } = await supabase.from('tenants').select('*').eq('id', profile.tenant_id).single();
      if (tenant) {
        setOwnerData({
          ownerName: tenant.owner_name || (isSalon ? 'Helena Smith' : 'Michael Carter'),
          ownerCpfCnpj: tenant.owner_document || '12.345.678/0001-99',
          unitName: tenant.name,
          whatsapp: tenant.whatsapp || '(11) 99999-9999',
          slug: tenant.slug,
          pixKey: tenant.pix_key || 'financeiro@fastbeauty.pro',
          bookingPrimaryColor: tenant.primary_color || (isSalon ? '#86198f' : '#f2b90d'),
          bookingSecondaryColor: tenant.secondary_color || (isSalon ? '#f1f5f9' : '#09090b'),
          logoUrl: tenant.logo_url || ''
        });
        setPaymentFees({
          pix: tenant.fee_percent_pix?.toString() || '0.00',
          cash: tenant.fee_percent_cash?.toString() || '0.00',
          credit: tenant.fee_percent_credit?.toString() || '4.99',
          debit: tenant.fee_percent_debit?.toString() || '1.99'
        });
      }
    }
    loadTenantData();
  }, [isSalon]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão não encontrada');

      const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', session.user.id).single();
      if (!profile?.tenant_id) throw new Error('Unidade não encontrada');

      const { error } = await supabase
        .from('tenants')
        .update({
          name: ownerData.unitName,
          slug: ownerData.slug,
          owner_name: ownerData.ownerName,
          owner_document: ownerData.ownerCpfCnpj,
          whatsapp: ownerData.whatsapp,
          pix_key: ownerData.pixKey,
          primary_color: ownerData.bookingPrimaryColor,
          secondary_color: ownerData.bookingSecondaryColor,
          fee_percent_pix: parseFloat(paymentFees.pix),
          fee_percent_cash: parseFloat(paymentFees.cash),
          fee_percent_credit: parseFloat(paymentFees.credit),
          fee_percent_debit: parseFloat(paymentFees.debit)
        })
        .eq('id', profile.tenant_id);

      if (error) throw error;
      alert('Configurações salvas com sucesso!');
    } catch (err: any) {
      alert('Erro ao salvar: ' + err.message);
    } finally {
      setIsSaving(false);
    }
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
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-text-muted ml-1">Nome da Unidade</label>
                <input type="text" className={`w-full ${isSalon ? 'bg-slate-50 text-slate-900 border-slate-200' : 'bg-black text-white border-white/5'} border rounded-2xl p-4 font-bold`} value={ownerData.unitName} onChange={e => setOwnerData({ ...ownerData, unitName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-text-muted ml-1">Endereço Personalizado (SLUG)</label>
                <div className="relative">
                  <span className="absolute left-4 top-4 text-primary font-black opacity-40">fastbeauty.pro/</span>
                  <input type="text" className={`w-full ${isSalon ? 'bg-slate-50 text-slate-900 border-slate-200' : 'bg-black text-white border-white/5'} border rounded-2xl p-4 pl-[125px] font-bold`} value={ownerData.slug} onChange={e => setOwnerData({ ...ownerData, slug: e.target.value })} />
                  <button onClick={() => copyToClipboard(`fastbeauty.pro/${ownerData.slug}`)} className="absolute right-4 top-3.5 size-10 flex items-center justify-center text-primary transition-all active:scale-95"><span className="material-symbols-outlined">content_copy</span></button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'finance' && (
          <div className={`${isSalon ? 'bg-white shadow-xl' : 'bg-background-card'} p-10 rounded-[3rem] border border-white/5 space-y-8 animate-in fade-in`}>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xl font-black italic uppercase text-text-main">Taxas Operacionais</h4>
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mt-1 italic">Defina as taxas cobradas pelas operadoras.</p>
              </div>
              <div className="size-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-emerald-500 text-3xl">account_balance_wallet</span>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'PIX (%)', key: 'pix', icon: 'qr_code_2' },
                { label: 'Crédito (%)', key: 'credit', icon: 'credit_card' },
                { label: 'Débito (%)', key: 'debit', icon: 'credit_card' },
                { label: 'Dinheiro (%)', key: 'cash', icon: 'payments' }
              ].map(field => (
                <div key={field.key} className={`p-6 rounded-3xl border transition-all ${isSalon ? 'bg-slate-50 border-slate-100' : 'bg-black/40 border-white/5'}`}>
                  <div className="flex items-center gap-2 mb-4 opacity-40">
                    <span className="material-symbols-outlined text-sm">{field.icon}</span>
                    <label className="text-[9px] font-black uppercase tracking-widest">{field.label}</label>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full bg-transparent border-none p-0 text-3xl font-black italic tracking-tighter focus:ring-0 text-primary"
                    value={paymentFees[field.key as keyof typeof paymentFees]}
                    onChange={e => setPaymentFees({ ...paymentFees, [field.key]: e.target.value })}
                  />
                </div>
              ))}
            </div>

            <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10">
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest text-center italic">
                * Estas taxas serão descontadas automaticamente no cálculo do Lucro Líquido nos Relatórios Intelligence.
              </p>
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
