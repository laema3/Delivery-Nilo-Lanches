
import React, { useState } from 'react';
import { Order } from '../types.ts';
import { PrintableCoupon } from './PrintableCoupon.tsx';

interface OrderSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onSendWhatsApp?: () => void;
}

export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({ isOpen, onClose, order, onSendWhatsApp }) => {
  // Estado para controlar se o cupom deve ser renderizado no DOM
  const [shouldRenderCoupon, setShouldRenderCoupon] = useState(false);
  // Estado para forçar a ação de impressão (mesmo se o componente já estiver renderizado)
  const [printTrigger, setPrintTrigger] = useState(0);

  if (!isOpen || !order) return null;

  const handlePrint = () => {
    // 1. Garante que o componente do cupom exista no DOM
    setShouldRenderCoupon(true);
    
    // 2. Atualiza o trigger para disparar o useEffect do PrintableCoupon
    // Isso garante que window.print() seja chamado toda vez que o botão for clicado
    setPrintTrigger(Date.now());
  };

  return (
    <>
      {/* O cupom fica renderizado invisível (display:none via CSS) esperando o comando de print */}
      {shouldRenderCoupon && <PrintableCoupon order={order} timestamp={printTrigger} />}
      
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-emerald-950/90 backdrop-blur-xl animate-in fade-in duration-300">
        <div className="bg-white rounded-[40px] w-full max-w-sm overflow-hidden shadow-2xl p-8 sm:p-10 text-center space-y-6 transform animate-in zoom-in-95 duration-500">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">PEDIDO ENVIADO!</h2>
            <p className="text-slate-500 font-bold text-sm">Seu pedido <span className="text-emerald-600">#{order.id}</span> já está no nosso sistema.</p>
          </div>

          <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Sucesso</p>
            <p className="text-xs font-bold text-slate-600 mt-1 italic">Deseja guardar seu comprovante ou confirmar agora?</p>
          </div>

          <div className="flex flex-col gap-3">
            {onSendWhatsApp && (
              <button 
                onClick={onSendWhatsApp}
                className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-black py-5 rounded-2xl shadow-xl shadow-green-100 transition-all uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 border-b-4 border-green-800 active:translate-y-1"
              >
                <span className="text-lg">💬</span> Enviar p/ WhatsApp
              </button>
            )}

            <button 
              onClick={handlePrint}
              className="w-full bg-slate-900 hover:bg-black text-white font-black py-4 rounded-2xl transition-all uppercase tracking-widest text-[10px] flex items-center justify-center gap-2"
            >
              🖨️ Imprimir Comprovante
            </button>
            
            <button 
              onClick={onClose}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-black py-4 rounded-2xl transition-all uppercase tracking-widest text-[9px]"
            >
              Voltar para o Início
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
