
import React, { useState, useEffect, useRef } from 'react';
import { Product, Order, Customer, ZipRange, CategoryItem, SubCategoryItem, OrderStatus, Complement, PaymentSettings, Coupon } from '../types.ts';
import { compressImage } from '../services/imageService.ts';

const NOTIFICATION_SOUND = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
const APP_VERSION = "v5.4 (Full Restore)";

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
  socialLinks: { instagram?: string; whatsapp?: string; facebook?: string; };
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

type DeleteTarget = {
  type: 'ORDER' | 'PRODUCT' | 'CATEGORY' | 'SUBCATEGORY' | 'COMPLEMENT' | 'COUPON' | 'ZIP' | 'PAYMENT';
  id: string;
  name?: string;
};

export const AdminPanel: React.FC<AdminPanelProps> = (props) => {
  // Fix: Added 'onUpdateCustomer' to the destructured props
  const { 
    products, orders, customers, zipRanges, categories, subCategories, complements, coupons, isStoreOpen, onToggleStore, isKioskMode, onToggleKioskMode,
    logoUrl, onUpdateLogo, socialLinks, onUpdateSocialLinks, onAddProduct, onDeleteProduct, onUpdateProduct, 
    onUpdateOrderStatus, onDeleteOrder, onUpdateCustomer, onAddCategory, onRemoveCategory, onUpdateCategory, onAddSubCategory, 
    onUpdateSubCategory, onRemoveSubCategory, onAddComplement, onToggleComplement, onRemoveComplement, 
    onAddZipRange, onRemoveZipRange, onAddCoupon, onRemoveCoupon, onLogout, onBackToSite, 
    paymentSettings, onTogglePaymentMethod, onAddPaymentMethod, onRemovePaymentMethod, onUpdatePaymentSettings
  } = props;

  const [activeView, setActiveView] = useState<AdminView>('dashboard');
  const [activeOrderTab, setActiveOrderTab] = useState<OrderStatus | 'TODOS'>('NOVO');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [audioEnabled, setAudioEnabled] = useState(true);
  
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null); 
  const [newProduct, setNewProduct] = useState<Partial<Product>>({ name: '', price: 0, category: '', subCategory: '', description: '', image: '', rating: 5.0 });
  const [isProcessingImg, setIsProcessingImg] = useState(false);

  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catName, setCatName] = useState('');
  
  const [editingSubCatId, setEditingSubCatId] = useState<string | null>(null);
  const [subCatName, setSubCatName] = useState('');
  const [subCatParent, setSubCatParent] = useState('');

  const [compName, setCompName] = useState('');
  const [compPrice, setCompPrice] = useState<number>(0);
  const [compCategories, setCompCategories] = useState<string[]>([]);

  const [cpCode, setCpCode] = useState('');
  const [cpDiscount, setCpDiscount] = useState<number>(0);
  const [cpType, setCpType] = useState<'PERCENT' | 'FIXED'>('PERCENT');

  const [zipStart, setZipStart] = useState('');
  const [zipEnd, setZipEnd] = useState('');
  const [zipFee, setZipFee] = useState<number>(0);

  const [payName, setPayName] = useState('');
  const [payType, setPayType] = useState<'ONLINE' | 'DELIVERY'>('DELIVERY');
  const [payEmail, setPayEmail] = useState('');
  const [payToken, setPayToken] = useState('');

  const [localInstagram, setLocalInstagram] = useState(socialLinks?.instagram || '');
  const [localWhatsapp, setLocalWhatsapp] = useState(socialLinks?.whatsapp || '');
  const [localFacebook, setLocalFacebook] = useState(socialLinks?.facebook || '');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const formTopRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalInstagram(socialLinks?.instagram || '');
    setLocalWhatsapp(socialLinks?.whatsapp || '');
    setLocalFacebook(socialLinks?.facebook || '');
  }, [socialLinks]);

  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND);
    audioRef.current.loop = true;
  }, []);

  const stopAlarm = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  useEffect(() => {
    const newOrders = orders.filter(o => o.status === 'NOVO' && !deletedIds.includes(o.id));
    const hasNewOrders = newOrders.length > 0;

    if (hasNewOrders && audioEnabled) {
      if (audioRef.current && audioRef.current.paused) {
        audioRef.current.play().catch(e => {
          console.warn("Autoplay bloqueado pelo navegador.", e);
        });
      }
    } else {
      stopAlarm();
    }
  }, [orders, deletedIds, audioEnabled]);

  const handlePrintOrder = (order: Order) => {
    const itemsHtml = order.items.map(item => `
      <div class="item-row">
        <span>${item.quantity}x ${item.name}</span>
        <span>R$ ${(item.price * item.quantity).toFixed(2)}</span>
      </div>
      ${(item.selectedComplements || []).map(c => `<div style="font-size:10px; padding-left:10px; color:#555;">+ ${c.name}</div>`).join('')}
    `).join('');

    const printContent = `
      <html>
      <head>
        <title>Cupom #${order.id.substring(0, 5)}</title>
        <style>
          body { margin: 0; padding: 0; font-family: 'Courier New', Courier, monospace; background: #fff; color: #000; }
          .coupon-content { width: 300px; margin: 0 auto; padding: 10px; font-size: 12px; line-height: 1.2; }
          .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
          .header h1 { font-size: 16px; font-weight: bold; margin: 0; }
          .header h2 { font-size: 14px; margin: 5px 0; }
          .info { border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
          .items { border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
          .item-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
          .totals { font-size: 12px; }
          .totals p { margin: 2px 0; display: flex; justify-content: space-between; }
          .total-final { font-size: 16px; font-weight: bold; margin-top: 10px; border-top: 1px solid #000; padding-top: 5px; display: flex; justify-content: space-between; }
          .footer { text-align: center; font-size: 10px; margin-top: 20px; }
          @media print { @page { margin: 0; } body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="coupon-content">
          <div class="header">
            <h1>NILO LANCHES</h1>
            <h2>Pedido #${order.id.substring(0,5)}</h2>
            <p>${new Date(order.createdAt).toLocaleString('pt-BR')}</p>
          </div>
          <div class="info">
            <p><strong>Cli:</strong> ${order.customerName}</p>
            <p><strong>Tel:</strong> ${order.customerPhone}</p>
            <p><strong>Status:</strong> ${order.status}</p>
            <p><strong>Pag:</strong> ${order.paymentMethod}</p>
            ${order.changeFor ? `<p><strong>Troco p/:</strong> R$ ${order.changeFor.toFixed(2)}</p>` : ''}
            ${order.deliveryType === 'DELIVERY' ? `<p><strong>End:</strong> ${order.customerAddress}</p>` : '<p><strong>RETIRADA NO BALCÃO</strong></p>'}
             ${order.couponCode ? `<p><strong>Cupom:</strong> ${order.couponCode}</p>` : ''}
          </div>
          <div class="items">${itemsHtml}</div>
          <div class="totals">
            <p><span>Subtotal:</span> <span>R$ ${(order.total - order.deliveryFee + (order.discountValue || 0)).toFixed(2)}</span></p>
            ${order.deliveryFee > 0 ? `<p><span>Taxa Entrega:</span> <span>R$ ${order.deliveryFee.toFixed(2)}</span></p>` : ''}
            ${order.discountValue ? `<p><span>Desconto:</span> <span>- R$ ${order.discountValue.toFixed(2)}</span></p>` : ''}
            <div class="total-final">
              <span>TOTAL:</span>
              <span>R$ ${order.total.toFixed(2)}</span>
            </div>
            ${order.changeFor ? `<p>Troco: R$ ${(order.changeFor - order.total).toFixed(2)}</p>` : ''}
          </div>
          <div class="footer">
            <p>Obrigado pela preferência!</p>
            <p>www.nilolanches.com.br</p>
          </div>
        </div>
        <script>
          window.onload = function() { window.print(); setTimeout(function() { window.close(); }, 500); }
        </script>
      </body>
      </html>
    `;

    try {
        const printWindow = window.open('', '_blank', 'width=350,height=600,menubar=no,toolbar=no,location=no,status=no,titlebar=no');
        if (printWindow) {
            printWindow.document.open();
            printWindow.document.write(printContent);
            printWindow.document.close();
        }
    } catch (e) {}
  };

  const handleRightSidebarClick = (status: OrderStatus | 'TODOS') => {
    if (selectedOrderId && status !== 'TODOS') {
      onUpdateOrderStatus(selectedOrderId, status as OrderStatus);
      const order = orders.find(o => o.id === selectedOrderId);
      if (order && order.status === 'NOVO' && status !== 'NOVO') {
        stopAlarm();
      }
      setSelectedOrderId(null);
    } else {
      setActiveOrderTab(status);
      setSelectedOrderId(null);
    }
  };

  const requestDelete = (type: DeleteTarget['type'], id: string, name?: string) => {
    setDeleteTarget({ type, id, name });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    switch (deleteTarget.type) {
      case 'ORDER':
        setDeletedIds(prev => [...prev, deleteTarget.id]);
        onDeleteOrder(deleteTarget.id);
        if (selectedOrderId === deleteTarget.id) setSelectedOrderId(null);
        stopAlarm();
        break;
      case 'PRODUCT': onDeleteProduct(deleteTarget.id); break;
      case 'CATEGORY': onRemoveCategory(deleteTarget.id); break;
      case 'SUBCATEGORY': onRemoveSubCategory(deleteTarget.id); break;
      case 'COMPLEMENT': onRemoveComplement(deleteTarget.id); break;
      case 'COUPON': onRemoveCoupon(deleteTarget.id); break;
      case 'ZIP': onRemoveZipRange(deleteTarget.id); break;
      case 'PAYMENT': onRemovePaymentMethod(deleteTarget.id); break;
    }
    setDeleteTarget(null);
  };

  const handleImageUpload = async (file: File, isLogo: boolean = false) => {
    setIsProcessingImg(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const compressed = await compressImage(base64);
        if (isLogo) onUpdateLogo(compressed);
        else setNewProduct(prev => ({ ...prev, image: compressed }));
        setIsProcessingImg(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      setIsProcessingImg(false);
    }
  };

  const handleEditProductClick = (p: Product) => {
    setEditingId(p.id);
    setNewProduct({ ...p });
    if (formTopRef.current) formTopRef.current.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSaveProduct = async () => {
    if (editingId && newProduct.name) {
      onUpdateProduct({ ...newProduct, id: editingId } as Product);
      setEditingId(null);
    } else if (newProduct.name) {
      await onAddProduct(newProduct);
    }
    setNewProduct({ name: '', price: 0, category: '', subCategory: '', description: '', image: '', rating: 5.0 });
  };

  const handleEditCategoryClick = (c: CategoryItem) => {
    setEditingCatId(c.id);
    setCatName(c.name);
    if (formTopRef.current) formTopRef.current.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSaveCategory = () => {
    if (catName) {
      if (editingCatId) {
        onUpdateCategory(editingCatId, catName);
        setEditingCatId(null);
      } else onAddCategory(catName);
      setCatName('');
    }
  };

  const handleEditSubCategoryClick = (s: SubCategoryItem) => {
    setEditingSubCatId(s.id);
    setSubCatName(s.name);
    setSubCatParent(s.categoryId);
    if (formTopRef.current) formTopRef.current.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSaveSubCategory = () => {
    if (subCatName && subCatParent) {
      if (editingSubCatId) {
        onUpdateSubCategory(editingSubCatId, subCatName, subCatParent);
        setEditingSubCatId(null);
      } else onAddSubCategory(subCatParent, subCatName);
      setSubCatName('');
    }
  };

  const activeOrdersCount = orders.filter(o => o.status === 'NOVO' && !deletedIds.includes(o.id)).length;

  const cardClass = "bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all";
  const inputClass = "w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-base text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all placeholder:text-slate-400";
  const labelClass = "text-xs font-bold uppercase text-slate-500 tracking-wider ml-1 mb-1 block";
  const buttonClass = "bg-emerald-600 text-white px-6 py-3 rounded-xl text-sm font-bold uppercase tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all active:scale-95";
  const editButtonClass = "bg-blue-600 text-white px-6 py-3 rounded-xl text-sm font-bold uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95";

  const ORDER_STATUSES: (OrderStatus | 'TODOS')[] = ['TODOS', 'NOVO', 'PREPARANDO', 'PRONTO PARA RETIRADA', 'SAIU PARA ENTREGA', 'FINALIZADO', 'CANCELADO'];

  const getStatusColorClass = (status: string) => {
    switch (status) {
      case 'NOVO': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'PREPARANDO': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'PRONTO PARA RETIRADA': return 'bg-cyan-100 text-cyan-700 border-cyan-200';
      case 'SAIU PARA ENTREGA': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'FINALIZADO': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'CANCELADO': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-emerald-200 selection:text-emerald-900">
      <aside className="w-full lg:w-72 bg-slate-950 flex flex-col border-r border-slate-800 shrink-0 z-30">
        <div className="p-8 border-b border-slate-800/50 flex flex-col items-center">
          <div className="w-24 h-24 bg-emerald-600 rounded-[24px] shadow-xl shadow-emerald-900/40 flex items-center justify-center mb-4 border-4 border-white/10 group cursor-pointer overflow-hidden relative" onClick={onBackToSite}>
             {logoUrl ? <img src={logoUrl} className="w-full h-full object-cover" alt="Logo" /> : <span className="text-5xl">🍔</span>}
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter">NILO <span className="text-emerald-500">ADMIN</span></h2>
          <div className="flex items-center gap-2 mt-2">
            <div className={`w-3 h-3 rounded-full ${isStoreOpen ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{isStoreOpen ? 'Loja Aberta' : 'Loja Fechada'}</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto no-scrollbar">
          <NavItem active={activeView === 'dashboard'} icon="📊" label="Dashboard" onClick={() => setActiveView('dashboard')} />
          <NavItem active={activeView === 'pedidos'} icon="🛍️" label="Pedidos" onClick={() => setActiveView('pedidos')} badge={activeOrdersCount > 0 ? activeOrdersCount : undefined} />
          
          <div className="pt-6 pb-2 px-4 text-xs font-black text-slate-600 uppercase tracking-widest">Cardápio</div>
          <NavItem active={activeView === 'produtos'} icon="🍔" label="Produtos" onClick={() => setActiveView('produtos')} />
          <NavItem active={activeView === 'categorias'} icon="📁" label="Categorias" onClick={() => setActiveView('categorias')} />
          <NavItem active={activeView === 'subcategorias'} icon="🌿" label="Subcategorias" onClick={() => setActiveView('subcategorias')} />
          <NavItem active={activeView === 'adicionais'} icon="➕" label="Adicionais" onClick={() => setActiveView('adicionais')} />
          
          <div className="pt-6 pb-2 px-4 text-xs font-black text-slate-600 uppercase tracking-widest">Gestão</div>
          <NavItem active={activeView === 'cupons'} icon="🏷️" label="Cupons" onClick={() => setActiveView('cupons')} />
          <NavItem active={activeView === 'entregas'} icon="🚚" label="Taxas Frete" onClick={() => setActiveView('entregas')} />
          <NavItem active={activeView === 'clientes'} icon="👥" label="Clientes" onClick={() => setActiveView('clientes')} />
          <NavItem active={activeView === 'pagamentos'} icon="💳" label="Pagamentos" onClick={() => setActiveView('pagamentos')} />
          <NavItem active={activeView === 'ajustes'} icon="⚙️" label="Ajustes" onClick={() => setActiveView('ajustes')} />
        </nav>

        <div className="p-4 border-t border-slate-800/50 bg-slate-950/50">
           <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl text-red-400 hover:bg-red-500/10 transition-all font-black uppercase text-xs tracking-widest">
             🚪 <span>Sair do Painel</span>
           </button>
           <div className="mt-2 text-center text-[10px] font-bold text-slate-600 uppercase">{APP_VERSION}</div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 relative h-screen overflow-hidden">
        <header className="h-24 bg-slate-950 border-b border-slate-800 px-8 flex items-center justify-between shrink-0 z-20 shadow-md shadow-slate-900/50">
           <div className="flex items-center gap-6">
              <h1 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                <span className="p-2.5 bg-slate-800 text-slate-200 rounded-xl text-xl border border-slate-700 shadow-sm">
                  {activeView === 'dashboard' ? '📊' : activeView === 'pedidos' ? '🛍️' : '⚙️'}
                </span>
                {activeView}
              </h1>
              <button onClick={onToggleStore} className={`hidden md:flex items-center gap-3 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${isStoreOpen ? 'bg-emerald-600/10 border-emerald-500 text-emerald-500 hover:bg-emerald-600/20' : 'bg-red-600/10 border-red-500 text-red-500 hover:bg-red-600/20'}`}>
                <div className={`w-2 h-2 rounded-full ${isStoreOpen ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                {isStoreOpen ? 'LOJA ABERTA' : 'LOJA FECHADA'}
              </button>
           </div>
           <div className="flex items-center gap-4">
             <button onClick={onBackToSite} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-900/20">Ver Site</button>
           </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 p-8 sm:p-10 overflow-y-auto no-scrollbar scroll-smooth">
            {activeView === 'dashboard' && (
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in">
                 <div className={cardClass}>
                   <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Total de Pedidos</p>
                   <p className="text-4xl font-black text-slate-800 mt-2">{orders.length}</p>
                 </div>
                 <div className={cardClass}>
                   <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Faturamento</p>
                   <p className="text-4xl font-black text-emerald-600 mt-2">R$ {orders.reduce((acc, o) => acc + o.total, 0).toFixed(2)}</p>
                 </div>
                 <div className={cardClass}>
                   <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Clientes</p>
                   <p className="text-4xl font-black text-blue-600 mt-2">{customers.length}</p>
                 </div>
                 <div className={cardClass}>
                   <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Produtos Ativos</p>
                   <p className="text-4xl font-black text-purple-600 mt-2">{products.length}</p>
                 </div>
               </div>
            )}

            {activeView === 'pedidos' && (
              <div className="animate-in fade-in duration-500">
                 <div className="grid grid-cols-1 gap-8 w-full max-w-4xl mr-auto">
                    {orders
                      .filter(o => (activeOrderTab === 'TODOS' || o.status === activeOrderTab) && !deletedIds.includes(o.id))
                      .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map(order => (
                        <div key={order.id} onClick={() => setSelectedOrderId(selectedOrderId === order.id ? null : order.id)} className={`rounded-3xl overflow-hidden transition-all shadow-sm flex flex-col md:flex-row cursor-pointer border-2 ${selectedOrderId === order.id ? 'bg-emerald-50 border-emerald-500 ring-4 ring-emerald-100 scale-[1.01] shadow-xl' : 'bg-white border-slate-200 hover:border-emerald-200 hover:shadow-lg'} ${order.status === 'NOVO' && selectedOrderId !== order.id ? 'border-l-8 border-l-blue-500' : ''}`}>
                          <div className="flex-1 p-8 flex flex-col justify-between">
                            <div className="space-y-4">
                               <div className="flex flex-wrap items-center gap-3">
                                 <span className="text-2xl font-black text-slate-800">#{order.id.substring(0,6)}</span>
                                 <div className="relative z-10">
                                   <select value={order.status} onClick={(e) => e.stopPropagation()} onChange={(e) => { const newStatus = e.target.value as OrderStatus; onUpdateOrderStatus(order.id, newStatus); if (order.status === 'NOVO' && newStatus !== 'NOVO') stopAlarm(); }} className={`appearance-none cursor-pointer pl-4 pr-10 py-2 rounded-xl text-xs font-black uppercase tracking-widest outline-none border-2 transition-all shadow-sm ${getStatusColorClass(order.status)}`}>
                                     <option value="NOVO">Novo</option>
                                     <option value="PREPARANDO">Preparando</option>
                                     <option value="PRONTO PARA RETIRADA">Pronto p/ Retirada</option>
                                     <option value="SAIU PARA ENTREGA">Saiu p/ Entrega</option>
                                     <option value="FINALIZADO">Finalizado</option>
                                     <option value="CANCELADO">Cancelado</option>
                                   </select>
                                   <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-current opacity-60">
                                     <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                   </div>
                                 </div>
                               </div>
                               <div className="text-slate-500 text-sm font-bold flex flex-wrap items-center gap-2">📅 {new Date(order.createdAt).toLocaleTimeString()} <span className="text-slate-300 mx-2">|</span> 👤 <span className="text-slate-700">{order.customerName}</span></div>
                               {order.deliveryType === 'DELIVERY' && <div className="text-xs font-medium text-slate-500 bg-slate-50 p-3 rounded-lg flex items-center gap-2"><span>📍</span> {order.customerAddress}</div>}
                            </div>
                            <div className="mt-6 pt-6 border-t border-slate-100">
                               <ul className="space-y-3">
                                {order.items.map((item, idx) => (
                                  <li key={idx} className="flex justify-between items-start text-sm">
                                    <div className="flex flex-col">
                                       <span className="font-black text-slate-700 uppercase leading-none">{item.quantity}x {item.name}</span>
                                       {item.selectedComplements?.map((c, ci) => (
                                         <span key={ci} className="text-[10px] text-emerald-600 font-bold ml-4 mt-1 block">+ {c.name}</span>
                                       ))}
                                    </div>
                                    <span className="text-slate-500 font-bold">R$ {(item.price * item.quantity).toFixed(2)}</span>
                                  </li>
                                ))}
                              </ul>
                              <div className="mt-4 pt-4 border-t border-dashed border-slate-200 flex justify-between items-end">
                                 <div>
                                   <div className="text-xs font-bold text-slate-400 uppercase">{order.paymentMethod}</div>
                                   {order.deliveryFee > 0 && <div className="text-[10px] font-bold text-slate-400 uppercase">Frete: R$ {order.deliveryFee.toFixed(2)}</div>}
                                   {order.discountValue && order.discountValue > 0 && <div className="text-[10px] font-bold text-emerald-500 uppercase">Desc: - R$ {order.discountValue.toFixed(2)}</div>}
                                 </div>
                                 <div className="text-2xl font-black text-emerald-600">Total: R$ {order.total.toFixed(2)}</div>
                              </div>
                            </div>
                          </div>
                          <div className="w-full md:w-16 bg-slate-50 border-l border-slate-200 flex flex-col items-center justify-center gap-4 py-4">
                             <button onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/${order.customerPhone.replace(/\D/g,'')}`, '_blank'); }} className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-emerald-50 text-emerald-600 shadow-sm" title="WhatsApp">📞</button>
                             <button onClick={(e) => { e.stopPropagation(); handlePrintOrder(order); }} className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 text-slate-600 shadow-sm" title="Imprimir Cupom">🖨️</button>
                             <button onClick={(e) => { e.stopPropagation(); requestDelete('ORDER', order.id, `Pedido #${order.id.substring(0,6)}`); }} className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-red-50 text-red-500 shadow-sm" title="Excluir">🗑️</button>
                          </div>
                        </div>
                      ))}
                 </div>
              </div>
            )}

            {activeView === 'produtos' && (
              <div className="space-y-8 animate-in fade-in">
                <div ref={formTopRef}></div>
                <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm space-y-6">
                   <div className="flex justify-between items-center">
                     <h3 className="text-2xl font-black text-slate-800 uppercase tracking-widest flex items-center gap-3">{editingId ? '✏️ Editando Produto' : '✨ Novo Produto'}</h3>
                     {editingId && <button onClick={() => { setEditingId(null); setNewProduct({ name: '', price: 0, category: '', subCategory: '', description: '', image: '', rating: 5.0 }); }} className="text-red-500 text-sm font-bold uppercase hover:underline">Cancelar Edição</button>}
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                     <div className="space-y-2">
                        <label className={labelClass}>Nome do Produto</label>
                        <input value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} placeholder="Ex: X-Tudo" className={inputClass} />
                     </div>
                     <div className="space-y-2">
                        <label className={labelClass}>Preço (R$)</label>
                        <input type="number" value={newProduct.price || ''} onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})} placeholder="0.00" className={inputClass} />
                     </div>
                     <div className="space-y-2">
                        <label className={labelClass}>Categoria</label>
                        <select value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} className={inputClass}>
                          <option value="">Selecione...</option>
                          {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                     </div>
                     <div className="md:col-span-3 space-y-2">
                        <label className={labelClass}>Descrição Detalhada</label>
                        <textarea rows={3} value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} className={inputClass} />
                     </div>
                     <div className="md:col-span-3 space-y-2">
                        <label className={labelClass}>Imagem do Produto (Upload)</label>
                        <div className="flex items-center gap-6 bg-slate-50 p-6 rounded-xl border border-dashed border-slate-300 hover:border-emerald-400">
                          <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], false)} className="text-sm text-slate-500 file:mr-5 file:py-3 file:px-6 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-emerald-100 file:text-emerald-700 cursor-pointer" />
                          {isProcessingImg && <span className="text-sm text-amber-500 font-bold animate-pulse">Processando...</span>}
                          {newProduct.image && <img src={newProduct.image} className="w-24 h-24 rounded-xl object-cover border-2 border-white shadow-md" />}
                        </div>
                     </div>
                   </div>
                   <div className="flex justify-end pt-6 border-t border-slate-100">
                     <button onClick={handleSaveProduct} className={`px-10 py-5 rounded-xl text-sm font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 ${editingId ? 'bg-blue-600 text-white shadow-blue-200' : 'bg-emerald-600 text-white shadow-emerald-200'}`}>{editingId ? '💾 Atualizar Produto' : '🚀 Adicionar Produto'}</button>
                   </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                   {products.map(p => (
                     <div key={p.id} className={`bg-white p-5 rounded-3xl border flex gap-5 transition-all ${editingId === p.id ? 'border-blue-500 ring-4 ring-blue-50 shadow-xl' : 'border-slate-200 shadow-sm hover:shadow-lg'}`}>
                        <div className="w-24 h-24 bg-slate-50 rounded-2xl overflow-hidden shrink-0 border border-slate-100"><img src={p.image || 'https://via.placeholder.com/150'} className="w-full h-full object-cover" /></div>
                        <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                           <div>
                             <h4 className="font-black text-slate-800 truncate text-base">{p.name}</h4>
                             <p className="text-emerald-600 text-sm font-black mt-1">R$ {p.price.toFixed(2)}</p>
                           </div>
                           <div className="flex gap-3 mt-4 justify-end">
                             <button onClick={() => handleEditProductClick(p)} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase">Editar</button>
                             <button onClick={() => requestDelete('PRODUCT', p.id, p.name)} className="px-4 py-2 bg-red-50 text-red-500 rounded-lg text-[10px] font-black uppercase">Excluir</button>
                           </div>
                        </div>
                     </div>
                   ))}
                </div>
              </div>
            )}

            {activeView === 'categorias' && (
               <div className="space-y-8 animate-in fade-in">
                 <div ref={formTopRef}></div>
                 <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm flex gap-4 items-center">
                   <div className="flex-1">
                      <label className={labelClass}>{editingCatId ? 'Editando Categoria' : 'Nova Categoria'}</label>
                      <input value={catName} onChange={e => setCatName(e.target.value)} placeholder="Ex: Lanches" className={inputClass} />
                   </div>
                   <div className="flex flex-col gap-2 mt-6">
                     <button onClick={handleSaveCategory} className={editingCatId ? editButtonClass : buttonClass}>{editingCatId ? 'Atualizar' : 'Adicionar'}</button>
                     {editingCatId && <button onClick={() => { setEditingCatId(null); setCatName(''); }} className="text-slate-400 text-[10px] font-black uppercase">Cancelar</button>}
                   </div>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                   {categories.map(c => (
                     <div key={c.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
                        <span className="font-bold text-slate-700 uppercase text-sm">{c.name}</span>
                        <div className="flex gap-2">
                           <button onClick={() => handleEditCategoryClick(c)} className="bg-blue-50 text-blue-600 text-xs font-black px-3 py-1.5 rounded-lg">Editar</button>
                           <button onClick={() => requestDelete('CATEGORY', c.id, c.name)} className="text-red-500 text-xs font-black hover:bg-red-50 px-3 py-1.5 rounded-lg">Excluir</button>
                        </div>
                     </div>
                   ))}
                 </div>
               </div>
            )}

            {activeView === 'subcategorias' && (
               <div className="space-y-8 animate-in fade-in">
                  <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm space-y-6">
                     <h3 className="text-xl font-black text-slate-800 uppercase tracking-widest">{editingSubCatId ? '✏️ Editando Subcategoria' : '🌿 Nova Subcategoria'}</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                           <label className={labelClass}>Nome da Subcategoria</label>
                           <input value={subCatName} onChange={e => setSubCatName(e.target.value)} placeholder="Ex: Artesanais, Combos" className={inputClass} />
                        </div>
                        <div className="space-y-1">
                           <label className={labelClass}>Categoria Pai</label>
                           <select value={subCatParent} onChange={e => setSubCatParent(e.target.value)} className={inputClass}>
                              <option value="">Selecione...</option>
                              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                           </select>
                        </div>
                     </div>
                     <div className="flex justify-end pt-4">
                        <button onClick={handleSaveSubCategory} className={editingSubCatId ? editButtonClass : buttonClass}>{editingSubCatId ? 'Atualizar' : 'Adicionar'}</button>
                     </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     {subCategories.map(s => (
                       <div key={s.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
                          <div>
                            <span className="font-bold text-slate-700 uppercase text-sm block">{s.name}</span>
                            <span className="text-[10px] text-slate-400 font-black uppercase">Pai: {categories.find(c => c.id === s.categoryId)?.name || 'N/A'}</span>
                          </div>
                          <div className="flex gap-2">
                             <button onClick={() => handleEditSubCategoryClick(s)} className="bg-blue-50 text-blue-600 text-xs font-black px-3 py-1.5 rounded-lg">Editar</button>
                             <button onClick={() => requestDelete('SUBCATEGORY', s.id, s.name)} className="text-red-500 text-xs font-black hover:bg-red-50 px-3 py-1.5 rounded-lg">Excluir</button>
                          </div>
                       </div>
                     ))}
                  </div>
               </div>
            )}

            {activeView === 'adicionais' && (
               <div className="space-y-8 animate-in fade-in">
                  <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm space-y-6">
                     <h3 className="text-xl font-black text-slate-800 uppercase tracking-widest">➕ Novo Adicional</h3>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <div className="space-y-1">
                           <label className={labelClass}>Nome do Adicional</label>
                           <input value={compName} onChange={e => setCompName(e.target.value)} placeholder="Ex: Bacon, Cheddar" className={inputClass} />
                        </div>
                        <div className="space-y-1">
                           <label className={labelClass}>Preço (+R$)</label>
                           <input type="number" value={compPrice || ''} onChange={e => setCompPrice(Number(e.target.value))} placeholder="0.00" className={inputClass} />
                        </div>
                        <button onClick={() => { onAddComplement(compName, compPrice, []); setCompName(''); setCompPrice(0); }} className={buttonClass}>Adicionar</button>
                     </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     {complements.map(c => (
                       <div key={c.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
                          <div>
                            <span className="font-bold text-slate-700 uppercase text-sm block">{c.name}</span>
                            <span className="text-[10px] text-emerald-600 font-black uppercase">+ R$ {c.price.toFixed(2)}</span>
                          </div>
                          <div className="flex gap-2">
                             <button onClick={() => onToggleComplement(c.id)} className={`text-xs font-black px-3 py-1.5 rounded-lg ${c.active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>{c.active ? 'Ativo' : 'Inativo'}</button>
                             <button onClick={() => requestDelete('COMPLEMENT', c.id, c.name)} className="text-red-500 text-xs font-black hover:bg-red-50 px-3 py-1.5 rounded-lg">Excluir</button>
                          </div>
                       </div>
                     ))}
                  </div>
               </div>
            )}

            {activeView === 'cupons' && (
               <div className="space-y-8 animate-in fade-in">
                  <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm space-y-6">
                     <h3 className="text-xl font-black text-slate-800 uppercase tracking-widest">🏷️ Novo Cupom</h3>
                     <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div className="space-y-1">
                           <label className={labelClass}>Código do Cupom</label>
                           <input value={cpCode} onChange={e => setCpCode(e.target.value.toUpperCase())} placeholder="Ex: NILO10" className={inputClass} />
                        </div>
                        <div className="space-y-1">
                           <label className={labelClass}>Valor do Desconto</label>
                           <input type="number" value={cpDiscount || ''} onChange={e => setCpDiscount(Number(e.target.value))} placeholder="10" className={inputClass} />
                        </div>
                        <div className="space-y-1">
                           <label className={labelClass}>Tipo</label>
                           <select value={cpType} onChange={e => setCpType(e.target.value as any)} className={inputClass}>
                              <option value="PERCENT">% Percentual</option>
                              <option value="FIXED">R$ Fixo</option>
                           </select>
                        </div>
                        <button onClick={() => { onAddCoupon(cpCode, cpDiscount, cpType); setCpCode(''); setCpDiscount(0); }} className={buttonClass}>Criar Cupom</button>
                     </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     {coupons.map(c => (
                       <div key={c.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
                          <div>
                            <span className="font-bold text-slate-700 uppercase text-sm block">{c.code}</span>
                            <span className="text-[10px] text-emerald-600 font-black uppercase">Desconto: {c.type === 'PERCENT' ? `${c.discount}%` : `R$ ${c.discount.toFixed(2)}`}</span>
                          </div>
                          <button onClick={() => requestDelete('COUPON', c.id, c.code)} className="text-red-500 text-xs font-black hover:bg-red-50 px-3 py-1.5 rounded-lg">Excluir</button>
                       </div>
                     ))}
                  </div>
               </div>
            )}

            {activeView === 'entregas' && (
               <div className="space-y-8 animate-in fade-in">
                  <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm space-y-6">
                     <h3 className="text-xl font-black text-slate-800 uppercase tracking-widest">🚚 Configurar Taxa de Frete</h3>
                     <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div className="space-y-1">
                           <label className={labelClass}>CEP Inicial (Apenas números)</label>
                           <input value={zipStart} onChange={e => setZipStart(e.target.value)} placeholder="38000000" className={inputClass} />
                        </div>
                        <div className="space-y-1">
                           <label className={labelClass}>CEP Final (Apenas números)</label>
                           <input value={zipEnd} onChange={e => setZipEnd(e.target.value)} placeholder="38099999" className={inputClass} />
                        </div>
                        <div className="space-y-1">
                           <label className={labelClass}>Taxa de Entrega (R$)</label>
                           <input type="number" value={zipFee || ''} onChange={e => setZipFee(Number(e.target.value))} placeholder="5.00" className={inputClass} />
                        </div>
                        <button onClick={() => { onAddZipRange(zipStart, zipEnd, zipFee); setZipStart(''); setZipEnd(''); setZipFee(0); }} className={buttonClass}>Salvar Faixa</button>
                     </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                     {zipRanges.map(z => (
                       <div key={z.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-8 flex-1">
                            <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Faixa de CEP</p>
                              <p className="font-bold text-slate-700 text-sm">{z.start} - {z.end}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Taxa Cobrada</p>
                              <p className="font-black text-emerald-600 text-sm">R$ {z.fee.toFixed(2)}</p>
                            </div>
                          </div>
                          <button onClick={() => requestDelete('ZIP', z.id, `${z.start}-${z.end}`)} className="text-red-500 text-xs font-black hover:bg-red-50 px-4 py-2 rounded-lg">Excluir</button>
                       </div>
                     ))}
                  </div>
               </div>
            )}

            {activeView === 'clientes' && (
               <div className="space-y-8 animate-in fade-in">
                  <div className="grid grid-cols-1 gap-4">
                     {customers.map(c => (
                       <div key={c.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                          <div className="flex-1 space-y-2">
                             <div className="flex items-center gap-3">
                                <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight">{c.name}</h4>
                                <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${c.isBlocked ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                  {c.isBlocked ? 'BLOQUEADO' : 'ATIVO'}
                                </span>
                             </div>
                             <div className="text-xs font-bold text-slate-500 flex flex-wrap gap-x-6 gap-y-1">
                                <span>📧 {c.email}</span>
                                <span>📞 {c.phone}</span>
                                <span>📍 {c.neighborhood}</span>
                                <span>🛍️ {c.totalOrders} pedidos</span>
                             </div>
                          </div>
                          <div className="flex gap-2 shrink-0">
                             <button onClick={() => onUpdateCustomer(c.id, { isBlocked: !c.isBlocked })} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${c.isBlocked ? 'bg-emerald-600 text-white' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                                {c.isBlocked ? 'Desbloquear' : 'Bloquear'}
                             </button>
                             <button onClick={() => window.open(`https://wa.me/${c.phone.replace(/\D/g,'')}`, '_blank')} className="px-4 py-2 bg-slate-50 text-slate-600 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest">WhatsApp</button>
                          </div>
                       </div>
                     ))}
                  </div>
               </div>
            )}

            {activeView === 'pagamentos' && (
               <div className="space-y-8 animate-in fade-in">
                  <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm space-y-6">
                     <h3 className="text-xl font-black text-slate-800 uppercase tracking-widest">Novo Método de Pagamento</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                        <div className="space-y-1">
                           <label className={labelClass}>Nome do Método</label>
                           <input value={payName} onChange={e => setPayName(e.target.value)} placeholder="Ex: Pix Online, PagSeguro" className={inputClass} />
                        </div>
                        <div className="space-y-1">
                           <label className={labelClass}>Tipo</label>
                           <select value={payType} onChange={e => setPayType(e.target.value as any)} className={inputClass}>
                             <option value="DELIVERY">Pagamento na Entrega</option>
                             <option value="ONLINE">Pagamento Online (App)</option>
                           </select>
                        </div>

                        {payType === 'ONLINE' && (
                          <>
                            <div className="space-y-1">
                               <label className={labelClass}>E-mail (PagSeguro)</label>
                               <input value={payEmail} onChange={e => setPayEmail(e.target.value)} placeholder="email@exemplo.com" className={inputClass} />
                            </div>
                            <div className="space-y-1">
                               <label className={labelClass}>Token (PagSeguro)</label>
                               <input value={payToken} onChange={e => setPayToken(e.target.value)} placeholder="Cole o token aqui" className={inputClass} />
                            </div>
                          </>
                        )}
                     </div>
                     <div className="flex justify-end pt-4 border-t border-slate-100">
                        <button onClick={() => { onAddPaymentMethod(payName, payType, payEmail, payToken); setPayName(''); setPayEmail(''); setPayToken(''); }} className={buttonClass}>Salvar Método</button>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                     {paymentSettings.map(p => (
                       <div key={p.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                          <div className="flex justify-between items-center">
                             <div>
                               <p className="font-black text-slate-800 text-lg uppercase">{p.name}</p>
                               <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{p.type === 'ONLINE' ? '✨ Pagamento Online' : '🚚 Na Entrega'}</p>
                             </div>
                             <div className="flex gap-3 items-center">
                                <button onClick={() => onTogglePaymentMethod(p.id)} className={`text-xs font-black px-4 py-2 rounded-xl transition-all ${p.enabled ? 'text-emerald-600 bg-emerald-50 border border-emerald-200' : 'text-slate-400 bg-slate-100 border border-slate-200'}`}>
                                  {p.enabled ? 'ATIVADO' : 'DESATIVADO'}
                                </button>
                                <button onClick={() => requestDelete('PAYMENT', p.id, p.name)} className="text-red-500 text-xs font-black hover:bg-red-50 p-2 rounded-lg">🗑️</button>
                             </div>
                          </div>

                          {p.type === 'ONLINE' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                               <div className="space-y-1">
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail Cadastrado</label>
                                  <input 
                                    defaultValue={p.email || ''} 
                                    onBlur={(e) => onUpdatePaymentSettings(p.id, { email: e.target.value })}
                                    placeholder="Não configurado" 
                                    className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-emerald-500" 
                                  />
                               </div>
                               <div className="space-y-1">
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Token Ativo</label>
                                  <input 
                                    type="password"
                                    defaultValue={p.token || ''} 
                                    onBlur={(e) => onUpdatePaymentSettings(p.id, { token: e.target.value })}
                                    placeholder="Não configurado" 
                                    className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-emerald-500" 
                                  />
                               </div>
                            </div>
                          )}
                       </div>
                     ))}
                  </div>
               </div>
            )}

            {activeView === 'ajustes' && (
               <div className="max-w-4xl space-y-12 animate-in slide-in-from-bottom-5 duration-500 pb-20">
                  <section className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm space-y-8">
                     <h3 className="text-xl font-black text-slate-800 uppercase tracking-widest flex items-center gap-3">
                       <span className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center text-xl">🏢</span>
                       Configurações Gerais
                     </h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                           <label className={labelClass}>Status da Loja</label>
                           <button onClick={onToggleStore} className={`w-full py-8 rounded-2xl flex items-center justify-center gap-4 border-2 transition-all ${isStoreOpen ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : 'bg-red-50 border-red-500 text-red-500'}`}>
                              <div className={`w-5 h-5 rounded-full ${isStoreOpen ? 'bg-emerald-500 shadow-lg' : 'bg-red-500'}`}></div>
                              <span className="font-black text-lg uppercase tracking-widest">{isStoreOpen ? 'Loja Aberta' : 'Loja Fechada'}</span>
                           </button>
                        </div>
                        <div className="space-y-3">
                           <label className={labelClass}>Modo Quiosque (Totem)</label>
                           <button onClick={onToggleKioskMode} className={`w-full py-8 rounded-2xl flex items-center justify-center gap-4 border-2 transition-all ${isKioskMode ? 'bg-purple-50 border-purple-500 text-purple-600' : 'bg-slate-50 border-slate-300 text-slate-400'}`}>
                              <span className="text-2xl">{isKioskMode ? '🤖' : '📱'}</span>
                              <span className="font-black text-lg uppercase tracking-widest">{isKioskMode ? 'Quiosque Ativado' : 'Modo Normal'}</span>
                           </button>
                        </div>
                        <div className="space-y-3 md:col-span-2">
                           <label className={labelClass}>Logo da Loja (Upload)</label>
                           <div className="flex items-center gap-6 bg-slate-50 p-6 rounded-2xl border border-dashed border-slate-300 hover:border-emerald-400">
                              <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], true)} className="text-sm text-slate-500 file:mr-5 file:py-3 file:px-6 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-emerald-100 file:text-emerald-700 cursor-pointer" />
                              {logoUrl && <img src={logoUrl} className="w-20 h-20 bg-white rounded-xl border border-slate-200 object-contain" />}
                           </div>
                        </div>
                     </div>
                  </section>

                  <section className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm space-y-8">
                     <h3 className="text-xl font-black text-slate-800 uppercase tracking-widest flex items-center gap-3">
                       <span className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center text-xl">📱</span>
                       Redes Sociais
                     </h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                           <label className={labelClass}>Instagram (URL completa)</label>
                           <input value={localInstagram} onChange={e => setLocalInstagram(e.target.value)} onBlur={() => onUpdateSocialLinks({ ...socialLinks, instagram: localInstagram })} placeholder="https://instagram.com/nilo..." className={inputClass} />
                        </div>
                        <div className="space-y-1">
                           <label className={labelClass}>WhatsApp (Número com DDD)</label>
                           <input value={localWhatsapp} onChange={e => setLocalWhatsapp(e.target.value)} onBlur={() => onUpdateSocialLinks({ ...socialLinks, whatsapp: localWhatsapp })} placeholder="5534991183728" className={inputClass} />
                        </div>
                        <div className="space-y-1">
                           <label className={labelClass}>Facebook (URL completa)</label>
                           <input value={localFacebook} onChange={e => setLocalFacebook(e.target.value)} onBlur={() => onUpdateSocialLinks({ ...socialLinks, facebook: localFacebook })} placeholder="https://facebook.com/nilo..." className={inputClass} />
                        </div>
                     </div>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">As alterações nas redes sociais são salvas automaticamente ao sair do campo.</p>
                  </section>
               </div>
            )}
          </div>

          {activeView === 'pedidos' && (
             <aside className="w-64 bg-white border-l border-slate-200 p-6 overflow-y-auto hidden lg:flex flex-col gap-2 shrink-0 z-20 shadow-[-5px_0_20px_-10px_rgba(0,0,0,0.05)]">
               <div className={`text-xs font-black uppercase tracking-widest mb-4 border-b pb-2 ${selectedOrderId ? 'text-emerald-600 border-emerald-100' : 'text-slate-400 border-slate-100'}`}>
                  {selectedOrderId ? `DEFINIR STATUS DO PEDIDO` : 'FILTRAR POR STATUS'}
               </div>
               {ORDER_STATUSES.map(status => (
                 <button key={status} onClick={() => handleRightSidebarClick(status)} disabled={selectedOrderId !== null && status === 'TODOS'} className={`w-full text-left px-5 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${selectedOrderId ? (status === 'TODOS' ? 'opacity-20 cursor-not-allowed border-transparent' : 'bg-white border-slate-200 hover:bg-emerald-50 hover:border-emerald-500 hover:text-emerald-700 hover:scale-105 shadow-sm') : (activeOrderTab === status ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-200' : 'bg-slate-50 text-slate-500 border-transparent hover:bg-slate-100 hover:text-slate-700')}`}>
                   {status} 
                   {status !== 'TODOS' && !selectedOrderId && (
                     <span className={`ml-2 px-1.5 py-0.5 rounded text-[9px] ${activeOrderTab === status ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'}`}>
                       {orders.filter(o => o.status === status && !deletedIds.includes(o.id)).length}
                     </span>
                   )}
                 </button>
               ))}
               {selectedOrderId && <button onClick={() => setSelectedOrderId(null)} className="mt-4 text-[9px] font-black uppercase text-red-400 hover:text-red-600">Cancelar Seleção X</button>}
             </aside>
          )}
        </div>
      </main>

      {deleteTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
           <div className="bg-white border border-slate-200 p-10 rounded-[40px] max-w-md w-full text-center space-y-8 shadow-2xl animate-in zoom-in-95">
              <div className="text-7xl">⚠️</div>
              <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Excluir {deleteTarget.type === 'ORDER' ? 'Pedido' : 'Item'}?</h3>
              <div className="flex flex-col gap-4">
                 <button onClick={confirmDelete} className="w-full py-6 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest text-sm rounded-2xl shadow-xl transition-all active:scale-95">Confirmar Exclusão</button>
                 <button onClick={() => setDeleteTarget(null)} className="w-full py-4 text-slate-400 font-bold uppercase text-xs hover:text-slate-600">Cancelar</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const NavItem: React.FC<{ active: boolean; icon: string; label: string; onClick: () => void; badge?: number }> = ({ active, icon, label, onClick, badge }) => (
  <button onClick={onClick} className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all group ${active ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-900/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}>
    <div className="flex items-center gap-4">
       <span className="text-xl group-hover:scale-110 transition-transform">{icon}</span>
       <span className="font-black uppercase tracking-widest text-xs">{label}</span>
    </div>
    {badge !== undefined && <span className={`min-w-[24px] h-6 flex items-center justify-center rounded-full text-[10px] font-black px-2 ${active ? 'bg-white text-emerald-600' : 'bg-blue-600 text-white animate-pulse'}`}>{badge}</span>}
  </button>
);
