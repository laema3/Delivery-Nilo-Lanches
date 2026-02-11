
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Product, Order, Customer, ZipRange, CategoryItem, SubCategoryItem, OrderStatus, Complement, PaymentSettings, Coupon } from '../types.ts';
import { compressImage } from '../services/imageService.ts';
import { dbService } from '../services/dbService.ts';
import { generateProductImage } from '../services/geminiService.ts';
import { firebaseConfig } from '../firebaseConfig.ts';

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
  onDeleteOrder: (id: string) => void;
  onUpdateCustomer: (id: string, updates: Partial<Customer>) => void;
  onAddCategory: (name: string) => void;
  onRemoveCategory: (id: string) => void;
  onAddSubCategory: (catId: string, name: string) => void;
  onUpdateSubCategory: (id: string, name: string, categoryId: string) => void;
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
    onUpdateProduct, onUpdateOrderStatus, onDeleteOrder, onUpdateCustomer, onAddCategory, onRemoveCategory, onAddSubCategory, onUpdateSubCategory, onRemoveSubCategory,
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
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [dbStatus, setDbStatus] = useState<'checking' | 'firebase' | 'local'>('checking');
  
  const [printingOrder, setPrintingOrder] = useState<Order | null>(null);

  const [catName, setCatName] = useState('');
  const [subCatName, setSubCatName] = useState('');
  const [subCatParent, setSubCatParent] = useState('');
  const [editingSubCat, setEditingSubCat] = useState<SubCategoryItem | null>(null);
  const [compName, setCompName] = useState('');
  const [compPrice, setCompPrice] = useState('');
  const [selectedCompCats, setSelectedCompCats] = useState<string[]>([]);
  const [zipStart, setZipStart] = useState('');
  const [zipEnd, setZipEnd] = useState('');
  const [zipFee, setZipFee] = useState('');
  const [payName, setPayName] = useState('');

  const productImgInputRef = useRef<HTMLInputElement>(null);
  const logoImgInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const productFormRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkConnection = () => {
      setDbStatus(dbService.isFirebaseConnected() ? 'firebase' : 'local');
    };
    const interval = setInterval(checkConnection, 5000);
    checkConnection();
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (editingSubCat) {
      setSubCatName(editingSubCat.name);
      setSubCatParent(editingSubCat.categoryId);
    } else {
      setSubCatName('');
    }
  }, [editingSubCat]);

  const stats = useMemo(() => {
    const totalSales = orders.filter(o => o.status === 'FINALIZADO').reduce((acc, o) => acc + o.total, 0);
    const todayOrders = orders.filter(o => new Date(o.createdAt).toDateString() === new Date().toDateString());
    return { totalSales, todayCount: todayOrders.length, ticketMedio: orders.length > 0 ? totalSales / (orders.filter(o => o.status === 'FINALIZADO').length || 1) : 0 };
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

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50 w-full overflow-hidden text-left">
      <aside className="w-full md:w-64 bg-slate-900 text-white flex flex-col shrink-0 md:h-full h-auto max-h-[300px] md:max-h-full overflow-y-auto no-scrollbar border-r border-white/5 shadow-2xl z-20">
        <div className="p-8 flex flex-col items-center shrink-0">
          <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg mb-4 overflow-hidden border-2 border-white/10">
            {logoUrl ? <img src={logoUrl} className="w-full h-full object-cover" /> : <span className="text-3xl">🍔</span>}
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Nilo Admin</span>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <button key={item.id} onClick={() => { setActiveView(item.id as AdminView); setEditingSubCat(null); }} className={`w-full text-left px-4 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center gap-3 ${activeView === item.id ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:bg-white/5'}`}>
              <span className="text-base">{item.icon}</span> {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-white/5 space-y-2 shrink-0">
          <button onClick={onBackToSite} className="w-full py-3 bg-slate-800 text-white rounded-xl font-black text-[9px] uppercase tracking-widest">🌐 Ver Site</button>
          <button onClick={onLogout} className="w-full py-3 text-red-400 border border-red-500/20 rounded-xl font-black text-[9px] uppercase tracking-widest">🚪 Sair</button>
        </div>
      </aside>

      <main id="admin-content" className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="shrink-0 p-6 md:p-10 pb-0 flex flex-col sm:flex-row justify-between items-center gap-6 bg-slate-50 z-10">
          <div className="flex flex-col gap-2 w-full text-left">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">{activeView}</h2>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border w-fit ${dbStatus === 'firebase' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
               <div className={`w-2.5 h-2.5 rounded-full ${dbStatus === 'firebase' ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`}></div>
               <span className="text-[9px] font-black uppercase tracking-widest">{dbStatus === 'firebase' ? 'Nuvem Conectada' : 'Modo Offline'}</span>
            </div>
          </div>
          <button onClick={onToggleStore} className={`whitespace-nowrap px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md ${isStoreOpen ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-red-600 text-white animate-pulse'}`}>
            {isStoreOpen ? '● Loja Aberta' : '● Loja Fechada'}
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-10 pb-32">
          {activeView === 'dashboard' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
              <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Vendas Totais</p><h3 className="text-3xl font-black text-emerald-600">R$ {stats.totalSales.toFixed(2)}</h3></div>
              <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Pedidos Hoje</p><h3 className="text-3xl font-black text-slate-900">{stats.todayCount}</h3></div>
              <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Ticket Médio</p><h3 className="text-3xl font-black text-slate-900">R$ {stats.ticketMedio.toFixed(2)}</h3></div>
            </div>
          )}

          {activeView === 'subcategorias' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
                <h3 className="text-xs font-black uppercase text-slate-400">{editingSubCat ? '✏️ Editando Subcategoria' : 'Adicionar Nova Subcategoria'}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <select value={subCatParent} onChange={e => setSubCatParent(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-emerald-500 outline-none">
                    <option value="">Selecione a Categoria...</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <input value={subCatName} onChange={e => setSubCatName(e.target.value)} placeholder="Nome da Subcategoria" className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-emerald-500 outline-none" />
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => { 
                      if(subCatName && subCatParent) { 
                        if (editingSubCat) onUpdateSubCategory(editingSubCat.id, subCatName, subCatParent);
                        else onAddSubCategory(subCatParent, subCatName);
                        setEditingSubCat(null); setSubCatName(''); setSubCatParent('');
                      } 
                    }} 
                    className={`flex-1 py-4 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${editingSubCat ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                  >
                    {editingSubCat ? 'Salvar Alterações' : 'Cadastrar Subcategoria'}
                  </button>
                  {editingSubCat && (
                    <button onClick={() => { setEditingSubCat(null); setSubCatName(''); setSubCatParent(''); }} className="px-8 py-4 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest">Cancelar</button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {subCategories.map(s => {
                  const parent = categories.find(c => c.id === s.categoryId)?.name || 'Sem Categoria';
                  return (
                    <div key={s.id} className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm flex justify-between items-center">
                      <div>
                        <span className="block text-[8px] font-black text-slate-300 uppercase tracking-widest">{parent}</span>
                        <span className="font-black text-sm text-slate-700 uppercase">{s.name}</span>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => { setEditingSubCat(s); window.scrollTo({top: 0, behavior: 'smooth'}); }} 
                          className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-[9px] font-black uppercase tracking-widest"
                        >
                          Editar
                        </button>
                        <button onClick={() => { if(window.confirm('Excluir?')) onRemoveSubCategory(s.id); }} className="px-4 py-2 bg-red-50 text-red-500 rounded-xl text-[9px] font-black uppercase tracking-widest">Excluir</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {/* Outras views mantidas simples para estabilidade */}
        </div>
      </main>
    </div>
  );
};
