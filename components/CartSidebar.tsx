import React, { useState, useMemo } from 'react';
import { CartItem, PaymentSettings, Customer, Coupon, DeliveryType } from '../types.ts';

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  coupons: Coupon[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  onCheckout: (paymentMethod: string, fee: number, discount: number, couponCode: string, deliveryType: DeliveryType, changeFor?: number) => void;
  onAuthClick: () => void;
  paymentSettings: PaymentSettings[];
  currentUser: Customer | null;
  deliveryFee: number;
  availableCoupons: any[];
  isStoreOpen?: boolean;
}

export const CartSidebar: React.FC<CartSidebarProps> = ({ 
  isOpen, onClose, items, coupons, onUpdateQuantity, onRemove, onCheckout, onAuthClick, paymentSettings, currentUser, deliveryFee, isStoreOpen = true
}) => {
  const [selectedPayment, setSelectedPayment] = useState('');
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('DELIVERY');
  const [changeValue, setChangeValue] = useState<string>('');
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  
  const subtotal = useMemo(() => items.reduce((acc, item) => acc + (item.price * item.quantity), 0), [items]);
  const activeDeliveryFee = deliveryType === 'PICKUP' ? 0 : deliveryFee;

  const discountAmount = useMemo(() => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.type === 'PERCENT') return (subtotal * appliedCoupon.discount) / 100;
    return appliedCoupon.discount;
  }, [appliedCoupon, subtotal]);

  const total = subtotal + activeDeliveryFee - discountAmount;

  const handleApplyCoupon = () => {
    const cp = coupons.find(c => c.code.toUpperCase() === couponInput.toUpperCase() && c.active);
    if (cp) setAppliedCoupon(cp); else alert("Cupom inválido.");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 max-w-full flex">
        <div className="w-screen max-w-lg bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-500">
          <div className="p-8 sm:p-10 border-b flex justify-between items-center bg-slate-50">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Meu Pedido</h2>
              {currentUser && (
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                  CEP: {currentUser.zipCode} | Entrega: R$ {activeDeliveryFee.toFixed(2)}
                </p>
              )}
            </div>
            <button onClick={onClose} className="p-4 hover:bg-slate-100 rounded-full transition-colors text-slate-400">✕</button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 sm:p-10 space-y-8 no-scrollbar">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                <span className="text-6xl">🛍️</span>
                <p className="text-slate-400 font-black uppercase text-xs tracking-widest">Carrinho vazio</p>
              </div>
            ) : (
              <>
                <div className="bg-slate-100 p-1.5 rounded-[24px] flex gap-1.5">
                  <button onClick={() => setDeliveryType('DELIVERY')} className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${deliveryType === 'DELIVERY' ? 'bg-white text-emerald-600 shadow-md' : 'text-slate-400'}`}>🚀 Entrega</button>
                  <button onClick={() => setDeliveryType('PICKUP')} className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${deliveryType === 'PICKUP' ? 'bg-white text-emerald-600 shadow-md' : 'text-slate-400'}`}>🏪 Retirada</button>
                </div>

                {deliveryType === 'DELIVERY' && currentUser && (
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <p className="text-[9px] font-black text-emerald-600 uppercase mb-1">Entregar em:</p>
                    <p className="text-[11px] font-bold text-slate-700 leading-tight">{currentUser.address}, {currentUser.neighborhood}</p>
                  </div>
                )}

                <div className="space-y-6">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex gap-5">
                      <div className="w-14 h-14 bg-slate-50 rounded-xl overflow-hidden shrink-0">
                        <img src={item.image} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-black text-slate-900 text-[10px] uppercase truncate">{item.name}</h4>
                        <div className="flex items-center justify-between mt-2">
                           <span className="text-emerald-600 font-black text-xs">R$ {(item.price * item.quantity).toFixed(2)}</span>
                           <div className="flex items-center gap-3">
                              <button onClick={() => onUpdateQuantity(item.id, -1)} className="text-slate-400 font-bold">-</button>
                              <span className="text-[11px] font-black">{item.quantity}</span>
                              <button onClick={() => onUpdateQuantity(item.id, 1)} className="text-slate-400 font-bold">+</button>
                           </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-6 border-t border-slate-100 space-y-4">
                  <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Pagamento</p>
                  <div className="grid grid-cols-1 gap-2">
                    {paymentSettings.filter(p => p.enabled).map(pay => (
                      <button key={pay.id} onClick={() => setSelectedPayment(pay.name)} className={`w-full p-4 rounded-xl border-2 text-left transition-all ${selectedPayment === pay.name ? 'border-emerald-500 bg-emerald-50' : 'border-slate-50 bg-white'}`}>
                        <span className="text-[10px] font-black uppercase tracking-tight text-slate-600">{pay.name}</span>
                      </button>
                    ))}
                  </div>
                  {selectedPayment.toLowerCase().includes('dinheiro') && (
                    <input type="number" value={changeValue} onChange={e => setChangeValue(e.target.value)} placeholder="Troco para quanto?" className="w-full p-4 bg-slate-50 rounded-xl font-bold text-xs border border-emerald-100 outline-none" />
                  )}
                </div>
              </>
            )}
          </div>

          {items.length > 0 && (
            <div className="p-8 bg-slate-900 rounded-t-[40px] space-y-4">
              <div className="space-y-1 text-white/50 text-[10px] font-black uppercase tracking-widest px-2">
                <div className="flex justify-between"><span>Subtotal</span><span>R$ {subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Frete</span><span>R$ {activeDeliveryFee.toFixed(2)}</span></div>
                <div className="flex justify-between text-white text-xl pt-2 font-black"><span>Total</span><span className="text-emerald-400">R$ {total.toFixed(2)}</span></div>
              </div>
              <button 
                disabled={!selectedPayment || !isStoreOpen} 
                onClick={() => onCheckout(selectedPayment, activeDeliveryFee, discountAmount, appliedCoupon?.code || '', deliveryType, Number(changeValue) || undefined)} 
                className={`w-full py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${(!selectedPayment || !isStoreOpen) ? 'bg-white/10 text-white/40' : 'bg-emerald-600 text-white border-b-4 border-emerald-800'}`}
              >
                {isStoreOpen ? 'Confirmar Pedido' : 'Loja Fechada'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};