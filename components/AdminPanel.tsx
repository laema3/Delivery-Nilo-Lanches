/* 
   🛡️ PAINEL ADMINISTRATIVO - VERSÃO REFORÇADA 🛡️
   Foco: Interrupção imediata de som ao trocar status do pedido.
*/

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Product, Order, Customer, ZipRange, CategoryItem, SubCategoryItem, OrderStatus, Complement, PaymentSettings, Coupon } from '../types.ts';
import { compressImage } from '../services/imageService.ts';

const NOTIFICATION_SOUND = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
const TICK_SOUND = "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3";
const APP_VERSION = "v3.2 (GitHub Sync Ready)";

interface AdminPanelProps {
  products: Product[];
  orders: Order[];
  customers: Customer[];
  zipRanges: ZipRange[];
  categories: CategoryItem[];
  subCategories: SubCategoryItem[];
  complements: Complement[];
  coupons: Coupon[];
  isStoreOpen: boolean;
  onToggleStore: () => void;
  isKioskMode: boolean;
  onToggleKioskMode: () => void;
  logoUrl: string;
  onUpdateLogo: (url: string) => void;
  socialLinks: {
    instagram?: string;
    whatsapp?: string;
    facebook?: string;
  };
  onUpdateSocialLinks: (links: { instagram?: string; whatsapp?: string; facebook?: string }) => void;
  onAddProduct: (p: Partial<Product>) => Promise<void>;
  onDeleteProduct: (id: string) => void;
  onUpdateProduct: (p: Product) => void;
  onUpdateOrderStatus: (id: string, status: OrderStatus) => void;
  onDeleteOrder: (id: string) => void;
  onUpdateCustomer: (id: string, updates: Partial<Customer>) => void;
  onAddCategory: (name: string) => void;
  onRemoveCategory: (id: string) => void;
  onUpdateCategory: (id: string, name: string) => void;
  onAddSubCategory: (catId: string, name: string) => void;
  onUpdateSubCategory: (id: string, name: string, categoryId: string) => void;
  onRemoveSubCategory: (id: string) => void;
  onAddComplement: (name: string, price: number, applicableCategories?: string[]) => void;
  onUpdateComplement: (id: string, name: string, price: number, applicableCategories?: string[]) => void;
  onToggleComplement: (id: string) => void;
  onRemoveComplement: (id: string) => void;
  onAddZipRange: (start: string, end: string, fee: number) => void;
  onUpdateZipRange: (id: string, start: string, end: string, fee: number) => void;
  onRemoveZipRange: (id: string) => void;
  onAddCoupon: (code: string, discount: number, type: 'PERCENT' | 'FIXED') => void;
  onRemoveCoupon: (id: string) => void;
  paymentSettings: PaymentSettings[];
  onTogglePaymentMethod: (id: string) => void;
  onAddPaymentMethod: (name: string, type: 'ONLINE' | 'DELIVERY', email?: string, token?: string) => void;
  onRemovePaymentMethod: (id: string) => void;
  onUpdatePaymentSettings: (id: string, updates: Partial<PaymentSettings>) => void;
  onLogout: () => void;
  onBackToSite: () => void;
}

type AdminView = 'dashboard' | 'pedidos' | 'produtos' | 'categorias' | 'subcategorias' | 'adicionais' | 'cupons' | 'entregas' | 'clientes' | 'pagamentos' | 'ajustes';

