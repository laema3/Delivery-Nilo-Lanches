import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Product, Order, Customer, ZipRange, CategoryItem, SubCategoryItem, OrderStatus, Complement, PaymentSettings, Coupon } from '../types.ts';
import { generateProductImage } from '../services/geminiService.ts';
import { compressImage } from '../services/imageService.ts';
import { dbService } from '../services/dbService.ts';
import { AI_CONNECTED, FIREBASE_CONNECTED } from '../firebaseConfig.ts';

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
  logoUrl: string;
  onUpdateLogo: (url: string) => void;
  onAddProduct: (p: Partial<Product>) => Promise<void>;
  onDeleteProduct: (id: string) => void;
  onUpdateProduct: (p: Product) => void;
  onUpdateOrderStatus: (id: string, status: OrderStatus) => void;
  onUpdateCustomer: (id: string, updates: Partial<Customer>) => void;
  onAddCategory: (name: string) => void;
  onRemoveCategory: (id: string) => void;
  onAddSubCategory: (catId: string, name: string) => void;
  onRemoveSubCategory: (id: string) => void;
  onAddComplement: (name: string, price: number, applicableCategories?: string[]) => void;
  onToggleComplement: (id: string) => void;
  onRemoveComplement: (id: string) => void;
  onAddZipRange: (start: string, end: string, fee: number) => void;
  onRemoveZipRange: (id: string) => void;
  onAddCoupon: (code: string, discount: number, type: 'PERCENT' | 'FIXED') => void;
  onRemoveCoupon: (id: string) => void;
  paymentSettings: PaymentSettings[];
  onTogglePaymentMethod: (id: string) => void;
  onAddPaymentMethod: (name: string, type: 'ONLINE' | 'DELIVERY') => void;
  onRemovePaymentMethod: (id: string) => void;
  onUpdatePaymentSettings: (id: string, updates: Partial<PaymentSettings>) => void;
  onLogout: () => void;
  onBackToSite: () => void;
  isAudioUnlocked: boolean;
  onUnlockAudio: () => void;
}

type AdminView = 'dashboard' | 'pedidos' | 'produtos' | 'categorias' | 'subcategorias' | 'complementos' | 'cupons' | 'clientes' | 'entregas' | 'ajustes';

