
import React, { useState, useEffect, useRef } from 'react';
import { Product, Order, Customer, ZipRange, CategoryItem, SubCategoryItem, OrderStatus, Complement, PaymentSettings, Coupon } from '../types.ts';
import { compressImage } from '../services/imageService.ts';

const NOTIFICATION_SOUND = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
const APP_VERSION = "v5.2 (Print & Direct Status)";

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

// Tipo para o alvo da exclusão
type DeleteTarget = {
  type: 'ORDER' | 'PRODUCT' | 'CATEGORY' | 'SUBCATEGORY' | 'COMPLEMENT' | 'COUPON' | 'ZIP' | 'PAYMENT';
  id: string;
  name?: string;
};

export const AdminPanel: React.FC<AdminPanelProps> = (props) => {
  const { 
    products, orders, customers, zipRanges, categories, subCategories, complements, coupons, isStoreOpen, onToggleStore, isKioskMode, onToggleKioskMode,
    logoUrl, onUpdateLogo, socialLinks, onUpdateSocialLinks, onAddProduct, onDeleteProduct, onUpdateProduct, 
    onUpdateOrderStatus, onDeleteOrder, onAddCategory, onRemoveCategory, onUpdateCategory, onAddSubCategory, 
    onUpdateSubCategory, onRemoveSubCategory, onAddComplement, onToggleComplement, onRemoveComplement, 
    onAddZipRange, onRemoveZipRange, onAddCoupon, onRemoveCoupon, onLogout, onBackToSite, 
    paymentSettings, onTogglePaymentMethod, onAddPaymentMethod, onRemovePaymentMethod
  } = props;

  const [activeView, setActiveView] = useState<AdminView>('dashboard');
  const [activeOrderTab, setActiveOrderTab] = useState<OrderStatus | 'TODOS'>('NOVO');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null); // NOVO: Pedido Selecionado
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [audioEnabled, setAudioEnabled] = useState(true);
  
  // --- GERENCIAMENTO DE EXCLUSÃO (MODAL GENÉRICO) ---
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  // States de Formulários (Produtos)
  const [editingId, setEditingId] = useState<string | null>(null); 
  const [newProduct, setNewProduct] = useState<Partial<Product>>({ name: '', price: 0, category: '', subCategory: '', description: '', image: '', rating: 5.0 });
  const [isProcessingImg, setIsProcessingImg] = useState(false);

  // States de Formulários (Categorias/Sub)
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catName, setCatName] = useState('');
  
  const [editingSubCatId, setEditingSubCatId] = useState<string | null>(null);
  const [subCatName, setSubCatName] = useState('');
  const [subCatParent, setSubCatParent] = useState('');

  // States (Adicionais)
  const [compName, setCompName] = useState('');
  const [compPrice, setCompPrice] = useState<number>(0);
  const [compCategories, setCompCategories] = useState<string[]>([]);

  // States (Cupons)
  const [cpCode, setCpCode] = useState('');
  const [cpDiscount, setCpDiscount] = useState<number>(0);
  const [cpType, setCpType] = useState<'PERCENT' | 'FIXED'>('PERCENT');

  // States (Frete)
  const [zipStart, setZipStart] = useState('');
  const [zipEnd, setZipEnd] = useState('');
  const [zipFee, setZipFee] = useState<number>(0);

  // States (Pagamentos)
  const [payName, setPayName] = useState('');
  const [payType, setPayType] = useState<'ONLINE' | 'DELIVERY'>('DELIVERY');

  // States (Ajustes - Links)
  const [localInstagram, setLocalInstagram] = useState(socialLinks?.instagram || '');
  const [localWhatsapp, setLocalWhatsapp] = useState(socialLinks?.whatsapp || '');
  const [localFacebook, setLocalFacebook] = useState(socialLinks?.facebook || '');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const formTopRef = useRef<HTMLDivElement>(null); // Referência para rolar ao topo

  useEffect(() => {
    setLocalInstagram(socialLinks?.instagram || '');
    setLocalWhatsapp(socialLinks?.whatsapp || '');
    setLocalFacebook(socialLinks?.facebook || '');
  }, [socialLinks]);

  // --- LÓGICA DE ÁUDIO ---
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
          console.warn("Autoplay bloqueado pelo navegador. Interaja com a página.", e);
        });
      }
    } else {
      stopAlarm();
    }
  }, [orders, deletedIds, audioEnabled]);

  // --- IMPRESSÃO DE CUPOM (PARA COZINHA) ---
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
          @media print { 
            @page { margin: 0; } 
            body { margin: 0; } 
          }
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
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          }
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
        } else {
            alert("Bloqueio de Pop-up detectado. Permita pop-ups para imprimir.");
        }
    } catch (e) {
        alert("Erro ao tentar imprimir.");
    }
  };

  // --- NOVA LÓGICA DO MENU LATERAL DIREITO ---
  const handleRightSidebarClick = (status: OrderStatus | 'TODOS') => {
    if (selectedOrderId && status !== 'TODOS') {
      // MODO AÇÃO: Alterar status do pedido selecionado
      onUpdateOrderStatus(selectedOrderId, status as OrderStatus);
      
      // Se tirou de 'NOVO', para o alarme
      const order = orders.find(o => o.id === selectedOrderId);
      if (order && order.status === 'NOVO' && status !== 'NOVO') {
        stopAlarm();
      }

      setSelectedOrderId(null); // Deseleciona após ação
    } else {
      // MODO FILTRO: Apenas filtrar a lista
      setActiveOrderTab(status);
      setSelectedOrderId(null);
    }
  };

  // --- FUNÇÃO CENTRAL DE DELETE ---
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

  // --- PROCESSAMENTO DE IMAGEM ---
  const handleImageUpload = async (file: File, isLogo: boolean = false) => {
    setIsProcessingImg(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const compressed = await compressImage(base64);
        
        if (isLogo) {
          onUpdateLogo(compressed);
        } else {
          setNewProduct(prev => ({ ...prev, image: compressed }));
        }
        setIsProcessingImg(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      setIsProcessingImg(false);
      alert("Erro ao processar imagem");
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
      } else {
        onAddCategory(catName);
      }
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
      } else {
        onAddSubCategory(subCatParent, subCatName);
      }
      setSubCatName('');
    }
  };

  const activeOrdersCount = orders.filter(o => o.status === 'NOVO' && !deletedIds.includes(o.id)).length;

  // ESTILOS GERAIS
  const cardClass = "bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all";
  const inputClass = "w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-base text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all placeholder:text-slate-400";
  const labelClass = "text-xs font-bold uppercase text-slate-500 tracking-wider ml-1 mb-1 block";
  const buttonClass = "bg-emerald-600 text-white px-6 py-3 rounded-xl text-sm font-bold uppercase tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all active:scale-95";
  const editButtonClass = "bg-blue-600 text-white px-6 py-3 rounded-xl text-sm font-bold uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95";

  // Lista de status para o menu lateral
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
      {/* SIDEBAR ESQUERDA (NAVEGAÇÃO DO PAINEL) - TEMA ESCURO */}
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

      {/* ÁREA PRINCIPAL + SIDEBAR DIREITA (QUANDO EM PEDIDOS) */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 relative h-screen overflow-hidden">
        {/* CABEÇALHO - AGORA ESCURO PARA MATCH COM SIDEBAR */}
        <header className="h-24 bg-slate-950 border-b border-slate-800 px-8 flex items-center justify-between shrink-0 z-20 shadow-md shadow-slate-900/50">
           <h1 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3">
             <span className="p-2.5 bg-slate-800 text-slate-200 rounded-xl text-xl border border-slate-700 shadow-sm">
               {activeView === 'dashboard' ? '📊' : activeView === 'pedidos' ? '🛍️' : '⚙️'}
             </span>
             {activeView}
           </h1>

           <div className="flex items-center gap-4">
             {/* BOTÃO DE ÁUDIO REMOVIDO - SOM SEMPRE ATIVO */}
             <button onClick={onBackToSite} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-900/20">Ver Site</button>
           </div>
        </header>

        {/* CONTAINER FLEX PARA CONTEÚDO + SIDEBAR DIREITA */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* CONTEÚDO SCROLLÁVEL */}
          <div className="flex-1 p-8 sm:p-10 overflow-y-auto no-scrollbar scroll-smooth">
            
            {/* DASHBOARD */}
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

            {/* PEDIDOS - LISTAGEM */}
            {activeView === 'pedidos' && (
              <div className="animate-in fade-in duration-500">
                 {/* Alinhado à esquerda como solicitado */}
                 <div className="grid grid-cols-1 gap-8 w-full max-w-4xl mr-auto">
                    {orders
                      .filter(o => (activeOrderTab === 'TODOS' || o.status === activeOrderTab) && !deletedIds.includes(o.id))
                      .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map(order => (
                        <div 
                           key={order.id} 
                           onClick={() => setSelectedOrderId(selectedOrderId === order.id ? null : order.id)}
                           className={`rounded-3xl overflow-hidden transition-all shadow-sm flex flex-col md:flex-row cursor-pointer border-2 ${
                             selectedOrderId === order.id 
                             ? 'bg-emerald-50 border-emerald-500 ring-4 ring-emerald-100 scale-[1.01] shadow-xl' 
                             : 'bg-white border-slate-200 hover:border-emerald-200 hover:shadow-lg'
                           } ${order.status === 'NOVO' && selectedOrderId !== order.id ? 'border-l-8 border-l-blue-500' : ''}`}
                        >
                          {/* CONTEÚDO PRINCIPAL (ESQUERDA) */}
                          <div className="flex-1 p-8 flex flex-col justify-between">
                            <div className="space-y-4">
                               <div className="flex flex-wrap items-center gap-3">
                                 <span className="text-2xl font-black text-slate-800">#{order.id.substring(0,6)}</span>
                                 
                                 {/* SELETOR DE STATUS DIRETO NO CARD */}
                                 <div className="relative z-10">
                                   <select
                                     value={order.status}
                                     onClick={(e) => e.stopPropagation()}
                                     onChange={(e) => {
                                        const newStatus = e.target.value as OrderStatus;
                                        onUpdateOrderStatus(order.id, newStatus);
                                        // Se tirou de 'NOVO', para o alarme
                                        if (order.status === 'NOVO' && newStatus !== 'NOVO') {
                                          stopAlarm();
                                        }
                                     }}
                                     className={`appearance-none cursor-pointer pl-4 pr-10 py-2 rounded-xl text-xs font-black uppercase tracking-widest outline-none border-2 transition-all shadow-sm ${getStatusColorClass(order.status)}`}
                                   >
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
                               <div className="text-slate-500 text-sm font-bold flex flex-wrap items-center gap-2">
                                  📅 {new Date(order.createdAt).toLocaleTimeString()} 
                                  <span className="text-slate-300 mx-2">|</span> 
                                  👤 <span className="text-slate-700">{order.customerName}</span>
                               </div>
                               {order.deliveryType === 'DELIVERY' && (
                                 <div className="text-xs font-medium text-slate-500 bg-slate-50 p-3 rounded-lg flex items-center gap-2">
                                    <span>📍</span> {order.customerAddress}
                                 </div>
                               )}
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

                          {/* AÇÕES RAPIDAS */}
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

            {/* OUTRAS VIEWS (PRODUTOS, ETC) */}
            {activeView === 'produtos' && (
              <div className="space-y-8 animate-in fade-in">
                <div ref={formTopRef}></div>

                {/* Formulário de Adição/Edição */}
                <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm space-y-6">
                   <div className="flex justify-between items-center">
                     <h3 className="text-2xl font-black text-slate-800 uppercase tracking-widest flex items-center gap-3">
                        {editingId ? '✏️ Editando Produto' : '✨ Novo Produto'}
                     </h3>
                     {editingId && (
                       <button onClick={() => { setEditingId(null); setNewProduct({ name: '', price: 0, category: '', subCategory: '', description: '', image: '', rating: 5.0 }); }} className="text-red-500 text-sm font-bold uppercase hover:underline">Cancelar Edição</button>
                     )}
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                     <div className="space-y-2">
                        <label className={labelClass}>Nome do Produto</label>
                        <input value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} placeholder="Ex: X-Tudo Completo" className={inputClass} />
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
                        <textarea rows={3} value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} placeholder="Ingredientes, modo de preparo..." className={inputClass} />
                     </div>

                     <div className="md:col-span-3 space-y-2">
                        <label className={labelClass}>Imagem do Produto (Upload)</label>
                        <div className="flex items-center gap-6 bg-slate-50 p-6 rounded-xl border border-dashed border-slate-300 hover:border-emerald-400 transition-colors">
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], false)} 
                            className="text-sm text-slate-500 file:mr-5 file:py-3 file:px-6 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-emerald-100 file:text-emerald-700 hover:file:bg-emerald-200 cursor-pointer" 
                          />
                          {isProcessingImg && <span className="text-sm text-amber-500 font-bold animate-pulse">Processando...</span>}
                          {newProduct.image && (
                            <div className="relative group w-24 h-24">
                              <img src={newProduct.image} className="w-full h-full rounded-xl object-cover border-2 border-white shadow-md" alt="Preview" />
                            </div>
                          )}
                        </div>
                     </div>
                   </div>

                   <div className="flex justify-end pt-6 border-t border-slate-100">
                     <button 
                        onClick={handleSaveProduct} 
                        className={`px-10 py-5 rounded-xl text-sm font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 ${editingId ? 'bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700' : 'bg-emerald-600 text-white shadow-emerald-200 hover:bg-emerald-700'}`}
                     >
                       {editingId ? '💾 Atualizar Produto' : '🚀 Adicionar Produto'}
                     </button>
                   </div>
                </div>

                {/* Lista de Produtos */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                   {products.map(p => (
                     <div key={p.id} className={`bg-white p-5 rounded-3xl border flex gap-5 transition-all ${editingId === p.id ? 'border-blue-500 ring-4 ring-blue-50 shadow-xl' : 'border-slate-200 shadow-sm hover:shadow-lg'}`}>
                        <div className="w-24 h-24 bg-slate-50 rounded-2xl overflow-hidden shrink-0 border border-slate-100">
                          <img src={p.image || 'https://via.placeholder.com/150'} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                           <div>
                             <h4 className="font-black text-slate-800 truncate text-base">{p.name}</h4>
                             <p className="text-emerald-600 text-sm font-black mt-1">R$ {p.price.toFixed(2)}</p>
                             <p className="text-slate-400 text-xs truncate mt-1">{p.category}</p>
                           </div>
                           <div className="flex gap-3 mt-4 justify-end">
                             <button onClick={() => handleEditProductClick(p)} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase hover:bg-blue-100 transition-colors">Editar</button>
                             <button onClick={() => requestDelete('PRODUCT', p.id, p.name)} className="px-4 py-2 bg-red-50 text-red-500 rounded-lg text-[10px] font-black uppercase hover:bg-red-100 transition-colors">Excluir</button>
                           </div>
                        </div>
                     </div>
                   ))}
                </div>
              </div>
            )}

            {/* CATEGORIAS */}
            {activeView === 'categorias' && (
               <div className="space-y-8 animate-in fade-in">
                 <div ref={formTopRef}></div>
                 <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm flex gap-4 items-center">
                   <div className="flex-1">
                      <label className={labelClass}>{editingCatId ? 'Editando Categoria' : 'Nova Categoria'}</label>
                      <input value={catName} onChange={e => setCatName(e.target.value)} placeholder="Ex: Bebidas, Lanches" className={inputClass} />
                   </div>
                   <div className="flex flex-col gap-2 mt-6">
                     <button onClick={handleSaveCategory} className={editingCatId ? editButtonClass : buttonClass}>
                       {editingCatId ? 'Atualizar' : 'Adicionar'}
                     </button>
                     {editingCatId && (
                       <button onClick={() => { setEditingCatId(null); setCatName(''); }} className="text-slate-400 text-[10px] font-black uppercase">Cancelar</button>
                     )}
                   </div>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                   {categories.map(c => (
                     <div key={c.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
                        <span className="font-bold text-slate-700 uppercase text-sm">{c.name}</span>
                        <div className="flex gap-2">
                           <button onClick={() => handleEditCategoryClick(c)} className="bg-blue-50 text-blue-600 text-xs font-black hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">Editar</button>
                           <button onClick={() => requestDelete('CATEGORY', c.id, c.name)} className="text-red-500 text-xs font-black hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">Excluir</button>
                        </div>
                     </div>
                   ))}
                 </div>
               </div>
            )}

            {/* SUBCATEGORIAS */}
            {activeView === 'subcategorias' && (
               <div className="space-y-8 animate-in fade-in">
                 <div ref={formTopRef}></div>
                 <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-end">
                   <div className="flex-1 w-full">
                     <label className={labelClass}>Categoria Pai</label>
                     <select value={subCatParent} onChange={e => setSubCatParent(e.target.value)} className={inputClass}>
                       <option value="">Selecione...</option>
                       {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                     </select>
                   </div>
                   <div className="flex-1 w-full">
                     <label className={labelClass}>{editingSubCatId ? 'Editando Subcategoria' : 'Nova Subcategoria'}</label>
                     <input value={subCatName} onChange={e => setSubCatName(e.target.value)} placeholder="Ex: Coca-Cola, Sucos" className={inputClass} />
                   </div>
                   <div className="flex flex-col gap-2">
                      <button onClick={handleSaveSubCategory} className={editingSubCatId ? editButtonClass : buttonClass}>
                        {editingSubCatId ? 'Atualizar' : 'Adicionar'}
                      </button>
                      {editingSubCatId && (
                        <button onClick={() => { setEditingSubCatId(null); setSubCatName(''); setSubCatParent(''); }} className="text-slate-400 text-[10px] font-black uppercase text-center">Cancelar</button>
                      )}
                   </div>
                 </div>
                 <div className="space-y-6">
                    {categories.map(cat => {
                      const subs = subCategories.filter(s => s.categoryId === cat.id);
                      if (subs.length === 0) return null;
                      return (
                        <div key={cat.id} className="space-y-3">
                          <h3 className="text-emerald-600 text-sm font-black uppercase tracking-widest pl-2 border-l-4 border-emerald-500">{cat.name}</h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                             {subs.map(s => (
                               <div key={s.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
                                  <span className="text-slate-700 text-sm font-bold">{s.name}</span>
                                  <div className="flex gap-2">
                                    <button onClick={() => handleEditSubCategoryClick(s)} className="bg-blue-50 text-blue-600 text-[10px] font-black hover:bg-blue-100 px-2 py-1 rounded-lg">Editar</button>
                                    <button onClick={() => requestDelete('SUBCATEGORY', s.id, s.name)} className="text-red-500 text-[10px] font-black hover:bg-red-50 px-2 py-1 rounded-lg">X</button>
                                  </div>
                               </div>
                             ))}
                          </div>
                        </div>
                      );
                    })}
                 </div>
               </div>
            )}

            {/* ADICIONAIS */}
            {activeView === 'adicionais' && (
               <div className="space-y-8 animate-in fade-in">
                 <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm space-y-6">
                   <h3 className="text-xl font-black text-slate-800 uppercase tracking-widest">Novo Adicional</h3>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className={labelClass}>Nome</label>
                        <input value={compName} onChange={e => setCompName(e.target.value)} placeholder="Ex: Bacon Extra" className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Preço (+)</label>
                        <input type="number" value={compPrice} onChange={e => setCompPrice(Number(e.target.value))} placeholder="0.00" className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Aplicar em:</label>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                          {categories.map(cat => (
                            <button 
                              key={cat.id} 
                              onClick={() => setCompCategories(prev => prev.includes(cat.id) ? prev.filter(x => x !== cat.id) : [...prev, cat.id])}
                              className={`px-4 py-2 rounded-lg text-xs font-black uppercase whitespace-nowrap transition-all ${compCategories.includes(cat.id) ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}
                            >
                              {cat.name}
                            </button>
                          ))}
                        </div>
                      </div>
                   </div>
                   <div className="flex justify-end">
                      <button onClick={() => { onAddComplement(compName, compPrice, compCategories); setCompName(''); setCompPrice(0); setCompCategories([]); }} className={buttonClass}>Salvar Adicional</button>
                   </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                   {complements.map(c => (
                     <div key={c.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
                        <div>
                          <p className="font-black text-slate-800 text-base">{c.name}</p>
                          <p className="text-emerald-600 text-sm font-bold">R$ {c.price.toFixed(2)}</p>
                        </div>
                        <div className="flex gap-3">
                           <button onClick={() => onToggleComplement(c.id)} className={`text-xs font-black px-3 py-1.5 rounded-lg transition-colors ${c.active ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 bg-slate-100'}`}>{c.active ? 'Ativo' : 'Inativo'}</button>
                           <button onClick={() => requestDelete('COMPLEMENT', c.id, c.name)} className="text-red-500 text-xs font-black hover:bg-red-50 px-3 py-1.5 rounded-lg">X</button>
                        </div>
                     </div>
                   ))}
                 </div>
               </div>
            )}

            {/* CUPONS */}
            {activeView === 'cupons' && (
               <div className="space-y-8 animate-in fade-in">
                 <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6 items-end">
                    <div className="flex-1 w-full">
                      <label className={labelClass}>Código do Cupom</label>
                      <input value={cpCode} onChange={e => setCpCode(e.target.value.toUpperCase())} placeholder="Ex: NILO10" className={inputClass} />
                    </div>
                    <div className="flex-1 w-full">
                      <label className={labelClass}>Valor do Desconto</label>
                      <input type="number" value={cpDiscount} onChange={e => setCpDiscount(Number(e.target.value))} placeholder="10" className={inputClass} />
                    </div>
                    <div className="flex-1 w-full">
                      <label className={labelClass}>Tipo de Desconto</label>
                      <select value={cpType} onChange={e => setCpType(e.target.value as any)} className={inputClass}>
                        <option value="PERCENT">% Porcentagem</option>
                        <option value="FIXED">R$ Fixo</option>
                      </select>
                    </div>
                    <button onClick={() => { onAddCoupon(cpCode, cpDiscount, cpType); setCpCode(''); }} className={buttonClass}>Criar Cupom</button>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {coupons.map(c => (
                      <div key={c.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex justify-between items-center relative overflow-hidden group">
                         <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-100 rounded-bl-[100%] z-0 transition-transform group-hover:scale-150"></div>
                         <div className="relative z-10">
                           <p className="font-black text-slate-800 text-xl tracking-tight">{c.code}</p>
                           <p className="text-emerald-600 text-sm font-black">{c.type === 'PERCENT' ? `${c.discount}% OFF` : `R$ ${c.discount} OFF`}</p>
                           <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase mt-1 inline-block">Ativo</span>
                         </div>
                         <button onClick={() => requestDelete('COUPON', c.id, c.code)} className="relative z-10 text-red-500 text-xs font-black hover:bg-red-50 px-3 py-2 rounded-lg transition-colors">Excluir</button>
                      </div>
                    ))}
                 </div>
               </div>
            )}

            {/* ENTREGAS (CEP) */}
            {activeView === 'entregas' && (
               <div className="space-y-8 animate-in fade-in">
                  <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6 items-end">
                     <div className="flex-1">
                        <label className={labelClass}>CEP Inicial</label>
                        <input value={zipStart} onChange={e => setZipStart(e.target.value)} placeholder="38000000" className={inputClass} />
                     </div>
                     <div className="flex-1">
                        <label className={labelClass}>CEP Final</label>
                        <input value={zipEnd} onChange={e => setZipEnd(e.target.value)} placeholder="38099999" className={inputClass} />
                     </div>
                     <div className="flex-1">
                        <label className={labelClass}>Taxa (R$)</label>
                        <input type="number" value={zipFee} onChange={e => setZipFee(Number(e.target.value))} placeholder="10.00" className={inputClass} />
                     </div>
                     <button onClick={() => { onAddZipRange(zipStart, zipEnd, zipFee); setZipStart(''); setZipEnd(''); setZipFee(0); }} className={buttonClass}>Salvar</button>
                  </div>
                  <div className="space-y-3">
                     {zipRanges.map(z => (
                       <div key={z.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
                          <span className="text-slate-700 text-base font-bold">CEP {z.start} até {z.end}</span>
                          <div className="flex items-center gap-6">
                             <span className="text-emerald-600 font-black text-lg">R$ {z.fee.toFixed(2)}</span>
                             <button onClick={() => requestDelete('ZIP', z.id)} className="text-red-500 text-xs font-black hover:bg-red-50 px-3 py-1.5 rounded-lg">X</button>
                          </div>
                       </div>
                     ))}
                  </div>
               </div>
            )}

            {/* CLIENTES */}
            {activeView === 'clientes' && (
               <div className="space-y-6 animate-in fade-in">
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-widest">Base de Clientes</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                     {customers.map(c => (
                       <div key={c.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                          <div className="flex justify-between items-start">
                             <h4 className="text-slate-900 font-black text-lg">{c.name}</h4>
                             <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-3 py-1 rounded-lg">{c.totalOrders} pedidos</span>
                          </div>
                          <p className="text-slate-500 text-sm font-medium">{c.phone}</p>
                          <p className="text-slate-500 text-sm font-medium truncate">{c.email}</p>
                       </div>
                     ))}
                  </div>
               </div>
            )}

            {/* PAGAMENTOS */}
            {activeView === 'pagamentos' && (
               <div className="space-y-8 animate-in fade-in">
                  <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6 items-end">
                     <div className="flex-1">
                        <label className={labelClass}>Nome do Método</label>
                        <input value={payName} onChange={e => setPayName(e.target.value)} placeholder="Ex: Pix, Cartão" className={inputClass} />
                     </div>
                     <div className="flex-1">
                        <label className={labelClass}>Tipo</label>
                        <select value={payType} onChange={e => setPayType(e.target.value as any)} className={inputClass}>
                          <option value="DELIVERY">Pagamento na Entrega</option>
                          <option value="ONLINE">Pagamento Online (App)</option>
                        </select>
                     </div>
                     <button onClick={() => { onAddPaymentMethod(payName, payType); setPayName(''); }} className={buttonClass}>Adicionar</button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                     {paymentSettings.map(p => (
                       <div key={p.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
                          <div>
                            <p className="font-black text-slate-800 text-lg">{p.name}</p>
                            <p className="text-sm text-slate-400 font-bold">{p.type === 'ONLINE' ? 'Online' : 'Na Entrega'}</p>
                          </div>
                          <div className="flex gap-3 items-center">
                             <button onClick={() => onTogglePaymentMethod(p.id)} className={`text-xs font-black px-3 py-1.5 rounded-lg transition-colors ${p.enabled ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 bg-slate-100'}`}>{p.enabled ? 'ON' : 'OFF'}</button>
                             <button onClick={() => requestDelete('PAYMENT', p.id, p.name)} className="text-red-500 text-xs font-black hover:bg-red-50 px-3 py-1.5 rounded-lg">X</button>
                          </div>
                       </div>
                     ))}
                  </div>
               </div>
            )}

            {/* AJUSTES */}
            {activeView === 'ajustes' && (
               <div className="max-w-4xl space-y-12 animate-in slide-in-from-bottom-5 duration-500">
                  <section className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm space-y-8">
                     <h3 className="text-xl font-black text-slate-800 uppercase tracking-widest flex items-center gap-3">
                       <span className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center text-xl">🏢</span>
                       Configurações Gerais
                     </h3>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                           <label className={labelClass}>Status da Loja</label>
                           <button 
                              onClick={onToggleStore}
                              className={`w-full py-8 rounded-2xl flex items-center justify-center gap-4 border-2 transition-all ${isStoreOpen ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : 'bg-red-50 border-red-500 text-red-500'}`}
                           >
                              <div className={`w-5 h-5 rounded-full ${isStoreOpen ? 'bg-emerald-500 shadow-lg' : 'bg-red-500'}`}></div>
                              <span className="font-black text-lg uppercase tracking-widest">{isStoreOpen ? 'Loja Aberta' : 'Loja Fechada'}</span>
                           </button>
                        </div>

                        <div className="space-y-3">
                           <label className={labelClass}>Modo Quiosque (Totem)</label>
                           <button 
                              onClick={onToggleKioskMode}
                              className={`w-full py-8 rounded-2xl flex items-center justify-center gap-4 border-2 transition-all ${isKioskMode ? 'bg-purple-50 border-purple-500 text-purple-600' : 'bg-slate-50 border-slate-300 text-slate-400'}`}
                           >
                              <span className="text-2xl">{isKioskMode ? '🤖' : '📱'}</span>
                              <span className="font-black text-lg uppercase tracking-widest">{isKioskMode ? 'Quiosque Ativado' : 'Modo Normal'}</span>
                           </button>
                        </div>

                        <div className="space-y-3 md:col-span-2">
                           <label className={labelClass}>Logo da Loja (Upload)</label>
                           <div className="flex items-center gap-6 bg-slate-50 p-6 rounded-2xl border border-dashed border-slate-300 hover:border-emerald-400 transition-colors">
                              <input 
                                type="file" 
                                accept="image/*"
                                onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], true)}
                                className="text-sm text-slate-500 file:mr-5 file:py-3 file:px-6 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-emerald-100 file:text-emerald-700 hover:file:bg-emerald-200 cursor-pointer"
                              />
                              {logoUrl && (
                                <div className="relative w-20 h-20 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                                  <img src={logoUrl} className="w-full h-full object-contain" />
                                </div>
                              )}
                           </div>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t border-slate-100">
                        <div className="space-y-2">
                          <label className={labelClass}>WhatsApp</label>
                          <input 
                            value={localWhatsapp} 
                            onChange={(e) => setLocalWhatsapp(e.target.value)} 
                            onBlur={() => onUpdateSocialLinks({ ...socialLinks, whatsapp: localWhatsapp })}
                            placeholder="Ex: 553499..." 
                            className={inputClass} 
                          />
                        </div>
                        <div className="space-y-2">
                          <label className={labelClass}>Instagram (URL)</label>
                          <input 
                            value={localInstagram} 
                            onChange={(e) => setLocalInstagram(e.target.value)} 
                            onBlur={() => onUpdateSocialLinks({ ...socialLinks, instagram: localInstagram })}
                            placeholder="https://inst..." 
                            className={inputClass} 
                          />
                        </div>
                        <div className="space-y-2">
                          <label className={labelClass}>Facebook (URL)</label>
                          <input 
                            value={localFacebook} 
                            onChange={(e) => setLocalFacebook(e.target.value)} 
                            onBlur={() => onUpdateSocialLinks({ ...socialLinks, facebook: localFacebook })}
                            placeholder="https://face..." 
                            className={inputClass} 
                          />
                        </div>
                     </div>
                  </section>
               </div>
            )}

          </div>

          {/* SIDEBAR DIREITA (APENAS NA ABA PEDIDOS) - CONTROLLER DE AÇÕES E FILTROS */}
          {activeView === 'pedidos' && (
             <aside className="w-64 bg-white border-l border-slate-200 p-6 overflow-y-auto hidden lg:flex flex-col gap-2 shrink-0 z-20 shadow-[-5px_0_20px_-10px_rgba(0,0,0,0.05)]">
               <div className={`text-xs font-black uppercase tracking-widest mb-4 border-b pb-2 ${selectedOrderId ? 'text-emerald-600 border-emerald-100' : 'text-slate-400 border-slate-100'}`}>
                  {selectedOrderId ? `DEFINIR STATUS DO PEDIDO` : 'FILTRAR POR STATUS'}
                  {selectedOrderId && <div className="text-[9px] text-slate-500 mt-1">#{selectedOrderId.substring(0,6)} SELECIONADO</div>}
               </div>

               {ORDER_STATUSES.map(status => (
                 <button 
                   key={status}
                   onClick={() => handleRightSidebarClick(status)}
                   disabled={selectedOrderId !== null && status === 'TODOS'}
                   className={`w-full text-left px-5 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border 
                     ${selectedOrderId 
                        ? (status === 'TODOS' ? 'opacity-20 cursor-not-allowed border-transparent' : 'bg-white border-slate-200 hover:bg-emerald-50 hover:border-emerald-500 hover:text-emerald-700 hover:scale-105 shadow-sm')
                        : (activeOrderTab === status ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-200' : 'bg-slate-50 text-slate-500 border-transparent hover:bg-slate-100 hover:text-slate-700')
                     }
                   `}
                 >
                   {status} 
                   {status !== 'TODOS' && !selectedOrderId && (
                     <span className={`ml-2 px-1.5 py-0.5 rounded text-[9px] ${activeOrderTab === status ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'}`}>
                       {orders.filter(o => o.status === status && !deletedIds.includes(o.id)).length}
                     </span>
                   )}
                   {selectedOrderId && status !== 'TODOS' && <span className="float-right">➜</span>}
                 </button>
               ))}
               
               {selectedOrderId && (
                  <button onClick={() => setSelectedOrderId(null)} className="mt-4 text-[9px] font-black uppercase text-red-400 hover:text-red-600">
                    Cancelar Seleção X
                  </button>
               )}
             </aside>
          )}

        </div>
      </main>

      {/* MODAL DELETE CONFIRM GENÉRICO */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
           <div className="bg-white border border-slate-200 p-10 rounded-[40px] max-w-md w-full text-center space-y-8 shadow-2xl animate-in zoom-in-95">
              <div className="text-7xl">⚠️</div>
              <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">
                Excluir {deleteTarget.type === 'ORDER' ? 'Pedido' : 
                         deleteTarget.type === 'PRODUCT' ? 'Produto' :
                         deleteTarget.type === 'CATEGORY' ? 'Categoria' : 
                         deleteTarget.type === 'SUBCATEGORY' ? 'Subcategoria' : 'Item'}?
              </h3>
              {deleteTarget.name && (
                <p className="text-lg font-bold text-slate-500">
                  {deleteTarget.name}
                </p>
              )}
              <div className="flex flex-col gap-4">
                 <button 
                    onClick={confirmDelete}
                    className="w-full py-6 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest text-sm rounded-2xl shadow-xl shadow-red-200 transition-all active:scale-95"
                 >
                    Confirmar Exclusão
                 </button>
                 <button onClick={() => setDeleteTarget(null)} className="w-full py-4 text-slate-400 font-bold uppercase text-xs hover:text-slate-600">Cancelar</button>
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
       <span className="text-xl group-hover:scale-110 transition-transform">{icon}</span>
       <span className="font-black uppercase tracking-widest text-xs">{label}</span>
    </div>
    {badge !== undefined && (
      <span className={`min-w-[24px] h-6 flex items-center justify-center rounded-full text-[10px] font-black px-2 ${active ? 'bg-white text-emerald-600' : 'bg-blue-600 text-white animate-pulse'}`}>
        {badge}
      </span>
    )}
  </button>
);
