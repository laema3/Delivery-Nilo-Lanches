
import React, { useState } from 'react';
import { Order, OrderStatus } from '../types.ts';
import { TrackingModal } from './TrackingModal.tsx';

interface CustomerOrdersProps {
  orders: Order[];
  onBack: () => void;
  onReorder: (order: Order) => void;
}

export const CustomerOrders: React.FC<CustomerOrdersProps> = ({ orders, onBack, onReorder }) => {
  const [trackingOrder, setTrackingOrder] = useState<Order | null>(null);

  const getStatusStyle = (status: OrderStatus) => {
    switch (status) {
      case 'NOVO': return 'bg-blue-100 text-blue-600';
      case 'PREPARANDO': return 'bg-amber-100 text-amber-600';
      case 'PRONTO PARA RETIRADA': return 'bg-cyan-100 text-cyan-600';
      case 'SAIU PARA ENTREGA': return 'bg-purple-100 text-purple-600';
      case 'FINALIZADO': return 'bg-emerald-100 text-emerald-600';
      case 'CANCELADO': return 'bg-red-100 text-red-600';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 animate-fade-in text-left">
      <div className="flex items-center gap-4 mb-10">
        <button onClick={onBack} className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h2 className="text-3xl font-black text-emerald-600 tracking-tight uppercase">Meus Pedidos</h2>
          <p className="text-slate-500 font-bold text-sm">Histórico de suas delícias</p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-[40px] p-20 text-center border border-slate-100 shadow-sm">
          <span className="text-6xl mb-6 block">🍔</span>
          <p className="text-slate-400 font-black uppercase text-xs tracking-widest">Você ainda não fez nenhum pedido.</p>
          <button onClick={onBack} className="mt-8 bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all">Ver Cardápio</button>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(order => (
            <div key={order.id} className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex flex-col md:flex-row justify-between gap-6">
                <div className="space-y-4 flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black bg-slate-900 text-white px-3 py-1 rounded-lg">#{order.id.substring(0,6)}</span>
                      <span className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-wider ${getStatusStyle(order.status)}`}>
                        {order.status}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">{new Date(order.createdAt).toLocaleDateString()}</span>
                  </div>
                  
                  {order.status === 'SAIU PARA ENTREGA' && order.deliveryType === 'DELIVERY' && (
                    <button 
                      onClick={() => setTrackingOrder(order)}
                      className="w-full bg-emerald-100 hover:bg-emerald-200 text-emerald-700 p-4 rounded-2xl flex items-center justify-center gap-3 transition-all animate-pulse border border-emerald-200"
                    >
                      <span className="text-xl">🛵</span>
                      <span className="text-xs font-black uppercase tracking-widest">Acompanhar Entrega no Mapa</span>
                    </button>
                  )}

                  <div className="space-y-2">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <p className="text-sm font-bold text-slate-700">
                          <span className="text-emerald-600 font-black">{item.quantity}x</span> {item.name}
                        </p>
                        <p className="text-xs font-bold text-slate-400">R$ {(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total do Pedido</p>
                      <p className="text-xl font-black text-slate-900">R$ {order.total.toFixed(2)}</p>
                    </div>
                    <button 
                      onClick={() => onReorder(order)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-blue-100"
                    >
                      <span>🔄</span> Repetir Pedido
                    </button>
                  </div>
                </div>

                <div className="md:w-64 space-y-4">
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-2 tracking-tighter">Endereço</p>
                    <p className="text-xs font-bold text-slate-600 leading-tight">{order.customerAddress}</p>
                  </div>
                  <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                    <p className="text-[9px] font-black text-emerald-600 uppercase mb-2 tracking-tighter">Pagamento</p>
                    <p className="text-xs font-bold text-emerald-800 uppercase">{order.paymentMethod}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {trackingOrder && <TrackingModal order={trackingOrder} onClose={() => setTrackingOrder(null)} />}
    </div>
  );
};
