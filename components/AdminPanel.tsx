
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
    onUpdateProduct, onUpdateOrderStatus, onAddCategory, onRemoveCategory, onAddSubCategory, onRemoveSubCategory,
    onAddComplement, onToggleComplement, onRemoveComplement, onAddZipRange, onRemoveZipRange,
    onAddCoupon, onRemoveCoupon, onUpdatePaymentSettings,
    onLogout, onBackToSite,
    paymentSettings, onTogglePaymentMethod, onAddPaymentMethod, onRemovePaymentMethod
  } = props;

  const [activeView, setActiveView] = useState<AdminView>('dashboard');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({ name: '', price: 0, category: '', subCategory: '', description: '', image: '', rating: 5.0 });
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const productImgInputRef = useRef<HTMLInputElement>(null);

  const isSystemOnline = dbService.isFirebaseConnected();

  // Subcategorias disponíveis para a categoria atual do formulário
  const currentCategoryName = editingProduct ? editingProduct.category : newProduct.category;
  const currentCategoryId = categories.find(c => c.name === currentCategoryName)?.id;
  const filteredSubCategories = subCategories.filter(s => s.categoryId === currentCategoryId);

  const handleAiImageGen = async () => {
    const name = editingProduct ? editingProduct.name : newProduct.name;
    if (!name) return alert("Digite o nome primeiro!");
    setIsGeneratingImage(true);
    try {
      const generated = await generateProductImage(name);
      if (generated) {
        const compressed = await compressImage(generated);
        if (editingProduct) setEditingProduct({...editingProduct, image: compressed});
        else setNewProduct({...newProduct, image: compressed});
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingImage(false);
    }
  };

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
    { id: 'adicionais', label: 'Extras', icon: '➕' },
    { id: 'entregas', label: 'Fretes', icon: '🚚' },
    { id: 'clientes', label: 'Clientes', icon: '👥' },
    { id: 'pagamentos', label: 'Pagamentos', icon: '💳' },
    { id: 'ajustes', label: 'Ajustes', icon: '⚙️' },
  ];

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

      <main id="admin-main" className="flex-1 p-6 md:p-10 overflow-y-auto no-scrollbar pb-32">
        <header className="flex flex-col sm:flex-row justify-between items-center mb-10 bg-white p-6 rounded-[28px] shadow-sm border border-slate-100 gap-6">
          <div className="flex flex-col gap-2 text-left w-full">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">{activeView}</h2>
            <div className="flex flex-wrap gap-4 items-center">
               <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border">
                  <div className={`w-2.5 h-2.5 rounded-full ${isSystemOnline ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`}></div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">Nuvem Conectada</span>
               </div>
            </div>
          </div>
          <button onClick={onToggleStore} className={`whitespace-nowrap px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md ${isStoreOpen ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-red-600 text-white animate-pulse'}`}>
            {isStoreOpen ? '● Aberto' : '● Fechado'}
          </button>
        </header>

        {activeView === 'produtos' && (
          <div className="space-y-10 animate-fade-in text-left">
            <div id="product-form" className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
               <h3 className="text-sm font-black uppercase text-slate-400">{editingProduct ? '✏️ Editando Produto' : '🍔 Cadastrar Novo'}</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-4">
                   <input value={editingProduct ? editingProduct.name : newProduct.name} onChange={e => editingProduct ? setEditingProduct({...editingProduct, name: e.target.value}) : setNewProduct({...newProduct, name: e.target.value})} placeholder="Nome do Lanche" className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-emerald-500" />
                   <textarea value={editingProduct ? editingProduct.description : newProduct.description} onChange={e => editingProduct ? setEditingProduct({...editingProduct, description: e.target.value}) : setNewProduct({...newProduct, description: e.target.value})} placeholder="Descrição" className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-emerald-500 h-24" />
                   
                   <div className="grid grid-cols-2 gap-4">
                     <input type="number" value={editingProduct ? editingProduct.price : newProduct.price} onChange={e => editingProduct ? setEditingProduct({...editingProduct, price: Number(e.target.value)}) : setNewProduct({...newProduct, price: Number(e.target.value)})} placeholder="Preço" className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-emerald-500" />
                     <select value={editingProduct ? editingProduct.category : newProduct.category} onChange={e => editingProduct ? setEditingProduct({...editingProduct, category: e.target.value, subCategory: ''}) : setNewProduct({...newProduct, category: e.target.value, subCategory: ''})} className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-emerald-500">
                        <option value="">Categoria...</option>
                        {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                     </select>
                   </div>

                   {/* CAMPO DE SUBCATEGORIA - CRÍTICO PARA FUNCIONAR NA HOME */}
                   <div className="space-y-1">
                     <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Subcategoria (Opcional)</label>
                     <select 
                        disabled={!currentCategoryName}
                        value={editingProduct ? editingProduct.subCategory : newProduct.subCategory} 
                        onChange={e => editingProduct ? setEditingProduct({...editingProduct, subCategory: e.target.value}) : setNewProduct({...newProduct, subCategory: e.target.value})} 
                        className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-emerald-500 disabled:opacity-30"
                      >
                        <option value="">Nenhuma subcategoria</option>
                        {filteredSubCategories.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                     </select>
                   </div>
                 </div>

                 <div className="space-y-4">
                    <div className="h-40 bg-slate-50 rounded-2xl overflow-hidden border-2 border-dashed border-slate-200 flex items-center justify-center relative">
                       {(editingProduct?.image || newProduct.image) ? <img src={editingProduct?.image || newProduct.image} className="w-full h-full object-contain" /> : <span className="text-slate-300 text-4xl">📸</span>}
                       {isGeneratingImage && (
                         <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
                            <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                         </div>
                       )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button type="button" onClick={() => productImgInputRef.current?.click()} className="py-3 bg-slate-100 rounded-xl font-black text-[9px] uppercase tracking-widest">Arquivo</button>
                      <button type="button" disabled={isGeneratingImage} onClick={handleAiImageGen} className="py-3 bg-emerald-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest disabled:opacity-50">IA</button>
                    </div>
                    <input type="file" ref={productImgInputRef} onChange={e => handleFileUpload(e, 'product')} className="hidden" accept="image/*" />
                 </div>
               </div>
               <div className="flex gap-4">
                  <button 
                    type="button"
                    disabled={isSaving}
                    onClick={async () => {
                      if (isSaving) return;
                      setIsSaving(true);
                      try {
                        if (editingProduct) { 
                          await onUpdateProduct(editingProduct); 
                          setEditingProduct(null); 
                          alert("Produto atualizado!");
                        } else { 
                          if (!newProduct.name) return alert("Dê um nome ao produto!");
                          await onAddProduct(newProduct); 
                          setNewProduct({ name: '', price: 0, category: '', subCategory: '', description: '', image: '', rating: 5.0 }); 
                          alert("Produto cadastrado!");
                        }
                      } catch (err) {
                        alert("Erro ao salvar.");
                      } finally { setIsSaving(false); }
                    }} 
                    className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest disabled:opacity-50 hover:bg-black transition-colors"
                  >
                    {isSaving ? 'Salvando...' : (editingProduct ? 'Salvar Alterações' : 'Cadastrar Item')}
                  </button>
                  {editingProduct && (
                    <button type="button" onClick={() => setEditingProduct(null)} className="px-6 py-4 bg-slate-200 text-slate-600 rounded-2xl font-black uppercase text-[10px] tracking-widest">Cancelar</button>
                  )}
               </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((p) => (
                <div key={p.id} className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm flex gap-4 hover:border-emerald-200 transition-all">
                   <div className="w-16 h-16 bg-slate-50 rounded-xl shrink-0 overflow-hidden border">
                      <img src={p.image || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500'} className="w-full h-full object-cover" />
                   </div>
                   <div className="flex-1 min-w-0">
                      <h4 className="font-black text-slate-900 text-[10px] uppercase truncate">{p.name}</h4>
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] text-emerald-600 font-bold">R$ {p.price.toFixed(2)}</p>
                        {p.subCategory && <span className="text-[8px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-bold">{p.subCategory}</span>}
                      </div>
                      <div className="flex gap-3 mt-2">
                        <button 
                          type="button"
                          onClick={() => { 
                            setEditingProduct({...p}); 
                            document.getElementById('admin-main')?.scrollTo({ top: 0, behavior: 'smooth' });
                          }} 
                          className="text-[9px] font-black uppercase text-emerald-600 hover:bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 bg-white"
                        >
                          Editar
                        </button>
                        <button 
                          type="button"
                          onClick={() => { 
                            if (window.confirm(`Apagar "${p.name}"?`)) onDeleteProduct(p.id);
                          }} 
                          className="text-[9px] font-black uppercase text-red-500 px-2 py-1 rounded-lg border border-red-100 bg-white"
                        >
                          Excluir
                        </button>
                      </div>
                   </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
