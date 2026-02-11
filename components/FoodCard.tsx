
import React from 'react';
import { Product } from '../types.ts';

interface FoodCardProps {
  product: Product;
  onAdd: (product: Product, quantity: number) => void;
  onClick: (product: Product) => void;
}

export const FoodCard: React.FC<FoodCardProps> = ({ product, onAdd, onClick }) => {
  return (
    <div className="group bg-white rounded-[20px] sm:rounded-[32px] overflow-hidden border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-row sm:flex-col h-full w-full relative items-center sm:items-stretch">
      
      {/* 1. CONTAINER DA IMAGEM */}
      {/* Mobile: Ordem 2 (Direita), largura fixa. Desktop: Ordem Padrão (Topo), largura total */}
      <div className="order-2 sm:order-none w-[110px] sm:w-full shrink-0 p-3 sm:p-3 flex flex-col justify-center sm:block">
        <div 
          className="relative w-full aspect-square sm:aspect-auto sm:h-56 bg-slate-50 cursor-pointer overflow-hidden rounded-[16px] sm:rounded-[26px] flex items-center justify-center p-2"
          onClick={() => onClick(product)}
        >
          <img 
            crossOrigin="anonymous"
            src={product.image || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500'} 
            alt={product.name}
            className="w-full h-full object-contain rounded-[12px] sm:rounded-[20px] transition-transform duration-700 group-hover:scale-110"
          />
          
          <div className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-white/80 backdrop-blur-md px-1.5 py-1 sm:px-2.5 sm:py-1.5 rounded-lg sm:rounded-xl flex items-center gap-1 shadow-sm z-10 border border-white/50">
            <span className="text-yellow-500 text-[8px] sm:text-[10px]">⭐</span>
            <span className="text-[8px] sm:text-[10px] font-black text-slate-800">{product.rating || 5.0}</span>
          </div>
          
          <div className="absolute bottom-1 left-0 right-0 text-center pointer-events-none hidden sm:block">
            <span className="text-[7px] font-black text-red-600 uppercase tracking-widest bg-white/70 backdrop-blur-sm px-2 py-0.5 rounded-full border border-red-100">
              Fotos meramente ilustrativas
            </span>
          </div>
        </div>
      </div>

      {/* 2. CONTAINER DE TEXTO & AÇÃO */}
      {/* Mobile: Ordem 1 (Esquerda). Desktop: Ordem Padrão (Baixo). */}
      {/* sm:contents remove este div wrapper no desktop, fazendo os filhos obedecerem ao flex-col do pai principal */}
      <div className="order-1 sm:order-none flex-1 flex flex-col sm:contents py-3 pl-4 sm:p-0 justify-between h-full">
        
        {/* ÁREA DE TEXTO */}
        <div className="sm:flex-1 sm:px-6 sm:pt-2 sm:pb-4 cursor-pointer text-left sm:text-center" onClick={() => onClick(product)}>
          <span className="text-[8px] sm:text-[9px] font-black uppercase text-emerald-600 tracking-widest block mb-1 truncate opacity-80">
            {product.category}
          </span>
          <h3 className="text-sm sm:text-lg font-black uppercase text-emerald-600 leading-tight tracking-tight line-clamp-2 sm:line-clamp-1 mb-1">
            {product.name}
          </h3>
          <p className="text-red-600 text-[10px] sm:text-[11px] font-bold leading-snug line-clamp-2 uppercase">
            {product.description || 'Lanche artesanal preparado com dedicação pela equipe Nilo Lanches.'}
          </p>
        </div>
        
        {/* ÁREA DE PREÇO & BOTÃO */}
        <div className="mt-2 sm:mt-auto sm:px-6 sm:pb-6 flex flex-col">
          <div className="flex items-center justify-between sm:pt-4 sm:border-t border-slate-50">
            <div className="flex flex-col">
              <span className="hidden sm:block text-[8px] font-black text-slate-400 uppercase tracking-widest">A partir de</span>
              <span className="text-sm sm:text-xl font-black text-slate-900 leading-none">R$ {product.price.toFixed(2)}</span>
            </div>
            
            <button 
              onClick={(e) => { e.stopPropagation(); onAdd(product, 1); }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 sm:p-3 rounded-xl sm:rounded-2xl transition-all shadow-lg shadow-emerald-100 active:scale-90"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
