
import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  type?: 'success' | 'error';
}

export const Toast: React.FC<ToastProps> = ({ message, isVisible, onClose, type = 'success' }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[150] animate-in slide-in-from-top-4 fade-in duration-300">
      <div className={`px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 border ${
        type === 'success' 
          ? 'bg-emerald-900/90 text-white border-emerald-500/50' 
          : 'bg-red-900/90 text-white border-red-500/50'
      } backdrop-blur-md`}>
        <span className="text-xl">{type === 'success' ? '✅' : '❌'}</span>
        <span className="text-xs font-black uppercase tracking-widest">{message}</span>
      </div>
    </div>
  );
};
