
import React from 'react';

interface ToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  type?: 'success' | 'error';
}

export const Toast: React.FC<ToastProps> = ({ message, isVisible, onClose, type = 'success' }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-top-4 fade-in duration-300 w-[90%] max-w-md">
      <div className={`p-1 rounded-2xl shadow-2xl flex items-center gap-3 border ${
        type === 'success' 
          ? 'bg-emerald-900 text-white border-emerald-500' 
          : 'bg-red-900 text-white border-red-500'
      } backdrop-blur-xl`}>
        <div className="flex-1 flex items-center gap-3 py-3 pl-4">
          <span className="text-xl">{type === 'success' ? '🚀' : '⚠️'}</span>
          <span className="text-[11px] font-black uppercase tracking-widest leading-tight">{message}</span>
        </div>
        <button 
          onClick={onClose}
          className="bg-white/10 hover:bg-white/20 px-4 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest border-l border-white/10 transition-colors"
        >
          Fechar
        </button>
      </div>
    </div>
  );
};
