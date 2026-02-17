
import React, { useState, useEffect } from 'react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  correctUser: string;
  correctPass: string;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({ isOpen, onClose, onSuccess, correctUser, correctPass }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setUsername('');
      setPassword('');
      setError(false);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() === correctUser && password.trim() === correctPass) {
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
          <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-900/40 mb-4">
            <span className="text-3xl">🔐</span>
          </div>
          <h2 className="text-2xl font-black text-emerald-500 uppercase tracking-tight">Acesso Restrito</h2>
          <p className="text-slate-500 text-sm font-bold">Por favor, informe suas credenciais</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-widest">Usuário</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Digite o usuário"
              className="w-full px-5 py-4 bg-slate-800 border border-slate-700 rounded-2xl font-bold text-white outline-none focus:border-emerald-500 transition-all placeholder:text-slate-600"
              required
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-widest">Senha</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-5 py-4 bg-slate-800 border border-slate-700 rounded-2xl font-bold text-white outline-none focus:border-emerald-500 transition-all placeholder:text-slate-600"
              required
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-center animate-pulse">
              <span className="text-xs font-black text-red-500 uppercase tracking-widest">Usuário ou Senha incorretos</span>
            </div>
          )}

          <div className="pt-4 flex flex-col gap-3">
            <button 
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-5 rounded-2xl shadow-xl transition-all uppercase tracking-widest text-xs active:scale-95"
            >
              ENTRAR NO PAINEL
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
