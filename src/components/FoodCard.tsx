
import React from 'react';
import { Product } from '../types';

interface FoodCardProps {
  product: Product;
  onAdd: (product: Product, quantity: number, comps?: any[]) => void;
  onClick: (product: Product) => void;
}

export const FoodCard: React.FC<FoodCardProps> = ({ product, onAdd, onClick }) => {
  return (
    <div className="group relative bg-white rounded-[32px] p-6 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border border-slate-100 overflow-hidden cursor-pointer" onClick={() => onClick(product)}>
      <div className="absolute top-4 right-4 z-10">
        <button className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm text-slate-400 hover:text-red-500 transition-colors">❤️</button>
      </div>
      
      <div className="relative aspect-square rounded-2xl overflow-hidden mb-6 bg-slate-50">
        {product.image ? (
          <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl text-slate-200">🍔</div>
        )}
        {product.rating > 0 && (
          <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
            <span className="text-yellow-400 text-xs">⭐</span>
            <span className="text-xs font-black text-slate-700">{product.rating.toFixed(1)}</span>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-black text-red-600 uppercase tracking-tight leading-tight group-hover:text-red-700 transition-colors line-clamp-2">{product.name}</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{product.category}</p>
          </div>
          <span className="text-lg font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg shrink-0">
            R$ {product.price.toFixed(2)}
          </span>
        </div>
        
        <p className="text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed h-10">
          {product.description}
        </p>

        <button 
          onClick={(e) => { e.stopPropagation(); onAdd(product, 1); }}
          className="w-full bg-red-600 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-red-700 transition-colors shadow-lg shadow-red-600/10 active:scale-95 flex items-center justify-center gap-2 group/btn"
        >
          <span>Adicionar</span>
          <span className="group-hover/btn:translate-x-1 transition-transform">➜</span>
        </button>
      </div>
    </div>
  );
};
