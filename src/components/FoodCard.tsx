
import React from 'react';
import { Product } from '../types';

interface FoodCardProps {
  product: Product;
  onAdd: (product: Product, quantity: number, comps?: any[]) => void;
  onClick: (product: Product) => void;
}

export const FoodCard: React.FC<FoodCardProps> = ({ product, onAdd, onClick }) => {
  return (
    <div className="group relative bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all border border-slate-100 cursor-pointer flex flex-row md:flex-col gap-4 h-full" onClick={() => onClick(product)}>
      
      {/* Imagem (Direita no Mobile, Topo no Desktop) */}
      <div className="relative w-24 h-24 sm:w-32 sm:h-32 md:w-full md:h-40 rounded-xl overflow-hidden shrink-0 bg-white order-2 md:order-1 shadow-inner p-2 flex items-center justify-center">
        {product.image ? (
          <img src={product.image} alt={product.name} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl text-slate-200 bg-slate-100 rounded-lg">🍔</div>
        )}
      </div>

      {/* Informações (Esquerda no Mobile, Baixo no Desktop) */}
      <div className="flex-1 flex flex-col justify-between min-w-0 order-1 md:order-2">
        <div>
          <h3 className="text-base sm:text-lg font-black text-emerald-600 uppercase tracking-tight leading-tight group-hover:text-emerald-700 transition-colors line-clamp-2">{product.name}</h3>
          <p className="text-xs text-slate-500 font-medium line-clamp-2 mt-1 mb-2 leading-relaxed">
            {product.description}
          </p>
        </div>
        
        <div className="flex items-center justify-between mt-2">
          <span className="text-base sm:text-lg font-black text-emerald-600">
            R$ {product.price.toFixed(2)}
          </span>
          <button 
            onClick={(e) => { e.stopPropagation(); onAdd(product, 1); }}
            className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-black uppercase text-base tracking-widest hover:bg-red-600 transition-colors shadow-md active:scale-95 flex items-center justify-center"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
};
