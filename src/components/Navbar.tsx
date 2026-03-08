
import React from 'react';
import { Customer } from '../types';

interface NavbarProps {
  cartCount: number;
  onCartClick: () => void;
  isAdmin: boolean;
  isKioskMode: boolean;
  onToggleAdmin: () => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  currentUser: Customer | null;
  onAuthClick: () => void;
  onLogout: () => void;
  onMyOrdersClick: () => void;
  onProfileClick: () => void;
  isStoreOpen: boolean;
  logoUrl: string;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  cartCount, onCartClick, isAdmin, isKioskMode, onToggleAdmin, searchTerm, onSearchChange, 
  currentUser, onAuthClick, onLogout, onMyOrdersClick, onProfileClick, isStoreOpen, logoUrl 
}) => {
  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 sm:h-28">
          
          <div className="flex items-center gap-4">
            <div className="relative group cursor-pointer" onClick={onToggleAdmin}>
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-slate-100 shadow-sm group-hover:border-emerald-500 transition-colors">
                {logoUrl ? <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" /> : <span className="text-2xl">🍔</span>}
              </div>
              {isAdmin && <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />}
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-black uppercase tracking-tighter leading-none">
                <span className="text-emerald-600">NILO</span> <span className="text-red-600">LANCHES</span>
              </h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{isStoreOpen ? 'Aberto Agora' : 'Fechado'}</p>
            </div>
          </div>

          {!isAdmin && !isKioskMode && (
            <div className="flex-1 max-w-md mx-4 hidden md:block">
              <div className="relative group">
                <input 
                  type="text" 
                  placeholder="Buscar lanche..." 
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full bg-slate-100 border-none rounded-2xl py-3 pl-12 pr-4 text-sm font-bold text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 transition-all group-hover:bg-white group-hover:shadow-md"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">🔍</span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 sm:gap-6">
            {!isAdmin && !isKioskMode && (
              <>
                <button 
                  onClick={onMyOrdersClick}
                  className="hidden lg:flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-900/20 active:scale-95"
                >
                  📋 Meus Pedidos
                </button>

                <button 
                  onClick={onToggleAdmin} 
                  className="hidden sm:flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors" 
                  title="Área Administrativa"
                >
                  ⚙️
                </button>
                
                {currentUser ? (
                  <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-emerald-600" onClick={onProfileClick}>Olá, {currentUser.name.split(' ')[0]}</p>
                      <button onClick={onMyOrdersClick} className="text-xs font-bold text-emerald-600 hover:text-emerald-700 uppercase md:hidden">Acompanhar</button>
                    </div>
                    <button onClick={onLogout} className="w-8 h-8 flex items-center justify-center bg-white rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Sair">🚪</button>
                  </div>
                ) : (
                  <button onClick={onAuthClick} className="flex items-center gap-2 text-xs font-black text-slate-600 hover:text-emerald-600 uppercase tracking-widest transition-colors">
                    <span>👤</span> Entrar
                  </button>
                )}
              </>
            )}

            {!isAdmin && (
              <button onClick={onCartClick} className="relative group">
                <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center text-xl shadow-lg shadow-emerald-900/20 group-hover:scale-105 group-active:scale-95 transition-all">
                  🛒
                </div>
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white animate-bounce-subtle shadow-sm">
                    {cartCount}
                  </span>
                )}
              </button>
            )}

            {isAdmin && (
              <button onClick={onToggleAdmin} className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-100 transition-colors">
                Sair do Admin
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
