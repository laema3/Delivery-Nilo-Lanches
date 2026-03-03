
import React, { useState, useEffect } from 'react';
import { Product, Complement, CategoryItem } from '../types';

interface ProductModalProps {
  product: Product | null;
  complements: Complement[];
  categories: CategoryItem[];
  onClose: () => void;
  onAdd: (product: Product, quantity: number, comps?: Complement[]) => void;
  isStoreOpen: boolean;
}

export const ProductModal: React.FC<ProductModalProps> = ({ product, complements, categories, onClose, onAdd, isStoreOpen }) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedComplements, setSelectedComplements] = useState<Complement[]>([]);

  useEffect(() => {
    if (product) {
      setQuantity(1);
      setSelectedComplements([]);
    }
  }, [product]);

  if (!product) return null;

  const handleToggleComplement = (comp: Complement) => {
    if (selectedComplements.find(c => c.id === comp.id)) {
      setSelectedComplements(prev => prev.filter(c => c.id !== comp.id));
    } else {
      setSelectedComplements(prev => [...prev, comp]);
    }
  };

  const totalPrice = (product.price + selectedComplements.reduce((acc, c) => acc + c.price, 0)) * quantity;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
        <div className="relative h-64 sm:h-80 bg-slate-100 shrink-0">
          {product.image ? (
            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl">🍔</div>
          )}
          <button onClick={onClose} className="absolute top-6 right-6 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg text-slate-800 hover:bg-red-50 hover:text-red-500 transition-colors font-black text-lg">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          <div>
            <div className="flex justify-between items-start gap-4">
              <h2 className="text-3xl sm:text-4xl font-black text-slate-800 uppercase tracking-tighter leading-none">{product.name}</h2>
              <span className="text-2xl font-black text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl shrink-0">R$ {product.price.toFixed(2)}</span>
            </div>
            <p className="text-slate-500 font-medium mt-4 leading-relaxed">{product.description}</p>
          </div>

          {complements.length > 0 && (
            <div className="space-y-4 pt-6 border-t border-slate-100">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Adicionais</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {complements.filter(c => c.active && (!c.applicable_categories || c.applicable_categories.includes(product.category))).map(comp => (
                  <button 
                    key={comp.id}
                    onClick={() => handleToggleComplement(comp)}
                    className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${selectedComplements.find(c => c.id === comp.id) ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-md' : 'border-slate-100 bg-white text-slate-600 hover:border-emerald-200 hover:bg-slate-50'}`}
                  >
                    <span className="font-bold text-xs uppercase tracking-wide">{comp.name}</span>
                    <span className="font-black text-xs text-emerald-600">+ R$ {comp.price.toFixed(2)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-white border-t border-slate-100 flex flex-col sm:flex-row gap-4 items-center shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] z-20">
          <div className="flex items-center gap-4 bg-slate-50 px-4 py-3 rounded-2xl border border-slate-200">
            <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-8 h-8 flex items-center justify-center bg-white rounded-xl shadow-sm text-slate-400 hover:text-emerald-600 font-black text-lg transition-colors">-</button>
            <span className="text-xl font-black text-slate-800 w-8 text-center">{quantity}</span>
            <button onClick={() => setQuantity(quantity + 1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-xl shadow-sm text-slate-400 hover:text-emerald-600 font-black text-lg transition-colors">+</button>
          </div>
          
          <button 
            onClick={() => { onAdd(product, quantity, selectedComplements); onClose(); }}
            disabled={!isStoreOpen}
            className={`flex-1 py-4 rounded-2xl font-black uppercase text-sm tracking-widest text-white shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 ${!isStoreOpen ? 'bg-slate-300 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/20'}`}
          >
            <span>{isStoreOpen ? `Adicionar • R$ ${totalPrice.toFixed(2)}` : 'Loja Fechada'}</span>
            {isStoreOpen && <span className="bg-white/20 px-2 py-0.5 rounded text-[10px]">➜</span>}
          </button>
        </div>
      </div>
    </div>
  );
};
