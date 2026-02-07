
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Product, Order, Customer, ZipRange, CategoryItem, SubCategoryItem, OrderStatus, Complement, PaymentSettings, Coupon } from '../types.ts';
import { compressImage } from '../services/imageService.ts';
import { dbService } from '../services/dbService.ts';
import { generateProductImage } from '../services/geminiService.ts';

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
}

type AdminView = 'dashboard' | 'pedidos' | 'produtos' | 'categorias' | 'subcategorias' | 'adicionais' | 'entregas' | 'clientes' | 'pagamentos' | 'ajustes';

export const AdminPanel: React.FC<AdminPanelProps> = (props) => {
  const { 
    products, orders, customers, zipRanges, categories, subCategories, complements, coupons,
    isStoreOpen, onToggleStore, logoUrl, onUpdateLogo, onAddProduct, onDeleteProduct, 
    onUpdateProduct, onUpdateOrderStatus, onUpdateCustomer, onAddCategory, onRemoveCategory, onAddSubCategory, onRemoveSubCategory,
    onAddComplement, onToggleComplement, onRemoveComplement, onAddZipRange, onRemoveZipRange,
    onAddCoupon, onRemoveCoupon, onUpdatePaymentSettings,
    onLogout, onBackToSite,
    paymentSettings, onTogglePaymentMethod, onAddPaymentMethod, onRemovePaymentMethod
  } = props;

  const [activeView, setActiveView] = useState<AdminView>('dashboard');
  const [activeOrderTab, setActiveOrderTab] = useState<OrderStatus | 'TODOS'>('NOVO');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({ name: '', price: 0, category: '', subCategory: '', description: '', image: '', rating: 5.0 });
  
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [catName, setCatName] = useState('');
  const [subCatName, setSubCatName] = useState('');
  const [subCatParent, setSubCatParent] = useState('');
  const [compName, setCompName] = useState('');
  const [compPrice, setCompPrice] = useState('');
  const [selectedCompCats, setSelectedCompCats] = useState<string[]>([]);
  const [zipStart, setZipStart] = useState('');
  const [zipEnd, setZipEnd] = useState('');
  const [zipFee, setZipFee] = useState('');

  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [payName, setPayName] = useState('');
  const [payType, setPayType] = useState<'ONLINE' | 'DELIVERY'>('DELIVERY');

  const productImgInputRef = useRef<HTMLInputElement>(null);
  const logoImgInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isSystemOnline = dbService.isFirebaseConnected();

  useEffect(() => {
    const audioUrl = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';
    audioRef.current = new Audio(audioUrl);
    audioRef.current.loop = true;
    return () => {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    };
  }, []);

  useEffect(() => {
    const hasNewOrders = orders.some(o => o.status === 'NOVO');
    if (hasNewOrders && audioEnabled) {
      audioRef.current?.play().catch(() => {});
    } else {
      audioRef.current?.pause();
      if (audioRef.current) audioRef.current.currentTime = 0;
    }
  }, [orders, audioEnabled]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'product' | 'logo') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const compressed = await compressImage(ev.target?.result as string);
      if (target === 'logo') onUpdateLogo(compressed);
      else if (editingProduct) setEditingProduct({ ...editingProduct, image: compressed });
      else setNewProduct({ ...newProduct, image: compressed });
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
        if (editingProduct) setEditingProduct({ ...editingProduct, image: imageUrl });
        else setNewProduct({ ...newProduct, image: imageUrl });
      }
    } catch (e) { console.error(e); } finally { setIsGeneratingImage(false); }
  };

  const handleEditClick = (p: Product) => {
    setEditingProduct(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteClick = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este item permanentemente?')) {
      onDeleteProduct(id);
    }
  };

  const filteredOrders = useMemo(() => {
    let list = [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (activeOrderTab !== 'TODOS') list = list.filter(o => o.status === activeOrderTab);
    return list;
  }, [orders, activeOrderTab]);

  const stats = useMemo(() => {
    const totalSales = orders.filter(o => o.status === 'FINALIZADO').reduce((acc, o) => acc + o.total, 0);
    const todayOrders = orders.filter(o => new Date(o.createdAt).toDateString() === new Date().toDateString());
    const ticketMedio = orders.length > 0 ? totalSales / orders.filter(o => o.status === 'FINALIZADO').length : 0;
    
    const productRanking: Record<string, number> = {};
    orders.forEach(o => o.items.forEach(i => {
      productRanking[i.name] = (productRanking[i.name] || 0) + i.quantity;
    }));
    const topProducts = Object.entries(productRanking).sort((a,b) => b[1] - a[1]).slice(0, 5);

    return { totalSales, todayCount: todayOrders.length, ticketMedio, topProducts };
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

  const ALL_STATUSES: OrderStatus[] = ['NOVO', 'PREPARANDO', 'PRONTO PARA RETIRADA', 'SAIU PARA ENTREGA', 'FINALIZADO', 'CANCELADO'];

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 w-full overflow-hidden text-left" onClick={() => !audioEnabled && setAudioEnabled(true)}>
      <aside className="w-full md:w-64 bg-slate-900 text-white flex flex-col shrink-0 border-r border-white/5 h-screen sticky top-0 overflow-y-auto no-scrollbar">
        <div className="p-8 flex flex-col items-center">
          <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg mb-4 overflow-hidden border-2 border-white/10">
            {logoUrl ? <img src={logoUrl} className="w-full h-full object-cover" /> : <span className="text-3xl">🍔</span>}
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nilo Admin</span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => (
            <button key={item.id} onClick={() => { setActiveView(item.id as any); setEditingProduct(null); }} className={`w-full text-left px-4 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center gap-3 ${activeView === item.id ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:bg-white/5'}`}>
              <span className="text-base">{item.icon}</span> {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-white/5 space-y-2">
          <button onClick={onBackToSite} className="w-full py-3 bg-slate-800 text-white rounded-xl font-black text-[9px] uppercase tracking-widest">🌐 Ver Site</button>
          <button onClick={onLogout} className="w-full py-3 text-red-400 border border-red-500/20 rounded-xl font-black text-[9px] uppercase tracking-widest">🚪 Sair</button>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-10 overflow-y-auto no-scrollbar pb-32">
        <header className="flex flex-col sm:flex-row justify-between items-center mb-10 bg-white p-6 rounded-[28px] shadow-sm border border-slate-100 gap-6">
          <div className="flex flex-col gap-2 w-full">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">{activeView}</h2>
            <div className="flex flex-wrap items-center gap-3">
              <div className={`flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border w-fit`}>
                 <div className={`w-2.5 h-2.5 rounded-full ${isSystemOnline ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`}></div>
                 <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">Servidor Online</span>
              </div>
              <button onClick={() => setAudioEnabled(!audioEnabled)} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest transition-all ${audioEnabled ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-500 border-red-200'}`}>
                {audioEnabled ? '🔔 Alerta Ativo' : '🔕 Alerta Mudo'}
              </button>
            </div>
          </div>
          <button onClick={onToggleStore} className={`whitespace-nowrap px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md ${isStoreOpen ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-red-600 text-white animate-pulse'}`}>
            {isStoreOpen ? '● Aberto' : '● Fechado'}
          </button>
        </header>

        {activeView === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
             <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm text-left">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Vendas Totais</p>
               <h3 className="text-3xl font-black text-emerald-600">R$ {stats.totalSales.toFixed(2)}</h3>
             </div>
             <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm text-left">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Pedidos Hoje</p>
               <h3 className="text-3xl font-black text-slate-900">{stats.todayCount}</h3>
             </div>
             <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm text-left">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Ticket Médio</p>
               <h3 className="text-3xl font-black text-slate-900">R$ {stats.ticketMedio.toFixed(2)}</h3>
             </div>
             <div className="md:col-span-3 bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm text-left">
               <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">🏆 Produtos Mais Vendidos</h4>
               <div className="space-y-4">
                 {stats.topProducts.map(([name, qty], i) => (
                   <div key={i} className="flex justify-between items-center py-3 border-b border-slate-50 last:border-0">
                     <span className="font-bold text-slate-700 text-xs">{name}</span>
                     <span className="font-black text-emerald-600">{qty}x</span>
                   </div>
                 ))}
               </div>
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
              {filteredOrders.map(order => (
                <div key={order.id} className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-100 shadow-sm text-left flex flex-col md:flex-row gap-8">
                   <div className="flex-1 space-y-4">
                     <div className="flex items-center gap-3">
                       <span className="text-[10px] font-black bg-slate-900 text-white px-3 py-1 rounded-lg">#{order.id}</span>
                       <span className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest ${order.status === 'NOVO' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>{order.status}</span>
                     </div>
                     <div className="space-y-1">
                       <p className="font-black text-xs text-slate-800 uppercase leading-none">{order.customerName}</p>
                       <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">{order.customerPhone} | {order.paymentMethod}</p>
                       <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight mt-2 italic">📍 {order.customerAddress}</p>
                     </div>
                     <div className="pt-4 border-t border-slate-50 space-y-2">
                       {order.items.map((item, idx) => (
                         <div key={idx} className="flex justify-between text-[10px] font-bold uppercase">
                           <span>{item.quantity}x {item.name}</span>
                           <span className="text-slate-400">R$ {(item.price * item.quantity).toFixed(2)}</span>
                         </div>
                       ))}
                     </div>
                   </div>
                   <div className="md:w-64 space-y-4">
                      <div className="flex flex-col items-end">
                        <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Total do Pedido</p>
                        <p className="text-2xl font-black text-emerald-600">R$ {order.total.toFixed(2)}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Mudar Status:</p>
                        <div className="grid grid-cols-2 gap-2">
                          {ALL_STATUSES.filter(s => s !== order.status).map(s => (
                            <button key={s} onClick={() => onUpdateOrderStatus(order.id, s)} className="py-2 bg-slate-50 hover:bg-emerald-50 text-slate-500 hover:text-emerald-600 border border-slate-100 rounded-xl text-[8px] font-black uppercase tracking-tighter transition-all">{s}</button>
                          ))}
                        </div>
                      </div>
                   </div>
                </div>
              ))}
              {filteredOrders.length === 0 && (
                <div className="py-20 text-center opacity-40">
                  <p className="text-[10px] font-black uppercase tracking-widest">Nenhum pedido encontrado nesta categoria.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeView === 'produtos' && (
          <div className="space-y-10 animate-fade-in">
            <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
               <div className="flex justify-between items-center">
                 <h3 className="text-sm font-black uppercase text-slate-400">{editingProduct ? '✏️ Editando Produto' : '🍔 Cadastrar Novo'}</h3>
                 {editingProduct && (
                   <button onClick={() => setEditingProduct(null)} className="text-[10px] font-black uppercase text-red-500 tracking-widest">Cancelar Edição</button>
                 )}
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-4">
                   <input value={editingProduct ? editingProduct.name : newProduct.name} onChange={e => editingProduct ? setEditingProduct({...editingProduct, name: e.target.value}) : setNewProduct({...newProduct, name: e.target.value})} placeholder="Nome do Lanche" className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-emerald-500" />
                   <textarea value={editingProduct ? editingProduct.description : newProduct.description} onChange={e => editingProduct ? setEditingProduct({...editingProduct, description: e.target.value}) : setNewProduct({...newProduct, description: e.target.value})} placeholder="Descrição" className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-emerald-500 h-24 uppercase" />
                   
                   <div className="grid grid-cols-2 gap-4">
                     <input type="number" value={editingProduct ? editingProduct.price : newProduct.price} onChange={e => editingProduct ? setEditingProduct({...editingProduct, price: Number(e.target.value)}) : setNewProduct({...newProduct, price: Number(e.target.value)})} placeholder="Preço" className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-emerald-500" />
                     <select value={editingProduct ? editingProduct.category : newProduct.category} onChange={e => editingProduct ? setEditingProduct({...editingProduct, category: e.target.value, subCategory: ''}) : setNewProduct({...newProduct, category: e.target.value, subCategory: ''})} className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-emerald-500">
                        <option value="">Categoria...</option>
                        {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                     </select>
                   </div>
                   {((editingProduct ? editingProduct.category : newProduct.category)) && (
                     <select 
                       value={editingProduct ? editingProduct.subCategory : newProduct.subCategory} 
                       onChange={e => editingProduct ? setEditingProduct({...editingProduct, subCategory: e.target.value}) : setNewProduct({...newProduct, subCategory: e.target.value})}
                       className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-emerald-500 animate-in slide-in-from-top-2"
                     >
                       <option value="">Selecione a Subcategoria...</option>
                       {subCategories
                         .filter(s => s.categoryId === (categories.find(c => c.name === (editingProduct ? editingProduct.category : newProduct.category))?.id))
                         .map(s => <option key={s.id} value={s.name}>{s.name}</option>)
                       }
                     </select>
                   )}
                 </div>
                 <div className="space-y-4 flex flex-col justify-center items-center bg-slate-50 rounded-[32px] p-6 border-2 border-dashed border-slate-200">
                    {editingProduct?.image || newProduct.image ? <img src={editingProduct?.image || newProduct.image} className="h-40 object-contain rounded-xl" /> : <span className="text-slate-300 text-4xl">📸</span>}
                    <div className="flex gap-2 mt-4">
                      <button onClick={() => productImgInputRef.current?.click()} className="px-4 py-2 bg-slate-200 rounded-lg text-[9px] font-black uppercase">Upload</button>
                      <button onClick={handleAiImageGen} disabled={isGeneratingImage} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-[9px] font-black uppercase">IA ✨</button>
                    </div>
                    <input type="file" ref={productImgInputRef} onChange={e => handleFileUpload(e, 'product')} className="hidden" />
                 </div>
               </div>
               <button onClick={async () => {
                 setIsSaving(true);
                 try {
                   if (editingProduct) { await onUpdateProduct(editingProduct); setEditingProduct(null); } 
                   else { await onAddProduct(newProduct); setNewProduct({ name: '', price: 0, category: '', subCategory: '', description: '', image: '', rating: 5.0 }); }
                 } catch (err) { alert('Erro ao salvar produto.'); }
                 finally { setIsSaving(false); }
               }} className={`w-full py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${isSaving ? 'bg-slate-400' : 'bg-slate-900 text-white shadow-xl hover:bg-black active:translate-y-1'}`}>
                 {isSaving ? 'SALVANDO...' : (editingProduct ? 'ATUALIZAR PRODUTO' : 'CADASTRAR PRODUTO')}
               </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map(p => (
                <div key={p.id} className="bg-white p-5 rounded-[32px] border border-slate-100 flex flex-col gap-4 text-left shadow-sm group hover:shadow-md transition-all">
                   <div className="h-32 bg-slate-50 rounded-2xl overflow-hidden flex items-center justify-center p-2 relative">
                      <img src={p.image} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500" />
                      <div className="absolute top-2 right-2 bg-white/90 px-2 py-1 rounded-lg text-[8px] font-black uppercase text-emerald-600 border border-emerald-100">R$ {p.price.toFixed(2)}</div>
                   </div>
                   <div className="flex-1 space-y-1">
                      <h4 className="font-black text-[10px] uppercase text-slate-800 truncate leading-tight">{p.name}</h4>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest line-clamp-1">{p.category} {p.subCategory ? `> ${p.subCategory}` : ''}</p>
                      <div className="flex gap-2 pt-3 border-t border-slate-50 mt-2">
                        <button onClick={() => handleEditClick(p)} className="flex-1 py-2.5 bg-emerald-50 text-emerald-600 rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all">Editar</button>
                        <button onClick={() => handleDeleteClick(p.id)} className="flex-1 py-2.5 bg-red-50 text-red-500 rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">Excluir</button>
                      </div>
                   </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeView === 'categorias' && (
          <div className="max-w-2xl animate-fade-in space-y-8">
            <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
               <h3 className="text-xs font-black uppercase text-slate-400">Nova Categoria</h3>
               <div className="flex gap-3">
                  <input value={catName} onChange={e => setCatName(e.target.value)} placeholder="Ex: Hambúrgueres" className="flex-1 p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-emerald-500" />
                  <button onClick={() => { onAddCategory(catName); setCatName(''); }} className="px-8 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px]">Adicionar</button>
               </div>
            </div>
            <div className="grid gap-2">
              {categories.map(c => (
                <div key={c.id} className="bg-white p-4 rounded-2xl border border-slate-50 flex justify-between items-center shadow-sm">
                   <span className="font-bold text-slate-700 uppercase text-xs">{c.name}</span>
                   <button onClick={() => onRemoveCategory(c.id)} className="text-red-400 hover:text-red-600 transition-colors">✕</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeView === 'subcategorias' && (
          <div className="max-w-2xl animate-fade-in space-y-8">
            <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
               <h3 className="text-xs font-black uppercase text-slate-400">Nova Subcategoria</h3>
               <select value={subCatParent} onChange={e => setSubCatParent(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-emerald-500">
                  <option value="">Selecione a Categoria Pai...</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
               </select>
               <div className="flex gap-3">
                  <input value={subCatName} onChange={e => setSubCatName(e.target.value)} placeholder="Ex: Artesanais Gourmet" className="flex-1 p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-emerald-500" />
                  <button onClick={() => { if(subCatParent && subCatName) { onAddSubCategory(subCatParent, subCatName); setSubCatName(''); } }} className="px-8 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px]">Adicionar</button>
               </div>
            </div>
            {categories.map(cat => (
              <div key={cat.id} className="space-y-2 text-left">
                 <h4 className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">{cat.name}</h4>
                 <div className="grid gap-2">
                    {subCategories.filter(s => s.categoryId === cat.id).map(sub => (
                      <div key={sub.id} className="bg-white p-4 rounded-2xl border border-slate-50 flex justify-between items-center shadow-sm">
                         <span className="font-bold text-slate-700 uppercase text-xs">{sub.name}</span>
                         <button onClick={() => onRemoveSubCategory(sub.id)} className="text-red-400">✕</button>
                      </div>
                    ))}
                 </div>
              </div>
            ))}
          </div>
        )}

        {activeView === 'adicionais' && (
          <div className="max-w-2xl animate-fade-in space-y-8">
            <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
               <h3 className="text-xs font-black uppercase text-slate-400">Novo Adicional (Extras)</h3>
               <div className="grid grid-cols-2 gap-3">
                  <input value={compName} onChange={e => setCompName(e.target.value)} placeholder="Nome" className="p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-emerald-500" />
                  <input value={compPrice} onChange={e => setCompPrice(e.target.value)} type="number" placeholder="Preço (R$)" className="p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-emerald-500" />
               </div>
               <div className="space-y-2">
                 <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Vincular às Categorias (Opcional):</p>
                 <div className="flex flex-wrap gap-2">
                    {categories.map(cat => (
                      <button 
                        key={cat.id} 
                        onClick={() => setSelectedCompCats(prev => prev.includes(cat.id) ? prev.filter(id => id !== cat.id) : [...prev, cat.id])}
                        className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all border ${selectedCompCats.includes(cat.id) ? 'bg-emerald-600 text-white border-emerald-700 shadow-md' : 'bg-slate-50 text-slate-400 border-slate-100'}`}
                      >
                        {cat.name}
                      </button>
                    ))}
                 </div>
               </div>
               <button onClick={() => { if(compName && compPrice) { onAddComplement(compName, Number(compPrice), selectedCompCats); setCompName(''); setCompPrice(''); setSelectedCompCats([]); } }} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px]">Cadastrar Adicional</button>
            </div>
            <div className="grid gap-3">
               {complements.map(comp => (
                 <div key={comp.id} className="bg-white p-5 rounded-3xl border border-slate-50 flex justify-between items-center shadow-sm text-left">
                    <div className="flex-1">
                       <p className="font-black text-xs text-slate-800 uppercase tracking-tight">{comp.name}</p>
                       <p className="text-[10px] font-bold text-emerald-600">R$ {comp.price.toFixed(2)}</p>
                    </div>
                    <div className="flex gap-4 items-center">
                       <button onClick={() => onToggleComplement(comp.id)} className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase ${comp.active ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>{comp.active ? 'Ativo' : 'Inativo'}</button>
                       <button onClick={() => onRemoveComplement(comp.id)} className="text-red-400 hover:text-red-600">✕</button>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        )}

        {activeView === 'entregas' && (
          <div className="max-w-3xl animate-fade-in space-y-8">
            <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
               <h3 className="text-xs font-black uppercase text-slate-400">Nova Taxa de Entrega</h3>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input value={zipStart} onChange={e => setZipStart(e.target.value)} placeholder="CEP Inicial" className="p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-emerald-500" />
                  <input value={zipEnd} onChange={e => setZipEnd(e.target.value)} placeholder="CEP Final" className="p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-emerald-500" />
                  <input value={zipFee} onChange={e => setZipFee(e.target.value)} type="number" placeholder="Taxa (R$)" className="p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-emerald-500" />
               </div>
               <button onClick={() => { if(zipStart && zipEnd && zipFee) { onAddZipRange(zipStart, zipEnd, Number(zipFee)); setZipStart(''); setZipEnd(''); setZipFee(''); } }} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px]">Salvar Região</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               {zipRanges.map(range => (
                 <div key={range.id} className="bg-white p-6 rounded-3xl border border-slate-100 flex justify-between items-center shadow-sm text-left">
                    <div>
                       <p className="text-[9px] font-black uppercase text-slate-400">De {range.start} a {range.end}</p>
                       <p className="text-xl font-black text-emerald-600">R$ {range.fee.toFixed(2)}</p>
                    </div>
                    <button onClick={() => onRemoveZipRange(range.id)} className="text-red-400 hover:text-red-600 p-2">✕</button>
                 </div>
               ))}
            </div>
          </div>
        )}

        {activeView === 'clientes' && (
          <div className="space-y-4 animate-fade-in">
             {customers.map(c => (
               <div key={c.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 text-left">
                 <div className="flex items-center gap-4 flex-1">
                   <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-xl shadow-inner">👤</div>
                   <div>
                     <h4 className="font-black text-slate-900 uppercase text-[11px] tracking-tight">{c.name}</h4>
                     <p className="text-[10px] text-slate-400 font-bold tracking-widest">{c.email} | {c.phone}</p>
                   </div>
                 </div>
                 <div className="flex gap-10 items-center">
                    <div className="text-center">
                       <p className="text-[8px] font-black uppercase text-slate-400 mb-1">Total Pedidos</p>
                       <p className="font-black text-emerald-600 text-lg">{c.totalOrders || 0}</p>
                    </div>
                    <button onClick={() => onUpdateCustomer(c.id, { isBlocked: !c.isBlocked })} className={`px-5 py-2.5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${c.isBlocked ? 'bg-red-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>
                      {c.isBlocked ? 'Bloqueado' : 'Bloquear'}
                    </button>
                 </div>
               </div>
             ))}
          </div>
        )}

        {activeView === 'pagamentos' && (
          <div className="max-w-3xl animate-fade-in space-y-8">
            <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">Configurar Métodos de Pagamento</h3>
              
              {/* Form for adding new payment method */}
              {isAddingPayment ? (
                <div className="p-6 bg-slate-50 rounded-[24px] border border-slate-100 space-y-4 animate-in slide-in-from-top-2 text-left">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input 
                      value={payName} 
                      onChange={e => setPayName(e.target.value)} 
                      placeholder="Nome (Ex: Pix, Cartão Débito)" 
                      className="p-4 bg-white rounded-xl font-bold outline-none border-2 border-transparent focus:border-emerald-500" 
                    />
                    <select 
                      value={payType} 
                      onChange={e => setPayType(e.target.value as any)} 
                      className="p-4 bg-white rounded-xl font-bold outline-none border-2 border-transparent focus:border-emerald-500"
                    >
                      <option value="DELIVERY">Pagamento na Entrega</option>
                      <option value="ONLINE">Pagamento Online</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => { 
                        if (payName) { 
                          onAddPaymentMethod(payName, payType); 
                          setPayName(''); 
                          setIsAddingPayment(false); 
                        } 
                      }} 
                      className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-black uppercase text-[10px]"
                    >
                      Confirmar
                    </button>
                    <button 
                      onClick={() => setIsAddingPayment(false)} 
                      className="flex-1 py-3 bg-slate-200 text-slate-600 rounded-xl font-black uppercase text-[10px]"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => setIsAddingPayment(true)} 
                  className="w-full py-5 bg-emerald-600 text-white rounded-[24px] font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all"
                >
                  + Nova Forma de Pagamento
                </button>
              )}

              <div className="space-y-6">
                {paymentSettings.map(pay => (
                  <div key={pay.id} className="bg-slate-50 p-6 rounded-[24px] border border-slate-100 space-y-4 shadow-inner text-left">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-[11px] uppercase text-slate-700 tracking-tight">{pay.name} ({pay.type})</span>
                      <div className="flex gap-3">
                        <button onClick={() => onTogglePaymentMethod(pay.id)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all shadow-sm ${pay.enabled ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                          {pay.enabled ? 'Ativo' : 'Inativo'}
                        </button>
                        <button onClick={() => onRemovePaymentMethod(pay.id)} className="text-red-500 hover:text-red-700 font-black text-xs">✕</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeView === 'ajustes' && (
          <div className="max-w-2xl animate-fade-in space-y-8">
             <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
                <h3 className="text-xs font-black uppercase text-slate-400">Identidade Visual</h3>
                <div className="flex items-center gap-6">
                   <div className="w-32 h-32 bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden shadow-inner shrink-0">
                      {logoUrl ? <img src={logoUrl} className="w-full h-full object-cover" /> : <span className="text-4xl text-slate-300">🖼️</span>}
                   </div>
                   <div className="space-y-3">
                      <button onClick={() => logoImgInputRef.current?.click()} className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-200">Alterar Logo</button>
                      <input type="file" ref={logoImgInputRef} onChange={e => handleFileUpload(e, 'logo')} className="hidden" />
                   </div>
                </div>
             </div>

             {/* GUIA DE CONFIGURAÇÃO DE DOMÍNIO */}
             <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🌐</span>
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">Configuração de Domínio Próprio</h3>
                  </div>
                  <button 
                    onClick={() => window.open('https://dnschecker.org/#A/nilolanches.com.br', '_blank')}
                    className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-emerald-200 transition-all flex items-center gap-2"
                  >
                    🔍 Verificar Propagação
                  </button>
                </div>
                
                <div className="p-5 bg-amber-50 rounded-2xl border border-amber-100 space-y-3">
                  <p className="text-[10px] font-black text-amber-700 uppercase leading-relaxed">
                    ⚠️ Importante: Para não perder seus e-mails, edite apenas os registros abaixo na zona DNS (Zone Editor) da sua HOSPEDAGEM.
                  </p>
                  <p className="text-[10px] font-black text-red-700 uppercase leading-relaxed bg-white/50 p-2 rounded-lg">
                    🚫 NÃO ALTERE OS NAMESERVERS (NS). Se o painel pedir para trocar "NS" por números de IP, ignore. Registros NS só aceitam letras (ex: ns1.host.com).
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <p className="text-[9px] font-black uppercase text-slate-400">1. Vá em "Zone Editor" e edite o registro Tipo A</p>
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 font-mono text-xs">
                      <div className="flex flex-col">
                        <span className="text-[8px] text-slate-400 uppercase">Nome/Host</span>
                        <span className="text-slate-500">@ ou nilolanches.com.br</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[8px] text-slate-400 uppercase">Valor/IP</span>
                        <span className="font-bold text-emerald-600">76.76.21.21</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <p className="text-[9px] font-black uppercase text-slate-400">2. Edite o registro Tipo CNAME</p>
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 font-mono text-xs">
                      <div className="flex flex-col">
                        <span className="text-[8px] text-slate-400 uppercase">Nome/Host</span>
                        <span className="text-slate-500">www</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[8px] text-slate-400 uppercase">Valor/Destino</span>
                        <span className="font-bold text-emerald-600">cname.vercel-dns.com</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <p className="text-[9px] font-black text-blue-700 uppercase leading-relaxed">
                    💡 Dica: Se no DNS Checker aparecerem vários pontos VERDES (Checkmarks) no IP 76.76.21.21, significa que o site já está funcionando!
                  </p>
                </div>

                <p className="text-[10px] font-bold text-slate-400 italic">
                  * Registros MX (E-mail) e NS (Nameservers) devem permanecer exatamente como estão hoje.
                </p>
             </div>

             <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
                <h3 className="text-xs font-black uppercase text-slate-400">Operação</h3>
                <div className={`p-6 rounded-3xl flex justify-between items-center border transition-all ${isStoreOpen ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                   <div className="text-left">
                      <p className={`text-[11px] font-black uppercase ${isStoreOpen ? 'text-emerald-700' : 'text-red-700'}`}>Loja {isStoreOpen ? 'Aberta' : 'Fechada'}</p>
                   </div>
                   <button onClick={onToggleStore} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md ${isStoreOpen ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
                     {isStoreOpen ? 'Fechar Loja' : 'Abrir Loja'}
                   </button>
                </div>
             </div>
          </div>
        )}
      </main>
    </div>
  );
};
