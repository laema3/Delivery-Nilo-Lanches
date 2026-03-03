
import React, { useState } from 'react';

interface MotoboyLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  correctPass: string;
}

export const MotoboyLoginModal: React.FC<MotoboyLoginModalProps> = ({ isOpen, onClose, onSuccess, correctPass }) => {
  const [pass, setPass] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pass === correctPass) {
      onSuccess();
      onClose();
    } else {
      alert('Credenciais inválidas');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl p-8 animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-6 text-center">Acesso Motoboy</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="password" placeholder="Senha" value={pass} onChange={e => setPass(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500" required />
          
          <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-emerald-600 transition-colors shadow-lg shadow-slate-900/20 active:scale-95 mt-6">
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
};
