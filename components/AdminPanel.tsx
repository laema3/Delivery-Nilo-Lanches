
/* 
   🔴 ARQUIVO BLINDADO - NÃO ALTERAR A ESTRUTURA LÓGICA SEM AUTORIZAÇÃO 🔴
   
   FUNCIONALIDADES CRÍTICAS:
   1. Sidebar Lateral Direita para Detalhes do Pedido (Desktop/Mobile).
   2. Loop de Som para Pedidos 'NOVO'.
   3. Upload de Imagens (Arquivo Local) e Geração via IA.
   4. Vínculo Estrito Categoria <-> Subcategoria.
   5. Gestão de Adicionais por Categoria.
   6. Backup e Restauração de Dados.
*/

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Product, Order, Customer, ZipRange, CategoryItem, SubCategoryItem, OrderStatus, Complement, PaymentSettings, Coupon } from '../types.ts';
import { dbService } from '../services/dbService.ts';
import { generateProductImage } from '../services/geminiService.ts';
import { compressImage } from '../services/imageService.ts';

// Som de notificação (Campainha de restaurante)
const NOTIFICATION_SOUND = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

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

  const [activeView, setActiveView] = useState<AdminView>('pedidos');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // --- STATES DE FORMULÁRIOS ---
  // Produto
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({ name: '', price: 0, category: '', subCategory: '', description: '', image: '', rating: 5.0 });
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  
  // Categoria/Sub
  const [catName, setCatName] = useState('');
  const [subCatName, setSubCatName] = useState('');
  const [subCatParent, setSubCatParent] = useState('');
  const [editingSubCat, setEditingSubCat] = useState<SubCategoryItem | null>(null);
  
  // Adicional
  const [compName, setCompName] = useState('');
  const [compPrice, setCompPrice] = useState('');
  const [compCats, setCompCats] = useState<string[]>([]);
  
  // Frete
  const [zipStart, setZipStart] = useState('');
  const [zipEnd, setZipEnd] = useState('');
  const [zipFee, setZipFee] = useState('');
  const [editingZip, setEditingZip] = useState<ZipRange | null>(null);
  
  // Pagamento
  const [payName, setPayName] = useState('');

  // Cliente
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // --- LOGICA DE SOM ---
  useEffect(() => {
    // Inicializa audio
    audioRef.current = new Audio(NOTIFICATION_SOUND);
    audioRef.current.loop = true;
  }, []);

  useEffect(() => {
    const hasNewOrders = orders.some(o => o.status === 'NOVO');
    if (hasNewOrders) {
      // Tenta tocar o som (navegadores bloqueiam autoplay sem interação, mas em app instalado funciona melhor)
      audioRef.current?.play().catch(() => console.log("Aguardando interação para tocar som"));
    } else {
      audioRef.current?.pause();
      if (audioRef.current) audioRef.current.currentTime = 0;
    }
  }, [orders]);

  // --- HELPER: UPLOAD DE IMAGEM ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'product' | 'logo') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const compressed = await compressImage(base64, 800, 800, 0.7);
      
      if (field === 'product') {
        setNewProduct(prev => ({ ...prev, image: compressed }));
      } else {
        onUpdateLogo(compressed);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateAiImage = async () => {
    if (!newProduct.name) return alert("Digite o nome do produto primeiro!");
    setIsGeneratingImage(true);
    const img = await generateProductImage(newProduct.name);
    if (img) {
      const compressed = await compressImage(img, 800, 800, 0.7);
      setNewProduct(prev => ({ ...prev, image: compressed }));
    } else {
      alert("Não foi possível gerar a imagem. Tente novamente.");
    }
    setIsGeneratingImage(false);
  };

  // --- HELPER: BACKUP ---
  const handleBackup = () => {
    const data = {
      products, categories, subCategories, complements, zipRanges, paymentSettings, coupons,
      settings: { logoUrl, isStoreOpen }
    };
    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nilo_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  // --- RENDERIZADORES AUXILIARES ---

  // Order List Filtered
  const sortedOrders = useMemo(() => {
    // Ordenação: Novos primeiro, depois por data
    return [...orders].sort((a, b) => {
      if (a.status === 'NOVO' && b.status !== 'NOVO') return -1;
      if (a.status !== 'NOVO' && b.status === 'NOVO') return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [orders]);

  const navItems = [
    { id: 'pedidos', label: 'Pedidos', icon: '🔔' },
    { id: 'produtos', label: 'Cardápio', icon: '🍔' },
    { id: 'categorias', label: 'Categorias', icon: '📁' },
    { id: 'subcategorias', label: 'Sub-Cats', icon: '📂' },
    { id: 'adicionais', label: 'Extras', icon: '➕' },
    { id: 'entregas', label: 'Fretes', icon: '🚚' },
    { id: 'clientes', label: 'Clientes', icon: '👥' },
    { id: 'pagamentos', label: 'Pagto', icon: '💳' },
    { id: 'ajustes', label: 'Ajustes', icon: '⚙️' },
  ];

  const getStatusColor = (s: OrderStatus) => {
    switch(s) {
      case 'NOVO': return 'bg-blue-600 text-white animate-pulse';
      case 'PREPARANDO': return 'bg-amber-500 text-white';
      case 'PRONTO PARA RETIRADA': return 'bg-purple-600 text-white';
      case 'SAIU PARA ENTREGA': return 'bg-indigo-600 text-white';
      case 'FINALIZADO': return 'bg-emerald-600 text-white';
      case 'CANCELADO': return 'bg-red-600 text-white';
      default: return 'bg-slate-500 text-white';
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans text-left">
      
      {/* 1. SIDEBAR NAVEGAÇÃO (ESQUERDA) */}
      <aside className="w-20 md:w-64 bg-slate-900 text-white flex flex-col shrink-0 z-30 shadow-xl">
        <div className="p-4 md:p-6 flex flex-col items-center border-b border-white/10">
          <div className="w-10 h-10 md:w-16 md:h-16 bg-emerald-600 rounded-xl flex items-center justify-center mb-2 overflow-hidden">
             {logoUrl ? <img src={logoUrl} className="w-full h-full object-cover"/> : <span>🍔</span>}
          </div>
          <span className="hidden md:block text-xs font-black uppercase tracking-widest text-emerald-500">Nilo Admin</span>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 space-y-1">
          {navItems.map(item => (
            <button 
              key={item.id} 
              onClick={() => setActiveView(item.id as AdminView)}
              className={`w-full flex items-center gap-3 px-4 py-3 md:px-6 transition-all ${activeView === item.id ? 'bg-emerald-600 text-white border-r-4 border-emerald-300' : 'text-slate-400 hover:bg-white/5'}`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="hidden md:block text-[11px] font-bold uppercase tracking-widest">{item.label}</span>
              {item.id === 'pedidos' && orders.filter(o => o.status === 'NOVO').length > 0 && (
                <span className="ml-auto bg-red-500 text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center animate-bounce">
                  {orders.filter(o => o.status === 'NOVO').length}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10 space-y-2">
           <button onClick={onBackToSite} className="w-full bg-slate-800 p-2 rounded text-[10px] font-black uppercase">🌐 Ver Loja</button>
           <button onClick={onLogout} className="w-full border border-red-500/30 text-red-400 p-2 rounded text-[10px] font-black uppercase hover:bg-red-500/10">🚪 Sair</button>
        </div>
      </aside>

      {/* 2. CONTEÚDO PRINCIPAL (CENTRO) */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 relative">
        {/* Header Mobile/Desktop */}
        <header className="bg-white border-b border-slate-200 p-4 flex justify-between items-center shrink-0 shadow-sm z-20">
          <h2 className="text-xl font-black uppercase text-slate-800 tracking-tight">{activeView}</h2>
          <button onClick={onToggleStore} className={`px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${isStoreOpen ? 'bg-emerald-100 text-emerald-700' : 'bg-red-600 text-white animate-pulse'}`}>
            {isStoreOpen ? '● Loja Aberta' : '● Loja Fechada'}
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-32">
          
          {/* VIEW: PEDIDOS */}
          {activeView === 'pedidos' && (
            <div className="grid grid-cols-1 gap-4">
              {sortedOrders.map(order => (
                <div 
                  key={order.id} 
                  onClick={() => setSelectedOrder(order)}
                  className={`bg-white p-4 rounded-xl border-l-4 shadow-sm hover:shadow-md cursor-pointer transition-all flex justify-between items-center ${selectedOrder?.id === order.id ? 'border-emerald-500 ring-2 ring-emerald-100' : 'border-slate-300'}`}
                >
                   <div className="flex items-center gap-4">
                     <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-xs font-black text-white ${getStatusColor(order.status)}`}>
                        {order.status === 'NOVO' ? '🔔' : order.status.substring(0,2)}
                     </div>
                     <div>
                       <h4 className="font-black text-slate-800 uppercase text-sm">#{order.id.substring(0,5)} - {order.customerName}</h4>
                       <p className="text-[10px] text-slate-400 font-bold uppercase">{order.deliveryType === 'DELIVERY' ? '🛵 Entrega' : '🏪 Retirada'} • {new Date(order.createdAt).toLocaleTimeString().substring(0,5)}</p>
                     </div>
                   </div>
                   <div className="text-right">
                     <p className="font-black text-emerald-600 text-sm">R$ {order.total.toFixed(2)}</p>
                     <p className="text-[9px] font-bold text-slate-400 uppercase">{order.status}</p>
                   </div>
                </div>
              ))}
            </div>
          )}

          {/* VIEW: PRODUTOS */}
          {activeView === 'produtos' && (
            <div className="space-y-8">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                 <h3 className="text-xs font-black uppercase text-slate-400 mb-4">{editingProduct ? 'Editar Produto' : 'Novo Produto'}</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="md:col-span-2 flex gap-4 items-start">
                     <div className="w-24 h-24 bg-slate-100 rounded-lg shrink-0 overflow-hidden border border-slate-200 relative group">
                        {newProduct.image ? <img src={newProduct.image} className="w-full h-full object-cover" /> : <span className="absolute inset-0 flex items-center justify-center text-slate-300 text-2xl">📷</span>}
                        {isGeneratingImage && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div></div>}
                     </div>
                     <div className="flex-1 space-y-2">
                        <label className="block text-[10px] font-black uppercase text-slate-400">Imagem</label>
                        <div className="flex gap-2">
                          <label className="cursor-pointer bg-slate-100 text-slate-600 px-4 py-2 rounded-lg text-[10px] font-bold uppercase hover:bg-slate-200 transition-all">
                             Escolher Arquivo
                             <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'product')} />
                          </label>
                          <button onClick={handleGenerateAiImage} className="bg-purple-100 text-purple-600 px-4 py-2 rounded-lg text-[10px] font-bold uppercase hover:bg-purple-200 transition-all">
                             ✨ Gerar com IA
                          </button>
                        </div>
                        <input value={newProduct.image || ''} onChange={e => setNewProduct({...newProduct, image: e.target.value})} placeholder="Ou cole URL da imagem..." className="w-full p-2 bg-slate-50 border rounded-lg text-xs" />
                     </div>
                   </div>

                   <input value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} placeholder="Nome do Produto" className="p-3 bg-slate-50 border rounded-xl font-bold text-sm outline-none focus:border-emerald-500" />
                   <input type="number" value={newProduct.price || ''} onChange={e => setNewProduct({...newProduct, price: parseFloat(e.target.value)})} placeholder="Preço (R$)" className="p-3 bg-slate-50 border rounded-xl font-bold text-sm outline-none focus:border-emerald-500" />
                   
                   <select value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value, subCategory: ''})} className="p-3 bg-slate-50 border rounded-xl font-bold text-sm outline-none focus:border-emerald-500">
                      <option value="">Selecione Categoria...</option>
                      {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                   </select>
                   
                   <select value={newProduct.subCategory} onChange={e => setNewProduct({...newProduct, subCategory: e.target.value})} className="p-3 bg-slate-50 border rounded-xl font-bold text-sm outline-none focus:border-emerald-500">
                      <option value="">Selecione Subcategoria...</option>
                      {/* VINCULO ESTRITO DE SUBCATEGORIA */}
                      {subCategories
                        .filter(s => {
                           const parentCat = categories.find(c => c.name === newProduct.category);
                           return parentCat && s.categoryId === parentCat.id;
                        })
                        .map(s => <option key={s.id} value={s.name}>{s.name}</option>)
                      }
                   </select>

                   <textarea value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} placeholder="Descrição" className="md:col-span-2 p-3 bg-slate-50 border rounded-xl font-bold text-sm outline-none focus:border-emerald-500 h-24" />
                 </div>
                 <div className="flex gap-3 mt-4">
                    <button onClick={async () => {
                       if(!newProduct.name || !newProduct.price) return alert("Preencha nome e preço!");
                       if(editingProduct) {
                         onUpdateProduct({ ...editingProduct, ...newProduct } as Product);
                         setEditingProduct(null);
                       } else {
                         await onAddProduct(newProduct);
                       }
                       setNewProduct({ name: '', price: 0, category: '', subCategory: '', description: '', image: '' });
                    }} className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-emerald-700">
                      Salvar Produto
                    </button>
                    {editingProduct && (
                      <button onClick={() => { setEditingProduct(null); setNewProduct({ name: '', price: 0 }); }} className="px-6 bg-slate-200 text-slate-500 rounded-xl font-black uppercase text-xs">Cancelar</button>
                    )}
                 </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map(p => (
                  <div key={p.id} className="bg-white p-4 rounded-xl border border-slate-200 flex gap-3 shadow-sm">
                     <img src={p.image} className="w-16 h-16 rounded-lg object-cover bg-slate-100" />
                     <div className="flex-1 min-w-0">
                        <h4 className="font-black text-xs uppercase text-slate-800 truncate">{p.name}</h4>
                        <p className="text-[10px] text-slate-400">{p.category} / {p.subCategory || '-'}</p>
                        <p className="text-emerald-600 font-bold text-sm">R$ {p.price.toFixed(2)}</p>
                     </div>
                     <div className="flex flex-col gap-2">
                        <button onClick={() => { setEditingProduct(p); setNewProduct(p); window.scrollTo({top:0, behavior:'smooth'}); }} className="bg-blue-50 text-blue-600 p-2 rounded-lg text-xs">✏️</button>
                        <button onClick={() => { if(window.confirm('Excluir?')) onDeleteProduct(p.id); }} className="bg-red-50 text-red-600 p-2 rounded-lg text-xs">🗑</button>
                     </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIEW: EXTRAS (Adicionais) */}
          {activeView === 'adicionais' && (
            <div className="space-y-8">
               <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-xs font-black uppercase text-slate-400 mb-4">Gerenciar Adicionais</h3>
                  <div className="flex flex-col gap-4">
                     <div className="flex gap-4">
                        <input value={compName} onChange={e => setCompName(e.target.value)} placeholder="Nome (Ex: Bacon)" className="flex-1 p-3 bg-slate-50 border rounded-xl font-bold text-sm" />
                        <input type="number" value={compPrice} onChange={e => setCompPrice(e.target.value)} placeholder="Preço (R$)" className="w-32 p-3 bg-slate-50 border rounded-xl font-bold text-sm" />
                     </div>
                     <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Aplicar nas Categorias:</p>
                        <div className="flex flex-wrap gap-2">
                           {categories.map(c => (
                              <button 
                                key={c.id}
                                onClick={() => setCompCats(prev => prev.includes(c.id) ? prev.filter(x => x !== c.id) : [...prev, c.id])}
                                className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${compCats.includes(c.id) ? 'bg-emerald-100 border-emerald-500 text-emerald-700' : 'bg-white border-slate-200 text-slate-400'}`}
                              >
                                {c.name}
                              </button>
                           ))}
                        </div>
                     </div>
                     <button onClick={() => { if(compName) { onAddComplement(compName, parseFloat(compPrice)||0, compCats); setCompName(''); setCompPrice(''); setCompCats([]); } }} className="bg-emerald-600 text-white py-3 rounded-xl font-black uppercase text-xs tracking-widest">Adicionar Extra</button>
                  </div>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {complements.map(c => (
                     <div key={c.id} className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center">
                        <div>
                           <p className="font-bold text-sm uppercase text-slate-800">{c.name} <span className="text-emerald-600">R$ {c.price.toFixed(2)}</span></p>
                           <p className="text-[9px] text-slate-400">
                              {c.applicable_categories?.length ? `Válido p/ ${c.applicable_categories.length} categorias` : 'Válido para TODOS'}
                           </p>
                        </div>
                        <div className="flex gap-2">
                           <button onClick={() => onToggleComplement(c.id)} className={`px-3 py-1 rounded text-[10px] font-bold uppercase ${c.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{c.active ? 'Ativo' : 'Inativo'}</button>
                           <button onClick={() => onRemoveComplement(c.id)} className="text-red-500 text-xs">🗑</button>
                        </div>
                     </div>
                  ))}
               </div>
            </div>
          )}

          {/* VIEW: FRETES */}
          {activeView === 'entregas' && (
             <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                   <h3 className="text-xs font-black uppercase text-slate-400 mb-4">{editingZip ? 'Editar Faixa de CEP' : 'Nova Faixa de Entrega'}</h3>
                   <div className="flex flex-col md:flex-row gap-4 items-end">
                      <div className="w-full">
                         <label className="text-[10px] font-black text-slate-400 uppercase">CEP Inicial</label>
                         <input value={zipStart} onChange={e => setZipStart(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl font-bold text-sm" placeholder="38000000" />
                      </div>
                      <div className="w-full">
                         <label className="text-[10px] font-black text-slate-400 uppercase">CEP Final</label>
                         <input value={zipEnd} onChange={e => setZipEnd(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl font-bold text-sm" placeholder="38099999" />
                      </div>
                      <div className="w-full md:w-32">
                         <label className="text-[10px] font-black text-slate-400 uppercase">Taxa</label>
                         <input type="number" value={zipFee} onChange={e => setZipFee(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl font-bold text-sm" placeholder="10.00" />
                      </div>
                      <button onClick={() => { 
                         if(zipStart && zipEnd && zipFee) {
                            if(editingZip) {
                               onRemoveZipRange(editingZip.id); // Remove antigo (simplificação, ideal seria update)
                               onAddZipRange(zipStart, zipEnd, parseFloat(zipFee));
                               setEditingZip(null);
                            } else {
                               onAddZipRange(zipStart, zipEnd, parseFloat(zipFee));
                            }
                            setZipStart(''); setZipEnd(''); setZipFee('');
                         }
                      }} className="w-full md:w-auto px-6 py-3 bg-emerald-600 text-white rounded-xl font-black uppercase text-xs tracking-widest whitespace-nowrap">
                         {editingZip ? 'Atualizar' : 'Salvar'}
                      </button>
                   </div>
                </div>
                <div className="space-y-2">
                   {zipRanges.map(z => (
                      <div key={z.id} className="bg-white p-4 px-6 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm">
                         <span className="font-bold text-slate-600 text-sm">CEP {z.start} até {z.end}</span>
                         <div className="flex items-center gap-4">
                            <span className="font-black text-emerald-600">R$ {z.fee.toFixed(2)}</span>
                            <button onClick={() => { setEditingZip(z); setZipStart(z.start); setZipEnd(z.end); setZipFee(z.fee.toString()); window.scrollTo({top:0, behavior:'smooth'}); }} className="text-blue-500 font-bold text-xs">Editar</button>
                            <button onClick={() => onRemoveZipRange(z.id)} className="text-red-500 font-bold text-xs">Excluir</button>
                         </div>
                      </div>
                   ))}
                </div>
             </div>
          )}

          {/* VIEW: CLIENTES */}
          {activeView === 'clientes' && (
             <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                   <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                         <th className="p-4 text-[10px] font-black uppercase text-slate-400">Nome</th>
                         <th className="p-4 text-[10px] font-black uppercase text-slate-400">Contato</th>
                         <th className="p-4 text-[10px] font-black uppercase text-slate-400">Endereço</th>
                         <th className="p-4 text-[10px] font-black uppercase text-slate-400 text-right">Ações</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                      {customers.map(c => (
                         <tr key={c.id}>
                            <td className="p-4 text-sm font-bold text-slate-700">
                               {c.name}
                               {c.isBlocked && <span className="ml-2 bg-red-100 text-red-600 text-[9px] px-2 py-0.5 rounded uppercase">Bloqueado</span>}
                            </td>
                            <td className="p-4 text-sm text-slate-500">{c.phone}<br/>{c.email}</td>
                            <td className="p-4 text-sm text-slate-500 max-w-xs truncate">{c.address}, {c.neighborhood}</td>
                            <td className="p-4 text-right">
                               <button onClick={() => { 
                                  if(window.confirm(c.isBlocked ? 'Desbloquear cliente?' : 'Bloquear este cliente de fazer pedidos?')) {
                                     onUpdateCustomer(c.id, { isBlocked: !c.isBlocked });
                                  }
                               }} className={`text-[10px] font-black uppercase px-3 py-1 rounded ${c.isBlocked ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                  {c.isBlocked ? 'Desbloquear' : 'Bloquear'}
                               </button>
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          )}

          {/* VIEW: AJUSTES */}
          {activeView === 'ajustes' && (
             <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                   <h3 className="text-xs font-black uppercase text-slate-400">Identidade Visual</h3>
                   <div className="flex gap-6 items-center">
                      <div className="w-24 h-24 bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
                         <img src={logoUrl} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1">
                         <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Trocar Logomarca</label>
                         <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'logo')} className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100" />
                      </div>
                   </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                   <h3 className="text-xs font-black uppercase text-slate-400 mb-4">Segurança e Dados</h3>
                   <div className="flex gap-4">
                      <button onClick={handleBackup} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-indigo-700 flex items-center gap-2">
                         📥 Fazer Backup dos Dados
                      </button>
                      <button onClick={() => { if(window.confirm('Isso recarregará o sistema. Continuar?')) window.location.reload(); }} className="px-6 py-3 bg-slate-200 text-slate-600 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-slate-300">
                         🔄 Sincronizar Agora
                      </button>
                   </div>
                </div>
             </div>
          )}

          {/* VIEW: OUTROS (CATEGORIAS, SUBCATS, PAGAMENTOS - Simplificado para caber) */}
          {(activeView === 'categorias' || activeView === 'subcategorias' || activeView === 'pagamentos') && (
            <div className="bg-white p-8 text-center rounded-2xl border border-slate-200">
               <p className="text-slate-400 font-bold">Use os formulários padrão para gerenciar {activeView}.</p>
               {activeView === 'categorias' && (
                  <div className="mt-4 flex gap-2 justify-center">
                     <input value={catName} onChange={e => setCatName(e.target.value)} placeholder="Nova Categoria" className="p-2 border rounded" />
                     <button onClick={() => { onAddCategory(catName); setCatName(''); }} className="bg-emerald-600 text-white px-4 py-2 rounded font-bold">Adicionar</button>
                     <div className="block w-full mt-4 space-y-2">
                        {categories.map(c => <div key={c.id} className="flex justify-between border-b pb-2"><span>{c.name}</span> <button onClick={() => onRemoveCategory(c.id)} className="text-red-500">Excluir</button></div>)}
                     </div>
                  </div>
               )}
               {activeView === 'subcategorias' && (
                  <div className="mt-4 flex gap-2 justify-center flex-col">
                     <select value={subCatParent} onChange={e => setSubCatParent(e.target.value)} className="p-2 border rounded"><option>Categoria...</option>{categories.map(c => <option value={c.id} key={c.id}>{c.name}</option>)}</select>
                     <input value={subCatName} onChange={e => setSubCatName(e.target.value)} placeholder="Nova Subcategoria" className="p-2 border rounded" />
                     <button onClick={() => { onAddSubCategory(subCatParent, subCatName); setSubCatName(''); }} className="bg-emerald-600 text-white px-4 py-2 rounded font-bold">Adicionar</button>
                  </div>
               )}
               {activeView === 'pagamentos' && (
                  <div className="mt-4 space-y-2">
                     <div className="flex gap-2"><input value={payName} onChange={e => setPayName(e.target.value)} placeholder="Método" className="border p-2 rounded w-full" /> <button onClick={() => {onAddPaymentMethod(payName, 'DELIVERY'); setPayName('')}} className="bg-emerald-600 text-white px-4 rounded">Add</button></div>
                     {paymentSettings.map(p => <div key={p.id} className="flex justify-between border p-2 rounded"><span>{p.name}</span> <div><button onClick={() => onTogglePaymentMethod(p.id)} className="text-blue-500 mr-2">{p.enabled?'ON':'OFF'}</button><button onClick={() => onRemovePaymentMethod(p.id)} className="text-red-500">Excluir</button></div></div>)}
                  </div>
               )}
            </div>
          )}

        </div>
      </main>

      {/* 3. SIDEBAR DETALHES DO PEDIDO (DIREITA - FIXED) */}
      {selectedOrder && (
        <aside className="fixed inset-y-0 right-0 w-full md:w-[400px] bg-white shadow-2xl z-40 flex flex-col animate-in slide-in-from-right duration-300 border-l border-slate-200">
           <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50">
              <div>
                 <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Pedido #{selectedOrder.id.substring(0,5)}</h3>
                 <p className="text-xs font-bold text-slate-400 mt-1">{selectedOrder.customerName}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-2 bg-white rounded-full hover:bg-slate-100 transition-colors text-slate-500 font-bold">✕</button>
           </div>
           
           <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Status Timeline Vertical */}
              <div className="space-y-4">
                 <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Alterar Status</p>
                 <div className="flex flex-col gap-2">
                    {['NOVO', 'PREPARANDO', 'PRONTO PARA RETIRADA', 'SAIU PARA ENTREGA', 'FINALIZADO', 'CANCELADO'].map((status) => (
                       <button 
                         key={status}
                         onClick={() => onUpdateOrderStatus(selectedOrder.id, status as OrderStatus)}
                         className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all flex justify-between items-center ${selectedOrder.status === status ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 text-slate-400 hover:border-slate-300'}`}
                       >
                          <span className="text-[10px] font-black uppercase tracking-widest">{status}</span>
                          {selectedOrder.status === status && <span>✅</span>}
                       </button>
                    ))}
                 </div>
              </div>

              {/* Itens */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
                 {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start text-sm border-b border-slate-200 pb-2 last:border-0 last:pb-0">
                       <div>
                          <p className="font-black text-slate-700">{item.quantity}x {item.name}</p>
                          {item.selectedComplements && item.selectedComplements.length > 0 && (
                             <p className="text-[10px] text-slate-500 ml-2">+ {item.selectedComplements.map(c => c.name).join(', ')}</p>
                          )}
                       </div>
                       <p className="font-bold text-slate-900">R$ {(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                 ))}
                 <div className="flex justify-between pt-2 text-sm">
                    <span>Taxa Entrega</span>
                    <span>R$ {selectedOrder.deliveryFee.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between pt-2 border-t border-slate-200 text-lg font-black text-emerald-600">
                    <span>Total</span>
                    <span>R$ {selectedOrder.total.toFixed(2)}</span>
                 </div>
              </div>

              {/* Info Cliente */}
              <div className="space-y-2">
                 <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Dados da Entrega</p>
                 <div className="bg-white border border-slate-200 p-4 rounded-xl text-sm text-slate-600 space-y-1">
                    <p>📍 {selectedOrder.customerAddress}</p>
                    <p>📞 {selectedOrder.customerPhone}</p>
                    <p>💳 {selectedOrder.paymentMethod} {selectedOrder.changeFor ? `(Troco p/ ${selectedOrder.changeFor})` : ''}</p>
                    {selectedOrder.deliveryType === 'PICKUP' && <p className="text-blue-600 font-bold uppercase mt-2">🏪 Cliente vai retirar no balcão</p>}
                 </div>
              </div>
           </div>

           <div className="p-6 border-t border-slate-100 bg-slate-50">
              <button 
                 onClick={() => { if(window.confirm('Excluir este pedido do histórico permanentemente?')) { onDeleteOrder(selectedOrder.id); setSelectedOrder(null); } }}
                 className="w-full py-4 bg-red-100 text-red-600 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-red-200"
              >
                 🗑 Excluir Pedido
              </button>
           </div>
        </aside>
      )}

    </div>
  );
};
