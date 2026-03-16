
import React from 'react';
import { Order } from '../types';

interface CustomerOrdersProps {
  orders: Order[];
  onBack: () => void;
  onReorder: (order: Order) => void;
}

export const CustomerOrders: React.FC<CustomerOrdersProps> = ({ orders, onBack, onReorder }) => {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 animate-in fade-in">
      <div className="flex items-center gap-6 mb-12">
        <button onClick={onBack} className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:border-emerald-200 transition-all shadow-sm">←</button>
        <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tight">Meus Pedidos</h2>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-20 opacity-50 space-y-4">
          <span className="text-6xl">📦</span>
          <p className="font-bold text-slate-400 uppercase tracking-widest text-sm">Você ainda não fez nenhum pedido.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {orders.map(order => (
            <div key={order.id} className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm hover:shadow-lg transition-shadow">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6 pb-6 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-black text-slate-400 uppercase tracking-widest">#{order.id.substring(0, 6)}</span>
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide ${
                      order.status === 'NOVO' ? 'bg-blue-100 text-blue-600' :
                      order.status === 'PREPARANDO' ? 'bg-yellow-100 text-yellow-600' :
                      order.status === 'SAIU PARA ENTREGA' ? 'bg-purple-100 text-purple-600' :
                      order.status === 'FINALIZADO' ? 'bg-emerald-100 text-emerald-600' :
                      'bg-red-100 text-red-600'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{new Date(order.createdAt).toLocaleDateString('pt-BR')} às {new Date(order.createdAt).toLocaleTimeString('pt-BR')}</p>
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">💳 {order.paymentMethod}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-emerald-600">R$ {order.total.toFixed(2)}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{order.items.length} itens</p>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm font-medium text-slate-600 border-b border-slate-50 pb-2 last:border-0">
                    <span>{item.quantity}x {item.name}</span>
                    <span className="font-bold">R$ {(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-4">
                <button onClick={() => onReorder(order)} className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-900/20 active:scale-95">
                  Repetir Pedido ↺
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
