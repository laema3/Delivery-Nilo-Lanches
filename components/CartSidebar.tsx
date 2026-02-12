
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
  isProcessing?: boolean; 
}

export const CartSidebar: React.FC<CartSidebarProps> = ({ 
  isOpen, onClose, items = [], coupons, onUpdateQuantity, onRemove, onCheckout, onAuthClick, paymentSettings, currentUser, deliveryFee = 0, isStoreOpen = true, isProcessing = false
}) => {
  const [selectedPayment, setSelectedPayment] = useState('');
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('DELIVERY');
  const [changeValue, setChangeValue] = useState<string>('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  
  // Proteção contra items nulo
  const safeItems = Array.isArray(items) ? items : [];

  const subtotal = useMemo(() => safeItems.reduce((acc, item) => acc + (item.price * item.quantity), 0), [safeItems]);
  const activeDeliveryFee = deliveryType === 'PICKUP' ? 0 : (deliveryFee || 0);

  const discountAmount = useMemo(() => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.type === 'PERCENT') return (subtotal * appliedCoupon.discount) / 100;
    return appliedCoupon.discount;
  }, [appliedCoupon, subtotal]);

  const total = subtotal + activeDeliveryFee - discountAmount;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 max-w-full flex">
        <div className="w-screen max-w-lg bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-500">
          
          {/* Header Aprimorado */}
          <div className="p-6 sm:p-8 border-b flex justify-between items-center bg-white shadow-sm z-10 relative">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase">Meu Pedido</h2>
              {currentUser && (
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-0.5">
                  {currentUser.zipCode ? `Entrega: R$ ${activeDeliveryFee.toFixed(2)}` : 'Calculando frete...'}
                </p>
              )}
            </div>
            
            <button 
              onClick={onClose} 
              className="shrink-0 text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-4 py-3 rounded-xl border border-emerald-100 hover:bg-emerald-100 transition-colors flex items-center gap-2 active:scale-95 shadow-sm"
            >
              <span>←</span> Voltar às compras
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-8 no-scrollbar bg-slate-50/50">
            {safeItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                <span className="text-6xl animate-bounce">🛍️</span>
                <p className="text-slate-400 font-black uppercase text-xs tracking-widest">Seu carrinho está vazio</p>
                <button onClick={onClose} className="text-emerald-600 font-black uppercase text-[10px] tracking-widest mt-2 border-b-2 border-emerald-600 pb-1">Voltar ao cardápio</button>
              </div>
            ) : (
              <>
                <div className="bg-slate-100 p-1.5 rounded-[24px] flex gap-1.5">
                  <button onClick={() => setDeliveryType('DELIVERY')} className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${deliveryType === 'DELIVERY' ? 'bg-white text-emerald-600 shadow-md' : 'text-slate-400'}`}>🚀 Entrega</button>
                  <button onClick={() => setDeliveryType('PICKUP')} className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${deliveryType === 'PICKUP' ? 'bg-white text-emerald-600 shadow-md' : 'text-slate-400'}`}>🏪 Retirada</button>
                </div>

                <div className="space-y-4">
                  {safeItems.map((item, idx) => (
                    <div key={`${item.id}-${idx}`} className="flex gap-4 group bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                      <div className="w-16 h-16 bg-slate-50 rounded-xl overflow-hidden shrink-0 border border-slate-100">
                        {item.image && <img src={item.image} className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <div className="flex justify-between items-start">
                          <h4 className="font-black text-slate-900 text-[11px] uppercase truncate pr-2 leading-tight">{item.name}</h4>
                          <button 
                            onClick={() => onRemove(item.id)} 
                            className="text-slate-300 hover:text-red-500 transition-colors p-1 -mt-1 -mr-1"
                            title="Excluir item"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                        {item.selectedComplements && item.selectedComplements.length > 0 && (
                          <p className="text-[9px] text-slate-400 truncate mt-0.5">
                            + {item.selectedComplements.map(c => c.name).join(', ')}
                          </p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                           <span className="text-emerald-600 font-black text-xs">R$ {(item.price * item.quantity).toFixed(2)}</span>
                           <div className="flex items-center gap-3 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                              <button 
                                onClick={() => item.quantity > 1 ? onUpdateQuantity(item.id, -1) : onRemove(item.id)} 
                                className={`font-black transition-colors w-5 h-5 flex items-center justify-center rounded-md text-[10px] ${item.quantity > 1 ? 'text-slate-400 hover:text-emerald-600 bg-white shadow-sm' : 'text-red-400 hover:text-red-600 bg-red-50'}`}
                              >
                                {item.quantity > 1 ? '-' : '×'}
                              </button>
                              <span className="text-[11px] font-black w-4 text-center">{item.quantity}</span>
                              <button 
                                onClick={() => onUpdateQuantity(item.id, 1)} 
                                className="text-slate-400 hover:text-emerald-600 bg-white shadow-sm font-black transition-colors w-5 h-5 flex items-center justify-center rounded-md text-[10px]"
                              >
                                +
                              </button>
                           </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-6 border-t border-slate-200 space-y-4">
                  <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <span>💳 Forma de Pagamento</span>
                    <span className="h-px bg-slate-200 flex-1"></span>
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {paymentSettings.filter(p => p.enabled).map(pay => (
                      <button key={pay.id} onClick={() => setSelectedPayment(pay.name)} className={`w-full p-4 rounded-xl border-2 text-left transition-all ${selectedPayment === pay.name ? 'border-emerald-500 bg-emerald-50 shadow-sm' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-tight text-slate-700">{pay.name}</span>
                          {selectedPayment === pay.name && <span className="text-emerald-600 text-xs">●</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                  {selectedPayment.toLowerCase().includes('dinheiro') && (
                    <div className="animate-in slide-in-from-top-2">
                      <input type="number" value={changeValue} onChange={e => setChangeValue(e.target.value)} placeholder="Troco para quanto? (R$)" className="w-full p-4 bg-white rounded-xl font-bold text-xs border-2 border-emerald-100 outline-none focus:border-emerald-500 transition-colors" />
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {safeItems.length > 0 && (
            <div className="p-6 sm:p-8 bg-white border-t border-slate-100 rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-20">
              <div className="space-y-1 text-slate-500 text-[10px] font-black uppercase tracking-widest px-1 mb-4">
                <div className="flex justify-between"><span>Subtotal</span><span>R$ {subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Frete</span><span>R$ {activeDeliveryFee.toFixed(2)}</span></div>
                <div className="flex justify-between text-slate-900 text-xl pt-2 font-black border-t border-dashed border-slate-200 mt-2"><span>Total</span><span className="text-emerald-600">R$ {total.toFixed(2)}</span></div>
              </div>
              <button 
                disabled={!selectedPayment || !isStoreOpen || isProcessing} 
                onClick={() => onCheckout(selectedPayment, activeDeliveryFee, discountAmount, appliedCoupon?.code || '', deliveryType, changeValue ? Number(changeValue) : undefined)} 
                className={`w-full py-5 rounded-2xl font-black uppercase text-[12px] tracking-widest transition-all shadow-xl ${(!selectedPayment || !isStoreOpen || isProcessing) ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-emerald-600 text-white border-b-4 border-emerald-800 active:scale-95 shadow-emerald-200'}`}
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
