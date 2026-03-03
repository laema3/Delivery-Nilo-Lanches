
import React, { useState } from 'react';
import { Customer, ZipRange } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (customer: Customer) => void;
  onSignup: (customer: Customer) => void;
  zipRanges: ZipRange[];
  customers: Customer[];
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLogin, onSignup, zipRanges, customers }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [zipCode, setZipCode] = useState('');

  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (isLogin) {
      const customer = customers.find(c => c.email.toLowerCase() === email.toLowerCase() && c.password === password);
      if (customer) {
        onLogin(customer);
        onClose();
      } else {
        setError('E-mail ou senha inválidos.');
      }
    } else {
      const existingCustomer = customers.find(c => c.email.toLowerCase() === email.toLowerCase());
      if (existingCustomer) {
        setError('Este e-mail já está cadastrado.');
        return;
      }
      
      const newCustomer: Customer = {
        id: Math.random().toString(36).substring(7),
        name, email: email.toLowerCase(), phone, password, address, neighborhood, zipCode,
        totalOrders: 0, points: 0, lastOrder: '', isBlocked: false
      };
      onSignup(newCustomer);
      onLogin(newCustomer);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl p-8 animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-6 text-center">{isLogin ? 'Bem-vindo de volta!' : 'Criar Conta'}</h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-bold text-center">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <input type="text" placeholder="Nome Completo" value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500" required />
              <input type="tel" placeholder="Telefone (WhatsApp)" value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500" required />
              <input type="text" placeholder="Endereço Completo" value={address} onChange={e => setAddress(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500" required />
              <input type="text" placeholder="Bairro" value={neighborhood} onChange={e => setNeighborhood(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500" required />
              <input type="text" placeholder="CEP" value={zipCode} onChange={e => setZipCode(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500" required />
            </>
          )}
          <input type="email" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500" required />
          <input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500" required />
          
          <button type="submit" className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-900/20 active:scale-95 mt-6">
            {isLogin ? 'Entrar' : 'Cadastrar'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="text-xs font-bold text-slate-400 hover:text-emerald-600 uppercase tracking-widest transition-colors">
            {isLogin ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entre aqui'}
          </button>
        </div>
      </div>
    </div>
  );
};
