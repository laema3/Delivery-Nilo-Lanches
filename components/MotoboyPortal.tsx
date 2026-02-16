
import React, { useState, useEffect } from 'react';
import { Order } from '../types.ts';
import { dbService } from '../services/dbService.ts';

interface MotoboyPortalProps {
  orders: Order[];
  onBack: () => void;
}

export const MotoboyPortal: React.FC<MotoboyPortalProps> = ({ orders, onBack }) => {
  const [activeTrackingId, setActiveTrackingId] = useState<string | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);

  const activeDeliveries = orders.filter(o => o.status === 'SAIU PARA ENTREGA' && o.deliveryType === 'DELIVERY');

  const startTracking = (orderId: string) => {
    if (activeTrackingId) stopTracking();

    if ("geolocation" in navigator) {
      const id = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          dbService.save('orders', orderId, {
            currentLocation: {
              lat: latitude,
              lng: longitude,
              timestamp: Date.now()
            }
          });
        },
        (error) => console.error("GPS Error:", error),
        // Fix: Removed 'distanceFilter' as it is not a property of the standard PositionOptions type.
        { enableHighAccuracy: true }
      );
      setWatchId(id);
      setActiveTrackingId(orderId);
    } else {
      alert("Seu celular não suporta GPS ou ele está desativado.");
    }
  };

  const stopTracking = () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setActiveTrackingId(null);
  };

  useEffect(() => {
    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [watchId]);

  return (
    <div className="max-w-xl mx-auto px-4 py-8 animate-fade-in bg-slate-50 min-h-screen">
      <header className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-3 bg-white rounded-2xl shadow-sm border border-slate-200">
           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h2 className="text-2xl font-black text-emerald-600 uppercase tracking-tight">Portal do Motoboy</h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Painel de Entregas</p>
        </div>
      </header>

      <div className="space-y-4">
        {activeDeliveries.length === 0 ? (
          <div className="bg-white p-12 rounded-[40px] text-center border-2 border-dashed border-slate-200">
            <span className="text-4xl block mb-4">🏠</span>
            <p className="text-slate-400 font-black uppercase text-xs tracking-widest">Nenhuma entrega no momento.</p>
          </div>
        ) : (
          activeDeliveries.map(order => (
            <div key={order.id} className={`bg-white p-6 rounded-[32px] border-2 transition-all ${activeTrackingId === order.id ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100'}`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-[10px] font-black bg-slate-900 text-white px-2 py-1 rounded-md">#{order.id.substring(0,6)}</span>
                  <h3 className="text-lg font-black text-slate-800 mt-2 uppercase">{order.customerName}</h3>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black text-emerald-600 block">TAXA</span>
                  <span className="font-black text-slate-900">R$ {order.deliveryFee.toFixed(2)}</span>
                </div>
              </div>

              <div className="bg-slate-100 p-4 rounded-2xl mb-6">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Endereço de Entrega</p>
                <p className="text-xs font-bold text-slate-700">{order.customerAddress}</p>
                <button 
                  onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.customerAddress)}`, '_blank')}
                  className="mt-3 text-[10px] font-black text-blue-600 uppercase flex items-center gap-1"
                >
                  🗺️ Ver no Google Maps
                </button>
              </div>

              {activeTrackingId === order.id ? (
                <button 
                  onClick={stopTracking}
                  className="w-full bg-red-500 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-red-100 border-b-4 border-red-700 active:translate-y-1"
                >
                  Finalizar Rastreio
                </button>
              ) : (
                <button 
                  onClick={() => startTracking(order.id)}
                  className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-emerald-100 border-b-4 border-emerald-800 active:translate-y-1"
                >
                  🚚 Iniciar Viagem (Ativar GPS)
                </button>
              )}
            </div>
          ))
        )}
      </div>

      <div className="mt-12 p-6 bg-slate-100 rounded-[32px] text-center">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">
          Mantenha a página aberta e o GPS ligado para que o cliente possa acompanhar sua chegada! 🛵💨
        </p>
      </div>
    </div>
  );
};
