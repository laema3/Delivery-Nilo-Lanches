
import React, { useState, useEffect } from 'react';
import { Customer, ZipRange } from '../types.ts';
import { dbService } from '../services/dbService.ts';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: Customer) => void;
  onSignup: (user: Customer) => void;
  zipRanges: ZipRange[];
  customers: Customer[];
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLogin, onSignup, zipRanges, customers }) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // States para Cadastro
  const [zipCode, setZipCode] = useState('');
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [detectedFee, setDetectedFee] = useState<number | null>(null);
  const [isOutOfRange, setIsOutOfRange] = useState(false);

  // States para Recuperação de Senha
  const [recoveryStep, setRecoveryStep] = useState<1 | 2>(1);
  const [foundCustomer, setFoundCustomer] = useState<Customer | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const formatZipCode = (val: string) => {
    const numeric = val.replace(/\D/g, '');
    if (numeric.length <= 5) return numeric;
    return `${numeric.substring(0, 5)}-${numeric.substring(5, 8)}`;
  };

  const findZipFee = (cepRaw: string) => {
    if (!cepRaw || zipRanges.length === 0) return null;
    const numZip = parseInt(cepRaw);
    const range = zipRanges.find(r => {
      const start = parseInt(r.start.replace(/\D/g, ''));
      const end = parseInt(r.end.replace(/\D/g, ''));
      return numZip >= start && numZip <= end;
    });
    return range ? range.fee : null;
  };

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '').substring(0, 8);
    setZipCode(formatZipCode(rawValue));
    setIsOutOfRange(false);
    setErrorMsg('');
    setDetectedFee(null);

    if (rawValue.length === 8) {
      const fee = findZipFee(rawValue);
      
      if (fee === null && zipRanges.length > 0) {
        setIsOutOfRange(true);
        setErrorMsg('Desculpe, ainda não entregamos nesta região (CEP fora da área).');
        return;
      }

      setDetectedFee(fee);

      try {
        const res = await fetch(`https://viacep.com.br/ws/${rawValue}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setAddress(data.logradouro || '');
          setNeighborhood(data.bairro || '');
        } else {
          setErrorMsg('CEP não encontrado na base do Correios.');
        }
      } catch (err) { 
        console.error(err);
        setErrorMsg('Erro de conexão ao buscar CEP.');
      }
    }
  };

  const handleVerifyRecovery = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg('');
    const fd = new FormData(e.currentTarget);
    const email = (fd.get('email') as string).trim().toLowerCase();
    const phone = (fd.get('phone') as string).replace(/\D/g, '');

    const user = customers.find(c => c.email.toLowerCase() === email && c.phone.replace(/\D/g, '') === phone);

    if (user) {
      setFoundCustomer(user);
      setRecoveryStep(2);
    } else {
      setErrorMsg('Dados não conferem. Verifique o e-mail e WhatsApp informados.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 4) {
      setErrorMsg('A nova senha deve ter pelo menos 4 caracteres.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMsg('As senhas não coincidem.');
      return;
    }

    if (foundCustomer) {
      setIsLoading(true);
      try {
        await dbService.save('customers', foundCustomer.id, { ...foundCustomer, password: newPassword });
        setSuccessMsg('Senha alterada com sucesso! Faça login agora.');
        setTimeout(() => {
          setMode('login');
          setRecoveryStep(1);
          setFoundCustomer(null);
          setNewPassword('');
          setConfirmNewPassword('');
          setSuccessMsg('');
        }, 2500);
      } catch (e) {
        setErrorMsg('Erro ao salvar nova senha.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg('');
    
    const fd = new FormData(e.currentTarget);
    const email = (fd.get('email') as string).trim().toLowerCase();
    const password = fd.get('password') as string;

    if (!password || password.length < 4) {
      setErrorMsg('A senha deve ter pelo menos 4 caracteres.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      if (mode === 'login') {
        const userFound = customers.find(c => c.email.toLowerCase() === email && c.password === password);
        if (userFound) {
          if (userFound.isBlocked) {
            setErrorMsg('Este usuário está bloqueado. Entre em contato com o suporte.');
            setIsLoading(false);
            return;
          }
          onLogin(userFound);
          localStorage.setItem('nl_current_user', JSON.stringify(userFound));
          onClose();
        } else {
          setErrorMsg('E-mail ou senha incorretos.');
        }
      } else if (mode === 'signup') {
        if (isOutOfRange) {
          setErrorMsg('Cadastro bloqueado: Endereço fora da área de entrega.');
          setIsLoading(false);
          return;
        }

        const newUser: Customer = {
          id: email,
          name: fd.get('name') as string,
          email: email,
          phone: fd.get('phone') as string,
          password: password,
          address: `${address}, ${fd.get('number')}`,
          neighborhood: neighborhood,
          zipCode: zipCode.replace(/\D/g, ''),
          totalOrders: 0,
          points: 0,
          lastOrder: new Date().toISOString()
        };
        
        onSignup(newUser);
        localStorage.setItem('nl_current_user', JSON.stringify(newUser));
        onClose();
      }
      setIsLoading(false);
    }, 800);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-[40px] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
        <div className="flex border-b border-slate-100">
          <button onClick={() => { setMode('login'); setErrorMsg(''); setSuccessMsg(''); setRecoveryStep(1); }} className={`flex-1 py-6 font-black text-[10px] uppercase tracking-widest transition-all ${mode === 'login' ? 'text-emerald-600 border-b-4 border-emerald-600 bg-emerald-50/50' : 'text-slate-400'}`}>Entrar</button>
          <button onClick={() => { setMode('signup'); setErrorMsg(''); setSuccessMsg(''); setRecoveryStep(1); }} className={`flex-1 py-6 font-black text-[10px] uppercase tracking-widest transition-all ${mode === 'signup' ? 'text-emerald-600 border-b-4 border-emerald-600 bg-emerald-50/50' : 'text-slate-400'}`}>Criar Conta</button>
        </div>
        
        <div className="p-8 sm:p-10 space-y-4 overflow-y-auto max-h-[75vh] no-scrollbar">
          {errorMsg && (
            <div className={`p-4 text-[10px] font-black uppercase tracking-widest text-center rounded-xl border animate-in zoom-in-95 ${isOutOfRange ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-4 text-[10px] font-black uppercase tracking-widest text-center rounded-xl border bg-emerald-50 text-emerald-600 border-emerald-200 animate-in zoom-in-95">
              {successMsg}
            </div>
          )}

          {mode === 'forgot' ? (
            <div className="space-y-6 animate-in slide-in-from-bottom-4">
              <div className="text-center space-y-2">
                 <h3 className="text-xl font-black text-slate-800 uppercase">Recuperar Senha</h3>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                   {recoveryStep === 1 ? 'Confirme seus dados cadastrados' : 'Defina sua nova senha de acesso'}
                 </p>
              </div>

              {recoveryStep === 1 ? (
                <form onSubmit={handleVerifyRecovery} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 ml-1 tracking-widest">E-mail Cadastrado</label>
                    <input name="email" type="email" placeholder="seu@email.com" required className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold focus:border-emerald-500 outline-none transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 ml-1 tracking-widest">WhatsApp (com DDD)</label>
                    <input name="phone" placeholder="34991183728" required className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold focus:border-emerald-500 outline-none transition-all" />
                  </div>
                  <button className="w-full font-black py-5 rounded-[24px] shadow-xl bg-slate-900 text-white uppercase text-[10px] tracking-widest mt-4">Verificar Dados</button>
                  <button type="button" onClick={() => setMode('login')} className="w-full text-slate-400 text-[10px] font-black uppercase py-2">Voltar ao Login</button>
                </form>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 ml-1 tracking-widest">Nova Senha</label>
                    <input value={newPassword} onChange={e => setNewPassword(e.target.value)} type="password" placeholder="Mínimo 4 caracteres" required className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold focus:border-emerald-500 outline-none transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 ml-1 tracking-widest">Confirmar Nova Senha</label>
                    <input value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} type="password" placeholder="Repita a nova senha" required className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold focus:border-emerald-500 outline-none transition-all" />
                  </div>
                  <button disabled={isLoading} className="w-full font-black py-5 rounded-[24px] shadow-xl bg-emerald-600 text-white uppercase text-[10px] tracking-widest mt-4 border-b-4 border-emerald-800">
                    {isLoading ? 'Salvando...' : 'Atualizar Minha Senha'}
                  </button>
                </form>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 ml-1 tracking-widest">Seu Nome</label>
                    <input name="name" placeholder="Ex: João da Silva" required className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold focus:border-emerald-500 outline-none transition-all" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <label className="text-[9px] font-black uppercase text-slate-400 ml-1 tracking-widest">WhatsApp</label>
                       <input name="phone" placeholder="(34) 9..." required className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold focus:border-emerald-500 outline-none transition-all" />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[9px] font-black uppercase text-slate-400 ml-1 tracking-widest">CEP (Somente Uberaba)</label>
                       <input name="zipCode" value={zipCode} onChange={handleCepChange} placeholder="38000-000" required className={`w-full px-5 py-4 bg-slate-50 border-2 rounded-2xl font-bold focus:border-emerald-500 outline-none transition-all ${isOutOfRange ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-transparent'}`} />
                    </div>
                  </div>

                  {detectedFee !== null && (
                    <div className="bg-emerald-600 text-white p-4 rounded-2xl flex items-center justify-between animate-in zoom-in-95">
                      <span className="text-[9px] font-black uppercase tracking-widest">🚀 Taxa de Entrega para sua Região:</span>
                      <span className="font-black">R$ {detectedFee.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2 space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-400 ml-1 tracking-widest">Rua</label>
                      <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Aguardando CEP..." required className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold focus:border-emerald-500 outline-none transition-all" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-400 ml-1 tracking-widest">Número</label>
                      <input name="number" placeholder="123" required className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold focus:border-emerald-500 outline-none transition-all" />
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-1 tracking-widest">E-mail</label>
                <input name="email" type="email" placeholder="seu@email.com" required className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold focus:border-emerald-500 outline-none transition-all" />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-1 tracking-widest">Senha</label>
                <input name="password" type="password" placeholder="Mínimo 4 caracteres" required className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold focus:border-emerald-500 outline-none transition-all" />
              </div>

              {mode === 'login' && (
                <div className="flex justify-end">
                   <button type="button" onClick={() => setMode('forgot')} className="text-[10px] font-black uppercase text-emerald-600 hover:underline">Esqueci minha senha</button>
                </div>
              )}

              <button 
                disabled={isLoading || (mode === 'signup' && isOutOfRange)} 
                className="w-full font-black py-5 rounded-[24px] shadow-xl bg-emerald-600 text-white uppercase text-[10px] tracking-widest mt-6 border-b-4 border-emerald-800 disabled:opacity-50 disabled:bg-slate-400 disabled:border-slate-500 transition-all active:translate-y-1"
              >
                {isLoading ? 'Verificando...' : (mode === 'login' ? 'Entrar Agora' : 'Finalizar Cadastro')}
              </button>
              
              <button type="button" onClick={onClose} className="w-full text-slate-400 text-[10px] font-black uppercase tracking-widest py-2">Voltar ao cardápio</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
