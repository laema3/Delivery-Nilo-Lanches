import React, { useState, useEffect } from 'react';
import { Customer } from '../types';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  onUpdate: (customer: Customer) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, customer, onUpdate }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [zipCode, setZipCode] = useState('');

  useEffect(() => {
    if (customer) {
      setName(customer.name || '');
      setPhone(customer.phone || '');
      setEmail(customer.email || '');
      setAddress(customer.address || '');
      setNeighborhood(customer.neighborhood || '');
      setZipCode(customer.zipCode || '');
    }
  }, [customer, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customer) {
      onUpdate({
        ...customer,
        name,
        phone,
        email,
        address,
        neighborhood,
        zipCode
      });
      onClose();
    }
  };

  if (!isOpen || !customer) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl p-8 animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight text-center flex-1">Editar Perfil</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" placeholder="Nome Completo" value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500" required />
          <input type="email" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500" required />
          <input type="tel" placeholder="Telefone (WhatsApp)" value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500" required />
          <input type="text" placeholder="Endereço Completo" value={address} onChange={e => setAddress(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500" required />
          <input type="text" placeholder="Bairro" value={neighborhood} onChange={e => setNeighborhood(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500" required />
          <input type="text" placeholder="CEP" value={zipCode} onChange={e => setZipCode(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500" required />
          
          <button type="submit" className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-900/20 active:scale-95 mt-6">
            Salvar Alterações
          </button>
        </form>
      </div>
    </div>
  );
};
