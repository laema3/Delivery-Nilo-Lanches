
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
    <footer className="bg-emerald-950 text-emerald-100/60 py-10 md:py-16 border-t border-emerald-900">
      <div className="max-w-7xl mx-auto px-6">
        {/* Grid de Informações - Agora visível em todos os tamanhos, empilhado no mobile */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-12 text-center md:text-left">
          <div className="space-y-6 flex flex-col items-center md:items-start">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center overflow-hidden shadow-lg border border-emerald-500/30">
                {logoUrl ? <img src={logoUrl} className="w-full h-full object-cover" alt="Logo" /> : <span className="text-white text-2xl">🍔</span>}
              </div>
              <span className="text-xl font-black tracking-tight text-white uppercase">Nilo Lanches</span>
            </div>
            <p className="text-xs font-bold leading-relaxed max-w-xs">O lanche mais respeitado de Uberaba. Qualidade artesanal em cada mordida.</p>
            <div className="flex gap-4">
              {socialLinks?.instagram && <a href={socialLinks.instagram} target="_blank" className="w-10 h-10 rounded-xl bg-emerald-900/50 flex items-center justify-center hover:bg-emerald-600 transition-all text-[10px] font-black text-white border border-white/5">IG</a>}
              <a href={whatsappUrl} target="_blank" className="w-10 h-10 rounded-xl bg-emerald-900/50 flex items-center justify-center hover:bg-emerald-600 transition-all text-[10px] font-black text-white border border-white/5">WA</a>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-white font-black text-xs uppercase tracking-[0.2em] opacity-50">Onde Estamos</h3>
            <p className="text-sm font-bold text-emerald-100/80 leading-relaxed">
              Av. Lucas Borges, 317<br/>
              Fabrício - Uberaba/MG<br/>
              <span className="text-emerald-500 mt-2 block">(34) 9 9118-3728</span>
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-white font-black text-xs uppercase tracking-[0.2em] opacity-50">Horário de Funcionamento</h3>
            <p className="text-sm font-bold text-emerald-100/80">Todos os dias: 18:30 às 23:50</p>
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border ${isStoreOpen ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
              <span className={`w-2 h-2 rounded-full ${isStoreOpen ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
              {isStoreOpen ? 'Estamos Abertos' : 'Loja Fechada'}
            </div>
          </div>
        </div>

        {/* Barra Inferior com Portais */}
        <div className="pt-8 border-t border-emerald-900/50 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-800">© 2024 NILO LANCHES - OFICIAL</p>
          
          <div className="flex items-center gap-8">
            <button 
              onClick={onMotoboyClick} 
              className="text-emerald-400 hover:text-white transition-colors uppercase tracking-[0.2em] font-black text-[11px] flex items-center gap-2"
            >
              <span className="text-lg">🛵</span> Portal Entregador
            </button>
            <button 
              onClick={onAdminClick} 
              className="text-emerald-700 hover:text-emerald-400 transition-colors uppercase tracking-[0.2em] font-black text-[10px]"
            >
              Acesso Admin
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
