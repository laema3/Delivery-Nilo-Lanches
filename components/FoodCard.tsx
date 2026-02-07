
import React from 'react';
import { Product } from '../types.ts';

interface FoodCardProps {
  product: Product;
  onAdd: (product: Product, quantity: number) => void;
  onClick: (product: Product) => void;
}

export const FoodCard: React.FC<FoodCardProps> = ({ product, onAdd, onClick }) => {
  return (
    <div className="group bg-white rounded-[32px] overflow-hidden border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full w-full">
      
      {/* MOLDURA DA FOTO */}
      <div className="p-3 bg-white">
        <div 
          className="relative h-48 sm:h-56 bg-slate-50 cursor-pointer overflow-hidden rounded-[26px] flex items-center justify-center p-3"
          onClick={() => onClick(product)}
        >
          <img 
            crossOrigin="anonymous"
            src={product.image || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500'} 
            alt={product.name}
            className="w-full h-full object-contain rounded-[20px] transition-transform duration-700 group-hover:scale-110"
          />
          <div className="absolute top-3 right-3 bg-white/80 backdrop-blur-md px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm z-10 border border-white/50">
            <span className="text-yellow-500 text-[10px]">⭐</span>
            <span className="text-[10px] font-black text-slate-800">{product.rating || 5.0}</span>
          </div>
        </div>
      </div>

      {/* TEXTO - VOLTOU PARA DENTRO DA MOLDURA (ABAIXO DA FOTO) */}
      <div className="px-6 pt-2 pb-4 cursor-pointer" onClick={() => onClick(product)}>
        <span className="text-[9px] font-black uppercase text-red-600 tracking-widest block mb-1 truncate opacity-80">
          {product.category}
        </span>
        {/* TÍTULO EM VERDE (MESMO DO SITE/BOTÃO +) */}
        <h3 className="text-lg font-black uppercase text-emerald-600 leading-tight tracking-tight line-clamp-1 mb-1">
          {product.name}
        </h3>
        {/* DESCRIÇÃO EM VERMELHO - FORÇADA PARA UPPERCASE */}
        <p className="text-red-600 text-[11px] font-bold leading-snug line-clamp-2 uppercase">
          {product.description || 'Lanche artesanal preparado com dedicação pela equipe Nilo Lanches.'}
        </p>
      </div>
      
      <div className="px-6 pb-6 flex flex-col flex-1">
        <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-50">
          <div className="flex flex-col">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">A partir de</span>
            <span className="text-xl font-black text-slate-900 leading-none">R$ {product.price.toFixed(2)}</span>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); onAdd(product, 1); }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white p-3 rounded-2xl transition-all shadow-lg shadow-emerald-100 active:scale-90"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
