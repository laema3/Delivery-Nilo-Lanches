
import React, { useState, useMemo } from 'react';
import { Product, Complement, CategoryItem } from '../types.ts';

interface ProductModalProps {
  product: Product | null;
  complements?: Complement[];
  categories?: CategoryItem[];
  onClose: () => void;
  onAdd: (product: Product, quantity: number, selectedComplements?: Complement[]) => void;
  isStoreOpen?: boolean;
}

export const ProductModal: React.FC<ProductModalProps> = ({ product, complements = [], categories = [], onClose, onAdd, isStoreOpen = true }) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedCompIds, setSelectedCompIds] = useState<string[]>([]);

  const filteredComplements = useMemo(() => {
    if (!product) return [];
    const productCategoryId = categories.find(c => c.name === product.category)?.id;
    return complements
      .filter(c => {
        if (!c.active) return false;
        if (!c.applicable_categories || c.applicable_categories.length === 0) return true;
        return productCategoryId && c.applicable_categories.includes(productCategoryId);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [product, complements, categories]);

  const selectedComplementsList = useMemo(() => {
    if (!product) return [];
    return filteredComplements.filter(c => selectedCompIds.includes(c.id));
  }, [selectedCompIds, filteredComplements, product]);

  if (!product) return null;

  const productBasePrice = Number(product.price) || 0;
  const complementsTotal = selectedComplementsList.reduce((acc, curr) => acc + (Number(curr?.price) || 0), 0);
  const unitPrice = productBasePrice + complementsTotal;
  const totalPrice = unitPrice * quantity;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-[32px] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh]">
        
        {/* Imagem (Mobile: Topo / Desktop: Esquerda) */}
        <div className="md:w-[40%] relative h-48 md:h-auto overflow-hidden bg-slate-50 flex flex-col items-center justify-center p-6 shrink-0">
          <img src={product.image} alt={product.name} className="w-full h-full object-contain rounded-[28px]" />
          <p className="mt-4 text-[9px] font-black text-red-600 uppercase tracking-widest text-center bg-red-50 px-3 py-1 rounded-full border border-red-100 hidden md:block">
            Fotos meramente ilustrativas
          </p>
          <button onClick={onClose} className="absolute top-4 left-4 bg-black/40 text-white p-2 rounded-full md:hidden backdrop-blur-md z-10">✕</button>
        </div>

        {/* Conteúdo (Scrollável independentemente do rodapé) */}
        <div className="md:w-[60%] flex flex-col h-full overflow-hidden bg-white">
          <div className="flex-1 overflow-y-auto p-6 md:p-8 no-scrollbar">
            <div className="space-y-5">
              <div className="flex justify-between items-start">
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-widest">{product.category}</span>
                <button onClick={onClose} className="hidden md:block p-1.5 text-slate-400 hover:text-slate-600">✕</button>
              </div>
              
              <div>
                <h2 className="text-xl md:text-3xl font-black uppercase text-slate-900 tracking-tight leading-tight">{product.name}</h2>
                <p className="text-slate-500 text-xs font-medium uppercase mt-2 leading-relaxed">{product.description}</p>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-50">
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Turbine seu lanche</h4>
                {filteredComplements.length === 0 ? (
                  <p className="text-[10px] text-slate-400 italic">Sem adicionais para este item</p>
                ) : (
                  filteredComplements.map(comp => (
                    <button 
                      key={comp.id}
                      onClick={() => setSelectedCompIds(prev => prev.includes(comp.id) ? prev.filter(i => i !== comp.id) : [...prev, comp.id])}
                      className={`w-full flex justify-between items-center p-3 rounded-xl border-2 transition-all active:scale-[0.98] ${selectedCompIds.includes(comp.id) ? 'border-emerald-500 bg-emerald-50' : 'border-slate-50 hover:border-slate-200'}`}
                    >
                      <span className="text-xs font-bold text-slate-700 uppercase">{comp.name}</span>
                      <span className="text-xs font-black text-emerald-600">+ R$ {comp.price.toFixed(2)}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Rodapé Fixo (Sempre visível) */}
          <div className="p-5 md:p-8 border-t border-slate-100 bg-white shrink-0 space-y-4 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 bg-slate-100 p-1.5 rounded-xl">
                <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center font-black active:scale-90 transition-transform">-</button>
                <span className="text-sm font-black w-6 text-center">{quantity}</span>
                <button onClick={() => setQuantity(q => q + 1)} className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center font-black active:scale-90 transition-transform">+</button>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black text-slate-400 uppercase block tracking-widest">Total</span>
                <p className="text-2xl font-black text-emerald-600 leading-none">R$ {totalPrice.toFixed(2)}</p>
              </div>
            </div>
            <button 
              disabled={!isStoreOpen}
              onClick={() => onAdd(product, quantity, selectedComplementsList)}
              className={`w-full font-black py-4 rounded-2xl transition-all uppercase text-xs tracking-widest active:scale-95 ${isStoreOpen ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-200' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
            >
              {isStoreOpen ? 'Adicionar ao Pedido' : 'Loja Fechada'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
