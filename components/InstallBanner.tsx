
import React, { useState, useEffect } from 'react';

interface InstallBannerProps {
  logoUrl?: string;
}

export const InstallBanner: React.FC<InstallBannerProps> = ({ logoUrl }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isDismissed = sessionStorage.getItem('nilo_pwa_dismissed') === 'true';
    if (isDismissed) return;

    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleScroll = () => {
      if (sessionStorage.getItem('nilo_pwa_dismissed') === 'true') return;

      if (window.scrollY > 300 && !isVisible) {
        if (deferredPrompt || (isIOSDevice && !(window.navigator as any).standalone)) {
          setIsVisible(true);
        }
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [deferredPrompt, isVisible]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsVisible(false);
        sessionStorage.setItem('nilo_pwa_dismissed', 'true');
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      alert('📱 Para instalar no iPhone:\n1. Clique no ícone de "Compartilhar" (quadrado com seta no rodapé).\n2. Selecione "Adicionar à Tela de Início".');
      setIsVisible(false);
      sessionStorage.setItem('nilo_pwa_dismissed', 'true');
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem('nilo_pwa_dismissed', 'true');
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 left-4 right-4 z-[200] md:hidden">
      <div className="relative overflow-hidden bg-white rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-slate-100 p-5 animate-in slide-in-from-bottom-10 duration-700">
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg border-2 border-slate-50 shrink-0 overflow-hidden p-1.5">
              {logoUrl ? (
                <img src={logoUrl} className="max-w-full max-h-full object-contain" alt="Logo do App" />
              ) : (
                <span className="text-3xl text-emerald-600">🍔</span>
              )}
            </div>
            <div className="flex flex-col items-start text-left">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight leading-none">
                App <span className="text-emerald-600">NILO</span> <span className="text-red-600">Lanches</span>
              </h4>
              <p className="text-[10px] text-slate-400 font-bold mt-1.5 leading-tight">Instale para pedir em segundos!</p>
              <div className="flex gap-2 mt-2">
                <span className="text-[8px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-black uppercase tracking-widest border border-emerald-100">Instalação Oficial</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-2 shrink-0">
            <button 
              onClick={handleInstall}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-md"
            >
              Instalar
            </button>
            <button 
              onClick={handleDismiss}
              className="text-[9px] text-slate-400 font-black uppercase tracking-widest text-center py-1"
            >
              Agora não
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
