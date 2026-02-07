
import React from 'react';

export const ProductLoader: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-white/95 backdrop-blur-xl animate-fade-in">
      <div className="relative">
        <div className="text-7xl animate-bounce-subtle drop-shadow-2xl filter">🍔</div>
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-16 h-2 bg-black/10 rounded-full blur-sm"></div>
      </div>
      
      <div className="mt-12 w-64 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200 shadow-inner">
        <div className="h-full bg-emerald-600 animate-loading-bar rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
      </div>
      
      <div className="mt-6 flex flex-col items-center gap-2">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-600 animate-pulse">
          Nilo Lanches
        </p>
        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
          Preparando cardápio...
        </p>
      </div>
    </div>
  );
};
