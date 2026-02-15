"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/hooks/useProfile';

export default function ProductsPage() {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isMovementOpen, setIsMovementOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);

    const { profile, loading: profileLoading } = useProfile();

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

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">Gestão de Estoque</h2>
                    <p className="text-zinc-400 font-medium">Controle de produtos e insumos.</p>
                </div>
                <button
                    onClick={() => setIsFormOpen(true)}
                    className="bg-[#f2b90d] text-black font-black py-3 px-6 rounded-xl uppercase tracking-widest text-xs hover:scale-105 transition-all shadow-lg flex items-center gap-2"
                >
                    <span className="material-symbols-outlined text-lg">add</span>
                    Novo Produto
                </button>
            </div>

            {/* Search Bar */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4">
                <span className="material-symbols-outlined text-zinc-500">search</span>
                <input
                    type="text"
                    placeholder="Buscar por nome ou código de barras..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-transparent border-none text-white font-bold w-full focus:outline-none placeholder:text-zinc-600"
                />
            </div>

            {/* Product List */}
            {loading ? (
                <div className="text-center py-20 text-zinc-500">Carregando estoque...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProducts.map(product => (
                        <div key={product.id} className="bg-[#121214] border border-white/5 rounded-3xl p-6 relative group hover:border-[#f2b90d]/30 transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <div className="size-12 rounded-xl bg-white/5 flex items-center justify-center text-2xl">
                                    🧴
                                </div>
                                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${product.current_stock <= product.min_threshold
                                    ? 'bg-red-500/10 text-red-500 border-red-500/20 animate-pulse'
                                    : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                    }`}>
                                    {product.current_stock} {product.unit_type}
                                </div>
                            </div>

                            <h3 className="text-xl font-black italic text-white uppercase tracking-tight mb-1">{product.name}</h3>
                            <p className="text-xs text-zinc-500 font-bold mb-4 line-clamp-2">{product.description || 'Sem descrição'}</p>

                            <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                                <span className="text-[#f2b90d] font-black text-lg">R$ {product.sale_price || '0.00'}</span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleMovement(product)}
                                        className="size-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all"
                                        title="Movimentar Estoque"
                                    >
                                        <span className="material-symbols-outlined text-sm">swap_vert</span>
                                    </button>
                                    <button
                                        onClick={() => handleEdit(product)}
                                        className="size-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all"
                                        title="Editar Produto"
                                    >
                                        <span className="material-symbols-outlined text-sm">edit</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modals imports would go here, managed by state */}
            {isFormOpen && <ProductForm onClose={handleCloseForm} productToEdit={selectedProduct} />}
            {isMovementOpen && selectedProduct && <StockMovementModal onClose={handleCloseMovement} product={selectedProduct} />}
        </div>
    );
}

// Sub-components (simulated as separate files for now, but inline for implementation speed if preferred. 
// However, best practice is separate files. I will create them separately.)
import ProductForm from './ProductForm';
import StockMovementModal from './StockMovementModal';
