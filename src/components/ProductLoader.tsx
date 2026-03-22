
import React, { useState, useEffect } from 'react';

interface ProductLoaderProps {
  logoUrl?: string;
}

export const ProductLoader: React.FC<ProductLoaderProps> = ({ logoUrl }) => {
  const [showRetry, setShowRetry] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowRetry(true), 10000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center p-6 text-center">
      <div className="w-24 h-24 rounded-full border-4 border-slate-100 border-t-emerald-500 animate-spin mb-4"></div>
      {logoUrl && <img src={logoUrl} alt="Logo" className="w-16 h-16 object-contain absolute" style={{ top: 'calc(50% - 32px)' }} />}
      <p className="text-emerald-600 font-black uppercase tracking-widest text-xs animate-pulse">ESQUENTANDO A CHAPA PRA VOCÊ!!!</p>
      
      {showRetry && (
        <div className="mt-8 animate-in fade-in duration-500">
          <p className="text-slate-400 text-[10px] font-bold uppercase mb-4">O carregamento está demorando mais que o esperado...</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-emerald-900/20 active:scale-95 transition-all"
          >
            Recarregar Página
          </button>
        </div>
      )}
    </div>
  );
};