export const AdminPanel: React.FC<AdminPanelProps> = (props) => {
  const { 
    products, orders, customers, zipRanges, categories, subCategories, complements, coupons, isStoreOpen, onToggleStore, isKioskMode, onToggleKioskMode, logoUrl, onUpdateLogo, socialLinks, onUpdateSocialLinks, onAddProduct, onDeleteProduct, 
    onUpdateProduct, onUpdateOrderStatus, onDeleteOrder, onUpdateCustomer, onAddCategory, onRemoveCategory, onUpdateCategory, onAddSubCategory, onUpdateSubCategory, onRemoveSubCategory,
    onAddComplement, onToggleComplement, onRemoveComplement, onUpdateComplement, onAddZipRange, onRemoveZipRange, onUpdateZipRange,
    onAddCoupon, onRemoveCoupon,
    onLogout, onBackToSite,
    paymentSettings, onTogglePaymentMethod, onAddPaymentMethod, onRemovePaymentMethod, onUpdatePaymentSettings
  } = props;

  const [activeView, setActiveView] = useState<AdminView>('dashboard');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [activeOrderTab, setActiveOrderTab] = useState<OrderStatus | 'TODOS'>('NOVO');
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [audioEnabled, setAudioEnabled] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const tickRef = useRef<HTMLAudioElement | null>(null);
  
  // States Formulários
  const [localInstagram, setLocalInstagram] = useState(socialLinks?.instagram || '');
  const [localWhatsapp, setLocalWhatsapp] = useState(socialLinks?.whatsapp || '');
  const [localFacebook, setLocalFacebook] = useState(socialLinks?.facebook || '');

  useEffect(() => {
    setLocalInstagram(socialLinks?.instagram || '');
    setLocalWhatsapp(socialLinks?.whatsapp || '');
    setLocalFacebook(socialLinks?.facebook || '');
  }, [socialLinks]);

  // ------------------------------------------------------------------
  // CONTROLE DE SOM (MELHORADO)
  // ------------------------------------------------------------------
  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND);
    audioRef.current.loop = true;
    tickRef.current = new Audio(TICK_SOUND);
  }, []);

  const stopAlarm = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  useEffect(() => {
    // Só toca se houver pedidos NOVO que não foram removidos localmente
    const newOrders = orders.filter(o => o.status === 'NOVO' && !deletedIds.includes(o.id));
    const hasNewOrders = newOrders.length > 0;

    if (hasNewOrders && audioEnabled) {
      if (audioRef.current && audioRef.current.paused) {
        audioRef.current.play().catch(() => setAudioEnabled(false));
      }
    } else {
      stopAlarm();
    }
  }, [orders, deletedIds, audioEnabled]);

  const handleUpdateStatus = (id: string, status: OrderStatus) => {
    stopAlarm(); // PARA O SOM NO MILISSEGUNDO DO CLIQUE
    onUpdateOrderStatus(id, status);
    if (tickRef.current) tickRef.current.play().catch(() => {});
  };

  const activeOrdersCount = orders.filter(o => o.status === 'NOVO' && !deletedIds.includes(o.id)).length;

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-emerald-500 selection:text-white">
      {/* SIDEBAR */}
      <aside className="w-full lg:w-72 bg-slate-950 flex flex-col border-r border-slate-800 shrink-0">
        <div className="p-8 border-b border-slate-800/50 flex flex-col items-center">
          <div className="w-20 h-20 bg-emerald-600 rounded-[24px] shadow-2xl shadow-emerald-900/40 flex items-center justify-center mb-4 border-2 border-white/10 group cursor-pointer overflow-hidden" onClick={onBackToSite}>
             {logoUrl ? <img src={logoUrl} className="w-full h-full object-cover" /> : <span className="text-4xl">🍔</span>}
          </div>
          <h2 className="text-xl font-black text-white uppercase tracking-tighter">NILO <span className="text-emerald-500">ADMIN</span></h2>
          <div className="flex items-center gap-2 mt-2">
            <div className={`w-2 h-2 rounded-full ${isStoreOpen ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{isStoreOpen ? 'Loja Aberta' : 'Loja Fechada'}</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto no-scrollbar">
          <NavItem active={activeView === 'dashboard'} icon="📊" label="Dashboard" onClick={() => setActiveView('dashboard')} />
          <NavItem active={activeView === 'pedidos'} icon="🛍️" label="Pedidos" onClick={() => setActiveView('pedidos')} badge={activeOrdersCount > 0 ? activeOrdersCount : undefined} />
          <div className="pt-4 pb-2 px-4 text-[10px] font-black text-slate-600 uppercase tracking-widest">Cardápio</div>
          <NavItem active={activeView === 'produtos'} icon="🍔" label="Produtos" onClick={() => setActiveView('produtos')} />
          <NavItem active={activeView === 'categorias'} icon="📁" label="Categorias" onClick={() => setActiveView('categorias')} />
          <NavItem active={activeView === 'subcategorias'} icon="🌿" label="Subcategorias" onClick={() => setActiveView('subcategorias')} />
          <NavItem active={activeView === 'adicionais'} icon="➕" label="Adicionais" onClick={() => setActiveView('adicionais')} />
          <div className="pt-4 pb-2 px-4 text-[10px] font-black text-slate-600 uppercase tracking-widest">Gestão</div>
          <NavItem active={activeView === 'cupons'} icon="🏷️" label="Cupons" onClick={() => setActiveView('cupons')} />
          <NavItem active={activeView === 'entregas'} icon="🚚" label="Taxas Frete" onClick={() => setActiveView('entregas')} />
          <NavItem active={activeView === 'clientes'} icon="👥" label="Clientes" onClick={() => setActiveView('clientes')} />
          <NavItem active={activeView === 'pagamentos'} icon="💳" label="Pagamentos" onClick={() => setActiveView('pagamentos')} />
          <NavItem active={activeView === 'ajustes'} icon="⚙️" label="Ajustes" onClick={() => setActiveView('ajustes')} />
        </nav>

        <div className="p-4 border-t border-slate-800/50 bg-slate-950/50">
           <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl text-red-400 hover:bg-red-500/10 transition-all font-black uppercase text-[10px] tracking-widest">
             🚪 <span>Sair do Painel</span>
           </button>
           <div className="mt-2 text-center text-[8px] font-bold text-slate-600 uppercase">{APP_VERSION}</div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-900 relative">
        <header className="h-20 sm:h-24 bg-slate-900 border-b border-slate-800 px-6 sm:px-10 flex items-center justify-between sticky top-0 z-20 backdrop-blur-md">
           <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3">
             <span className="p-2 bg-slate-800 rounded-lg text-lg">
               {activeView === 'dashboard' ? '📊' : activeView === 'pedidos' ? '🛍️' : '⚙️'}
             </span>
             {activeView}
           </h1>

           <div className="flex items-center gap-4">
             <button 
               onClick={() => {
                 const next = !audioEnabled;
                 setAudioEnabled(next);
                 if (!next) stopAlarm();
               }}
               className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${audioEnabled ? 'bg-emerald-600/10 text-emerald-500 border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}
             >
               {audioEnabled ? '🔔 Som Ativado' : '🔕 Som Desativado'}
             </button>
             <button onClick={onBackToSite} className="bg-slate-800 hover:bg-slate-700 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Ver Site</button>
           </div>
        </header>

        <div className="flex-1 p-6 sm:p-10 overflow-y-auto no-scrollbar scroll-smooth">
          {activeView === 'pedidos' && (
            <div className="space-y-8 animate-in fade-in duration-500">
               <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                 {['TODOS', 'NOVO', 'PREPARANDO', 'PRONTO PARA RETIRADA', 'SAIU PARA ENTREGA', 'FINALIZADO', 'CANCELADO'].map(status => (
                    <button 
                      key={status} 
                      onClick={() => setActiveOrderTab(status as any)}
                      className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border-2 ${activeOrderTab === status ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg' : 'bg-slate-800 text-slate-500 border-transparent hover:bg-slate-700'}`}
                    >
                      {status} {status !== 'TODOS' && `(${orders.filter(o => o.status === status && !deletedIds.includes(o.id)).length})`}
                    </button>
                 ))}
               </div>

               <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {orders
                    .filter(o => (activeOrderTab === 'TODOS' || o.status === activeOrderTab) && !deletedIds.includes(o.id))
                    .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map(order => (
                      <div key={order.id} className={`bg-slate-950 border-l-4 rounded-2xl overflow-hidden transition-all hover:scale-[1.01] ${order.status === 'NOVO' ? 'border-blue-500 animate-pulse shadow-[0_0_30px_rgba(59,130,246,0.1)]' : 'border-slate-800'}`}>
                        <div className="p-6 flex flex-col sm:flex-row justify-between gap-4">
                          <div className="space-y-2">
                             <div className="flex items-center gap-3">
                               <span className="text-xl font-black text-white">#{order.id.substring(0,6)}</span>
                               <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase ${
                                  order.status === 'NOVO' ? 'bg-blue-600 text-white' : 
                                  order.status === 'FINALIZADO' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                               }`}>{order.status}</span>
                             </div>
                             <div className="text-slate-400 text-xs font-bold flex items-center gap-2">
                                📅 {new Date(order.createdAt).toLocaleTimeString()} 
                                <span className="text-slate-600">|</span> 👤 {order.customerName}
                             </div>
                          </div>
                          <div className="text-right">
                             <div className="text-2xl font-black text-emerald-500">R$ {order.total.toFixed(2)}</div>
                          </div>
                        </div>

                        <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {order.status === 'NOVO' && (
                             <button onClick={() => handleUpdateStatus(order.id, 'PREPARANDO')} className="col-span-2 py-3 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase rounded-xl shadow-lg transition-all">🚀 ACEITAR PEDIDO</button>
                          )}
                          {order.status === 'PREPARANDO' && (
                             <button onClick={() => handleUpdateStatus(order.id, order.deliveryType === 'PICKUP' ? 'PRONTO PARA RETIRADA' : 'SAIU PARA ENTREGA')} className="col-span-2 py-3 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-black uppercase rounded-xl transition-all">🔥 PRONTO / SAIU</button>
                          )}
                          {(order.status === 'PRONTO PARA RETIRADA' || order.status === 'SAIU PARA ENTREGA') && (
                             <button onClick={() => handleUpdateStatus(order.id, 'FINALIZADO')} className="col-span-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase rounded-xl transition-all">🏁 FINALIZAR</button>
                          )}
                          <button onClick={() => { setSelectedOrder(order); setShowDeleteConfirm(true); }} className="py-3 bg-red-600/10 hover:bg-red-600/20 text-red-500 text-[10px] font-black uppercase rounded-xl transition-all">Deletar</button>
                          <button onClick={() => window.open(`https://wa.me/${order.customerPhone.replace(/\D/g,'')}`, '_blank')} className="py-3 bg-slate-800 text-slate-300 text-[10px] font-black uppercase rounded-xl">📞 Chat</button>
                        </div>
                      </div>
                    ))}
               </div>
            </div>
          )}
        </div>
      </main>

      {/* MODAL CONFIRMAÇÃO DELETAR PEDIDO */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm">
           <div className="bg-slate-900 border border-slate-800 p-10 rounded-[40px] max-w-md w-full text-center space-y-8 shadow-2xl">
              <div className="text-6xl">⚠️</div>
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Deletar Pedido?</h3>
              <div className="flex flex-col gap-3">
                 <button 
                    onClick={() => {
                      if (selectedOrder) {
                        setDeletedIds(prev => [...prev, selectedOrder.id]);
                        onDeleteOrder(selectedOrder.id);
                        stopAlarm();
                      }
                      setShowDeleteConfirm(false);
                    }}
                    className="w-full py-5 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl shadow-red-900/20"
                 >
                    Sim, Deletar Agora
                 </button>
                 <button onClick={() => setShowDeleteConfirm(false)} className="w-full py-4 text-slate-500 font-bold uppercase text-[10px]">Cancelar</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const NavItem: React.FC<{ active: boolean; icon: string; label: string; onClick: () => void; badge?: number }> = ({ active, icon, label, onClick, badge }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all group ${active ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-900/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}
  >
    <div className="flex items-center gap-4">
       <span className="text-lg group-hover:scale-110 transition-transform">{icon}</span>
       <span className="font-black uppercase tracking-widest text-[10px]">{label}</span>
    </div>
    {badge !== undefined && (
      <span className={`min-w-[20px] h-5 flex items-center justify-center rounded-full text-[9px] font-black px-1.5 ${active ? 'bg-white text-emerald-600' : 'bg-blue-600 text-white animate-pulse'}`}>
        {badge}
      </span>
    )}
  </button>
);