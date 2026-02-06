
import React, { useState, useEffect } from 'react';

interface InstallBannerProps {
  logoUrl?: string;
}

export const InstallBanner: React.FC<InstallBannerProps> = ({ logoUrl }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Verifica se é iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // Captura o evento de instalação do Android/Chrome
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Mostra o banner após 4 segundos
      setTimeout(() => setIsVisible(true), 4000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Se for iOS e não estiver em modo standalone
    if (isIOSDevice && !(window.navigator as any).standalone) {
      const timer = setTimeout(() => setIsVisible(true), 6000);
      return () => clearTimeout(timer);
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsVisible(false);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      alert('📱 No iPhone: Clique no ícone de "Compartilhar" (quadrado com seta no rodapé do Safari) e depois em "Adicionar à Tela de Início".');
      setIsVisible(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 left-4 right-4 z-[200] md:hidden">
      <div className="relative overflow-hidden bg-slate-900 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.4)] border border-white/10 p-5 animate-in slide-in-from-bottom-10 duration-700">
        {/* Background Decoration */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-600/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-red-600/10 rounded-full blur-3xl"></div>

        <div className="relative flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg border border-white/20 shrink-0 overflow-hidden">
              {logoUrl ? (
                <img src={logoUrl} className="w-full h-full object-cover" alt="Logo" />
              ) : (
                <span className="text-3xl">🍔</span>
              )}
            </div>
            <div className="flex flex-col items-start text-left">
              <h4 className="text-sm font-black text-white uppercase tracking-tight leading-none">
                App <span className="text-emerald-500">NILO</span> <span className="text-red-600">Lanches</span>
              </h4>
              <p className="text-[10px] text-slate-400 font-bold mt-1.5 leading-tight">Peça mais rápido e receba avisos!</p>
              <div className="flex gap-2 mt-2">
                <span className="text-[8px] bg-white/10 text-emerald-400 px-2 py-0.5 rounded-full font-black uppercase tracking-widest">Oficial</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-2 shrink-0">
            <button 
              onClick={handleInstall}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all active:scale-95 shadow-lg border-b-4 border-emerald-800"
            >
              Instalar
            </button>
            <button 
              onClick={() => setIsVisible(false)}
              className="text-[9px] text-slate-500 font-black uppercase tracking-widest text-center py-1"
            >
              Agora não
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
