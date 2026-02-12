
import React from 'react';

interface FooterProps {
  logoUrl?: string;
  onAdminClick?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ logoUrl, onAdminClick }) => {
  return (
    <footer className="bg-emerald-950 text-emerald-100/60 py-16 border-t border-emerald-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Brand Column */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-950/40 overflow-hidden border border-white/10">
                {logoUrl ? (
                  <img src={logoUrl} className="w-full h-full object-cover" alt="Logo Rodapé" />
                ) : (
                  <span className="text-white text-2xl">🍔</span>
                )}
              </div>
              <span className="text-xl font-bold tracking-tight">
                <span className="text-emerald-600">Nilo</span> <span className="text-red-600">Lanches</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed max-w-xs">
              O melhor sabor de Uberaba direto na sua casa. Ingredientes selecionados e entrega rápida para matar sua fome com qualidade artesanal.
            </p>
            <div className="flex gap-4">
              <a href="#" className="w-8 h-8 rounded-lg bg-emerald-900/50 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all text-[10px] font-black">IG</a>
              <a href="#" className="w-8 h-8 rounded-lg bg-emerald-900/50 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all text-[10px] font-black">WA</a>
              <a href="#" className="w-8 h-8 rounded-lg bg-emerald-900/50 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all text-[10px] font-black">FB</a>
            </div>
          </div>

          {/* Contact Column */}
          <div className="space-y-6">
            <h3 className="text-white font-black text-sm uppercase tracking-widest">Atendimento</h3>
            <ul className="space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <span className="text-emerald-400 text-lg">📍</span>
                <span>Av. Lucas Borges, 317 - Fabrício<br/>Uberaba - MG</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-emerald-400 text-lg">📞</span>
                <span>(34) 3077-3706</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-emerald-400 text-lg">💬</span>
                <span>(34) 9 9118-3728 (WhatsApp)</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-emerald-400 text-lg">✉️</span>
                <span>contato@nilolanches.com.br</span>
              </li>
            </ul>
          </div>

          {/* Opening Hours Column */}
          <div className="space-y-6">
            <h3 className="text-white font-black text-sm uppercase tracking-widest">Horários</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm py-2 border-b border-emerald-900/50">
                <span className="font-bold">Todos os dias</span>
                <span className="text-white font-black">18:30 - 23:50</span>
              </div>
            </div>
            <div className="mt-6 flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-[10px] font-black text-emerald-400 uppercase">Aberto para Pedidos</span>
            </div>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-emerald-900/50 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-emerald-700">
          <p>© 2024 NILO LANCHES - TODOS OS DIREITOS RESERVADOS</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-emerald-400 transition-colors">Privacidade</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
