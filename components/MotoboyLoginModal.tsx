
import React, { useState, useEffect } from 'react';

interface MotoboyLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const MotoboyLoginModal: React.FC<MotoboyLoginModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setPassword('');
      setError(false);
    }
  }, [isOpen]);

  const MOTOBOY_PASS = 'nilo123';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim() === MOTOBOY_PASS) {
      setError(false);
      onSuccess();
      onClose();
    } else {
      setError(true);
      setTimeout(() => setError(false), 3000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300">
      <div className={`bg-slate-900 border ${error ? 'border-red-500' : 'border-slate-800'} rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl p-8 space-y-8 transition-all`}>
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-blue-900/40 mb-4">
            <span className="text-3xl">🛵</span>
          </div>
          <h2 className="text-2xl font-black text-blue-500 uppercase tracking-tight">Portal Entregador</h2>
          <p className="text-slate-500 text-sm font-bold">Acesso restrito para motoboys</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-widest">Senha de Acesso</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-5 py-4 bg-slate-800 border border-slate-700 rounded-2xl font-bold text-white outline-none focus:border-blue-500 transition-all placeholder:text-slate-600"
              required
              autoFocus
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-center animate-pulse">
              <span className="text-xs font-black text-red-500 uppercase tracking-widest">Senha Incorreta</span>
            </div>
          )}

          <div className="pt-4 flex flex-col gap-3">
            <button 
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-2xl shadow-xl transition-all uppercase tracking-widest text-xs active:scale-95"
            >
              ENTRAR NO PORTAL
            </button>
            <button 
              type="button" 
              onClick={onClose} 
              className="w-full text-slate-500 hover:text-white font-bold py-2 transition-colors text-xs uppercase tracking-widest"
            >
              Cancelar e Voltar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
