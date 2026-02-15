
import React from 'react';

interface FooterProps {
  logoUrl?: string;
  onAdminClick?: () => void;
  isStoreOpen?: boolean;
  socialLinks?: {
    instagram?: string;
    whatsapp?: string;
    facebook?: string;
  };
}

export const Footer: React.FC<FooterProps> = ({ logoUrl, onAdminClick, isStoreOpen = true, socialLinks }) => {
  const whatsappNumber = socialLinks?.whatsapp || '5534991183728';
  const whatsappUrl = whatsappNumber.startsWith('http') ? whatsappNumber : `https://wa.me/${whatsappNumber.replace(/\D/g, '')}`;

  return (
    <footer className="bg-emerald-950 text-emerald-100/60 py-8 md:py-16 border-t border-emerald-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Esconde o grid principal no Mobile, mostra apenas no Desktop (md) */}
        <div className="hidden md:grid grid-cols-3 gap-12 mb-12">
          {/* Brand */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center overflow-hidden">
                {logoUrl ? <img src={logoUrl} className="w-full h-full object-cover" alt="Logo" /> : <span className="text-white text-2xl">🍔</span>}
              </div>
              <span className="text-xl font-bold tracking-tight text-white">Nilo Lanches</span>
            </div>
            <div className="flex gap-4">
              {socialLinks?.instagram && <a href={socialLinks.instagram} target="_blank" className="w-8 h-8 rounded-lg bg-emerald-900 flex items-center justify-center hover:bg-emerald-600 transition-all text-[10px] font-black">IG</a>}
              <a href={whatsappUrl} target="_blank" className="w-8 h-8 rounded-lg bg-emerald-900 flex items-center justify-center hover:bg-emerald-600 transition-all text-[10px] font-black">WA</a>
            </div>
          </div>

          {/* Atendimento */}
          <div className="space-y-4">
            <h3 className="text-white font-black text-sm uppercase tracking-widest">Atendimento</h3>
            <p className="text-sm">Av. Lucas Borges, 317 - Uberaba MG<br/>(34) 9 9118-3728</p>
          </div>

          {/* Horários */}
          <div className="space-y-4">
            <h3 className="text-white font-black text-sm uppercase tracking-widest">Horários</h3>
            <p className="text-sm">Todos os dias: 18:30 - 23:50</p>
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${isStoreOpen ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
              {isStoreOpen ? 'Loja Aberta' : 'Loja Fechada'}
            </div>
          </div>
        </div>

        {/* Linha de Copyright / Acesso - No mobile centraliza e deixa minimalista */}
        <div className="pt-4 md:pt-8 border-t border-emerald-900/50 flex flex-col md:flex-row justify-between items-center text-[10px] font-bold uppercase tracking-widest text-emerald-800 gap-4">
          <p className="hidden md:block">© 2024 NILO LANCHES - UBERABA-MG</p>
          <button 
            onClick={onAdminClick} 
            className="hover:text-emerald-400 transition-colors uppercase tracking-[0.3em] font-black text-emerald-700 md:text-emerald-800"
          >
            Acesso
          </button>
        </div>
      </div>
    </footer>
  );
};
