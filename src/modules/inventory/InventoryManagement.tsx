
import React, { useState } from 'react';
import Layout from '../../components/layout/Layout';
import { Product } from '../../types';

const InventoryManagement: React.FC = () => {
  const isSalon = document.body.classList.contains('theme-salon');

  const [products, setProducts] = useState([
    { id: 'p1', name: 'Pomada Matte Elite', price: 22, current_stock: 4, min_stock: 10, img: 'https://picsum.photos/200/200?random=1' },
    { id: 'p2', name: 'Óleo de Cedro', price: 18, current_stock: 35, min_stock: 10, img: 'https://picsum.photos/200/200?random=2' },
    { id: 'p3', name: 'Pente de Carbono', price: 15, current_stock: 2, min_stock: 5, img: 'https://picsum.photos/200/200?random=3' },
    { id: 'p4', name: 'Pós-barba Refrescante', price: 25, current_stock: 15, min_stock: 5, img: 'https://picsum.photos/200/200?random=4' }
  ]);

  const [editingProduct, setEditingProduct] = useState<any>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setProducts(prev => prev.map(p => p.id === editingProduct.id ? editingProduct : p));
    setEditingProduct(null);
  };

  return (
    <Layout title="Estoque & Produtos">
      <div className="space-y-8 relative">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-text-main text-xl font-black italic uppercase">Lista de Produtos</h3>
            <p className="text-text-muted text-xs font-bold uppercase tracking-widest">Gerencie seus itens de revenda</p>
          </div>
          <button className="bg-primary text-white px-8 py-3 rounded-xl font-black text-sm shadow-xl shadow-primary/20 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all">
            <span className="material-symbols-outlined">add_box</span>
            ADICIONAR PRODUTO
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {products.map(p => (
            <div key={p.id} className={`${isSalon ? 'bg-white border-slate-100' : 'bg-background-card border-white/5'} rounded-[2rem] border overflow-hidden group hover:border-primary/20 transition-all shadow-xl`}>
              <div className="relative aspect-square overflow-hidden bg-background-deep">
                <img alt="Produto" src={p.img} className="w-full h-full object-cover grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500 scale-110 group-hover:scale-100" />
                {p.current_stock <= p.min_stock && (
                  <div className="absolute top-4 right-4 bg-red-500 text-white text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-lg">
                    ESTOQUE CRÍTICO
                  </div>
                )}
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <h4 className="text-text-main font-bold text-lg leading-tight">{p.name}</h4>
                  <span className="text-primary font-black text-lg">R$ {p.price}</span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter">
                    <span className="text-text-muted">Nível do Inventário</span>
                    <span className={p.current_stock <= p.min_stock ? 'text-red-400' : 'text-emerald-400'}>{p.current_stock} / {p.min_stock * 3}</span>
                  </div>
                  <div className="w-full bg-background-deep h-1 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${p.current_stock <= p.min_stock ? 'bg-red-500' : 'bg-primary'}`}
                      style={{ width: `${Math.min((p.current_stock / (p.min_stock * 3)) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => setEditingProduct({ ...p })}
                    className="w-full bg-primary/10 hover:bg-primary text-primary hover:text-white font-black py-4 rounded-2xl text-[10px] tracking-widest uppercase transition-all flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                    EDITAR PRODUTO
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Modal de Edição */}
        {editingProduct && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto">
            <div
              className={`${isSalon ? 'bg-white' : 'bg-background-card'} w-full max-w-xl rounded-[3rem] border border-slate-500/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 my-8`}
            >
              <div className="p-8 border-b border-slate-500/10 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="size-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined">inventory_2</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-black italic uppercase tracking-tight">Editar Produto</h3>
                    <p className="text-text-muted text-[10px] font-bold uppercase tracking-widest italic">Atualize as informações do item</p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingProduct(null)}
                  className="size-10 flex items-center justify-center rounded-full hover:bg-slate-500/10 text-text-muted transition-all"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleSave} className="p-8 space-y-6">

                {/* Seção de Upload de Foto */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-text-muted ml-2 tracking-widest italic">Imagem do Produto</label>
                  <div className={`flex flex-col md:flex-row items-center gap-6 p-6 rounded-3xl border-2 border-dashed ${isSalon ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-background-deep/50'}`}>
                    <div className="size-32 rounded-2xl overflow-hidden bg-background-deep border border-white/5 relative group">
                      <img alt="Preview" src={editingProduct.img} className="w-full h-full object-cover opacity-80" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="material-symbols-outlined text-white">photo_camera</span>
                      </div>
                    </div>
                    <div className="flex-1 space-y-3 text-center md:text-left">
                      <div className="flex flex-col gap-1">
                        <p className="text-xs font-bold text-text-main">Selecione uma nova foto</p>
                        <p className="text-[10px] text-text-muted leading-tight">
                          Formatos aceitos: <span className="text-primary">JPG, PNG, WebP</span>. <br />
                          Tamanho máximo recomendado: <span className="text-primary">2MB</span>.
                        </p>
                      </div>
                      <button
                        type="button"
                        className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                      >
                        ALTERAR IMAGEM
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-text-muted ml-2 tracking-widest italic">Nome do Produto</label>
                  <input
                    type="text"
                    value={editingProduct.name}
                    onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    className={`w-full ${isSalon ? 'bg-slate-50 border-slate-200' : 'bg-background-deep border-white/5'} border rounded-2xl p-4 focus:outline-none focus:border-primary font-bold transition-all`}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-text-muted ml-2 tracking-widest italic">Preço (R$)</label>
                    <input
                      type="number"
                      value={editingProduct.price}
                      onChange={e => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) })}
                      className={`w-full ${isSalon ? 'bg-slate-50 border-slate-200' : 'bg-background-deep border-white/5'} border rounded-2xl p-4 focus:outline-none focus:border-primary font-bold transition-all`}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-text-muted ml-2 tracking-widest italic">Mínimo para Alerta</label>
                    <input
                      type="number"
                      value={editingProduct.min_stock}
                      onChange={e => setEditingProduct({ ...editingProduct, min_stock: parseInt(e.target.value) })}
                      className={`w-full ${isSalon ? 'bg-slate-50 border-slate-200' : 'bg-background-deep border-white/5'} border rounded-2xl p-4 focus:outline-none focus:border-primary font-bold transition-all`}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-text-muted ml-2 tracking-widest italic">Estoque Atual</label>
                  <div className={`flex items-center gap-4 ${isSalon ? 'bg-slate-50 border-slate-200' : 'bg-background-deep border-white/5'} border rounded-2xl p-2`}>
                    <button
                      type="button"
                      onClick={() => setEditingProduct({ ...editingProduct, current_stock: Math.max(0, editingProduct.current_stock - 1) })}
                      className="size-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center hover:bg-primary hover:text-white transition-all"
                    >
                      <span className="material-symbols-outlined">remove</span>
                    </button>
                    <input
                      type="number"
                      value={editingProduct.current_stock}
                      onChange={e => setEditingProduct({ ...editingProduct, current_stock: parseInt(e.target.value) || 0 })}
                      className="flex-1 bg-transparent border-none text-center font-black text-2xl focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setEditingProduct({ ...editingProduct, current_stock: editingProduct.current_stock + 1 })}
                      className="size-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center hover:bg-primary hover:text-white transition-all"
                    >
                      <span className="material-symbols-outlined">add</span>
                    </button>
                  </div>
                </div>

                <div className="pt-4 flex gap-4">
                  <button
                    type="button"
                    onClick={() => setEditingProduct(null)}
                    className="flex-1 bg-slate-500/10 text-text-muted font-black py-5 rounded-2xl text-[12px] uppercase tracking-widest hover:bg-slate-500/20 transition-all"
                  >
                    CANCELAR
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-primary text-white font-black py-5 rounded-2xl text-[12px] uppercase tracking-widest shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all italic"
                  >
                    SALVAR ALTERAÇÕES
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default InventoryManagement;
