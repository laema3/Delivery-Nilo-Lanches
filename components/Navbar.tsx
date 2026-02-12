
import React, { useState, useEffect } from 'react';
import { Customer } from '../types.ts';

interface NavbarProps {
  cartCount: number;
  onCartClick: () => void;
  isAdmin: boolean;
  onToggleAdmin: () => void;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  currentUser: Customer | null;
  onAuthClick: () => void;
  onLogout: () => void;
  onMyOrdersClick: () => void;
  isStoreOpen?: boolean;
  logoUrl?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  cartCount, 
  onCartClick, 
  isAdmin, 
  onToggleAdmin,
  searchTerm,
  onSearchChange,
  currentUser,
  onAuthClick,
  onLogout,
  onMyOrdersClick,
  isStoreOpen = true,
  logoUrl
}) => {
  const [isLive, setIsLive] = useState(true);

  // Simula detecção de conexão para o cliente
  useEffect(() => {
    const handleOnline = () => setIsLive(true);
    const handleOffline = () => setIsLive(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-md w-full border-b border-slate-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center h-20 sm:h-28 gap-3">
          
          {/* Logo Section */}
          <div className="flex items-center gap-3 flex-shrink-0 cursor-pointer group" onClick={() => !isAdmin && window.scrollTo({top: 0, behavior: 'smooth'})}>
            <div className="relative">
              <div className="w-12 h-12 sm:w-20 sm:h-20 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg overflow-hidden border-2 border-white transition-transform group-hover:scale-105">
                {logoUrl ? (
                  <img src={logoUrl} className="w-full h-full object-cover" alt="Logo" />
                ) : (
                  <span className="text-white text-xl sm:text-3xl">🍔</span>
                )}
              </div>
              {/* Indicador de Conexão Real-time */}
              <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${isLive ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-red-50 animate-pulse'}`}></div>
            </div>
            
            <div className="hidden md:flex flex-col">
              <span className="text-xl font-black leading-none uppercase tracking-tighter">
                <span className="text-emerald-500">NILO</span> <span className="text-red-600">Lanches</span>
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[8px] font-black uppercase tracking-widest ${isStoreOpen ? 'text-emerald-500' : 'text-red-500'}`}>
                  {isStoreOpen ? 'Aberto' : 'Fechado'}
                </span>
                <span className="text-[7px] font-black text-slate-300 uppercase tracking-widest">● LIVE</span>
              </div>
            </div>
          </div>

          {/* Search Box */}
          {!isAdmin && (
            <div className="flex-1 max-w-md mx-2">
              <div className="relative group">
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="O que vamos comer?" 
                  className="w-full bg-slate-100 border-2 border-transparent rounded-2xl px-5 py-3 text-xs sm:text-sm font-bold focus:bg-white focus:border-emerald-500 outline-none transition-all placeholder:text-slate-400"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none">🔍</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            
            {/* Display User Name (Novo) */}
            {!isAdmin && currentUser && (
              <div className="hidden md:flex flex-col items-end mr-1">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Olá,</span>
                <span className="text-xs font-black text-emerald-600 uppercase tracking-tight leading-none truncate max-w-[100px]">
                  {currentUser.name.split(' ')[0]}
                </span>
              </div>
            )}

            {/* Botão de Administração (Escudo) - Apenas Desktop */}
            {!isAdmin && (
              <button 
                onClick={onToggleAdmin}
                className="hidden md:flex p-3 text-slate-400 hover:text-emerald-600 bg-slate-50 rounded-2xl transition-all"
                title="Acesso Administrativo"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </button>
            )}

            {!isAdmin && currentUser && (
              <button onClick={onMyOrdersClick} className="p-3 text-slate-500 hover:text-emerald-600 transition-all bg-slate-50 rounded-2xl" title="Meus Pedidos">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>
            )}

            {!isAdmin && (
              currentUser ? (
                <button onClick={onLogout} className="p-3 text-slate-400 hover:text-red-500 bg-slate-50 rounded-2xl transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7" />
                  </svg>
                </button>
              ) : (
                <button onClick={onAuthClick} className="px-5 py-3 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-100 active:scale-95 transition-all">
                  Entrar
                </button>
              )
            )}
            
            {!isAdmin && (
              <button onClick={onCartClick} className="relative p-3 text-white bg-emerald-600 rounded-2xl shadow-xl shadow-emerald-100 hover:bg-emerald-700 active:scale-95 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19,7h-3c0-2.21-1.79-4-4-4S8,4.79,8,7H5C3.89,7,3,7.89,3,9v10c0,1.11,0.89,2,2,2h14c1.11,0,2-0.89,2-2V9 C21,7.89,20.11,7,19,7z M12,5c1.1,0,2,0.9,2,2h-4C10,5.9,10.9,5,12,5z M19,19H5V9h14V19z" />
                </svg>
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] font-black w-5 h-5 flex items-center justify-center rounded-full ring-2 ring-white">
                    {cartCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
