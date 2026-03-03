
import React from 'react';

interface ProductLoaderProps {
  logoUrl?: string;
}

export const ProductLoader: React.FC<ProductLoaderProps> = ({ logoUrl }) => {
  return (
    <div className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center">
      <div className="w-24 h-24 rounded-full border-4 border-slate-100 border-t-emerald-500 animate-spin mb-4"></div>
      {logoUrl && <img src={logoUrl} alt="Logo" className="w-16 h-16 object-contain absolute" />}
      <p className="text-emerald-600 font-black uppercase tracking-widest text-xs animate-pulse">Carregando...</p>
    </div>
  );
};
