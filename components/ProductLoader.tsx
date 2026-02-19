
import React from 'react';

interface ProductLoaderProps {
  logoUrl?: string;
}

export const ProductLoader: React.FC<ProductLoaderProps> = ({ logoUrl }) => {
  return (
    <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-white/95 backdrop-blur-xl animate-fade-in">
      <div className="relative flex flex-col items-center">
        <div className="w-32 h-32 md:w-40 md:h-40 flex items-center justify-center animate-bounce-subtle">
           {logoUrl ? (
             <img src={logoUrl} className="max-w-full max-h-full object-contain drop-shadow-2xl" alt="Logo" />
           ) : (
             <span className="text-7xl drop-shadow-2xl filter">🍔</span>
           )}
        </div>
        <div className="mt-4 w-16 h-2 bg-black/10 rounded-full blur-sm"></div>
      </div>
      
      <div className="mt-12 w-64 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200 shadow-inner">
        <div className="h-full bg-emerald-600 animate-loading-bar rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
      </div>
      
      <div className="mt-6 flex flex-col items-center gap-2 text-center">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-600 animate-pulse px-4">
          Nilo Lanches • Qualidade em primeiro lugar
        </p>
        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
          Preparando seu cardápio...
        </p>
      </div>
    </div>
  );
};
