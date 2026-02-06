
import React, { useState, useRef, useMemo } from 'react';
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
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({ name: '', price: 0, category: '', subCategory: '', description: '', image: '', rating: 5.0 });
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [catName, setCatName] = useState('');
  const [subCatName, setSubCatName] = useState('');
  const [subCatParent, setSubCatParent] = useState('');
  const [compName, setCompName] = useState('');
  const [compPrice, setCompPrice] = useState('');
  const [zipStart, setZipStart] = useState('');
  const [zipEnd, setZipEnd] = useState('');
  const [zipFee, setZipFee] = useState('');

  const productImgInputRef = useRef<HTMLInputElement>(null);
  const isSystemOnline = dbService.isFirebaseConnected();

  // Lógica para filtrar subcategorias com base na categoria selecionada no produto
  const currentCategoryName = editingProduct ? editingProduct.category : newProduct.category;
  const filteredSubCategoriesForProduct = useMemo(() => {
    if (!currentCategoryName) return [];
    const cat = categories.find(c => c.name === currentCategoryName);
    if (!cat) return [];
    return subCategories.filter(s => s.categoryId === cat.id);
  }, [currentCategoryName, categories, subCategories]);

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
    } catch (e) { console.error(e); } finally { setIsGeneratingImage(false); }
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

      <main className="flex-1 p-6 md:p-10 overflow-y-auto no-scrollbar pb-32">
        <header className="flex flex-col sm:flex-row justify-between items-center mb-10 bg-white p-6 rounded-[28px] shadow-sm border border-slate-100 gap-6">
          <div className="flex flex-col gap-2 text-left w-full">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">{activeView}</h2>
            <div className={`flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border w-fit`}>
               <div className={`w-2.5 h-2.5 rounded-full ${isSystemOnline ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`}></div>
               <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">Nuvem Conectada</span>
            </div>
          </div>
          <button onClick={onToggleStore} className={`whitespace-nowrap px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md ${isStoreOpen ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-red-600 text-white animate-pulse'}`}>
            {isStoreOpen ? '● Aberto' : '● Fechado'}
          </button>
        </header>

        {/* DASHBOARD */}
        {activeView === 'dashboard' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in text-left">
            {[
              { label: 'Pedidos Totais', val: orders.length, icon: '📦', color: 'bg-blue-500' },
              { label: 'Produtos Ativos', val: products.length, icon: '🍔', color: 'bg-emerald-500' },
              { label: 'Clientes', val: customers.length, icon: '👥', color: 'bg-purple-500' },
              { label: 'Faturamento', val: `R$ ${orders.filter(o => o.status === 'FINALIZADO').reduce((a, b) => a + b.total, 0).toFixed(2)}`, icon: '💰', color: 'bg-amber-500' }
            ].map((stat, i) => (
              <div key={i} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
                <div className={`w-12 h-12 ${stat.color} rounded-2xl flex items-center justify-center text-white text-xl mb-4 shadow-lg`}>{stat.icon}</div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{stat.label}</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">{stat.val}</h3>
              </div>
            ))}
          </div>
        )}

        {/* PEDIDOS */}
        {activeView === 'pedidos' && (
          <div className="space-y-6 animate-fade-in">
            {orders.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(order => (
              <div key={order.id} className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm flex flex-col md:flex-row gap-8 text-left">
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="bg-slate-900 text-white px-3 py-1 rounded-lg font-black text-[10px]">#{order.id}</span>
                    <span className="text-[10px] font-black uppercase text-emerald-600">{order.customerName}</span>
                  </div>
                  <div className="space-y-1">
                    {order.items.map((item, i) => (
                      <p key={i} className="text-xs font-bold text-slate-600">{item.quantity}x {item.name}</p>
                    ))}
                  </div>
                  <p className="text-[10px] font-black uppercase text-slate-400">Total: <span className="text-slate-900">R$ {order.total.toFixed(2)}</span> | {order.paymentMethod}</p>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  {['PREPARANDO', 'SAIU PARA ENTREGA', 'FINALIZADO', 'CANCELADO'].map(status => (
                    <button key={status} onClick={() => onUpdateOrderStatus(order.id, status as OrderStatus)} className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all ${order.status === status ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-400 border-slate-100'}`}>
                      {status.replace('SAIU PARA ', '')}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PRODUTOS (CARDÁPIO) */}
        {activeView === 'produtos' && (
          <div className="space-y-10 animate-fade-in text-left">
            <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
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
                   <select value={editingProduct ? editingProduct.subCategory : newProduct.subCategory} onChange={e => editingProduct ? setEditingProduct({...editingProduct, subCategory: e.target.value}) : setNewProduct({...newProduct, subCategory: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-emerald-500">
                      <option value="">Subcategoria...</option>
                      {filteredSubCategoriesForProduct.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                   </select>
                 </div>
                 <div className="space-y-4">
                    <div className="h-40 bg-slate-50 rounded-2xl overflow-hidden border-2 border-dashed border-slate-200 flex items-center justify-center relative">
                       {(editingProduct?.image || newProduct.image) ? <img src={editingProduct?.image || newProduct.image} className="w-full h-full object-contain" /> : <span className="text-slate-300 text-4xl">📸</span>}
                       {isGeneratingImage && <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center"><div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div></div>}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => productImgInputRef.current?.click()} className="py-3 bg-slate-100 rounded-xl font-black text-[9px] uppercase tracking-widest">Arquivo</button>
                      <button disabled={isGeneratingImage} onClick={handleAiImageGen} className="py-3 bg-emerald-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest">IA ✨</button>
                    </div>
                    <input type="file" ref={productImgInputRef} onChange={e => handleFileUpload(e, 'product')} className="hidden" accept="image/*" />
                 </div>
               </div>
               <button disabled={isSaving} onClick={async () => {
                 setIsSaving(true);
                 if (editingProduct) { await onUpdateProduct(editingProduct); setEditingProduct(null); }
                 else { await onAddProduct(newProduct); setNewProduct({ name: '', price: 0, category: '', subCategory: '', description: '', image: '', rating: 5.0 }); }
                 setIsSaving(false);
               }} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest">
                 {isSaving ? 'Salvando...' : (editingProduct ? 'Salvar Alterações' : 'Cadastrar Item')}
               </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map(p => (
                <div key={p.id} className="bg-white p-4 rounded-[28px] border border-slate-100 shadow-sm flex gap-4">
                   <img src={p.image} className="w-16 h-16 rounded-xl object-cover border" />
                   <div className="flex-1 min-w-0">
                      <h4 className="font-black text-slate-900 text-[10px] uppercase truncate">{p.name}</h4>
                      <p className="text-[10px] text-emerald-600 font-bold">R$ {p.price.toFixed(2)}</p>
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => setEditingProduct({...p})} className="text-[8px] font-black uppercase text-emerald-600">Editar</button>
                        <button onClick={() => onDeleteProduct(p.id)} className="text-[8px] font-black uppercase text-red-500">Excluir</button>
                      </div>
                   </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CATEGORIAS */}
        {activeView === 'categorias' && (
          <div className="max-w-2xl animate-fade-in text-left">
            <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm mb-8 space-y-4">
               <h3 className="text-xs font-black uppercase text-slate-400">Criar Nova Categoria</h3>
               <div className="flex gap-4">
                  <input value={catName} onChange={e => setCatName(e.target.value)} placeholder="Ex: Bebidas" className="flex-1 p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-emerald-500" />
                  <button onClick={() => { onAddCategory(catName); setCatName(''); }} className="px-8 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest">Adicionar</button>
               </div>
            </div>
            <div className="space-y-3">
              {categories.map(c => (
                <div key={c.id} className="bg-white p-4 rounded-2xl flex justify-between items-center border border-slate-50">
                  <span className="font-bold text-slate-700">{c.name}</span>
                  <button onClick={() => onRemoveCategory(c.id)} className="text-red-400 hover:text-red-600 transition-colors">✕</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SUBCATEGORIAS */}
        {activeView === 'subcategorias' && (
          <div className="max-w-2xl animate-fade-in text-left">
             <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm mb-8 space-y-4">
               <h3 className="text-xs font-black uppercase text-slate-400">Criar Subcategoria</h3>
               <select value={subCatParent} onChange={e => setSubCatParent(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-emerald-500">
                  <option value="">Selecione a Categoria Pai...</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
               </select>
               <div className="flex gap-4">
                  <input value={subCatName} onChange={e => setSubCatName(e.target.value)} placeholder="Ex: Sucos Naturais" className="flex-1 p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-emerald-500" />
                  <button onClick={() => { if(subCatParent && subCatName) { onAddSubCategory(subCatParent, subCatName); setSubCatName(''); } }} className="px-8 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest">Adicionar</button>
               </div>
            </div>
            <div className="space-y-4">
               {categories.map(cat => (
                 <div key={cat.id} className="space-y-2">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 ml-2">{cat.name}</h4>
                    {subCategories.filter(s => s.categoryId === cat.id).map(sub => (
                      <div key={sub.id} className="bg-white p-4 rounded-2xl flex justify-between items-center border border-slate-50">
                        <span className="font-bold text-slate-700">{sub.name}</span>
                        <button onClick={() => onRemoveSubCategory(sub.id)} className="text-red-400">✕</button>
                      </div>
                    ))}
                 </div>
               ))}
            </div>
          </div>
        )}

        {/* ADICIONAIS */}
        {activeView === 'adicionais' && (
          <div className="max-w-2xl animate-fade-in text-left">
            <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm mb-8 space-y-4">
               <h3 className="text-xs font-black uppercase text-slate-400">Novo Adicional</h3>
               <div className="grid grid-cols-2 gap-4">
                  <input value={compName} onChange={e => setCompName(e.target.value)} placeholder="Nome" className="p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-emerald-500" />
                  <input value={compPrice} onChange={e => setCompPrice(e.target.value)} type="number" placeholder="Preço (R$)" className="p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-emerald-500" />
               </div>
               <button onClick={() => { if(compName && compPrice) { onAddComplement(compName, Number(compPrice)); setCompName(''); setCompPrice(''); } }} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest">Cadastrar</button>
            </div>
            <div className="space-y-3">
              {complements.map(comp => (
                <div key={comp.id} className="bg-white p-4 rounded-2xl flex justify-between items-center border border-slate-50">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-700">{comp.name}</span>
                    <span className="text-[10px] text-emerald-600 font-black">R$ {comp.price.toFixed(2)}</span>
                  </div>
                  <div className="flex gap-4">
                    <button onClick={() => onToggleComplement(comp.id)} className={`px-4 py-1.5 rounded-lg text-[8px] font-black uppercase ${comp.active ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                      {comp.active ? 'Ativo' : 'Inativo'}
                    </button>
                    <button onClick={() => onRemoveComplement(comp.id)} className="text-red-400">✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ENTREGAS / FRETES */}
        {activeView === 'entregas' && (
          <div className="max-w-4xl animate-fade-in text-left">
             <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm mb-8 space-y-4">
               <h3 className="text-xs font-black uppercase text-slate-400">Novo Range de CEP</h3>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input value={zipStart} onChange={e => setZipStart(e.target.value)} placeholder="CEP Inicial" className="p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-emerald-500" />
                  <input value={zipEnd} onChange={e => setZipEnd(e.target.value)} placeholder="CEP Final" className="p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-emerald-500" />
                  <input value={zipFee} onChange={e => setZipFee(e.target.value)} type="number" placeholder="Taxa (R$)" className="p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-emerald-500" />
               </div>
               <button onClick={() => { if(zipStart && zipEnd && zipFee) { onAddZipRange(zipStart, zipEnd, Number(zipFee)); setZipStart(''); setZipEnd(''); setZipFee(''); } }} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest">Salvar Região</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {zipRanges.map(range => (
                <div key={range.id} className="bg-white p-6 rounded-[28px] border border-slate-100 flex justify-between items-center">
                   <div>
                     <p className="text-[9px] font-black uppercase text-slate-400">De {range.start} a {range.end}</p>
                     <p className="text-xl font-black text-emerald-600">R$ {range.fee.toFixed(2)}</p>
                   </div>
                   <button onClick={() => onRemoveZipRange(range.id)} className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center">✕</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CLIENTES */}
        {activeView === 'clientes' && (
          <div className="space-y-4 animate-fade-in text-left">
            {customers.map(c => (
              <div key={c.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-xl">👤</div>
                  <div>
                    <h4 className="font-black text-slate-900 uppercase text-[11px] tracking-tight">{c.name}</h4>
                    <p className="text-[10px] text-slate-400 font-bold">{c.email} | {c.phone}</p>
                  </div>
                </div>
                <div className="flex gap-10 items-center">
                   <div className="text-center">
                      <p className="text-[8px] font-black uppercase text-slate-400">Pedidos</p>
                      <p className="font-black text-emerald-600">{c.totalOrders || 0}</p>
                   </div>
                   <div className="text-center">
                      <p className="text-[8px] font-black uppercase text-slate-400">Pontos</p>
                      <p className="font-black text-amber-500">{c.points || 0}</p>
                   </div>
                   <button onClick={() => onUpdateCustomer(c.id, { isBlocked: !c.isBlocked })} className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest ${c.isBlocked ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                     {c.isBlocked ? 'Bloqueado' : 'Bloquear'}
                   </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PAGAMENTOS E AJUSTES */}
        {(activeView === 'pagamentos' || activeView === 'ajustes') && (
          <div className="max-w-2xl animate-fade-in text-left space-y-8">
            {activeView === 'pagamentos' && (
              <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
                 <h3 className="text-xs font-black uppercase text-slate-400">Métodos de Pagamento</h3>
                 <div className="space-y-4">
                    {paymentSettings.map(pay => (
                      <div key={pay.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <span className="font-black text-[10px] uppercase text-slate-600">{pay.name}</span>
                        <div className="flex gap-3">
                          <button onClick={() => onTogglePaymentMethod(pay.id)} className={`px-4 py-1.5 rounded-lg text-[8px] font-black uppercase ${pay.enabled ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                            {pay.enabled ? 'Ativo' : 'Inativo'}
                          </button>
                          <button onClick={() => onRemovePaymentMethod(pay.id)} className="text-red-400">✕</button>
                        </div>
                      </div>
                    ))}
                 </div>
                 <div className="pt-4 border-t border-slate-100">
                    <button onClick={() => {
                      const name = prompt('Nome do método (ex: Pix, Dinheiro):');
                      const type = confirm('É pagamento online? (OK = Online, Cancelar = Entrega)') ? 'ONLINE' : 'DELIVERY';
                      if(name) onAddPaymentMethod(name, type);
                    }} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest">+ Novo Método</button>
                 </div>
              </div>
            )}
            
            {activeView === 'ajustes' && (
              <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
                 <h3 className="text-xs font-black uppercase text-slate-400">Identidade Visual</h3>
                 <div className="flex items-center gap-6">
                    <div className="w-24 h-24 bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden">
                       {logoUrl ? <img src={logoUrl} className="w-full h-full object-cover" /> : <span className="text-3xl">🖼️</span>}
                    </div>
                    <button onClick={() => productImgInputRef.current?.click()} className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg">Alterar Logo</button>
                 </div>
                 <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100">
                    <p className="text-[9px] font-black text-amber-700 uppercase mb-2 tracking-widest">Status da Operação</p>
                    <div className="flex justify-between items-center">
                       <span className="text-xs font-bold text-slate-700">A loja está {isStoreOpen ? 'Aberta' : 'Fechada'} no momento</span>
                       <button onClick={onToggleStore} className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest ${isStoreOpen ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
                         {isStoreOpen ? 'Fechar Loja' : 'Abrir Loja'}
                       </button>
                    </div>
                 </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
