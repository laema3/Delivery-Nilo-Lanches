
import React, { useState, useEffect } from 'react';

interface InstallBannerProps {
  logoUrl?: string;
}

// Variável global para capturar o evento de instalação fora do ciclo do React
let deferredPrompt: any = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
});

export const InstallBanner: React.FC<InstallBannerProps> = ({ logoUrl }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // 1. Verifica se o usuário já dispensou NESTA SESSÃO (ao fechar o browser e voltar, aparece de novo)
    const isDismissed = sessionStorage.getItem('nilo_pwa_dismissed') === 'true';
    if (isDismissed) return;

    // 2. Detecta se é iOS para mostrar instruções específicas
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    const checkInstallation = () => {
      if (sessionStorage.getItem('nilo_pwa_dismissed') === 'true') return;

      // Se tivermos o prompt capturado ou for iOS (que não tem prompt nativo automático)
      const canInstall = deferredPrompt || (isIOSDevice && !(window.navigator as any).standalone);
      
      if (canInstall) {
        setIsVisible(true);
      }
    };

    // Mostra o banner após 6 segundos (tempo para o usuário ver o site primeiro)
    const timer = setTimeout(checkInstallation, 6000);

    // Também mostra se o usuário rolar a página
    const handleScroll = () => {
      if (window.scrollY > 300) checkInstallation();
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsVisible(false);
        sessionStorage.setItem('nilo_pwa_dismissed', 'true');
      }
      deferredPrompt = null;
    } else if (isIOS) {
      // Instrução específica para iPhone
      alert('📱 Dica para iPhone:\n\nPara instalar, clique no ícone de "Compartilhar" (quadrado com seta no rodapé do Safari) e depois em "Adicionar à Tela de Início".');
      setIsVisible(false);
      sessionStorage.setItem('nilo_pwa_dismissed', 'true');
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    // Salva na sessionStorage para não incomodar mais NESTE ACESSO
    sessionStorage.setItem('nilo_pwa_dismissed', 'true');
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 left-4 right-4 z-[200] md:hidden">
      <div className="relative overflow-hidden bg-white rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-slate-100 p-5 animate-in slide-in-from-bottom-10 duration-700">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg border-2 border-slate-50 shrink-0 overflow-hidden p-1.5">
              {logoUrl ? (
                <img src={logoUrl} className="max-w-full max-h-full object-contain" alt="Logo" />
              ) : (
                <span className="text-3xl">🍔</span>
              )}
            </div>
            <div className="flex flex-col items-start text-left">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                App <span className="text-emerald-600">Nilo</span> Lanches
              </h4>
              <p className="text-[10px] text-slate-400 font-bold leading-tight mt-1">
                Instale para pedir mais rápido e ganhar pontos!
              </p>
            </div>
          </div>
          
          <div className="flex flex-col gap-2 shrink-0">
            <button 
              onClick={handleInstall}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-md transition-all active:scale-95"
            >
              Instalar
            </button>
            <button 
              onClick={handleDismiss}
              className="text-[9px] text-slate-400 font-black uppercase tracking-widest text-center py-1 hover:text-slate-600 transition-colors"
            >
              Agora não
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
