
import React, { useEffect, useRef } from 'react';
import { Order } from '../types.ts';

interface TrackingModalProps {
  order: Order;
  onClose: () => void;
}

export const TrackingModal: React.FC<TrackingModalProps> = ({ order, onClose }) => {
  // Fix: Using any type for mapRef and markerRef to avoid 'Cannot find namespace L' errors as Leaflet is loaded via window.
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    // Inicializa o mapa assim que o modal abrir
    if (!mapRef.current && (window as any).L) {
      const L = (window as any).L;
      
      const defaultLat = -19.7472; // Centro de Uberaba aproximado
      const defaultLng = -47.9392;

      const initialLat = order.currentLocation?.lat || defaultLat;
      const initialLng = order.currentLocation?.lng || defaultLng;

      mapRef.current = L.map('delivery-map').setView([initialLat, initialLng], 15);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
      }).addTo(mapRef.current);

      const motoIcon = L.divIcon({
        html: '<div style="font-size: 30px;">🛵</div>',
        className: 'moto-icon',
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });

      markerRef.current = L.marker([initialLat, initialLng], { icon: motoIcon }).addTo(mapRef.current);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Atualiza a posição do marcador quando as coordenadas mudarem no Firebase
  useEffect(() => {
    if (markerRef.current && order.currentLocation) {
      // Fix: Used any for newPos coordinates to resolve 'Cannot find namespace L' error.
      const newPos = [order.currentLocation.lat, order.currentLocation.lng] as any;
      markerRef.current.setLatLng(newPos);
      mapRef.current?.panTo(newPos);
    }
  }, [order.currentLocation]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-[40px] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Onde está meu lanche?</h3>
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Pedido #{order.id.substring(0,4)}</p>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-50 text-slate-400 rounded-full">✕</button>
        </div>

        <div className="p-4">
          <div id="delivery-map" className="shadow-inner border border-slate-100"></div>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm border border-slate-100 animate-bounce">🛵</div>
             <div className="flex-1">
                <p className="text-sm font-black text-slate-800 uppercase">Motoboy em Movimento</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase">Seu pedido está chegando! Prepare o apetite.</p>
             </div>
          </div>
          <button onClick={onClose} className="w-full mt-6 py-4 bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl transition-all active:scale-95">Fechar Mapa</button>
        </div>
      </div>
    </div>
  );
};
