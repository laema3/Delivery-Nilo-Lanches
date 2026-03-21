
import React, { useState, useEffect } from 'react';
import { Order } from '../types';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

interface CustomerOrdersProps {
  orders: Order[];
  onBack: () => void;
  onReorder: (order: Order) => void;
}

export const CustomerOrders: React.FC<CustomerOrdersProps> = ({ orders, onBack, onReorder }) => {
  console.log("[CustomerOrders] Renderizado com orders:", orders);
  const [trackingOrder, setTrackingOrder] = useState<Order | null>(null);

  useEffect(() => {
    console.log(`[CustomerOrders] Renderizado com ${orders.length} pedidos:`, orders);
  }, [orders]);

  useEffect(() => {
    // Fix para ícones do Leaflet
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 animate-in fade-in">
      <div className="flex items-center gap-6 mb-12">
        <button onClick={onBack} className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:border-emerald-200 transition-all shadow-sm">←</button>
        <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tight">Meus Pedidos</h2>
      </div>

      {trackingOrder && trackingOrder.currentLocation && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white p-4 rounded-3xl w-full max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black uppercase tracking-widest">Acompanhando Entregador</h3>
              <button onClick={() => setTrackingOrder(null)} className="text-slate-400 hover:text-red-500">Fechar</button>
            </div>
            <div className="h-96 rounded-2xl overflow-hidden">
              <MapContainer center={[trackingOrder.currentLocation.lat, trackingOrder.currentLocation.lng]} zoom={15} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={[trackingOrder.currentLocation.lat, trackingOrder.currentLocation.lng]}>
                  <Popup>Entregador está aqui!</Popup>
                </Marker>
              </MapContainer>
            </div>
          </div>
        </div>
      )}

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
                {(() => {
                  console.log(`[CustomerOrders] Pedido ${order.id}: status=${order.status}, hasLocation=${!!order.currentLocation}, location=${JSON.stringify(order.currentLocation)}`);
                  return null;
                })()}
                {order.status === 'SAIU PARA ENTREGA' && order.currentLocation && (
                  <button onClick={() => setTrackingOrder(order)} className="bg-purple-600 text-white px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-purple-700 transition-colors shadow-lg shadow-purple-900/20 active:scale-95">
                    Acompanhar Entrega 📍
                  </button>
                )}
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
