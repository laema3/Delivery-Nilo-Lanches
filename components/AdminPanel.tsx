
import React, { useState, useRef } from 'react';
import { Product, Order, Customer, ZipRange, CategoryItem, SubCategoryItem, OrderStatus, Complement, PaymentSettings, Coupon } from '../types.ts';
import { compressImage } from '../services/imageService.ts';
import { dbService } from '../services/dbService.ts';

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
    products, orders, customers, categories, subCategories, isStoreOpen, onToggleStore, 
    logoUrl, onUpdateLogo, onAddProduct, onDeleteProduct, onUpdateProduct, onLogout, onBackToSite,
    onAddCategory, onRemoveCategory, onAddSubCategory, onRemoveSubCategory
  } = props;

  const [activeView, setActiveView] = useState<AdminView>('dashboard');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({ name: '', price: 0, category: '', subCategory: '', description: '', image: '', rating: 5.0 });
  const productImgInputRef = useRef<HTMLInputElement>(null);

  // Status de Conectividade
  const isSystemOnline = dbService.isFirebaseConnected();
  const isAiConnected = !!process.env.API_KEY;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'product' | 'logo') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const compressed = await compressImage(ev.target?.result as string);
      if (target === 'logo') onUpdateLogo(compressed);
      else if (editingProduct) setEditingProduct({...editingProduct, image: compressed});
      else setNewProduct({...newProduct, image: compressed});
    };
    reader.readAsDataURL(file);
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'pedidos', label: 'Pedidos', icon: '📋' },
    { id: 'produtos', label: 'Cardápio', icon: '🍔' },
    { id: 'categorias', label: 'Categorias', icon: '📁' },
    { id: 'subcategorias', label: 'Subcategorias', icon: '📂' },
    { id: 'pagamentos', label: 'Pagamentos', icon: '💳' },
    { id: 'ajustes', label: 'Ajustes', icon: '⚙️' },
  ];

  const handleForceSync = () => {
    localStorage.clear();
    window.location.reload();
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 w-full overflow-hidden">
      <aside className="w-full md:w-64 bg-slate-900 text-white flex flex-col shrink-0 border-r border-white/5 h-screen sticky top-0 overflow-y-auto no-scrollbar">
        <div className="p-8 flex flex-col items-center">
          <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg mb-4 overflow-hidden border-2 border-white/10">
            {logoUrl ? <img src={logoUrl} className="w-full h-full object-cover" /> : <span className="text-3xl">🍔</span>}
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nilo Admin</span>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setActiveView(item.id as any)} className={`w-full text-left px-4 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center gap-3 ${activeView === item.id ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-white/5'}`}>
              <span className="text-base">{item.icon}</span> {item.label}
            </button>
          ))}
        </nav>
        
        <div className="p-4 border-t border-white/5 space-y-2">
          <button onClick={handleForceSync} className="w-full py-2 mb-2 text-emerald-400 border border-emerald-500/20 rounded-xl font-black text-[8px] uppercase tracking-widest hover:bg-emerald-500/10">🔄 Forçar Sincronia Celular</button>
          <button onClick={onBackToSite} className="w-full py-3 bg-slate-800 text-white rounded-xl font-black text-[9px] uppercase tracking-widest">🌐 Ver Site</button>
          <button onClick={onLogout} className="w-full py-3 text-red-400 border border-red-500/20 rounded-xl font-black text-[9px] uppercase tracking-widest">🚪 Sair</button>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-10 overflow-y-auto no-scrollbar pb-32">
        <header className="flex flex-col sm:flex-row justify-between items-center mb-10 bg-white p-6 rounded-[28px] shadow-sm border border-slate-100 gap-6">
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">{activeView}</h2>
            <div className="flex flex-wrap gap-4 items-center">
               <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border">
                  <div className={`w-2.5 h-2.5 rounded-full ${isSystemOnline ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-red-500 animate-pulse'}`}></div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">Banco Sincronizado</span>
               </div>
               <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border">
                  <div className={`w-2.5 h-2.5 rounded-full ${isAiConnected ? 'bg-blue-500 shadow-[0_0_10px_#3b82f6]' : 'bg-red-500 animate-pulse'}`}></div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">IA Nilo Ativa</span>
               </div>
            </div>
          </div>

          <button onClick={onToggleStore} className={`px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md ${isStoreOpen ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-red-600 text-white border-b-4 border-red-800 animate-pulse'}`}>
            {isStoreOpen ? '● Loja Aberta' : '● LOJA FECHADA'}
          </button>
        </header>

        {activeView === 'dashboard' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
             <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
                <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Vendas Totais</p>
                <h3 className="text-2xl font-black text-emerald-600">R$ {orders.filter(o => o.status === 'FINALIZADO').reduce((acc, o) => acc + o.total, 0).toFixed(2)}</h3>
             </div>
             <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
                <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Novos Pedidos</p>
                <h3 className="text-2xl font-black text-red-600">{orders.filter(o => o.status === 'NOVO').length}</h3>
             </div>
             <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
                <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Em Preparo</p>
                <h3 className="text-2xl font-black text-blue-600">{orders.filter(o => ['PREPARANDO', 'SAIU PARA ENTREGA'].includes(o.status)).length}</h3>
             </div>
             <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
                <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Total Clientes</p>
                <h3 className="text-2xl font-black text-slate-800">{customers.length}</h3>
             </div>
          </div>
        )}

        {/* ... Restante das telas conforme App original ... */}
      </main>
    </div>
  );
};
