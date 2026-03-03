
import React from 'react';

interface FooterProps {
  logoUrl: string;
  isStoreOpen: boolean;
  socialLinks: { instagram?: string; whatsapp?: string; facebook?: string; };
  onAdminClick: () => void;
  onMotoboyClick: () => void;
}

export const Footer: React.FC<FooterProps> = ({ logoUrl, isStoreOpen, socialLinks, onAdminClick, onMotoboyClick }) => {
  return (
    <footer className="bg-slate-900 text-slate-400 py-12 px-6 mt-20">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center overflow-hidden">
              {logoUrl ? <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" /> : <span className="text-4xl">🍔</span>}
            </div>
            <div>
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">Nilo <span className="text-emerald-500">Lanches</span></h3>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Desde 2015</p>
            </div>
          </div>
          <p className="text-sm leading-relaxed max-w-xs">
            O melhor lanche artesanal de Uberaba. Ingredientes frescos, molhos especiais e muito sabor em cada mordida.
          </p>
        </div>

        <div className="space-y-6">
          <h4 className="text-lg font-black text-white uppercase tracking-widest border-b border-slate-800 pb-4 w-fit">Contato</h4>
          <ul className="space-y-4 text-sm font-medium">
            <li className="flex items-center gap-3 hover:text-emerald-500 transition-colors cursor-pointer">
              <span className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center text-lg">📍</span>
              Rua dos Andradas, 123 - Abadia
            </li>
            <li className="flex items-center gap-3 hover:text-emerald-500 transition-colors cursor-pointer">
              <span className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center text-lg">📞</span>
              (34) 99118-3728
            </li>
            <li className="flex items-center gap-3 hover:text-emerald-500 transition-colors cursor-pointer">
              <span className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center text-lg">⏰</span>
              {isStoreOpen ? <span className="text-emerald-500 font-bold">Aberto Agora</span> : <span className="text-red-500 font-bold">Fechado</span>}
            </li>
          </ul>
        </div>

        <div className="space-y-6">
          <h4 className="text-lg font-black text-white uppercase tracking-widest border-b border-slate-800 pb-4 w-fit">Acesso Rápido</h4>
          <div className="flex flex-col gap-3">
            <button onClick={onAdminClick} className="text-left text-sm font-bold hover:text-white transition-colors uppercase tracking-wide">🔐 Área Administrativa</button>
            <button onClick={onMotoboyClick} className="text-left text-sm font-bold hover:text-white transition-colors uppercase tracking-wide">🛵 Portal do Motoboy</button>
            <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="text-left text-sm font-bold hover:text-white transition-colors uppercase tracking-wide">📸 Instagram</a>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-slate-800 text-center text-xs font-bold uppercase tracking-widest text-slate-600">
        © {new Date().getFullYear()} Nilo Lanches. Todos os direitos reservados.
      </div>
    </footer>
  );
};
