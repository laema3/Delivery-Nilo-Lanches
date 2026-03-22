
import React, { useState, useEffect } from 'react';
import { safeStorage } from '../utils/safeStorage.ts';

interface InstallBannerProps {
  logoUrl: string;
}

export const InstallBanner: React.FC<InstallBannerProps> = ({ logoUrl }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      
      const lastDismissed = safeStorage.getItem('installBannerDismissedAt');
      if (lastDismissed) {
        const lastDate = new Date(parseInt(lastDismissed));
        const today = new Date();
        if (lastDate.getDate() === today.getDate() && 
            lastDate.getMonth() === today.getMonth() && 
            lastDate.getFullYear() === today.getFullYear()) {
          return; // Already dismissed today
        }
      }

      setDeferredPrompt(e);
      setShowBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowBanner(false);
    }
  };

  const handleDismiss = () => {
    safeStorage.setItem('installBannerDismissedAt', Date.now().toString());
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[1000] bg-slate-900 text-white p-4 flex items-center justify-between shadow-2xl animate-in slide-in-from-bottom-10 duration-500">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-white rounded-xl overflow-hidden p-1">
          {logoUrl ? <img src={logoUrl} alt="App Icon" className="w-full h-full object-contain" /> : <span className="text-2xl">🍔</span>}
        </div>
        <div>
          <h3 className="font-black uppercase text-sm tracking-wide">Instalar App</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Acesso rápido e offline</p>
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={handleDismiss} className="text-xs font-black text-slate-400 hover:text-white uppercase tracking-widest px-3 py-2">Agora não</button>
        <button onClick={handleInstall} className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-900/20 active:scale-95">Instalar</button>
      </div>
    </div>
  );
};
