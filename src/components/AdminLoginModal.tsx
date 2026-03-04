
import React, { useState } from 'react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  correctUser: string;
  correctPass: string;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({ isOpen, onClose, onSuccess, correctUser, correctPass }) => {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Pequeno delay para dar feedback visual
    await new Promise(resolve => setTimeout(resolve, 500));

    if (user === correctUser && pass === correctPass) {
      onSuccess();
      onClose();
      setUser('');
      setPass('');
    } else {
      setError('Usuário ou senha incorretos.');
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl p-8 animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
        <div className="text-center mb-6">
          <span className="text-4xl mb-2 block">🔐</span>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Acesso Admin</h2>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Área Restrita</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input 
              type="text" 
              placeholder="Usuário" 
              value={user} 
              onChange={e => { setUser(e.target.value); setError(''); }} 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 outline-none transition-all" 
              required 
            />
          </div>
          <div>
            <input 
              type="password" 
              placeholder="Senha" 
              value={pass} 
              onChange={e => { setPass(e.target.value); setError(''); }} 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 outline-none transition-all" 
              required 
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-center animate-in fade-in slide-in-from-top-2">
              <p className="text-xs font-black text-red-500 uppercase">{error}</p>
            </div>
          )}
          
          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-emerald-600 transition-colors shadow-lg shadow-slate-900/20 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Verificando...</span>
              </>
            ) : (
              'Entrar'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