export const AdminPanel: React.FC<AdminPanelProps> = (props) => {
  const { 
    products, orders, customers, zipRanges, categories, subCategories, complements, coupons,
    isStoreOpen, onToggleStore, logoUrl, onUpdateLogo, onAddProduct, onDeleteProduct, 
    onUpdateOrderStatus, onAddCategory, onRemoveCategory, onAddSubCategory, onRemoveSubCategory,
    onAddComplement, onToggleComplement, onRemoveComplement, onAddZipRange, onRemoveZipRange,
    onAddCoupon, onRemoveCoupon, onLogout, onBackToSite, isAudioUnlocked, onUnlockAudio,
    paymentSettings, onTogglePaymentMethod, onUpdatePaymentSettings
  } = props;

  const [activeView, setActiveView] = useState<AdminView>('dashboard');
  const [orderFilter, setOrderFilter] = useState<OrderStatus | 'TODOS'>('NOVO');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const soundInterval = useRef<any>(null);
  
  const [newProd, setNewProd] = useState<Partial<Product>>({ name: '', price: 0, description: '', category: '', subCategory: '', image: '' });
  const [newCat, setNewCat] = useState('');
  const [newSub, setNewSub] = useState({ catId: '', name: '' });
  const [newZip, setNewZip] = useState({ start: '', end: '', fee: '' });
  const [newComp, setNewComp] = useState({ name: '', price: '', catIds: [] as string[] });
  const [newCoup, setNewCoup] = useState({ code: '', discount: '', type: 'FIXED' as 'FIXED' | 'PERCENT' });

  const sidebarItems: {id: AdminView, label: string, icon: string}[] = [
    { id: 'dashboard', label: 'Início', icon: '📊' },
    { id: 'pedidos', label: 'Pedidos', icon: '📋' },
    { id: 'produtos', label: 'Cardápio', icon: '🍔' },
    { id: 'categorias', label: 'Categorias', icon: '📁' },
    { id: 'subcategorias', label: 'Subcategorias', icon: '📑' },
    { id: 'complementos', label: 'Adicionais', icon: '➕' },
    { id: 'cupons', label: 'Cupons', icon: '🏷️' },
    { id: 'clientes', label: 'Clientes', icon: '👥' },
    { id: 'entregas', label: 'Taxas CEP', icon: '🚚' },
    { id: 'ajustes', label: 'Ajustes', icon: '⚙️' },
  ];

  const filteredOrders = useMemo(() => {
    return orderFilter === 'TODOS' ? orders : orders.filter(o => o.status === orderFilter);
  }, [orders, orderFilter]);

  const availableSubCategories = useMemo(() => {
    if (!newProd.category) return [];
    const parentCat = categories.find(c => c.name === newProd.category);
    if (!parentCat) return [];
    return subCategories.filter(s => s.categoryId === parentCat.id);
  }, [newProd.category, categories, subCategories]);

  // EFEITO PARA ALERTA SONORO DE TELEFONE ANTIGO (Old School Bell)
  useEffect(() => {
    const hasNewOrders = orders.some(o => o.status === 'NOVO');
    
    if (hasNewOrders && isAudioUnlocked) {
      if (!soundInterval.current) {
        const playOldPhoneAlert = () => {
          try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const now = ctx.currentTime;
            
            // Simula um toque duplo de telefone antigo (Trim-Trim)
            const ring = (offset: number) => {
              for(let i = 0; i < 12; i++) {
                const startTime = now + offset + (i * 0.06);
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'square';
                // Oscilação rápida entre frequências agudas para efeito metálico
                osc.frequency.setValueAtTime(i % 2 === 0 ? 1400 : 1700, startTime);
                gain.gain.setValueAtTime(0.12, startTime);
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.05);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(startTime);
                osc.stop(startTime + 0.05);
              }
            };

            ring(0);      // Primeiro toque
            ring(0.9);    // Segundo toque rápido
          } catch (e) {
            console.debug("Audio play blocked", e);
          }
        };
        playOldPhoneAlert();
        soundInterval.current = setInterval(playOldPhoneAlert, 4000);
      }
    } else {
      if (soundInterval.current) {
        clearInterval(soundInterval.current);
        soundInterval.current = null;
      }
    }
    
    return () => { if(soundInterval.current) clearInterval(soundInterval.current); };
  }, [orders, isAudioUnlocked]);

  const handlePrintOrder = (order: Order) => {
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) return;

    const itemsHtml = order.items.map(item => {
      const complements = item.selectedComplements?.map(c => `<div>+ ${c.name}</div>`).join('') || '';
      return `
        <div style="margin-bottom: 8px;">
          <div style="display: flex; justify-content: space-between; font-weight: bold;">
            <span>${item.quantity}x ${item.name.toUpperCase()}</span>
            <span>R$ ${(item.price * item.quantity).toFixed(2)}</span>
          </div>
          <div style="font-size: 10px; padding-left: 10px;">${complements}</div>
        </div>
      `;
    }).join('');

    const html = `
      <html>
        <head>
          <title>Cupom Pedido #${order.id}</title>
          <style>
            @page { margin: 0; }
            body { 
              font-family: 'Courier New', Courier, monospace; 
              width: 80mm; 
              padding: 5mm; 
              margin: 0;
              font-size: 12px;
              color: #000;
            }
            .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
            .section { border-bottom: 1px dashed #000; padding: 8px 0; }
            .bold { font-weight: bold; }
            .footer { text-align: center; margin-top: 15px; font-size: 10px; }
            .total-row { display: flex; justify-content: space-between; font-size: 14px; margin-top: 4px; }
          </style>
        </head>
        <body onload="window.print();">
          <div class="header">
            <div style="font-size: 18px; font-weight: bold;">NILO LANCHES</div>
            <div>Uberaba - MG</div>
            <div>(34) 9 9118-3728</div>
          </div>
          <div class="section">
            <div class="bold text-center">PEDIDO #${order.id}</div>
            <div>Data: ${new Date(order.createdAt).toLocaleString()}</div>
            <div>Status: ${order.status}</div>
          </div>
          <div class="section">
            <div class="bold">CLIENTE:</div>
            <div>${order.customerName.toUpperCase()}</div>
            <div>Tel: ${order.customerPhone}</div>
            <div style="margin-top: 4px;">
              <div class="bold">ENDEREÇO:</div>
              <div>${order.customerAddress.toUpperCase()}</div>
            </div>
          </div>
          <div class="section">
            <div class="bold">ITENS:</div>
            ${itemsHtml}
          </div>
          <div class="section">
            <div class="total-row"><span>Subtotal:</span> <span>R$ ${(order.total - order.deliveryFee).toFixed(2)}</span></div>
            <div class="total-row"><span>Frete:</span> <span>R$ ${order.deliveryFee.toFixed(2)}</span></div>
            <div class="total-row bold" style="font-size: 16px; margin-top: 8px;">
              <span>TOTAL:</span> <span>R$ ${order.total.toFixed(2)}</span>
            </div>
          </div>
          <div class="section">
            <div class="bold">PAGAMENTO:</div>
            <div>${order.paymentMethod.toUpperCase()}</div>
            ${order.changeFor ? `<div>Troco para: R$ ${order.changeFor.toFixed(2)}</div>` : ''}
            <div>Tipo: ${order.deliveryType}</div>
          </div>
          <div class="footer">
            Agradecemos a preferência!<br>
            www.nilolanches.com.br
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 w-full overflow-hidden">
      <aside className="w-full md:w-64 bg-slate-900 text-white flex flex-col shrink-0">
        <div className="p-8 border-b border-white/5 flex flex-col items-center">
          <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg mb-3 overflow-hidden border-2 border-white/10">
            {logoUrl ? <img src={logoUrl} className="w-full h-full object-cover" /> : <span className="text-3xl">🍔</span>}
          </div>
          <h1 className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Nilo Lanches</h1>
          
          <div className="mt-4 w-full space-y-2">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[7px] font-black uppercase tracking-widest ${AI_CONNECTED ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${AI_CONNECTED ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}></span>
              {AI_CONNECTED ? 'IA Conectada' : 'IA Desconectada'}
            </div>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[7px] font-black uppercase tracking-widest ${isAudioUnlocked ? 'bg-blue-500/10 text-blue-400' : 'bg-amber-500/10 text-amber-400'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isAudioUnlocked ? 'bg-blue-400' : 'bg-amber-400 animate-pulse'}`}></span>
              {isAudioUnlocked ? 'Alerta Sonoro: Ativo' : 'Alerta: Silenciado'}
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto no-scrollbar">
          {sidebarItems.map(item => (
            <button key={item.id} onClick={() => setActiveView(item.id)} className={`w-full text-left px-4 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center gap-3 ${activeView === item.id ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
              <span className="text-base">{item.icon}</span> {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5 space-y-2">
          {!isAudioUnlocked && <button onClick={onUnlockAudio} className="w-full py-2 bg-amber-600 text-[8px] font-bold uppercase rounded-lg">Ativar Sons</button>}
          <button onClick={onBackToSite} className="w-full py-3 bg-slate-800 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-700 transition-colors">🌐 Ver Site</button>
          <button onClick={onLogout} className="w-full py-3 text-red-400 border border-red-500/20 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-red-500/10 transition-colors">🚪 Sair</button>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-10 overflow-y-auto h-screen no-scrollbar pb-24">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{sidebarItems.find(i => i.id === activeView)?.label}</h2>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Painel Administrativo v3.8</p>
          </div>
          <button onClick={onToggleStore} className={`px-6 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all shadow-md ${isStoreOpen ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
            {isStoreOpen ? '● Loja Aberta' : '● Loja Fechada'}
          </button>
        </header>

        {activeView === 'dashboard' && (
          <div className="space-y-6 animate-fade-in">
             <div className={`p-8 rounded-[32px] border-2 flex flex-col md:flex-row items-center gap-6 ${FIREBASE_CONNECTED ? 'bg-emerald-50 border-emerald-100' : 'bg-blue-50 border-blue-100'}`}>
                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl shrink-0 ${FIREBASE_CONNECTED ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'}`}>
                  {FIREBASE_CONNECTED ? '🌍' : '💻'}
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className={`text-lg font-black uppercase tracking-tight ${FIREBASE_CONNECTED ? 'text-emerald-800' : 'text-blue-800'}`}>
                    {FIREBASE_CONNECTED ? 'Sincronização em Nuvem Ativa!' : 'Você está em Modo Local'}
                  </h3>
                  <p className={`text-xs font-medium mt-1 ${FIREBASE_CONNECTED ? 'text-emerald-600' : 'text-blue-600'}`}>
                    {FIREBASE_CONNECTED 
                      ? 'Tudo o que você cadastrar agora será visto pelos seus clientes em qualquer celular.' 
                      : 'Status: ⚠️ AGUARDANDO CONEXÃO COM O GOOGLE. O que você cadastrar agora fica salvo apenas neste aparelho.'}
                  </p>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                   <p className="text-[9px] font-black text-emerald-600 uppercase mb-1">Vendas Finalizadas</p>
                   <span className="text-3xl font-black text-slate-900">R$ {orders.filter(o => o.status === 'FINALIZADO').reduce((acc, o) => acc + o.total, 0).toFixed(2)}</span>
                </div>
                <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                   <p className="text-[9px] font-black text-blue-600 uppercase mb-1">Pedidos no Sistema</p>
                   <span className="text-3xl font-black text-slate-900">{orders.length}</span>
                </div>
                <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                   <p className="text-[9px] font-black text-purple-600 uppercase mb-1">Clientes na Base</p>
                   <span className="text-3xl font-black text-slate-900">{customers.length}</span>
                </div>
             </div>
          </div>
        )}

        {activeView === 'pedidos' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
              {['NOVO', 'PREPARANDO', 'PRONTO PARA RETIRADA', 'SAIU PARA ENTREGA', 'FINALIZADO', 'CANCELADO', 'TODOS'].map(status => (
                <button key={status} onClick={() => setOrderFilter(status as any)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${orderFilter === status ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100'}`}>
                  {status}
                </button>
              ))}
            </div>
            <div className="space-y-4">
              {filteredOrders.length === 0 ? (
                <div className="bg-white p-20 rounded-[32px] text-center border border-slate-100">
                  <p className="text-slate-400 font-black text-[10px] uppercase">Sem pedidos filtrados</p>
                </div>
              ) : (
                filteredOrders.map(order => (
                  <div key={order.id} className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between gap-6 hover:border-emerald-200 transition-all">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-red-600">#{order.id}</span>
                        <span className="text-[10px] font-bold text-slate-400">{new Date(order.createdAt).toLocaleTimeString()}</span>
                        <button 
                          onClick={() => handlePrintOrder(order)}
                          className="ml-2 bg-slate-100 hover:bg-slate-200 text-slate-600 p-1.5 rounded-lg transition-colors group"
                          title="Imprimir Cupom"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                          </svg>
                        </button>
                      </div>
                      <p className="font-black text-[11px] uppercase text-emerald-600">{order.customerName}</p>
                      <p className="text-xs text-slate-500">{order.customerAddress}</p>
                      <div className="pt-2">
                        {order.items.map((item, i) => (
                          <div key={i}>
                            <p className="text-[10px] font-bold text-slate-600">{item.quantity}x {item.name}</p>
                            {item.selectedComplements?.map((c, ci) => (
                              <p key={ci} className="text-[8px] text-slate-400 ml-4">+ {c.name}</p>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col justify-between items-end gap-4">
                      <span className="text-lg font-black text-slate-900">R$ {order.total.toFixed(2)}</span>
                      <div className="flex gap-2">
                         <select value={order.status} onChange={(e) => onUpdateOrderStatus(order.id, e.target.value as any)} className="bg-slate-50 border border-slate-200 p-2 rounded-lg text-[9px] font-black uppercase tracking-widest outline-none focus:border-emerald-500">
                          <option value="NOVO">NOVO</option>
                          <option value="PREPARANDO">PREPARANDO</option>
                          <option value="PRONTO PARA RETIRADA">PRONTO PARA RETIRADA</option>
                          <option value="SAIU PARA ENTREGA">SAIU PARA ENTREGA</option>
                          <option value="FINALIZADO">FINALIZADO</option>
                          <option value="CANCELADO">CANCELADO</option>
                        </select>
                        <button 
                          onClick={() => handlePrintOrder(order)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                        >
                          IMPRIMIR
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeView === 'produtos' && (
          <div className="space-y-8 animate-fade-in">
            <form onSubmit={async (e) => { e.preventDefault(); await onAddProduct(newProd); setNewProd({ name: '', price: 0, description: '', category: '', subCategory: '', image: '' }); }} className="bg-white p-8 rounded-[32px] border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-8 shadow-sm">
              <div className="space-y-4">
                <input value={newProd.name} onChange={e => setNewProd({...newProd, name: e.target.value})} placeholder="NOME DO LANCHE" className="w-full p-4 bg-slate-50 rounded-xl font-black text-[10px] uppercase outline-none focus:ring-2 focus:ring-emerald-500/20" required />
                <input type="number" step="0.01" value={newProd.price || ''} onChange={e => setNewProd({...newProd, price: Number(e.target.value)})} placeholder="PREÇO (R$)" className="w-full p-4 bg-slate-50 rounded-xl font-black outline-none" required />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <select value={newProd.category} onChange={e => { setNewProd({...newProd, category: e.target.value, subCategory: ''}) }} className="w-full p-4 bg-slate-50 rounded-xl font-black text-[10px] uppercase" required>
                    <option value="">CATEGORIA</option>
                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                  
                  <select 
                    value={newProd.subCategory} 
                    onChange={e => setNewProd({...newProd, subCategory: e.target.value})} 
                    className="w-full p-4 bg-slate-50 rounded-xl font-black text-[10px] uppercase disabled:opacity-40"
                    disabled={!newProd.category || availableSubCategories.length === 0}
                  >
                    <option value="">SUBCATEGORIA (OPCIONAL)</option>
                    {availableSubCategories.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                </div>

                <textarea value={newProd.description} onChange={e => setNewProd({...newProd, description: e.target.value})} placeholder="O QUE VEM NO LANCHE?" className="w-full p-4 bg-slate-50 rounded-xl font-black text-[10px] h-20 outline-none" required />
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex-1 bg-slate-50 rounded-[24px] border-2 border-dashed border-slate-200 flex items-center justify-center relative min-h-[200px] overflow-hidden group">
                  {newProd.image ? <img src={newProd.image} className="w-full h-full object-contain p-4 transition-transform group-hover:scale-105" /> : <span className="text-[10px] font-black text-slate-300 uppercase">Sem Foto</span>}
                  <button type="button" onClick={async () => { if(!newProd.name) return alert("Dê um nome ao lanche!"); setIsGeneratingImage(true); const url = await generateProductImage(newProd.name!); if(url) setNewProd({...newProd, image: url}); setIsGeneratingImage(false); }} className="absolute bottom-3 bg-white px-4 py-2 rounded-xl text-[9px] font-black uppercase text-emerald-600 shadow-md hover:bg-emerald-50 transition-colors">
                    {isGeneratingImage ? '✨ Criando...' : '✨ Foto c/ IA'}
                  </button>
                </div>
                <button type="submit" className="w-full py-5 bg-emerald-600 text-white rounded-xl font-black uppercase text-[10px] shadow-lg hover:bg-emerald-700 transition-all border-b-4 border-emerald-800">Cadastrar Lanche</button>
              </div>
            </form>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map(p => (
                <div key={p.id} className="bg-white p-4 rounded-xl border border-slate-100 flex items-center gap-4 shadow-sm group hover:border-emerald-200 transition-all">
                  <img src={p.image} className="w-12 h-12 rounded-lg object-cover bg-slate-50" />
                  <div className="flex-1 min-w-0">
                    <h5 className="font-black text-[10px] uppercase text-red-600 truncate">{p.name}</h5>
                    <p className="text-[8px] font-bold text-slate-400 uppercase truncate">
                      {p.category} {p.subCategory ? `> ${p.subCategory}` : ''}
                    </p>
                    <p className="text-emerald-600 font-black text-xs">R$ {p.price.toFixed(2)}</p>
                  </div>
                  <button onClick={() => onDeleteProduct(p.id)} className="text-red-400 p-2 hover:bg-red-50 rounded-lg">✕</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeView === 'categorias' && (
          <div className="max-w-xl space-y-6 animate-fade-in">
            <form onSubmit={(e) => { e.preventDefault(); if(newCat) { onAddCategory(newCat); setNewCat(''); } }} className="flex gap-2">
              <input value={newCat} onChange={e => setNewCat(e.target.value)} placeholder="NOME DA CATEGORIA" className="flex-1 p-4 bg-white border border-slate-200 rounded-xl font-black text-[10px] uppercase outline-none focus:border-emerald-500" />
              <button type="submit" className="bg-emerald-600 text-white px-6 py-4 rounded-xl font-black text-[10px] uppercase shadow-md">Salvar</button>
            </form>
            <div className="bg-white rounded-[24px] border border-slate-100 overflow-hidden shadow-sm">
              {categories.length === 0 ? <p className="p-8 text-center text-slate-400 font-bold uppercase text-[10px]">Sem categorias cadastradas</p> : categories.map(c => (
                <div key={c.id} className="p-4 border-b border-slate-50 flex justify-between items-center hover:bg-slate-50">
                  <span className="font-black text-[10px] uppercase tracking-widest text-slate-700">{c.name}</span>
                  <button onClick={() => onRemoveCategory(c.id)} className="text-red-400 hover:bg-red-50 p-2 rounded-lg font-bold text-[9px] uppercase">Excluir</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeView === 'subcategorias' && (
          <div className="max-w-xl space-y-6 animate-fade-in">
            <form onSubmit={(e) => { e.preventDefault(); if(newSub.catId && newSub.name) { onAddSubCategory(newSub.catId, newSub.name); setNewSub({ catId: '', name: '' }); } }} className="space-y-3">
              <select value={newSub.catId} onChange={e => setNewSub({...newSub, catId: e.target.value})} className="w-full p-4 bg-white border border-slate-200 rounded-xl font-black text-[10px] uppercase outline-none focus:border-emerald-500">
                <option value="">CATEGORIA PAI</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <div className="flex gap-2">
                <input value={newSub.name} onChange={e => setNewSub({...newSub, name: e.target.value})} placeholder="NOME DA SUB" className="flex-1 p-4 bg-white border border-slate-200 rounded-xl font-black text-[10px] uppercase outline-none focus:border-emerald-500" />
                <button type="submit" className="bg-emerald-600 text-white px-6 py-4 rounded-xl font-black text-[10px] uppercase">Salvar</button>
              </div>
            </form>
            <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden">
              {subCategories.length === 0 ? <p className="p-8 text-center text-slate-400 font-bold uppercase text-[10px]">Sem subcategorias</p> : subCategories.map(s => (
                <div key={s.id} className="p-4 border-b border-slate-50 flex justify-between items-center">
                  <div>
                    <span className="font-black text-[10px] uppercase tracking-widest text-slate-700">{s.name}</span>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Categoria: {categories.find(c => c.id === s.categoryId)?.name}</p>
                  </div>
                  <button onClick={() => onRemoveSubCategory(s.id)} className="text-red-400 hover:bg-red-50 p-2 rounded-lg font-bold text-[9px] uppercase">Excluir</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeView === 'complementos' && (
          <div className="max-w-2xl space-y-6 animate-fade-in">
            <form onSubmit={(e) => { e.preventDefault(); onAddComplement(newComp.name, Number(newComp.price), newComp.catIds); setNewComp({ name: '', price: '', catIds: [] }); }} className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input value={newComp.name} onChange={e => setNewComp({...newComp, name: e.target.value})} placeholder="EX: BACON EXTRA" className="p-4 bg-slate-50 rounded-xl font-black text-[10px] uppercase outline-none focus:border-emerald-500" required />
                <input type="number" step="0.01" value={newComp.price} onChange={e => setNewComp({...newComp, price: e.target.value})} placeholder="PREÇO" className="p-4 bg-slate-50 rounded-xl font-black outline-none" required />
              </div>
              <div className="space-y-2">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Categorias aplicáveis</p>
                <div className="flex flex-wrap gap-2">
                  {categories.map(c => (
                    <button type="button" key={c.id} onClick={() => setNewComp(prev => ({ ...prev, catIds: prev.catIds.includes(c.id) ? prev.catIds.filter(id => id !== c.id) : [...prev.catIds, c.id] }))} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${newComp.catIds.includes(c.id) ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
              <button type="submit" className="w-full bg-emerald-600 text-white py-4 rounded-xl font-black text-[10px] uppercase shadow-lg">Cadastrar Extra</button>
            </form>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {complements.map(c => (
                <div key={c.id} className="bg-white p-4 rounded-xl border border-slate-100 flex justify-between items-center shadow-sm">
                  <div className="flex-1">
                    <span className="font-black text-[10px] uppercase tracking-widest text-slate-700">{c.name}</span>
                    <p className="text-emerald-600 font-black text-[10px]">R$ {c.price.toFixed(2)}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => onToggleComplement(c.id)} className={`px-2 py-1 rounded-lg text-[8px] font-black ${c.active ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>{c.active ? 'ATIVO' : 'OFF'}</button>
                    <button onClick={() => onRemoveComplement(c.id)} className="text-red-400 hover:bg-red-50 p-1 rounded-lg">✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeView === 'cupons' && (
          <div className="max-w-xl space-y-6 animate-fade-in">
            <form onSubmit={(e) => { e.preventDefault(); onAddCoupon(newCoup.code, Number(newCoup.discount), newCoup.type); setNewCoup({ code: '', discount: '', type: 'FIXED' }); }} className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm space-y-4">
              <input value={newCoup.code} onChange={e => setNewCoup({...newCoup, code: e.target.value.toUpperCase()})} placeholder="CÓDIGO" className="w-full p-4 bg-slate-50 rounded-xl font-black text-[10px] uppercase outline-none focus:border-emerald-500" required />
              <div className="grid grid-cols-2 gap-4">
                <input type="number" value={newCoup.discount} onChange={e => setNewCoup({...newCoup, discount: e.target.value})} placeholder="VALOR" className="p-4 bg-slate-50 rounded-xl font-black outline-none" required />
                <select value={newCoup.type} onChange={e => setNewCoup({...newCoup, type: e.target.value as any})} className="p-4 bg-slate-50 rounded-xl font-black text-[10px] outline-none">
                  <option value="FIXED">R$ DESCONTO FIXO</option>
                  <option value="PERCENT">% PERCENTUAL</option>
                </select>
              </div>
              <button type="submit" className="w-full bg-emerald-600 text-white py-4 rounded-xl font-black text-[10px] uppercase">Gerar Cupom</button>
            </form>
            <div className="space-y-2">
              {coupons.map(c => (
                <div key={c.id} className="bg-white p-4 rounded-xl border border-slate-100 flex justify-between items-center shadow-sm">
                  <div>
                    <span className="font-black text-[11px] uppercase bg-slate-900 text-white px-3 py-1 rounded-lg">{c.code}</span>
                    <span className="ml-3 font-black text-[10px] text-emerald-600">{c.type === 'FIXED' ? `R$ ${c.discount.toFixed(2)}` : `${c.discount}%`} OFF</span>
                  </div>
                  <button onClick={() => onRemoveCoupon(c.id)} className="text-red-400 hover:bg-red-50 p-2 rounded-lg">✕</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeView === 'clientes' && (
          <div className="bg-white rounded-[32px] border border-slate-100 overflow-hidden shadow-sm animate-fade-in">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400">Nome</th>
                  <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400">Contato</th>
                  <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400">Pedidos</th>
                  <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400">Pontos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {customers.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-black text-[10px] uppercase text-slate-700">{c.name}</td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-500">{c.phone}</td>
                    <td className="px-6 py-4 text-xs font-black text-emerald-600">{c.totalOrders}</td>
                    <td className="px-6 py-4 text-xs font-black text-emerald-600">{c.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeView === 'entregas' && (
          <div className="max-w-xl space-y-6 animate-fade-in">
            <form onSubmit={(e) => { e.preventDefault(); onAddZipRange(newZip.start, newZip.end, Number(newZip.fee)); setNewZip({ start: '', end: '', fee: '' }); }} className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input value={newZip.start} onChange={e => setNewZip({...newZip, start: e.target.value})} placeholder="CEP INICIAL" className="p-4 bg-slate-50 rounded-xl font-black text-[10px] outline-none focus:border-emerald-500 border border-transparent" required />
                <input value={newZip.end} onChange={e => setNewZip({...newZip, end: e.target.value})} placeholder="CEP FINAL" className="p-4 bg-slate-50 rounded-xl font-black text-[10px] outline-none focus:border-emerald-500 border border-transparent" required />
              </div>
              <input type="number" step="0.01" value={newZip.fee} onChange={e => setNewZip({...newZip, fee: e.target.value})} placeholder="TAXA DE ENTREGA (R$)" className="w-full p-4 bg-slate-50 rounded-xl font-black outline-none focus:border-emerald-500 border border-transparent" required />
              <button type="submit" className="w-full bg-emerald-600 text-white py-4 rounded-xl font-black text-[10px] uppercase">Salvar Faixa</button>
            </form>
            <div className="space-y-2">
              {zipRanges.map(z => (
                <div key={z.id} className="bg-white p-4 rounded-xl border border-slate-100 flex justify-between items-center shadow-sm">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">De {z.start} até {z.end}</span>
                    <p className="text-emerald-600 font-black text-sm">Taxa: R$ {z.fee.toFixed(2)}</p>
                  </div>
                  <button onClick={() => onRemoveZipRange(z.id)} className="text-red-400 hover:bg-red-50 p-2 rounded-lg font-black text-[9px]">✕</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeView === 'ajustes' && (
          <div className="max-w-xl space-y-8 animate-fade-in">
             <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-8">
                <div className="text-center">
                  <h3 className="text-sm font-black uppercase tracking-widest mb-4">Logo da Loja</h3>
                  <div className="flex gap-6 items-center justify-center flex-col sm:flex-row">
                    <div className="w-24 h-24 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden">
                      {logoUrl ? <img src={logoUrl} className="w-full h-full object-cover" /> : <span className="text-3xl">🍔</span>}
                    </div>
                    <div className="flex-1 space-y-3 w-full">
                      <input type="file" ref={fileInputRef} onChange={async (e) => { const f = e.target.files?.[0]; if(f) { setIsUploadingLogo(true); const reader = new FileReader(); reader.onload = async (ev) => { const b64 = ev.target?.result as string; const comp = await compressImage(b64, 400, 400); onUpdateLogo(comp); setIsUploadingLogo(false); }; reader.readAsDataURL(f); } }} className="hidden" />
                      <button onClick={() => fileInputRef.current?.click()} className="w-full py-3 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md">{isUploadingLogo ? 'Processando...' : 'Alterar Logo'}</button>
                    </div>
                  </div>
                </div>
                <div className="pt-8 border-t border-slate-50 space-y-4">
                  <h3 className="text-sm font-black uppercase tracking-widest text-center">Métodos de Pagamento</h3>
                  {paymentSettings.map(p => (
                    <div key={p.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="font-black text-[10px] uppercase text-slate-700">{p.name}</span>
                      <button onClick={() => onTogglePaymentMethod(p.id)} className={`px-4 py-2 rounded-xl text-[9px] font-black transition-all ${p.enabled ? 'bg-emerald-100 text-emerald-600 border border-emerald-200' : 'bg-slate-200 text-slate-400 border border-transparent'}`}>{p.enabled ? 'ON' : 'OFF'}</button>
                    </div>
                  ))}
                </div>
             </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminPanel;