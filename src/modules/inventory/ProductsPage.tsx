"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/hooks/useProfile';

export default function ProductsPage() {
    const { profile, loading: profileLoading, theme: colors } = useProfile();
    const [activeTab, setActiveTab] = useState<'sale' | 'supply'>('sale');
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isMovementOpen, setIsMovementOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);

    useEffect(() => {
        if (profile?.tenant_id) {
            fetchProducts(profile.tenant_id, activeTab);
        }
    }, [profile, activeTab]);

    const fetchProducts = async (tid: string, tab: 'sale' | 'supply') => {
        setLoading(true);
        setProducts([]); // Clear list for visual feedback of change
        const table = tab === 'sale' ? 'products' : 'supplies';
        const { data, error } = await supabase
            .from(table)
            .select('*')
            .eq('tenant_id', tid)
            .order('name', { ascending: true });

        if (error) {
            console.error(`Error fetching ${table}:`, error);
        } else {
            setProducts(data || []);
        }
        setLoading(false);
    };

    const handleEdit = (product: any) => {
        setSelectedProduct(product);
        setIsFormOpen(true);
    };

    const handleMovement = (product: any) => {
        setSelectedProduct(product);
        setIsMovementOpen(true);
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setSelectedProduct(null);
        if (profile?.tenant_id) fetchProducts(profile.tenant_id, activeTab);
    };

    const handleCloseMovement = () => {
        setIsMovementOpen(false);
        setSelectedProduct(null);
        if (profile?.tenant_id) fetchProducts(profile.tenant_id, activeTab);
    };

    const handleDeleteProduct = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este item permanentemente?')) return;

        const table = activeTab === 'sale' ? 'products' : 'supplies';
        const { error } = await supabase.from(table).delete().eq('id', id);

        if (error) {
            alert('Erro ao deletar: ' + error.message);
        } else {
            if (profile?.tenant_id) fetchProducts(profile.tenant_id, activeTab);
        }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.barcode && p.barcode.includes(searchTerm))
    );

    if (profileLoading) return null;

    const isSalon = profile?.tenant?.business_type === 'salon';

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black italic uppercase tracking-tighter" style={{ color: colors.text }}>Gestão de <span style={{ color: colors.primary }}>Estoque</span></h2>
                    <p className="font-black uppercase text-[10px] tracking-widest mt-1" style={{ color: colors.textMuted }}>Controle de produtos e insumos.</p>
                </div>
            </div>

            {/* TABS SEPARATION */}
            <div className="flex p-1.5 rounded-3xl bg-black/40 border border-white/5 w-fit gap-2">
                <button
                    onClick={() => setActiveTab('sale')}
                    className={`flex items-center gap-2 px-8 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'sale' ? 'bg-primary text-black italic shadow-lg' : 'text-zinc-500 hover:text-white'}`}
                    style={activeTab === 'sale' ? { backgroundColor: colors.primary } : {}}
                >
                    <span className="material-symbols-outlined text-sm">shopping_bag</span>
                    Produtos para Venda
                </button>
                <button
                    onClick={() => setActiveTab('supply')}
                    className={`flex items-center gap-2 px-8 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'supply' ? 'bg-primary text-black italic shadow-lg' : 'text-zinc-500 hover:text-white'}`}
                    style={activeTab === 'supply' ? { backgroundColor: colors.primary } : {}}
                >
                    <span className="material-symbols-outlined text-sm">inventory</span>
                    Insumos da Loja
                </button>
            </div>

            <button
                onClick={() => setIsFormOpen(true)}
                className="group relative overflow-hidden font-black h-10 px-6 rounded-xl uppercase tracking-[0.2em] text-[9px] transition-all border border-emerald-400/20 active:scale-95 w-fit flex items-center justify-center gap-2"
                style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    boxShadow: 'none'
                }}
            >
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <span className="material-symbols-outlined text-base relative z-10">add_circle</span>
                <span className="relative z-10">
                    {activeTab === 'sale' ? '+ NOVO PRODUTO' : '+ NOVO INSUMO'}
                </span>
            </button>

            {/* Search Bar */}
            <div className="border p-4 flex items-center gap-4 rounded-3xl" style={{ backgroundColor: colors.cardBg, borderColor: colors.border }}>
                <span className="material-symbols-outlined" style={{ color: colors.textMuted }}>search</span>
                <input
                    type="text"
                    placeholder="Buscar por nome ou código de barras..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-transparent border-none font-bold w-full focus:outline-none"
                    style={{ color: colors.text }}
                />
            </div>

            {/* Product List */}
            {loading ? (
                <div className="text-center py-20 font-bold uppercase tracking-widest" style={{ color: colors.textMuted }}>Carregando estoque...</div>
            ) : filteredProducts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProducts.map(product => (
                        <div key={product.id} className="border p-6 relative group transition-all rounded-[2.5rem]"
                            style={{ backgroundColor: colors.cardBg, borderColor: colors.border }}>
                            <div className="flex justify-between items-start mb-6">
                                <div className="size-14 rounded-2xl flex items-center justify-center text-2xl shadow-inner border border-white/5 opacity-50" style={{ backgroundColor: `${colors.text}08` }}>
                                    <span className="material-symbols-outlined text-white/40">inventory_2</span>
                                </div>
                                <div className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${product.current_stock <= product.min_threshold
                                    ? 'bg-red-500/10 text-red-500 border-red-500/20 animate-pulse'
                                    : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                    }`}>
                                    {product.current_stock} {product.unit_type}
                                </div>
                            </div>

                            <h3 className="text-xl font-black italic uppercase tracking-tight mb-1" style={{ color: colors.text }}>{product.name}</h3>
                            <p className="text-[10px] font-bold mb-6 line-clamp-2 uppercase tracking-widest" style={{ color: colors.textMuted }}>{product.description || 'Sem descrição'}</p>

                            <div className="flex items-center justify-between mt-auto pt-6 border-t" style={{ borderColor: colors.border }}>
                                <span className="font-black text-2xl italic tracking-tighter" style={{ color: colors.primary }}>R$ {product.sale_price?.toFixed(2) || '0.00'}</span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleMovement(product)}
                                        className="size-10 rounded-xl flex items-center justify-center transition-all border"
                                        style={{ backgroundColor: `${colors.text}08`, borderColor: colors.border, color: colors.textMuted }}
                                        title="Movimentar Estoque"
                                    >
                                        <span className="material-symbols-outlined text-xl">swap_vert</span>
                                    </button>
                                    <button
                                        onClick={() => handleEdit(product)}
                                        className="size-10 rounded-xl flex items-center justify-center transition-all border"
                                        style={{ backgroundColor: `${colors.text}08`, borderColor: colors.border, color: colors.textMuted }}
                                        title="Editar Produto"
                                    >
                                        <span className="material-symbols-outlined text-xl">edit</span>
                                    </button>
                                    <button
                                        onClick={() => handleDeleteProduct(product.id)}
                                        className="size-10 rounded-xl flex items-center justify-center transition-all border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white"
                                        title="Excluir Produto"
                                    >
                                        <span className="material-symbols-outlined text-xl">delete</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="py-20 border border-dashed rounded-[3rem] text-center opacity-40" style={{ borderColor: colors.border }}>
                    <span className="material-symbols-outlined text-4xl mb-4" style={{ color: colors.text }}>inventory_2</span>
                    <p className="font-black uppercase text-[10px] tracking-[0.4em]" style={{ color: colors.text }}>Nenhum produto encontrado</p>
                </div>
            )}

            {isFormOpen && (
                <ProductForm
                    onClose={handleCloseForm}
                    productToEdit={selectedProduct}
                    mode={activeTab}
                />
            )}
            {isMovementOpen && selectedProduct && (
                <StockMovementModal
                    onClose={handleCloseMovement}
                    product={selectedProduct}
                    mode={activeTab}
                />
            )}
        </div>
    );
}

// Sub-components (simulated as separate files for now, but inline for implementation speed if preferred. 
// However, best practice is separate files. I will create them separately.)
import ProductForm from './ProductForm';
import StockMovementModal from './StockMovementModal';
