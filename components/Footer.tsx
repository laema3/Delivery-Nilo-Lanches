
import React from 'react';

interface FooterProps {
  logoUrl?: string;
  onAdminClick?: () => void;
  onMotoboyClick?: () => void;
  isStoreOpen?: boolean;
  socialLinks?: {
    instagram?: string;
    whatsapp?: string;
    facebook?: string;
  };
}

export const Footer: React.FC<FooterProps> = ({ logoUrl, onAdminClick, onMotoboyClick, isStoreOpen = true, socialLinks }) => {
  const whatsappNumber = socialLinks?.whatsapp || '5534991183728';
  const whatsappUrl = whatsappNumber.startsWith('http') ? whatsappNumber : `https://wa.me/${whatsappNumber.replace(/\D/g, '')}`;

  return (
    <footer className="bg-slate-950 text-emerald-100/60 py-12 md:py-20 border-t border-emerald-900/30">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16 text-center md:text-left">
          <div className="space-y-6 flex flex-col items-center md:items-start">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center overflow-hidden shadow-xl border-2 border-white/10">
                {logoUrl ? <img src={logoUrl} className="w-full h-full object-cover" alt="Logo" /> : <span className="text-white text-3xl">🍔</span>}
              </div>
              <span className="text-2xl font-black tracking-tighter text-white uppercase">Nilo Lanches</span>
            </div>
            <p className="text-xs font-bold leading-relaxed max-w-xs text-emerald-100/40 uppercase tracking-widest">Qualidade artesanal em cada mordida.</p>
            <div className="flex gap-4">
              {socialLinks?.instagram && <a href={socialLinks.instagram} target="_blank" className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-emerald-600 transition-all text-white border border-white/5">IG</a>}
              <a href={whatsappUrl} target="_blank" className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-emerald-600 transition-all text-white border border-white/5">WA</a>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-white font-black text-xs uppercase tracking-[0.3em] opacity-30">Localização</h3>
            <p className="text-base font-bold text-emerald-50/80 leading-relaxed">
              Av. Lucas Borges, 317<br/>
              Fabrício - Uberaba/MG<br/>
              <span className="text-emerald-500 mt-2 block font-black">(34) 9 9118-3728</span>
            </p>
          </div>

          <div className="space-y-6">
            <h3 className="text-white font-black text-xs uppercase tracking-[0.3em] opacity-30">Atendimento</h3>
            <p className="text-base font-bold text-emerald-50/80">Todos os dias: 18:30 às 23:50</p>
            <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest border-2 ${isStoreOpen ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
              <span className={`w-2.5 h-2.5 rounded-full ${isStoreOpen ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
              {isStoreOpen ? 'Aberto' : 'Fechado'}
            </div>
          </div>
        </div>

        <div className="pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-900">© 2024 NILO LANCHES</p>
          
          <div className="flex flex-wrap justify-center items-center gap-6 md:gap-10">
            <button 
              onClick={onMotoboyClick} 
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-2xl transition-all uppercase tracking-[0.2em] font-black text-[11px] flex items-center gap-3 shadow-lg"
            >
              <span className="text-xl">🛵</span> 
              <span>Portal Entregador</span>
            </button>

            <button 
              onClick={onAdminClick} 
              className="text-slate-600 hover:text-emerald-400 transition-colors uppercase tracking-[0.2em] font-black text-[10px]"
            >
              🔒 Painel Admin
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
