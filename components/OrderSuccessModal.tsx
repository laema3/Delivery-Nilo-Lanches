
import React, { useEffect } from 'react';
import { Order } from '../types.ts';

interface OrderSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onSendWhatsApp: () => void;
  isKioskMode?: boolean;
}

export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({ isOpen, onClose, order, onSendWhatsApp, isKioskMode = false }) => {
  useEffect(() => {
    if (isOpen && isKioskMode) {
      const timer = setTimeout(() => {
        onClose();
      }, 10000); // 10 segundos para o cliente ver o número e o sistema resetar
      return () => clearTimeout(timer);
    }
  }, [isOpen, isKioskMode, onClose]);

  if (!isOpen || !order) return null;

  const handlePrint = () => {
    const itemsHtml = order.items.map(item => `
      <div class="item-row">
        <span>${item.quantity}x ${item.name}</span>
        <span>R$ ${(item.price * item.quantity).toFixed(2)}</span>
      </div>
      ${(item.selectedComplements || []).map(c => `<div style="font-size:10px; padding-left:10px; color:#555;">+ ${c.name}</div>`).join('')}
    `).join('');

    const printContent = `
      <html>
      <head>
        <title>Cupom #${order.id.substring(0, 5)}</title>
        <style>
          body { margin: 0; padding: 10px; font-family: 'Courier New', Courier, monospace; background: #fff; color: #000; width: 300px; }
          .coupon-content { width: 100%; font-size: 12px; line-height: 1.2; }
          .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
          .header h1 { font-size: 16px; font-weight: bold; margin: 0; }
          .header h2 { font-size: 14px; margin: 5px 0; }
          .info { border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
          .items { border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
          .item-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
          .totals { font-size: 12px; }
          .totals p { margin: 2px 0; display: flex; justify-content: space-between; }
          .total-final { font-size: 16px; font-weight: bold; margin-top: 10px; border-top: 1px solid #000; padding-top: 5px; display: flex; justify-content: space-between; }
          .footer { text-align: center; font-size: 10px; margin-top: 20px; }
          @media print { 
            @page { margin: 0; } 
            body { margin: 0; padding: 5px; } 
          }
        </style>
      </head>
      <body>
        <div class="coupon-content">
          <div class="header">
            <h1>NILO LANCHES</h1>
            <h2>Pedido #${order.id.substring(0,5)}</h2>
            <p>${new Date(order.createdAt).toLocaleString('pt-BR')}</p>
          </div>
          <div class="info">
            <p><strong>Cli:</strong> ${order.customerName}</p>
            <p><strong>Status:</strong> PEDIDO LOCAL</p>
            <p><strong>Pag:</strong> ${order.paymentMethod}</p>
          </div>
          <div class="items">${itemsHtml}</div>
          <div class="totals">
            <p><span>Subtotal:</span> <span>R$ ${(order.total - order.deliveryFee + (order.discountValue || 0)).toFixed(2)}</span></p>
            <div class="total-final">
              <span>TOTAL:</span>
              <span>R$ ${order.total.toFixed(2)}</span>
            </div>
          </div>
          <div class="footer">
            <p>Aguarde o seu número ser chamado!</p>
            <p>www.nilolanches.com.br</p>
          </div>
        </div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          }
        </script>
      </body>
      </html>
    `;

    try {
        const printWindow = window.open('', '_blank', 'width=350,height=600,menubar=no,toolbar=no,location=no,status=no,titlebar=no');
        if (printWindow) {
            printWindow.document.open();
            printWindow.document.write(printContent);
            printWindow.document.close();
        } else {
            alert("Bloqueio de Pop-up detectado.");
        }
    } catch (e) {
        alert("Erro ao tentar imprimir.");
    }
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-emerald-950/95 backdrop-blur-2xl animate-in fade-in duration-300">
      <div className="bg-white rounded-[40px] w-full max-w-sm overflow-hidden shadow-2xl p-8 sm:p-10 text-center space-y-6 transform animate-in zoom-in-95 duration-500">
        <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">LANCHE PEDIDO!</h2>
          <p className="text-slate-500 font-bold text-sm">Aguarde seu número no painel:</p>
          <div className="text-5xl font-black text-emerald-600 py-4 bg-emerald-50 rounded-3xl border-2 border-emerald-100">
            #{order.id.substring(0,4)}
          </div>
        </div>

        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Informação</p>
          <p className="text-xs font-bold text-slate-600 mt-1 italic">
            {isKioskMode 
              ? "Dirija-se ao caixa para realizar o pagamento (se necessário) ou aguarde seu lanche!" 
              : "Seu pedido já está com nossos chapeiros!"}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {!isKioskMode && (
            <button 
              onClick={onSendWhatsApp}
              className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-black py-5 rounded-2xl shadow-xl shadow-green-100 transition-all uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 border-b-4 border-green-800 active:translate-y-1"
            >
              <span className="text-lg">💬</span> Enviar p/ WhatsApp
            </button>
          )}

          {isKioskMode && (
             <button 
                onClick={handlePrint}
                className="w-full bg-slate-900 hover:bg-black text-white font-black py-4 rounded-2xl transition-all uppercase tracking-widest text-[10px] flex items-center justify-center gap-2"
              >
                🖨️ Imprimir Senha
              </button>
          )}
          
          <button 
            onClick={onClose}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-black py-4 rounded-2xl transition-all uppercase tracking-widest text-[9px]"
          >
            {isKioskMode ? "Fechar (Auto em 10s)" : "Voltar para o Início"}
          </button>
        </div>
      </div>
    </div>
  );
};
