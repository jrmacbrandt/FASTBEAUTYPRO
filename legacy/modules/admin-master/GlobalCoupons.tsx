
import React, { useState } from 'react';
import Layout from '../../components/Layout';

const GlobalCoupons: React.FC = () => {
  const [coupons] = useState([
    { id: '1', code: 'LAUNCH30', discount: '30 Days Free', status: 'active', usage: 145 },
    { id: '2', code: 'MASTER50', discount: '50% Off First Month', status: 'active', usage: 89 },
    { id: '3', code: 'ELITEPRO', discount: '15 Days Trial', status: 'expired', usage: 302 },
  ]);

  return (
    <Layout title="Global Coupons">
      <div className="space-y-8">
        <div className="bg-background-elite/60 p-8 rounded-[2rem] border border-primary/20 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
          <div className="flex items-center gap-4">
             <div className="size-16 bg-primary/20 rounded-2xl flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-4xl">local_activity</span>
             </div>
             <div>
                <h3 className="text-2xl font-black text-white italic italic uppercase">Coupon Generator</h3>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Create system-wide promotional offers</p>
             </div>
          </div>
          <button className="bg-primary text-background-deep font-black px-10 py-4 rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 transition-all">
            NEW CAMPAIGN
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {coupons.map(coupon => (
            <div key={coupon.id} className="bg-background-card p-8 rounded-[2rem] border border-white/5 group hover:border-primary/20 transition-all shadow-xl relative overflow-hidden">
               <div className={`absolute top-0 right-0 h-1 w-24 ${coupon.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
               <div className="flex justify-between items-start mb-6">
                  <span className="bg-background-deep border border-white/10 text-primary px-4 py-2 rounded-xl font-black text-lg tracking-widest">{coupon.code}</span>
                  <div className="text-right">
                     <p className="text-slate-500 text-[10px] font-black uppercase">Redemptions</p>
                     <p className="text-white font-black text-xl">{coupon.usage}</p>
                  </div>
               </div>
               <div className="space-y-1 mb-8">
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Reward</p>
                  <p className="text-white text-2xl font-black italic">{coupon.discount}</p>
               </div>
               <div className="flex justify-between items-center pt-4 border-t border-white/5">
                  <span className={`text-[10px] font-black uppercase px-2 py-1 rounded ${coupon.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                    {coupon.status}
                  </span>
                  <div className="flex gap-2">
                    <button className="text-slate-600 hover:text-white transition-colors">
                      <span className="material-symbols-outlined text-xl">edit</span>
                    </button>
                    <button className="text-slate-600 hover:text-red-500 transition-colors">
                      <span className="material-symbols-outlined text-xl">delete</span>
                    </button>
                  </div>
               </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default GlobalCoupons;
