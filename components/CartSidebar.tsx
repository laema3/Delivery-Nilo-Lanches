
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
  isKioskMode?: boolean;
  deliveryFee: number;
  availableCoupons: Coupon[];
  isStoreOpen?: boolean;
  isProcessing?: boolean; 
}

export const CartSidebar: React.FC<CartSidebarProps> = ({ 
  isOpen, onClose, items = [], coupons = [], onUpdateQuantity, onRemove, onCheckout, onAuthClick, paymentSettings, currentUser, isKioskMode = false, deliveryFee = 0, isStoreOpen = true, isProcessing = false
}) => {
  const [selectedPayment, setSelectedPayment] = useState('');
  const [deliveryType, setDeliveryType] = useState<DeliveryType>(isKioskMode ? 'PICKUP' : 'DELIVERY');
  const [changeValue, setChangeValue] = useState<string>('');
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState('');
  
  const safeItems = Array.isArray(items) ? items : [];
  const subtotal = useMemo(() => safeItems.reduce((acc, item) => acc + (item.price * item.quantity), 0), [safeItems]);
  const activeDeliveryFee = (isKioskMode || deliveryType === 'PICKUP') ? 0 : (deliveryFee || 0);

  const handleApplyCoupon = () => {
    setCouponError('');
    const code = couponInput.trim().toUpperCase();
    if (!code) return;

    const found = coupons.find(c => c.code === code && c.active);
    if (found) {
      setAppliedCoupon(found);
      setCouponInput('');
    } else {
      setCouponError('Cupom inválido ou expirado');
      setAppliedCoupon(null);
    }
  };

  const handleCheckoutClick = () => {
    if (!selectedPayment) {
      alert("ESCOLHA A FORMA DE PAGAMENTO");
      return;
    }
    onCheckout(selectedPayment, activeDeliveryFee, discountAmount, appliedCoupon?.code || '', deliveryType, changeValue ? Number(changeValue) : undefined);
  };

  const discountAmount = useMemo(() => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.type === 'PERCENT') return (subtotal * appliedCoupon.discount) / 100;
    return appliedCoupon.discount;
  }, [appliedCoupon, subtotal]);

  const total = Math.max(0, subtotal + activeDeliveryFee - discountAmount);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden text-left">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 max-w-full flex">
        <div className="w-screen max-w-lg bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-500">
          
          <div className="p-6 sm:p-8 border-b flex justify-between items-center bg-white shadow-sm z-10 relative">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase">Meu Pedido</h2>
              {!isKioskMode && (
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-0.5">
                  {currentUser ? `Frete: R$ ${activeDeliveryFee.toFixed(2)}` : 'Entre para calcular frete'}
                </p>
              )}
            </div>
            <button onClick={onClose} className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-4 py-3 rounded-xl border border-emerald-100 active:scale-95">← Continuar Comprando</button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 no-scrollbar bg-slate-50/50">
            {safeItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <span className="text-6xl mb-4">🛍️</span>
                <p className="text-slate-400 font-black uppercase text-xs tracking-widest">Carrinho Vazio</p>
              </div>
            ) : (
              <>
                {!isKioskMode && (
                  <div className="bg-slate-100 p-1 rounded-2xl flex gap-1">
                    <button onClick={() => setDeliveryType('DELIVERY')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${deliveryType === 'DELIVERY' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>🚀 Entrega</button>
                    <button onClick={() => setDeliveryType('PICKUP')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${deliveryType === 'PICKUP' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>🏪 Retirada</button>
                  </div>
                )}

                <div className="space-y-3">
                  {safeItems.map((item, idx) => (
                    <div key={`${item.id}-${idx}`} className="flex gap-4 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                      <div className="w-12 h-12 bg-slate-50 rounded-lg overflow-hidden shrink-0">
                        {item.image && <img src={item.image} className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <h4 className="font-black text-slate-900 text-[10px] uppercase truncate">{item.name}</h4>
                          <button onClick={() => onRemove(item.id)} className="text-slate-300 hover:text-red-500">✕</button>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                           <span className="text-emerald-600 font-black text-xs">R$ {(item.price * item.quantity).toFixed(2)}</span>
                           <div className="flex items-center gap-2 bg-slate-50 px-2 py-1 rounded-lg">
                              <button onClick={() => onUpdateQuantity(item.id, -1)} className="font-black text-slate-400 w-4">-</button>
                              <span className="text-[10px] font-black w-4 text-center">{item.quantity}</span>
                              <button onClick={() => onUpdateQuantity(item.id, 1)} className="font-black text-slate-400 w-4">+</button>
                           </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* CAMPO DE CUPOM */}
                <div className="bg-white p-4 rounded-2xl border border-dashed border-slate-200">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Cupom de Desconto</p>
                   {appliedCoupon ? (
                     <div className="flex items-center justify-between bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                        <div>
                          <span className="text-[10px] font-black text-emerald-700 block">{appliedCoupon.code}</span>
                          <span className="text-[9px] font-bold text-emerald-600 uppercase">-{appliedCoupon.type === 'PERCENT' ? `${appliedCoupon.discount}%` : `R$ ${appliedCoupon.discount.toFixed(2)}`} Aplicado</span>
                        </div>
                        <button onClick={() => setAppliedCoupon(null)} className="text-emerald-400 font-black text-xs">✕</button>
                     </div>
                   ) : (
                     <div className="flex gap-2">
                        <input 
                          value={couponInput} 
                          onChange={e => setCouponInput(e.target.value.toUpperCase())} 
                          placeholder="CÓDIGO" 
                          className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 text-[10px] font-black outline-none focus:border-emerald-500"
                        />
                        <button onClick={handleApplyCoupon} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase">Aplicar</button>
                     </div>
                   )}
                   {couponError && <p className="text-[9px] text-red-500 font-bold mt-2 uppercase">{couponError}</p>}
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-4">
                  <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Pagamento</p>
                  <div className="grid grid-cols-1 gap-2">
                    {paymentSettings.filter(p => p.enabled).map(pay => (
                      <button key={pay.id} onClick={() => setSelectedPayment(pay.name)} className={`w-full p-4 rounded-xl border-2 text-left transition-all ${selectedPayment === pay.name ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100'}`}>
                        <span className="text-[10px] font-black uppercase text-slate-700">{pay.name}</span>
                      </button>
                    ))}
                  </div>
                  {selectedPayment.toLowerCase().includes('dinheiro') && (
                    <input type="number" value={changeValue} onChange={e => setChangeValue(e.target.value)} placeholder="Troco para quanto?" className="w-full p-4 bg-slate-50 rounded-xl font-bold text-xs border-2 border-transparent focus:border-emerald-500 outline-none" />
                  )}
                </div>
              </>
            )}
          </div>

          {safeItems.length > 0 && (
            <div className="p-6 sm:p-8 bg-white border-t border-slate-100 rounded-t-[32px] shadow-2xl">
              <div className="space-y-1 text-slate-500 text-[10px] font-black uppercase tracking-widest mb-4">
                <div className="flex justify-between"><span>Subtotal</span><span>R$ {subtotal.toFixed(2)}</span></div>
                {activeDeliveryFee > 0 && <div className="flex justify-between"><span>Entrega</span><span>R$ {activeDeliveryFee.toFixed(2)}</span></div>}
                {discountAmount > 0 && <div className="flex justify-between text-emerald-600"><span>Desconto</span><span>- R$ {discountAmount.toFixed(2)}</span></div>}
                <div className="flex justify-between text-slate-900 text-xl pt-2 font-black border-t border-dashed border-slate-200 mt-2"><span>Total</span><span className="text-emerald-600">R$ {total.toFixed(2)}</span></div>
              </div>
              <button 
                disabled={!isStoreOpen || isProcessing} 
                onClick={handleCheckoutClick} 
                className={`w-full py-5 rounded-2xl font-black uppercase text-[12px] tracking-widest transition-all shadow-xl ${(!isStoreOpen || isProcessing) ? 'bg-slate-100 text-slate-400' : 'bg-emerald-600 text-white border-b-4 border-emerald-800'}`}
              >
                {isProcessing ? 'Enviando...' : (isStoreOpen ? 'Confirmar Pedido' : 'Loja Fechada')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
