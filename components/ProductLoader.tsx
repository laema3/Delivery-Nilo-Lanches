
import React from 'react';

export const ProductLoader: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/80 backdrop-blur-md animate-fade-in">
      <div className="relative">
        <div className="text-6xl animate-bounce-subtle drop-shadow-2xl filter">🍔</div>
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-black/10 rounded-full blur-sm"></div>
      </div>
      <div className="mt-8 w-48 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-emerald-600 animate-loading-bar rounded-full"></div>
      </div>
      <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-400 animate-pulse">
        Preparando detalhes...
      </p>
    </div>
  );
};
