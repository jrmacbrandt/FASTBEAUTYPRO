"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/hooks/useProfile';

export default function ProductsPage() {
    const { profile, loading: profileLoading, theme: colors } = useProfile();
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isMovementOpen, setIsMovementOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);

    useEffect(() => {
        if (profile?.tenant_id) {
            fetchProducts(profile.tenant_id);
        }
    }, [profile]);

    const fetchProducts = async (tid: string) => {
        setLoading(true);
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('tenant_id', tid)
            .order('name', { ascending: true });

        if (error) {
            console.error('Error fetching products:', error);
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
        if (profile?.tenant_id) fetchProducts(profile.tenant_id);
    };

    const handleCloseMovement = () => {
        setIsMovementOpen(false);
        setSelectedProduct(null);
        if (profile?.tenant_id) fetchProducts(profile.tenant_id);
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
                <button
                    onClick={() => setIsFormOpen(true)}
                    className="font-black py-4 px-8 rounded-2xl uppercase tracking-widest text-xs hover:scale-105 active:scale-95 transition-all shadow-xl flex items-center gap-2"
                    style={{ backgroundColor: colors.primary, color: isSalon ? 'white' : 'black', boxShadow: `0 10px 20px -5px ${colors.primary}33` }}
                >
                    <span className="material-symbols-outlined">add</span>
                    Novo Produto
                </button>
            </div>

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
                                <div className="size-14 rounded-2xl flex items-center justify-center text-2xl shadow-inner" style={{ backgroundColor: `${colors.text}08` }}>
                                    {product.category === 'drink' ? '🥤' : product.category === 'shampoo' ? '🧴' : '📦'}
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

            {isFormOpen && <ProductForm onClose={handleCloseForm} productToEdit={selectedProduct} />}
            {isMovementOpen && selectedProduct && <StockMovementModal onClose={handleCloseMovement} product={selectedProduct} />}
        </div>
    );
}

// Sub-components (simulated as separate files for now, but inline for implementation speed if preferred. 
// However, best practice is separate files. I will create them separately.)
import ProductForm from './ProductForm';
import StockMovementModal from './StockMovementModal';
