
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export const WelcomePopup: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const hasSeenPopup = sessionStorage.getItem('nl_welcome_popup_seen');
    if (!hasSeenPopup) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1500); // Mostra após 1.5s para não ser tão abrupto
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    sessionStorage.setItem('nl_welcome_popup_seen', 'true');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden relative"
          >
            <div className="bg-emerald-600 p-8 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                <div className="absolute -top-10 -left-10 w-40 h-40 bg-white rounded-full blur-3xl" />
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white rounded-full blur-3xl" />
              </div>
              <span className="text-6xl mb-4 block">👋</span>
              <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Seja Bem-vindo!</h2>
            </div>

            <div className="p-8 sm:p-10 space-y-6">
              <div className="space-y-4 text-slate-600 leading-relaxed">
                <p className="font-bold text-slate-800 text-lg">Caro cliente, mudamos a nossa plataforma.</p>
                <p className="text-sm">
                  Para garantir sua segurança, clique em <span className="font-black text-emerald-600">"esqueci a senha"</span> e faça a redefinição. Assim que fizer, seu acesso já estará liberado.
                </p>
                <p className="text-xs font-medium bg-slate-50 p-4 rounded-2xl border border-slate-100 italic">
                  "Se você é um usuário novo, clique em cadastrar e faça o seu cadastro normalmente."
                </p>
              </div>

              <button 
                onClick={handleClose}
                className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-emerald-600 transition-all shadow-xl shadow-slate-900/20 active:scale-95"
              >
                Entendi, vamos lá!
              </button>
            </div>
            
            <button 
              onClick={handleClose}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 text-white hover:bg-white/40 flex items-center justify-center transition-colors"
            >
              ✕
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
