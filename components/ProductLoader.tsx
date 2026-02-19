
import React from 'react';

interface ProductLoaderProps {
  logoUrl?: string;
}

export const ProductLoader: React.FC<ProductLoaderProps> = ({ logoUrl }) => {
  return (
    <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-white/95 backdrop-blur-xl animate-fade-in">
      <div className="relative flex flex-col items-center">
        <div className="w-40 h-40 md:w-48 md:h-48 flex items-center justify-center animate-bounce-subtle bg-white rounded-full shadow-2xl p-4 border-2 border-slate-50 overflow-hidden">
           {logoUrl ? (
             <img src={logoUrl} className="max-w-full max-h-full object-contain" alt="Logo" />
           ) : (
             <span className="text-7xl drop-shadow-2xl filter">🍔</span>
           )}
        </div>
        <div className="mt-8 w-20 h-2 bg-black/5 rounded-full blur-sm"></div>
      </div>
      
      <div className="mt-12 w-64 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200 shadow-inner">
        <div className="h-full bg-emerald-600 animate-loading-bar rounded-full shadow-[0_0_15px_rgba(16,185,129,0.4)]"></div>
      </div>
      
      <div className="mt-8 flex flex-col items-center gap-3 text-center">
        <p className="text-[12px] font-black uppercase tracking-[0.3em] text-emerald-600 animate-pulse px-4">
          Nilo Lanches • Qualidade em primeiro lugar
        </p>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Sincronizando cardápio em tempo real...
        </p>
      </div>
    </div>
  );
};
