
import React, { useState, useEffect, useRef } from 'react';
import { Product, Order, Customer, ZipRange, CategoryItem, SubCategoryItem, OrderStatus, Complement, PaymentSettings, Coupon } from '../types.ts';
import { compressImage } from '../services/imageService.ts';

const NOTIFICATION_SOUND = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
const APP_VERSION = "v4.2 (Light Theme + Uploads)";

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

export const AdminPanel: React.FC<AdminPanelProps> = (props) => {
  const { 
    products, orders, customers, zipRanges, categories, subCategories, complements, coupons, isStoreOpen, onToggleStore, isKioskMode, onToggleKioskMode,
    logoUrl, onUpdateLogo, socialLinks, onUpdateSocialLinks, onAddProduct, onDeleteProduct, onUpdateProduct, 
    onUpdateOrderStatus, onDeleteOrder, onAddCategory, onRemoveCategory, onAddSubCategory, 
    onRemoveSubCategory, onAddComplement, onToggleComplement, onRemoveComplement, 
    onAddZipRange, onRemoveZipRange, onAddCoupon, onRemoveCoupon, onLogout, onBackToSite, 
    paymentSettings, onTogglePaymentMethod, onAddPaymentMethod, onRemovePaymentMethod
  } = props;

  const [activeView, setActiveView] = useState<AdminView>('dashboard');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [activeOrderTab, setActiveOrderTab] = useState<OrderStatus | 'TODOS'>('NOVO');
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [audioEnabled, setAudioEnabled] = useState(false);
  
  // Modais de confirmação
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [productToDeleteId, setProductToDeleteId] = useState<string | null>(null);

  // States de Formulários (Produtos)
  const [editingId, setEditingId] = useState<string | null>(null); // ID do produto sendo editado no topo
  const [newProduct, setNewProduct] = useState<Partial<Product>>({ name: '', price: 0, category: '', subCategory: '', description: '', image: '', rating: 5.0 });
  const [isProcessingImg, setIsProcessingImg] = useState(false);

  // States de Formulários (Categorias/Sub)
  const [catName, setCatName] = useState('');
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
        audioRef.current.play().catch(() => setAudioEnabled(false));
      }
    } else {
      stopAlarm();
    }
  }, [orders, deletedIds, audioEnabled]);

  const handleUpdateStatus = (id: string, status: OrderStatus) => {
    stopAlarm();
    onUpdateOrderStatus(id, status);
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
    // Rola suavemente para o topo onde está o formulário
    if (formTopRef.current) {
      formTopRef.current.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSaveProduct = async () => {
    if (editingId && newProduct.name) {
      // Atualizar Existente
      onUpdateProduct({ ...newProduct, id: editingId } as Product);
      setEditingId(null);
    } else if (newProduct.name) {
      // Criar Novo
      await onAddProduct(newProduct);
    }
    // Limpar form
    setNewProduct({ name: '', price: 0, category: '', subCategory: '', description: '', image: '', rating: 5.0 });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setNewProduct({ name: '', price: 0, category: '', subCategory: '', description: '', image: '', rating: 5.0 });
  };

  const activeOrdersCount = orders.filter(o => o.status === 'NOVO' && !deletedIds.includes(o.id)).length;

  // ESTILOS GERAIS (Light Theme)
  const cardClass = "bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all";
  const inputClass = "w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all placeholder:text-slate-400";
  const labelClass = "text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1 mb-1 block";

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-emerald-200 selection:text-emerald-900">
      {/* SIDEBAR */}
      <aside className="w-full lg:w-72 bg-white flex flex-col border-r border-slate-200 shrink-0 z-30">
        <div className="p-8 border-b border-slate-100 flex flex-col items-center">
          <div className="w-20 h-20 bg-emerald-600 rounded-[24px] shadow-xl shadow-emerald-200 flex items-center justify-center mb-4 border-4 border-white group cursor-pointer overflow-hidden relative" onClick={onBackToSite}>
             {logoUrl ? <img src={logoUrl} className="w-full h-full object-cover" alt="Logo" /> : <span className="text-4xl">🍔</span>}
          </div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">NILO <span className="text-emerald-600">ADMIN</span></h2>
          <div className="flex items-center gap-2 mt-2">
            <div className={`w-2 h-2 rounded-full ${isStoreOpen ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isStoreOpen ? 'Loja Aberta' : 'Loja Fechada'}</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto no-scrollbar">
          <NavItem active={activeView === 'dashboard'} icon="📊" label="Dashboard" onClick={() => setActiveView('dashboard')} />
          <NavItem active={activeView === 'pedidos'} icon="🛍️" label="Pedidos" onClick={() => setActiveView('pedidos')} badge={activeOrdersCount > 0 ? activeOrdersCount : undefined} />
          
          <div className="pt-4 pb-2 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cardápio</div>
          <NavItem active={activeView === 'produtos'} icon="🍔" label="Produtos" onClick={() => setActiveView('produtos')} />
          <NavItem active={activeView === 'categorias'} icon="📁" label="Categorias" onClick={() => setActiveView('categorias')} />
          <NavItem active={activeView === 'subcategorias'} icon="🌿" label="Subcategorias" onClick={() => setActiveView('subcategorias')} />
          <NavItem active={activeView === 'adicionais'} icon="➕" label="Adicionais" onClick={() => setActiveView('adicionais')} />
          
          <div className="pt-4 pb-2 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Gestão</div>
          <NavItem active={activeView === 'cupons'} icon="🏷️" label="Cupons" onClick={() => setActiveView('cupons')} />
          <NavItem active={activeView === 'entregas'} icon="🚚" label="Taxas Frete" onClick={() => setActiveView('entregas')} />
          <NavItem active={activeView === 'clientes'} icon="👥" label="Clientes" onClick={() => setActiveView('clientes')} />
          <NavItem active={activeView === 'pagamentos'} icon="💳" label="Pagamentos" onClick={() => setActiveView('pagamentos')} />
          <NavItem active={activeView === 'ajustes'} icon="⚙️" label="Ajustes" onClick={() => setActiveView('ajustes')} />
        </nav>

        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
           <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl text-red-500 hover:bg-red-50 transition-all font-black uppercase text-[10px] tracking-widest">
             🚪 <span>Sair do Painel</span>
           </button>
           <div className="mt-2 text-center text-[8px] font-bold text-slate-400 uppercase">{APP_VERSION}</div>
        </div>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 relative">
        <header className="h-20 sm:h-24 bg-white/80 border-b border-slate-200 px-6 sm:px-10 flex items-center justify-between sticky top-0 z-20 backdrop-blur-md shadow-sm">
           <h1 className="text-xl sm:text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
             <span className="p-2 bg-slate-100 text-slate-600 rounded-lg text-lg border border-slate-200">
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
               className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${audioEnabled ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}
             >
               {audioEnabled ? '🔔 Som Ativado' : '🔕 Som Desativado'}
             </button>
             <button onClick={onBackToSite} className="bg-slate-900 hover:bg-black text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-slate-200">Ver Site</button>
           </div>
        </header>

        <div className="flex-1 p-6 sm:p-10 overflow-y-auto no-scrollbar scroll-smooth">
          
          {/* DASHBOARD */}
          {activeView === 'dashboard' && (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in">
               <div className={cardClass}>
                 <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Total de Pedidos</p>
                 <p className="text-3xl font-black text-slate-800 mt-2">{orders.length}</p>
               </div>
               <div className={cardClass}>
                 <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Faturamento</p>
                 <p className="text-3xl font-black text-emerald-600 mt-2">R$ {orders.reduce((acc, o) => acc + o.total, 0).toFixed(2)}</p>
               </div>
               <div className={cardClass}>
                 <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Clientes</p>
                 <p className="text-3xl font-black text-blue-600 mt-2">{customers.length}</p>
               </div>
               <div className={cardClass}>
                 <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Produtos Ativos</p>
                 <p className="text-3xl font-black text-purple-600 mt-2">{products.length}</p>
               </div>
             </div>
          )}

          {/* PEDIDOS */}
          {activeView === 'pedidos' && (
            <div className="space-y-8 animate-in fade-in duration-500">
               <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                 {['TODOS', 'NOVO', 'PREPARANDO', 'PRONTO PARA RETIRADA', 'SAIU PARA ENTREGA', 'FINALIZADO', 'CANCELADO'].map(status => (
                    <button 
                      key={status} 
                      onClick={() => setActiveOrderTab(status as any)}
                      className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border-2 ${activeOrderTab === status ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' : 'bg-white text-slate-500 border-transparent hover:bg-slate-100'}`}
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
                      <div key={order.id} className={`bg-white border-l-4 rounded-2xl overflow-hidden transition-all shadow-sm hover:shadow-md ${order.status === 'NOVO' ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200'}`}>
                        <div className="p-6 flex flex-col sm:flex-row justify-between gap-4">
                          <div className="space-y-2">
                             <div className="flex items-center gap-3">
                               <span className="text-xl font-black text-slate-800">#{order.id.substring(0,6)}</span>
                               <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase ${
                                  order.status === 'NOVO' ? 'bg-blue-100 text-blue-700' : 
                                  order.status === 'FINALIZADO' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                               }`}>{order.status}</span>
                             </div>
                             <div className="text-slate-500 text-xs font-bold flex items-center gap-2">
                                📅 {new Date(order.createdAt).toLocaleTimeString()} 
                                <span className="text-slate-300">|</span> 👤 {order.customerName}
                             </div>
                          </div>
                          <div className="text-right">
                             <div className="text-2xl font-black text-emerald-600">R$ {order.total.toFixed(2)}</div>
                          </div>
                        </div>
                        
                        <div className="px-6 py-4 bg-slate-50 border-y border-slate-100">
                          <ul className="space-y-3">
                            {order.items.map((item, idx) => (
                              <li key={idx} className="flex justify-between items-start text-sm">
                                <div className="flex flex-col">
                                   <span className="font-black text-slate-700 uppercase leading-none">{item.quantity}x {item.name}</span>
                                   {item.selectedComplements?.map((c, ci) => (
                                     <span key={ci} className="text-[10px] text-emerald-600 font-bold ml-4">+ {c.name}</span>
                                   ))}
                                </div>
                                <span className="text-slate-500 font-bold">R$ {(item.price * item.quantity).toFixed(2)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white">
                          {order.status === 'NOVO' && (
                             <button onClick={() => handleUpdateStatus(order.id, 'PREPARANDO')} className="col-span-2 py-3 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase rounded-xl shadow-lg shadow-blue-100 transition-all">🚀 ACEITAR</button>
                          )}
                          {order.status === 'PREPARANDO' && (
                             <button onClick={() => handleUpdateStatus(order.id, order.deliveryType === 'PICKUP' ? 'PRONTO PARA RETIRADA' : 'SAIU PARA ENTREGA')} className="col-span-2 py-3 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black uppercase rounded-xl transition-all">🔥 PRONTO / SAIU</button>
                          )}
                          {(order.status === 'PRONTO PARA RETIRADA' || order.status === 'SAIU PARA ENTREGA') && (
                             <button onClick={() => handleUpdateStatus(order.id, 'FINALIZADO')} className="col-span-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase rounded-xl transition-all">🏁 FINALIZAR</button>
                          )}
                          <button onClick={() => { setSelectedOrder(order); setShowDeleteConfirm(true); }} className="py-3 bg-red-50 text-red-500 hover:bg-red-100 text-[10px] font-black uppercase rounded-xl transition-all">Deletar</button>
                          <button onClick={() => window.open(`https://wa.me/${order.customerPhone.replace(/\D/g,'')}`, '_blank')} className="py-3 bg-slate-100 text-slate-500 hover:bg-slate-200 text-[10px] font-black uppercase rounded-xl">📞 Chat</button>
                        </div>
                      </div>
                    ))}
               </div>
            </div>
          )}

          {/* PRODUTOS */}
          {activeView === 'produtos' && (
            <div className="space-y-8 animate-in fade-in">
              {/* REF para Scroll */}
              <div ref={formTopRef}></div>

              {/* Formulário de Adição/Edição */}
              <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm space-y-6">
                 <div className="flex justify-between items-center">
                   <h3 className="text-xl font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                      {editingId ? '✏️ Editando Produto' : '✨ Novo Produto'}
                   </h3>
                   {editingId && (
                     <button onClick={handleCancelEdit} className="text-red-500 text-xs font-bold uppercase hover:underline">Cancelar Edição</button>
                   )}
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="space-y-1">
                      <label className={labelClass}>Nome do Produto</label>
                      <input value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} placeholder="Ex: X-Tudo Completo" className={inputClass} />
                   </div>
                   
                   <div className="space-y-1">
                      <label className={labelClass}>Preço (R$)</label>
                      <input type="number" value={newProduct.price || ''} onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})} placeholder="0.00" className={inputClass} />
                   </div>

                   <div className="space-y-1">
                      <label className={labelClass}>Categoria</label>
                      <select value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} className={inputClass}>
                        <option value="">Selecione...</option>
                        {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      </select>
                   </div>

                   <div className="md:col-span-3 space-y-1">
                      <label className={labelClass}>Descrição Detalhada</label>
                      <textarea rows={2} value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} placeholder="Ingredientes, modo de preparo..." className={inputClass} />
                   </div>

                   <div className="md:col-span-3 space-y-1">
                      <label className={labelClass}>Imagem do Produto (Upload)</label>
                      <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-dashed border-slate-300">
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], false)} 
                          className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-black file:bg-emerald-100 file:text-emerald-700 hover:file:bg-emerald-200 cursor-pointer" 
                        />
                        {isProcessingImg && <span className="text-xs text-amber-500 font-bold animate-pulse">Processando...</span>}
                        {newProduct.image && (
                          <div className="relative group">
                            <img src={newProduct.image} className="w-16 h-16 rounded-lg object-cover border border-slate-200 shadow-sm" alt="Preview" />
                            <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <span className="text-[8px] text-white font-bold">Preview</span>
                            </div>
                          </div>
                        )}
                      </div>
                   </div>
                 </div>

                 <div className="flex justify-end pt-4 border-t border-slate-100">
                   <button 
                      onClick={handleSaveProduct} 
                      className={`px-8 py-4 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 ${editingId ? 'bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700' : 'bg-emerald-600 text-white shadow-emerald-200 hover:bg-emerald-700'}`}
                   >
                     {editingId ? '💾 Atualizar Produto' : '🚀 Adicionar Produto'}
                   </button>
                 </div>
              </div>

              {/* Lista de Produtos */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                 {products.map(p => (
                   <div key={p.id} className={`bg-white p-4 rounded-2xl border flex gap-4 transition-all ${editingId === p.id ? 'border-blue-500 ring-2 ring-blue-100 shadow-lg' : 'border-slate-200 shadow-sm hover:shadow-md'}`}>
                      <div className="w-20 h-20 bg-slate-50 rounded-xl overflow-hidden shrink-0 border border-slate-100">
                        <img src={p.image || 'https://via.placeholder.com/150'} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                         <div>
                           <h4 className="font-black text-slate-800 truncate text-sm">{p.name}</h4>
                           <p className="text-emerald-600 text-xs font-black mt-1">R$ {p.price.toFixed(2)}</p>
                           <p className="text-slate-400 text-[10px] truncate">{p.category}</p>
                         </div>
                         <div className="flex gap-2 mt-3 justify-end">
                           <button onClick={() => handleEditProductClick(p)} className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase hover:bg-blue-100 transition-colors">Editar</button>
                           <button onClick={() => { setProductToDeleteId(p.id); setShowDeleteConfirm(true); }} className="px-3 py-1.5 bg-red-50 text-red-500 rounded-lg text-[10px] font-black uppercase hover:bg-red-100 transition-colors">Excluir</button>
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
               <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex gap-4">
                 <input value={catName} onChange={e => setCatName(e.target.value)} placeholder="Nova Categoria" className={inputClass} />
                 <button onClick={() => { if(catName) { onAddCategory(catName); setCatName(''); } }} className="bg-emerald-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-200">Adicionar</button>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 {categories.map(c => (
                   <div key={c.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
                      <span className="font-bold text-slate-700 uppercase text-sm">{c.name}</span>
                      <button onClick={() => onRemoveCategory(c.id)} className="text-red-500 text-xs font-black hover:bg-red-50 px-2 py-1 rounded">Excluir</button>
                   </div>
                 ))}
               </div>
             </div>
          )}

          {/* SUBCATEGORIAS */}
          {activeView === 'subcategorias' && (
             <div className="space-y-8 animate-in fade-in">
               <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
                 <select value={subCatParent} onChange={e => setSubCatParent(e.target.value)} className={inputClass}>
                   <option value="">Selecione a Categoria Pai</option>
                   {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                 </select>
                 <input value={subCatName} onChange={e => setSubCatName(e.target.value)} placeholder="Nome da Subcategoria" className={inputClass} />
                 <button onClick={() => { if(subCatName && subCatParent) { onAddSubCategory(subCatParent, subCatName); setSubCatName(''); } }} className="bg-emerald-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-200">Adicionar</button>
               </div>
               <div className="space-y-4">
                  {categories.map(cat => {
                    const subs = subCategories.filter(s => s.categoryId === cat.id);
                    if (subs.length === 0) return null;
                    return (
                      <div key={cat.id} className="space-y-2">
                        <h3 className="text-emerald-600 text-xs font-black uppercase tracking-widest pl-2">{cat.name}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                           {subs.map(s => (
                             <div key={s.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
                                <span className="text-slate-700 text-sm font-bold">{s.name}</span>
                                <button onClick={() => onRemoveSubCategory(s.id)} className="text-red-500 text-xs font-black hover:bg-red-50 px-2 py-1 rounded">X</button>
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
               <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                 <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest">Novo Adicional</h3>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input value={compName} onChange={e => setCompName(e.target.value)} placeholder="Nome (Ex: Bacon)" className={inputClass} />
                    <input type="number" value={compPrice} onChange={e => setCompPrice(Number(e.target.value))} placeholder="Preço" className={inputClass} />
                    <div className="flex gap-2 overflow-x-auto">
                      {categories.map(cat => (
                        <button 
                          key={cat.id} 
                          onClick={() => setCompCategories(prev => prev.includes(cat.id) ? prev.filter(x => x !== cat.id) : [...prev, cat.id])}
                          className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase whitespace-nowrap transition-all ${compCategories.includes(cat.id) ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>
                 </div>
                 <button onClick={() => { onAddComplement(compName, compPrice, compCategories); setCompName(''); setCompPrice(0); setCompCategories([]); }} className="bg-emerald-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-200">Salvar Adicional</button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 {complements.map(c => (
                   <div key={c.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
                      <div>
                        <p className="font-black text-slate-800">{c.name}</p>
                        <p className="text-emerald-600 text-xs font-bold">R$ {c.price.toFixed(2)}</p>
                      </div>
                      <div className="flex gap-3">
                         <button onClick={() => onToggleComplement(c.id)} className={`text-xs font-black px-2 py-1 rounded ${c.active ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 bg-slate-100'}`}>{c.active ? 'Ativo' : 'Inativo'}</button>
                         <button onClick={() => onRemoveComplement(c.id)} className="text-red-500 text-xs font-black hover:bg-red-50 px-2 py-1 rounded">X</button>
                      </div>
                   </div>
                 ))}
               </div>
             </div>
          )}

          {/* CUPONS */}
          {activeView === 'cupons' && (
             <div className="space-y-8 animate-in fade-in">
               <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
                  <input value={cpCode} onChange={e => setCpCode(e.target.value.toUpperCase())} placeholder="CÓDIGO" className={inputClass} />
                  <input type="number" value={cpDiscount} onChange={e => setCpDiscount(Number(e.target.value))} placeholder="Valor" className={inputClass} />
                  <select value={cpType} onChange={e => setCpType(e.target.value as any)} className={inputClass}>
                    <option value="PERCENT">% Porcentagem</option>
                    <option value="FIXED">R$ Fixo</option>
                  </select>
                  <button onClick={() => { onAddCoupon(cpCode, cpDiscount, cpType); setCpCode(''); }} className="bg-emerald-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-200">Criar Cupom</button>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {coupons.map(c => (
                    <div key={c.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
                       <div>
                         <p className="font-black text-slate-800">{c.code}</p>
                         <p className="text-emerald-600 text-xs font-bold">{c.type === 'PERCENT' ? `${c.discount}% OFF` : `R$ ${c.discount} OFF`}</p>
                       </div>
                       <button onClick={() => onRemoveCoupon(c.id)} className="text-red-500 text-xs font-black hover:bg-red-50 px-2 py-1 rounded">Excluir</button>
                    </div>
                  ))}
               </div>
             </div>
          )}

          {/* ENTREGAS (CEP) */}
          {activeView === 'entregas' && (
             <div className="space-y-8 animate-in fade-in">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
                   <input value={zipStart} onChange={e => setZipStart(e.target.value)} placeholder="CEP Inicial (Ex: 38000000)" className={inputClass} />
                   <input value={zipEnd} onChange={e => setZipEnd(e.target.value)} placeholder="CEP Final" className={inputClass} />
                   <input type="number" value={zipFee} onChange={e => setZipFee(Number(e.target.value))} placeholder="Taxa R$" className={inputClass} />
                   <button onClick={() => { onAddZipRange(zipStart, zipEnd, zipFee); setZipStart(''); setZipEnd(''); setZipFee(0); }} className="bg-emerald-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-200">Salvar Faixa</button>
                </div>
                <div className="space-y-2">
                   {zipRanges.map(z => (
                     <div key={z.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
                        <span className="text-slate-700 text-sm font-bold">CEP {z.start} até {z.end}</span>
                        <div className="flex items-center gap-4">
                           <span className="text-emerald-600 font-black">R$ {z.fee.toFixed(2)}</span>
                           <button onClick={() => onRemoveZipRange(z.id)} className="text-red-500 text-xs font-black hover:bg-red-50 px-2 py-1 rounded">X</button>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
          )}

          {/* CLIENTES */}
          {activeView === 'clientes' && (
             <div className="space-y-6 animate-in fade-in">
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest">Base de Clientes</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {customers.map(c => (
                     <div key={c.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-2">
                        <div className="flex justify-between items-start">
                           <h4 className="text-slate-900 font-black">{c.name}</h4>
                           <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded">{c.totalOrders} pedidos</span>
                        </div>
                        <p className="text-slate-500 text-xs">{c.phone}</p>
                        <p className="text-slate-500 text-xs truncate">{c.email}</p>
                     </div>
                   ))}
                </div>
             </div>
          )}

          {/* PAGAMENTOS */}
          {activeView === 'pagamentos' && (
             <div className="space-y-8 animate-in fade-in">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
                   <input value={payName} onChange={e => setPayName(e.target.value)} placeholder="Nome (Ex: Pix, Cartão)" className={inputClass} />
                   <select value={payType} onChange={e => setPayType(e.target.value as any)} className={inputClass}>
                     <option value="DELIVERY">Pagamento na Entrega</option>
                     <option value="ONLINE">Pagamento Online (App)</option>
                   </select>
                   <button onClick={() => { onAddPaymentMethod(payName, payType); setPayName(''); }} className="bg-emerald-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-200">Adicionar</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                   {paymentSettings.map(p => (
                     <div key={p.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
                        <div>
                          <p className="font-black text-slate-800">{p.name}</p>
                          <p className="text-xs text-slate-400">{p.type === 'ONLINE' ? 'Online' : 'Na Entrega'}</p>
                        </div>
                        <div className="flex gap-3 items-center">
                           <button onClick={() => onTogglePaymentMethod(p.id)} className={`text-xs font-black px-2 py-1 rounded ${p.enabled ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 bg-slate-100'}`}>{p.enabled ? 'ON' : 'OFF'}</button>
                           <button onClick={() => onRemovePaymentMethod(p.id)} className="text-red-500 text-xs font-black hover:bg-red-50 px-2 py-1 rounded">X</button>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
          )}

          {/* AJUSTES - ONDE FICA O QUIOSQUE E SOCIAIS */}
          {activeView === 'ajustes' && (
             <div className="max-w-4xl space-y-10 animate-in slide-in-from-bottom-5 duration-500">
                <section className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm space-y-8">
                   <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest flex items-center gap-3">
                     <span className="w-8 h-8 bg-emerald-600 text-white rounded-lg flex items-center justify-center">🏢</span>
                     Configurações Gerais
                   </h3>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                         <label className={labelClass}>Status da Loja</label>
                         <button 
                            onClick={onToggleStore}
                            className={`w-full py-6 rounded-2xl flex items-center justify-center gap-4 border-2 transition-all ${isStoreOpen ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : 'bg-red-50 border-red-500 text-red-500'}`}
                         >
                            <div className={`w-4 h-4 rounded-full ${isStoreOpen ? 'bg-emerald-500 shadow-lg' : 'bg-red-500'}`}></div>
                            <span className="font-black uppercase tracking-widest">{isStoreOpen ? 'Loja Aberta' : 'Loja Fechada'}</span>
                         </button>
                      </div>

                      <div className="space-y-4">
                         <label className={labelClass}>Modo Quiosque (Totem)</label>
                         <button 
                            onClick={onToggleKioskMode}
                            className={`w-full py-6 rounded-2xl flex items-center justify-center gap-4 border-2 transition-all ${isKioskMode ? 'bg-purple-50 border-purple-500 text-purple-600' : 'bg-slate-50 border-slate-300 text-slate-400'}`}
                         >
                            <span className="text-xl">{isKioskMode ? '🤖' : '📱'}</span>
                            <span className="font-black uppercase tracking-widest">{isKioskMode ? 'Quiosque Ativado' : 'Modo Normal'}</span>
                         </button>
                      </div>

                      <div className="space-y-4 md:col-span-2">
                         <label className={labelClass}>Logo da Loja (Upload)</label>
                         <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-dashed border-slate-300">
                            <input 
                              type="file" 
                              accept="image/*"
                              onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], true)}
                              className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-black file:bg-emerald-100 file:text-emerald-700 hover:file:bg-emerald-200 cursor-pointer"
                            />
                            {logoUrl && (
                              <div className="relative w-16 h-16 bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                                <img src={logoUrl} className="w-full h-full object-contain" />
                              </div>
                            )}
                         </div>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-100">
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
      </main>

      {/* MODAL DELETE CONFIRM */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
           <div className="bg-white border border-slate-200 p-10 rounded-[40px] max-w-md w-full text-center space-y-8 shadow-2xl">
              <div className="text-6xl">⚠️</div>
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{selectedOrder ? 'Deletar Pedido?' : 'Excluir Item?'}</h3>
              <div className="flex flex-col gap-3">
                 <button 
                    onClick={() => {
                      if (selectedOrder) {
                        setDeletedIds(prev => [...prev, selectedOrder.id]);
                        onDeleteOrder(selectedOrder.id);
                        setSelectedOrder(null);
                        stopAlarm();
                      } else if (productToDeleteId) {
                        onDeleteProduct(productToDeleteId);
                        setProductToDeleteId(null);
                      }
                      setShowDeleteConfirm(false);
                    }}
                    className="w-full py-5 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl shadow-red-200"
                 >
                    Confirmar Exclusão
                 </button>
                 <button onClick={() => { setShowDeleteConfirm(false); setSelectedOrder(null); setProductToDeleteId(null); }} className="w-full py-4 text-slate-400 font-bold uppercase text-[10px] hover:text-slate-600">Cancelar</button>
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
    className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all group ${active ? 'bg-emerald-50 text-emerald-600 shadow-sm border border-emerald-100' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600 border border-transparent'}`}
  >
    <div className="flex items-center gap-4">
       <span className="text-lg group-hover:scale-110 transition-transform">{icon}</span>
       <span className="font-black uppercase tracking-widest text-[10px]">{label}</span>
    </div>
    {badge !== undefined && (
      <span className={`min-w-[20px] h-5 flex items-center justify-center rounded-full text-[9px] font-black px-1.5 ${active ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white animate-pulse'}`}>
        {badge}
      </span>
    )}
  </button>
);
