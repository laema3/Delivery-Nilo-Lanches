
import React, { useState, useEffect, useRef } from 'react';
import { Order } from '../types';

interface MotoboyPortalProps {
  orders: Order[];
  motoboyName: string;
  onBack: () => void;
  onUpdateOrderStatus: (id: string, status: string, motoboyName?: string) => void;
}

export const MotoboyPortal: React.FC<MotoboyPortalProps> = ({ orders, motoboyName, onBack, onUpdateOrderStatus }) => {
  const [activeTab, setActiveTab] = useState<'PENDING' | 'COMPLETED'>('PENDING');
  const lastOrderCountRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Inicializa o áudio
  useEffect(() => {
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
  }, []);

  // Notificação sonora para novos pedidos disponíveis
  useEffect(() => {
    const availableOrders = orders.filter(o => o.status === 'PREPARANDO' && !o.motoboyName);
    
    if (availableOrders.length > lastOrderCountRef.current) {
      // Novo pedido chegou!
      if (audioRef.current) {
        audioRef.current.play().catch(e => console.log("Erro ao tocar áudio (interação do usuário necessária):", e));
      }
    }
    lastOrderCountRef.current = availableOrders.length;
  }, [orders]);

  const filteredOrders = orders.filter(o => {
    // Apenas pedidos do tipo DELIVERY aparecem para o motoboy
    if (o.deliveryType !== 'DELIVERY') return false;

    if (activeTab === 'PENDING') {
      // Mostra pedidos disponíveis (PREPARANDO, PRONTO ou SAIU PARA ENTREGA sem motoboy)
      // OU pedidos que já estão COMIGO (SAIU PARA ENTREGA com meu nome)
      const isAvailable = ['PREPARANDO', 'PRONTO PARA RETIRADA', 'SAIU PARA ENTREGA'].includes(o.status) && !o.motoboyName;
      const isMine = o.status === 'SAIU PARA ENTREGA' && o.motoboyName === motoboyName;
      
      return isAvailable || isMine;
    } else {
      // Mostra apenas pedidos FINALIZADOS por MIM
      return o.status === 'FINALIZADO' && o.motoboyName === motoboyName;
    }
  });

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 animate-in fade-in">
      <div className="flex items-center justify-between mb-12">
        <div className="flex items-center gap-6">
          <button onClick={onBack} className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:border-emerald-200 transition-all shadow-sm">←</button>
          <div>
            <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tight">Portal do Entregador</h2>
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Olá, {motoboyName} 👋</p>
          </div>
        </div>
      </div>

      <div className="flex gap-4 mb-8">
        <button onClick={() => setActiveTab('PENDING')} className={`px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest transition-all ${activeTab === 'PENDING' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}>Pendentes</button>
        <button onClick={() => setActiveTab('COMPLETED')} className={`px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest transition-all ${activeTab === 'COMPLETED' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}>Meus Finalizados</button>
      </div>

      <div className="grid gap-6">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-20 opacity-50 space-y-4">
            <span className="text-6xl">🛵</span>
            <p className="font-bold text-slate-400 uppercase tracking-widest text-sm">Nenhum pedido encontrado.</p>
          </div>
        ) : (
          filteredOrders.map(order => (
            <div key={order.id} className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm hover:shadow-lg transition-shadow relative overflow-hidden">
              <div className={`absolute top-0 left-0 w-2 h-full ${order.status === 'SAIU PARA ENTREGA' ? 'bg-purple-500' : 'bg-yellow-500'}`} />
              
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-1">{order.customerName}</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{order.customerAddress}</p>
                </div>
                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide ${order.status === 'SAIU PARA ENTREGA' ? 'bg-purple-100 text-purple-600' : 'bg-yellow-100 text-yellow-600'}`}>{order.status}</span>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.customerAddress)}`} target="_blank" rel="noopener noreferrer" className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-emerald-600 transition-colors shadow-lg shadow-slate-900/20 active:scale-95 flex items-center justify-center gap-2">
                  <span>Abrir Mapa</span>
                  <span>🗺️</span>
                </a>
                <a href={`https://wa.me/${order.customerPhone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex-1 bg-emerald-100 text-emerald-600 py-3 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-emerald-200 transition-colors flex items-center justify-center gap-2">
                  <span>WhatsApp</span>
                  <span>💬</span>
                </a>
                {(!order.motoboyName && ['PREPARANDO', 'PRONTO PARA RETIRADA', 'SAIU PARA ENTREGA'].includes(order.status)) && (
                  <button onClick={() => onUpdateOrderStatus(order.id, 'SAIU PARA ENTREGA', motoboyName)} className="flex-1 bg-purple-600 text-white py-3 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-purple-700 transition-colors shadow-lg shadow-purple-900/20 active:scale-95 flex items-center justify-center gap-2">
                    Aceitar Pedido 🛵
                  </button>
                )}
                {(order.status === 'SAIU PARA ENTREGA' && order.motoboyName === motoboyName) && (
                  <button onClick={() => onUpdateOrderStatus(order.id, 'FINALIZADO', motoboyName)} className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-900/20 active:scale-95 flex items-center justify-center gap-2">
                    Entregue ✅
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
