
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Product, Order, Customer, ZipRange, CategoryItem, SubCategoryItem, OrderStatus, Complement, PaymentSettings, Coupon } from '../types.ts';
import { compressImage } from '../services/imageService.ts';
import { dbService } from '../services/dbService.ts';
import { generateProductImage } from '../services/geminiService.ts';
import { firebaseConfig } from '../firebaseConfig.ts';
import { PrintableCoupon } from './PrintableCoupon.tsx';

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
  onDeleteCustomer: (id: string) => void;
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
}

type AdminView = 'dashboard' | 'pedidos' | 'produtos' | 'categorias' | 'subcategorias' | 'adicionais' | 'entregas' | 'clientes' | 'pagamentos' | 'ajustes';

export const AdminPanel: React.FC<AdminPanelProps> = (props) => {
  const { 
    products, orders, customers, zipRanges, categories, subCategories, complements, coupons,
    isStoreOpen, onToggleStore, logoUrl, onUpdateLogo, onAddProduct, onDeleteProduct, 
    onUpdateProduct, onUpdateOrderStatus, onUpdateCustomer, onDeleteCustomer, onAddCategory, onRemoveCategory, onAddSubCategory, onRemoveSubCategory,
    onAddComplement, onToggleComplement, onRemoveComplement, onAddZipRange, onRemoveZipRange,
    onAddCoupon, onRemoveCoupon, onUpdatePaymentSettings,
    onLogout, onBackToSite,
    paymentSettings, onTogglePaymentMethod, onAddPaymentMethod, onRemovePaymentMethod
  } = props;

  const [activeView, setActiveView] = useState<AdminView>('dashboard');
  const [activeOrderTab, setActiveOrderTab] = useState<OrderStatus | 'TODOS'>('NOVO');
  
  // Products State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({ name: '', price: 0, category: '', subCategory: '', description: '', image: '', rating: 5.0 });
  
  // Customers State
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const customerFormRef = useRef<HTMLDivElement>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [dbStatus, setDbStatus] = useState<'checking' | 'firebase' | 'local'>('checking');
  
  // Imprimir Cupom State
  const [printingOrder, setPrintingOrder] = useState<Order | null>(null);

  // States para Formulários
  const [catName, setCatName] = useState('');
  const [subCatName, setSubCatName] = useState('');
  const [subCatParent, setSubCatParent] = useState('');
  const [compName, setCompName] = useState('');
  const [compPrice, setCompPrice] = useState('');
  const [selectedCompCats, setSelectedCompCats] = useState<string[]>([]);
  const [zipStart, setZipStart] = useState('');
  const [zipEnd, setZipEnd] = useState('');
  const [zipFee, setZipFee] = useState('');
  const [payName, setPayName] = useState('');

  const productImgInputRef = useRef<HTMLInputElement>(null);
  const logoImgInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const productFormRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkConnection = () => {
      const isConnected = dbService.isFirebaseConnected();
      setDbStatus(isConnected ? 'firebase' : 'local');
    };
    checkConnection();
  }, []);

  useEffect(() => {
    const audioUrl = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';
    audioRef.current = new Audio(audioUrl);
    audioRef.current.loop = true;
    return () => { if (audioRef.current) audioRef.current.pause(); };
  }, []);

  useEffect(() => {
    const hasNewOrders = orders.some(o => o.status === 'NOVO');
    if (hasNewOrders && audioEnabled) audioRef.current?.play().catch(() => {});
    else { audioRef.current?.pause(); if(audioRef.current) audioRef.current.currentTime = 0; }
  }, [orders, audioEnabled]);

  const handlePrint = (order: Order) => {
    // Truque para forçar o componente PrintableCoupon a desmontar e montar novamente
    // Isso garante que o useEffect de impressão seja acionado, mesmo se for o mesmo pedido
    setPrintingOrder(null);
    setTimeout(() => {
      setPrintingOrder(order);
    }, 50);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'product' | 'logo') => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsProcessingFile(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const compressed = await compressImage(ev.target?.result as string);
        if (target === 'logo') onUpdateLogo(compressed);
        else if (editingProduct) setEditingProduct({ ...editingProduct, image: compressed });
        else setNewProduct({ ...newProduct, image: compressed });
      } finally {
        setIsProcessingFile(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAiImageGen = async () => {
    const name = editingProduct ? editingProduct.name : (newProduct.name || '');
    if (!name) return alert("Digite o nome primeiro!");
    
    setIsGeneratingImage(true);
    try {
      const imageUrl = await generateProductImage(name);
      if (imageUrl) {
        const compressedAiImage = await compressImage(imageUrl);
        if (editingProduct) setEditingProduct({ ...editingProduct, image: compressedAiImage });
        else setNewProduct({ ...newProduct, image: compressedAiImage });
      }
    } finally { 
      setIsGeneratingImage(false); 
    }
  };

  const handleFullBackup = () => {
    const backupData = {
      backupDate: new Date().toLocaleString(),
      systemInfo: {
        note: "Este arquivo contem suas chaves de acesso e todo o banco de dados. Guarde em local seguro.",
        keys: firebaseConfig
      },
      database: {
        products,
        categories,
        subCategories,
        complements,
        orders,
        customers,
        zipRanges,
        paymentSettings,
        coupons,
        storeSettings: { isStoreOpen, logoUrl }
      }
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BACKUP_NILO_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredOrders = useMemo(() => {
    let list = [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (activeOrderTab !== 'TODOS') list = list.filter(o => o.status === activeOrderTab);
    return list;
  }, [orders, activeOrderTab]);

  const stats = useMemo(() => {
    const totalSales = orders.filter(o => o.status === 'FINALIZADO').reduce((acc, o) => acc + o.total, 0);
    const todayOrders = orders.filter(o => new Date(o.createdAt).toDateString() === new Date().toDateString());
    const ticketMedio = orders.length > 0 ? totalSales / (orders.filter(o => o.status === 'FINALIZADO').length || 1) : 0;
    return { totalSales, todayCount: todayOrders.length, ticketMedio };
  }, [orders]);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'pedidos', label: 'Pedidos', icon: '📋' },
    { id: 'produtos', label: 'Cardápio', icon: '🍔' },
    { id: 'categorias', label: 'Categorias', icon: '📁' },
    { id: 'subcategorias', label: 'Subcategorias', icon: '📂' },
    { id: 'adicionais', label: 'Extras', icon: '➕' },
    { id: 'entregas', label: 'Fretes', icon: '🚚' },
    { id: 'clientes', label: 'Clientes', icon: '👥' },
    { id: 'pagamentos', label: 'Pagamentos', icon: '💳' },
    { id: 'ajustes', label: 'Ajustes', icon: '⚙️' },
  ];

  const handleNavClick = (view: AdminView) => {
    setActiveView(view);
    setEditingProduct(null);
    setEditingCustomer(null);
    if (window.innerWidth < 768) {
      document.getElementById('admin-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSaveCustomer = () => {
    if (editingCustomer) {
      onUpdateCustomer(editingCustomer.id, editingCustomer);
      setEditingCustomer(null);
    }
  };

  const ALL_STATUSES: OrderStatus[] = ['NOVO', 'PREPARANDO', 'PRONTO PARA RETIRADA', 'SAIU PARA ENTREGA', 'FINALIZADO', 'CANCELADO'];

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50 w-full overflow-hidden text-left" onClick={() => !audioEnabled && setAudioEnabled(true)}>
      
      {/* CUPOM DE IMPRESSÃO - USANDO COMPONENTE DEDICADO */}
      <PrintableCoupon order={printingOrder} />

      {/* SIDEBAR */}
      <aside className="w-full md:w-64 bg-slate-900 text-white flex flex-col shrink-0 md:h-full h-auto max-h-[300px] md:max-h-full overflow-y-auto no-scrollbar border-r border-white/5 shadow-2xl z-20">
        <div className="p-8 flex flex-col items-center shrink-0">
          <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg mb-4 overflow-hidden border-2 border-white/10">
            {logoUrl ? <img src={logoUrl} className="w-full h-full object-cover" /> : <span className="text-3xl">🍔</span>}
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nilo Admin</span>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <button 
              key={item.id} 
              onClick={() => handleNavClick(item.id as AdminView)} 
              className={`w-full text-left px-4 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center gap-3 ${activeView === item.id ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:bg-white/5'}`}
            >
              <span className="text-base">{item.icon}</span> {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-white/5 space-y-2 shrink-0">
          <button onClick={onBackToSite} className="w-full py-3 bg-slate-800 text-white rounded-xl font-black text-[9px] uppercase tracking-widest">🌐 Ver Site</button>
          <button onClick={onLogout} className="w-full py-3 text-red-400 border border-red-500/20 rounded-xl font-black text-[9px] uppercase tracking-widest">🚪 Sair</button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main id="admin-content" className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="shrink-0 p-6 md:p-10 pb-0 flex flex-col sm:flex-row justify-between items-center gap-6 bg-slate-50 z-10">
          <div className="flex flex-col gap-2 w-full text-left">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">{activeView}</h2>
            <div className="flex flex-wrap items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border w-fit transition-all ${dbStatus === 'firebase' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                 <div className={`w-2.5 h-2.5 rounded-full ${dbStatus === 'firebase' ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`}></div>
                 <span className={`text-[9px] font-black uppercase tracking-widest ${dbStatus === 'firebase' ? 'text-emerald-700' : 'text-red-700'}`}>
                   {dbStatus === 'firebase' ? 'Nuvem Conectada' : 'Modo Offline'}
                 </span>
              </div>
              <button onClick={() => setAudioEnabled(!audioEnabled)} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest transition-all ${audioEnabled ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-500 border-red-200'}`}>
                {audioEnabled ? '🔔 Som Ativo' : '🔕 Som Mudo'}
              </button>
            </div>
          </div>
          <button onClick={onToggleStore} className={`whitespace-nowrap px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md ${isStoreOpen ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-red-600 text-white animate-pulse'}`}>
            {isStoreOpen ? '● Aberto' : '● Fechado'}
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-10 pb-32">
          {activeView === 'dashboard' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
              <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Vendas Totais</p>
                <h3 className="text-3xl font-black text-emerald-600">R$ {stats.totalSales.toFixed(2)}</h3>
              </div>
              <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Pedidos Hoje</p>
                <h3 className="text-3xl font-black text-slate-900">{stats.todayCount}</h3>
              </div>
              <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Ticket Médio</p>
                <h3 className="text-3xl font-black text-slate-900">R$ {stats.ticketMedio.toFixed(2)}</h3>
              </div>
            </div>
          )}

          {activeView === 'pedidos' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                <button onClick={() => setActiveOrderTab('TODOS')} className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeOrderTab === 'TODOS' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100'}`}>Todos</button>
                {ALL_STATUSES.map(s => (
                  <button key={s} onClick={() => setActiveOrderTab(s)} className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeOrderTab === s ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100'}`}>{s}</button>
                ))}
              </div>
              <div className="space-y-4">
                {filteredOrders.length === 0 ? (
                  <div className="text-center py-10 opacity-50">
                      <span className="text-4xl">📭</span>
                      <p className="mt-2 text-xs font-bold uppercase">Nenhum pedido encontrado</p>
                  </div>
                ) : filteredOrders.map(order => (
                  <div key={order.id} className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-100 shadow-sm text-left flex flex-col md:flex-row gap-8">
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-black bg-slate-900 text-white px-3 py-1 rounded-lg">#{order.id}</span>
                          <span className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest ${order.status === 'NOVO' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>{order.status}</span>
                        </div>
                        <button 
                          onClick={() => handlePrint(order)}
                          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-black transition-colors"
                        >
                          🖨️ Imprimir Cupom
                        </button>
                      </div>
                      <div className="space-y-1">
                        <p className="font-black text-xs text-slate-800 uppercase leading-none">{order.customerName}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight mt-2 italic">📍 {order.customerAddress}</p>
                      </div>
                      <div className="pt-4 border-t border-slate-50 space-y-2">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between text-[10px] font-bold uppercase">
                              <span className="text-slate-900">{item.quantity}x {item.name}</span>
                              <span className="text-slate-400">R$ {(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                            {item.selectedComplements?.map((c, ci) => (
                              <div key={ci} className="text-[8px] font-black text-slate-400 uppercase pl-3">+ {c.name}</div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="md:w-64 space-y-4">
                        <div className="flex flex-col items-end">
                          <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Total do Pedido</p>
                          <p className="text-2xl font-black text-emerald-600">R$ {order.total.toFixed(2)}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {ALL_STATUSES.filter(s => s !== order.status).map(s => (
                            <button key={s} onClick={() => onUpdateOrderStatus(order.id, s)} className="py-2 bg-slate-50 hover:bg-emerald-50 text-slate-500 hover:text-emerald-600 border border-slate-100 rounded-xl text-[8px] font-black uppercase tracking-tighter transition-all">{s}</button>
                          ))}
                        </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ... Resto do componente permanece igual ... */}
          {activeView === 'produtos' && (
            <div className="space-y-10 animate-fade-in">
              <div ref={productFormRef} className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
                <h3 className="text-sm font-black uppercase text-slate-400">{editingProduct ? '✏️ Editar Produto' : '🍔 Novo Produto'}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <input value={(editingProduct ? editingProduct.name : newProduct.name) || ''} onChange={e => editingProduct ? setEditingProduct({...editingProduct, name: e.target.value}) : setNewProduct({...newProduct, name: e.target.value})} placeholder="Nome" className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-emerald-500 outline-none" />
                    <textarea value={(editingProduct ? editingProduct.description : newProduct.description) || ''} onChange={e => editingProduct ? setEditingProduct({...editingProduct, description: e.target.value}) : setNewProduct({...newProduct, description: e.target.value})} placeholder="Descrição" className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-emerald-500 outline-none h-24 uppercase" />
                    <div className="grid grid-cols-2 gap-4">
                      <input type="number" value={(editingProduct ? editingProduct.price : newProduct.price)} onChange={e => editingProduct ? setEditingProduct({...editingProduct, price: Number(e.target.value)}) : setNewProduct({...newProduct, price: Number(e.target.value)})} placeholder="Preço" className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none" />
                      <select value={(editingProduct ? editingProduct.category : newProduct.category) || ''} onChange={e => editingProduct ? setEditingProduct({...editingProduct, category: e.target.value}) : setNewProduct({...newProduct, category: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none">
                          <option value="">Categoria...</option>
                          {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-4 flex flex-col justify-center items-center bg-slate-50 rounded-[32px] p-6 border-2 border-dashed min-h-[250px]">
                      {isProcessingFile || isGeneratingImage ? (
                        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                      ) : (editingProduct?.image || newProduct.image ? (
                        <img src={editingProduct?.image || newProduct.image} className="h-40 object-contain rounded-xl" />
                      ) : (
                        <span className="text-slate-300 text-4xl">📸</span>
                      ))}
                      <div className="flex gap-2">
                        <button onClick={() => productImgInputRef.current?.click()} className="px-4 py-2 bg-slate-200 rounded-lg text-[9px] font-black uppercase">Upload</button>
                        <button onClick={handleAiImageGen} disabled={isGeneratingImage} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-[9px] font-black uppercase">IA ✨</button>
                      </div>
                      <input type="file" ref={productImgInputRef} onChange={e => handleFileUpload(e, 'product')} className="hidden" accept="image/*" />
                  </div>
                </div>
                <button onClick={async () => {
                  setIsSaving(true);
                  try {
                    if (editingProduct) { await onUpdateProduct(editingProduct); setEditingProduct(null); } 
                    else { await onAddProduct(newProduct); setNewProduct({ name: '', price: 0, category: '', description: '', image: '', rating: 5.0 }); }
                  } finally { setIsSaving(false); }
                }} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest">{isSaving ? 'SALVANDO...' : 'CONFIRMAR'}</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {products.map(p => (
                  <div key={p.id} className="bg-white p-5 rounded-[32px] border border-slate-100 flex flex-col gap-4 text-left shadow-sm">
                    <div className="h-32 bg-slate-50 rounded-2xl overflow-hidden flex items-center justify-center p-2">
                        <img src={p.image} className="w-full h-full object-contain" />
                    </div>
                    <h4 className="font-black text-[10px] uppercase text-slate-800 truncate">{p.name}</h4>
                    <div className="flex gap-2 pt-2 border-t">
                      <button onClick={() => {
                        setEditingProduct(p);
                        productFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }} className="flex-1 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[8px] font-black uppercase">Editar</button>
                      <button onClick={() => onDeleteProduct(p.id)} className="flex-1 py-2 bg-red-50 text-red-500 rounded-xl text-[8px] font-black uppercase">Excluir</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {activeView === 'categorias' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Nova Categoria</label>
                  <input value={catName} onChange={e => setCatName(e.target.value)} placeholder="Ex: Bebidas" className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-emerald-500 outline-none" />
                </div>
                <button onClick={() => { if(catName) { onAddCategory(catName); setCatName(''); } }} className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-700 transition-all w-full md:w-auto">Adicionar</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map(c => (
                  <div key={c.id} className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm flex justify-between items-center">
                    <span className="font-black text-sm text-slate-700 uppercase">{c.name}</span>
                    <button onClick={() => onRemoveCategory(c.id)} className="text-red-400 hover:text-red-600 font-bold px-3 py-1 bg-red-50 rounded-lg text-[10px] uppercase">Excluir</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeView === 'subcategorias' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
                <h3 className="text-xs font-black uppercase text-slate-400">Nova Subcategoria</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <select value={subCatParent} onChange={e => setSubCatParent(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none">
                    <option value="">Selecione a Categoria Pai...</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <input value={subCatName} onChange={e => setSubCatName(e.target.value)} placeholder="Nome da Subcategoria" className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-emerald-500 outline-none" />
                </div>
                <button onClick={() => { if(subCatName && subCatParent) { onAddSubCategory(subCatParent, subCatName); setSubCatName(''); } }} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest">Adicionar</button>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {subCategories.map(s => {
                  const parent = categories.find(c => c.id === s.categoryId)?.name || 'Desconhecida';
                  return (
                    <div key={s.id} className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm flex justify-between items-center">
                      <div>
                        <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">{parent}</span>
                        <span className="font-black text-sm text-slate-700 uppercase">{s.name}</span>
                      </div>
                      <button onClick={() => onRemoveSubCategory(s.id)} className="text-red-400 hover:text-red-600 font-bold px-3 py-1 bg-red-50 rounded-lg text-[10px] uppercase">Excluir</button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeView === 'adicionais' && (
            <div className="space-y-6 animate-fade-in">
               <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
                 <h3 className="text-xs font-black uppercase text-slate-400">Novo Adicional</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <input value={compName} onChange={e => setCompName(e.target.value)} placeholder="Nome (ex: Bacon)" className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none" />
                   <input type="number" value={compPrice} onChange={e => setCompPrice(e.target.value)} placeholder="Preço (ex: 3.50)" className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none" />
                 </div>
                 <div className="flex gap-2 flex-wrap">
                   {categories.map(cat => (
                     <button 
                       key={cat.id}
                       onClick={() => {
                          if(selectedCompCats.includes(cat.id)) setSelectedCompCats(prev => prev.filter(id => id !== cat.id));
                          else setSelectedCompCats(prev => [...prev, cat.id]);
                       }}
                       className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase border transition-all ${selectedCompCats.includes(cat.id) ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-slate-400 border-slate-200'}`}
                     >
                       {cat.name}
                     </button>
                   ))}
                 </div>
                 <button onClick={() => { if(compName && compPrice) { onAddComplement(compName, Number(compPrice), selectedCompCats.length > 0 ? selectedCompCats : undefined); setCompName(''); setCompPrice(''); setSelectedCompCats([]); } }} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest">Adicionar</button>
               </div>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 {complements.map(comp => (
                   <div key={comp.id} className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm flex justify-between items-center">
                      <div>
                        <span className="font-black text-sm text-slate-700 uppercase block">{comp.name}</span>
                        <span className="text-xs font-bold text-emerald-600">R$ {comp.price.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => onToggleComplement(comp.id)} className={`w-10 h-6 rounded-full p-1 transition-colors ${comp.active ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                          <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${comp.active ? 'translate-x-4' : ''}`}></div>
                        </button>
                        <button onClick={() => onRemoveComplement(comp.id)} className="w-8 h-8 flex items-center justify-center bg-red-50 text-red-500 rounded-lg hover:bg-red-100">🗑️</button>
                      </div>
                   </div>
                 ))}
               </div>
            </div>
          )}

          {activeView === 'entregas' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
                <h3 className="text-xs font-black uppercase text-slate-400">Novo Intervalo de CEP</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input value={zipStart} onChange={e => setZipStart(e.target.value)} placeholder="Início (38000000)" className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none" />
                  <input value={zipEnd} onChange={e => setZipEnd(e.target.value)} placeholder="Fim (38999999)" className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none" />
                  <input type="number" value={zipFee} onChange={e => setZipFee(e.target.value)} placeholder="Taxa (R$)" className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none" />
                </div>
                <button onClick={() => { if(zipStart && zipEnd && zipFee) { onAddZipRange(zipStart, zipEnd, Number(zipFee)); setZipStart(''); setZipEnd(''); setZipFee(''); } }} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest">Adicionar Região</button>
              </div>
              <div className="space-y-3">
                {zipRanges.map(z => (
                  <div key={z.id} className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm flex justify-between items-center">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                       <div className="flex items-center gap-2">
                         <span className="text-[10px] font-black uppercase bg-slate-100 px-2 py-1 rounded text-slate-500">Início</span>
                         <span className="font-bold text-slate-700">{z.start}</span>
                       </div>
                       <div className="flex items-center gap-2">
                         <span className="text-[10px] font-black uppercase bg-slate-100 px-2 py-1 rounded text-slate-500">Fim</span>
                         <span className="font-bold text-slate-700">{z.end}</span>
                       </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-black text-emerald-600">R$ {z.fee.toFixed(2)}</span>
                      <button onClick={() => onRemoveZipRange(z.id)} className="text-red-400 hover:text-red-600">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {activeView === 'clientes' && (
            <div className="space-y-6 animate-fade-in">
              {/* Formulário de Edição de Cliente */}
              {editingCustomer && (
                <div ref={customerFormRef} className="bg-white p-8 rounded-[32px] border border-emerald-100 shadow-md space-y-4 mb-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-black uppercase text-slate-400">✏️ Editar Cliente</h3>
                    <button onClick={() => setEditingCustomer(null)} className="text-slate-400 hover:text-slate-600">✕</button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Nome</label>
                      <input value={editingCustomer.name} onChange={e => setEditingCustomer({...editingCustomer, name: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl font-bold border outline-none focus:border-emerald-500" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Telefone</label>
                      <input value={editingCustomer.phone} onChange={e => setEditingCustomer({...editingCustomer, phone: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl font-bold border outline-none focus:border-emerald-500" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Email (ID)</label>
                      <input value={editingCustomer.email} disabled className="w-full p-3 bg-slate-100 rounded-xl font-bold border outline-none text-slate-400 cursor-not-allowed" />
                    </div>
                     <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-400 ml-1">CEP</label>
                      <input value={editingCustomer.zipCode} onChange={e => setEditingCustomer({...editingCustomer, zipCode: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl font-bold border outline-none focus:border-emerald-500" />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Endereço Completo</label>
                      <input value={editingCustomer.address} onChange={e => setEditingCustomer({...editingCustomer, address: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl font-bold border outline-none focus:border-emerald-500" />
                    </div>
                  </div>
                  <button onClick={handleSaveCustomer} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-700">Salvar Alterações</button>
                </div>
              )}

              <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="pb-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Cliente</th>
                      <th className="pb-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Contato</th>
                      <th className="pb-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Status</th>
                      <th className="pb-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {customers.map(cust => (
                      <tr key={cust.id} className="group hover:bg-slate-50 transition-colors">
                        <td className="py-4 pr-4 align-top">
                          <span className="block font-bold text-slate-800 text-sm">{cust.name}</span>
                          <span className="text-[10px] text-slate-400">{cust.email}</span>
                          <span className="block text-[10px] text-slate-500 mt-1 max-w-[200px] truncate">{cust.address}</span>
                        </td>
                        <td className="py-4 pr-4 align-top font-bold text-slate-600 text-xs">{cust.phone}</td>
                        <td className="py-4 pr-4 align-top">
                           {cust.isBlocked ? (
                             <span className="px-2 py-1 bg-red-100 text-red-600 rounded-md text-[9px] font-black uppercase tracking-wide">Bloqueado</span>
                           ) : (
                             <span className="px-2 py-1 bg-emerald-100 text-emerald-600 rounded-md text-[9px] font-black uppercase tracking-wide">Ativo</span>
                           )}
                           <div className="mt-2 text-[9px] font-bold text-slate-400">{cust.totalOrders || 0} Pedidos</div>
                        </td>
                        <td className="py-4 align-top text-right">
                          <div className="flex items-center justify-end gap-2">
                             <button 
                               onClick={() => {
                                 setEditingCustomer(cust);
                                 customerFormRef.current?.scrollIntoView({ behavior: 'smooth' });
                               }}
                               className="px-3 py-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 text-[9px] font-black uppercase transition-colors"
                             >
                               Editar
                             </button>
                             <button 
                               onClick={() => onUpdateCustomer(cust.id, { isBlocked: !cust.isBlocked })}
                               className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase transition-colors ${cust.isBlocked ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'}`}
                             >
                               {cust.isBlocked ? 'Desbloquear' : 'Bloquear'}
                             </button>
                             <button 
                               onClick={() => {
                                 if (confirm(`Tem certeza que deseja excluir o cliente ${cust.name}? Isso não pode ser desfeito.`)) {
                                   onDeleteCustomer(cust.id);
                                 }
                               }}
                               className="px-3 py-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 text-[9px] font-black uppercase transition-colors"
                             >
                               Excluir
                             </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {customers.length === 0 && <p className="text-center py-10 text-slate-400 font-bold uppercase text-xs">Nenhum cliente cadastrado</p>}
              </div>
            </div>
          )}

          {activeView === 'pagamentos' && (
            <div className="space-y-6 animate-fade-in">
               <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
                 <h3 className="text-xs font-black uppercase text-slate-400">Novo Método</h3>
                 <div className="flex gap-4">
                   <input value={payName} onChange={e => setPayName(e.target.value)} placeholder="Nome (ex: Pix, Cartão)" className="flex-1 p-4 bg-slate-50 rounded-2xl font-bold outline-none" />
                   <button onClick={() => { if(payName) { onAddPaymentMethod(payName, 'DELIVERY'); setPayName(''); } }} className="px-8 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest">Adicionar</button>
                 </div>
               </div>
               <div className="grid grid-cols-1 gap-3">
                  {paymentSettings.map(p => (
                    <div key={p.id} className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm flex justify-between items-center">
                      <span className="font-black text-sm text-slate-700 uppercase">{p.name}</span>
                      <div className="flex items-center gap-3">
                        <button onClick={() => onTogglePaymentMethod(p.id)} className={`w-12 h-7 rounded-full p-1 transition-colors ${p.enabled ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                          <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${p.enabled ? 'translate-x-5' : ''}`}></div>
                        </button>
                        <button onClick={() => onRemovePaymentMethod(p.id)} className="w-8 h-8 flex items-center justify-center bg-red-50 text-red-500 rounded-lg hover:bg-red-100">🗑️</button>
                      </div>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {activeView === 'ajustes' && (
            <div className="max-w-2xl animate-fade-in space-y-8 text-left pb-10">
              <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
                  <h3 className="text-xs font-black uppercase text-slate-400">Identidade Visual</h3>
                  <div className="flex items-center gap-6">
                    <div className="w-32 h-32 bg-slate-50 rounded-[40px] flex items-center justify-center overflow-hidden border-2 border-dashed border-slate-200">
                        {logoUrl ? <img src={logoUrl} className="w-full h-full object-cover" /> : <span className="text-4xl">🖼️</span>}
                    </div>
                    <button onClick={() => logoImgInputRef.current?.click()} className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest">Alterar Logo</button>
                    <input type="file" ref={logoImgInputRef} onChange={e => handleFileUpload(e, 'logo')} className="hidden" accept="image/*" />
                  </div>
              </div>
              <div className="bg-white p-8 rounded-[32px] border border-emerald-100 shadow-sm space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">💾</span>
                    <h3 className="text-sm font-black uppercase text-emerald-600">Backup Completo</h3>
                  </div>
                  <button onClick={handleFullBackup} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest">Baixar Backup (JSON)</button>
              </div>
              <div className="bg-white p-8 rounded-[32px] border border-blue-100 shadow-sm space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">☁️</span>
                    <h3 className="text-sm font-black uppercase text-blue-600">Reconectar Nuvem</h3>
                  </div>
                  <button onClick={() => dbService.forceSync()} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest">Forçar Sincronização</button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
