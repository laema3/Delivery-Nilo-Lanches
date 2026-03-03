
import React, { useEffect } from 'react';

interface ToastProps {
  isVisible: boolean;
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ isVisible, message, type, onClose }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className={`fixed top-6 right-6 z-[2000] px-6 py-4 rounded-2xl shadow-xl flex items-center gap-4 animate-in slide-in-from-top-10 duration-300 ${type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
      <span className="text-2xl">{type === 'success' ? '✅' : '⚠️'}</span>
      <p className="font-black uppercase text-xs tracking-widest">{message}</p>
      <button onClick={onClose} className="ml-4 text-white/50 hover:text-white font-black">✕</button>
    </div>
  );
};
