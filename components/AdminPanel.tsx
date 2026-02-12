
/* 
   🛡️ PAINEL ADMINISTRATIVO BLINDADO - VERSÃO ESTÁVEL 1.0 🛡️
   ----------------------------------------------------------
   ATENÇÃO: Este arquivo contém a lógica central do sistema.
   Novas funcionalidades devem ser adicionadas COM CUIDADO, 
   respeitando as REGIÕES demarcadas abaixo.
   NÃO ALTERAR FUNCIONALIDADES EXISTENTES SEM TESTES.
*/

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Product, Order, Customer, ZipRange, CategoryItem, SubCategoryItem, OrderStatus, Complement, PaymentSettings, Coupon } from '../types.ts';
import { generateProductImage } from '../services/geminiService.ts';
import { compressImage } from '../services/imageService.ts';

// Som de notificação
const NOTIFICATION_SOUND = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
const APP_VERSION = "v1.0 (Stable)";

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

type AdminView = 'dashboard' | 'pedidos' | 'produtos' | 'categorias' | 'subcategorias' | 'adicionais' | 'entregas' | 'clientes' | 'pagamentos' | 'ajustes';

export const AdminPanel: React.FC<AdminPanelProps> = (props) => {
  const { 
    products, orders, customers, zipRanges, categories, subCategories, complements, coupons, isStoreOpen, onToggleStore, logoUrl, onUpdateLogo, onAddProduct, onDeleteProduct, 
    onUpdateProduct, onUpdateOrderStatus, onDeleteOrder, onUpdateCustomer, onAddCategory, onRemoveCategory, onUpdateCategory, onAddSubCategory, onUpdateSubCategory, onRemoveSubCategory,
    onAddComplement, onToggleComplement, onRemoveComplement, onUpdateComplement, onAddZipRange, onRemoveZipRange, onUpdateZipRange,
    onLogout, onBackToSite,
    paymentSettings, onTogglePaymentMethod, onAddPaymentMethod, onRemovePaymentMethod, onUpdatePaymentSettings
  } = props;

  // #REGION: ESTADOS LOCAIS
  const [activeView, setActiveView] = useState<AdminView>('pedidos');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [activeOrderTab, setActiveOrderTab] = useState<OrderStatus | 'TODOS'>('NOVO');
  const [deletedIds, setDeletedIds] = useState<string[]>([]);

  // MODAIS INTERNOS
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [showProductDeleteConfirm, setShowProductDeleteConfirm] = useState(false);
  const [productToDeleteId, setProductToDeleteId] = useState<string | null>(null);
  const [showCategoryDeleteConfirm, setShowCategoryDeleteConfirm] = useState(false);
  const [categoryToDeleteId, setCategoryToDeleteId] = useState<string | null>(null);
  const [showSubCategoryDeleteConfirm, setShowSubCategoryDeleteConfirm] = useState(false);
  const [subCategoryToDeleteId, setSubCategoryToDeleteId] = useState<string | null>(null);
  const [showComplementDeleteConfirm, setShowComplementDeleteConfirm] = useState(false);
  const [complementToDeleteId, setComplementToDeleteId] = useState<string | null>(null);
  const [showZipDeleteConfirm, setShowZipDeleteConfirm] = useState(false);
  const [zipToDeleteId, setZipToDeleteId] = useState<string | null>(null);
  const [showCustomerBlockConfirm, setShowCustomerBlockConfirm] = useState(false);
  const [customerToBlock, setCustomerToBlock] = useState<Customer | null>(null);
  const [showPaymentDeleteConfirm, setShowPaymentDeleteConfirm] = useState(false);
  const [paymentToDeleteId, setPaymentToDeleteId] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // States Formulários
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({ name: '', price: 0, category: '', subCategory: '', description: '', image: '', rating: 5.0 });
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [catName, setCatName] = useState('');
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [subCatName, setSubCatName] = useState('');
  const [subCatParent, setSubCatParent] = useState('');
  const [editingSubCat, setEditingSubCat] = useState<SubCategoryItem | null>(null);
  const [compName, setCompName] = useState('');
  const [compPrice, setCompPrice] = useState<number>(0);
  const [compCategories, setCompCategories] = useState<string[]>([]);
  const [editingComp, setEditingComp] = useState<Complement | null>(null);
  const [zipStart, setZipStart] = useState('');
  const [zipEnd, setZipEnd] = useState('');
  const [zipFee, setZipFee] = useState<number>(0);
  const [editingZip, setEditingZip] = useState<ZipRange | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [custNeighborhood, setCustNeighborhood] = useState('');
  const [custZip, setCustZip] = useState('');
  const [editingPayment, setEditingPayment] = useState<PaymentSettings | null>(null);
  const [payName, setPayName] = useState('');
  const [payType, setPayType] = useState<'ONLINE' | 'DELIVERY'>('DELIVERY');
  const [payEmail, setPayEmail] = useState('');
  const [payToken, setPayToken] = useState('');
  // #ENDREGION

  // #REGION: EFEITOS (AUDIO)
  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND);
    audioRef.current.loop = true;
  }, []);

  useEffect(() => {
    const hasNewOrders = orders.some(o => o.status === 'NOVO' && !deletedIds.includes(o.id));
    if (hasNewOrders) {
      audioRef.current?.play().catch(() => console.log("Aguardando interação para tocar som"));
    } else {
      audioRef.current?.pause();
      if (audioRef.current) audioRef.current.currentTime = 0;
    }
  }, [orders, deletedIds]);
  // #ENDREGION

  // #REGION: HANDLERS GERAIS (BACKUP/SYNC)
  const handleBackup = () => {
    const backupData = {
      timestamp: new Date().toISOString(),
      products, categories, subCategories, complements, orders, customers, zipRanges, paymentSettings, coupons,
      settings: { isStoreOpen, logoUrl }
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_nilo_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleForceSync = () => {
    if (confirm("Isso recarregará a página para forçar a sincronização. Continuar?")) window.location.reload();
  };
  // #ENDREGION

  // #REGION: HANDLERS DE PRODUTOS
  const handleSaveProduct = async () => {
    if (!newProduct.name || !newProduct.price || !newProduct.category) return alert("Preencha nome, preço e categoria.");
    if (editingProduct) { onUpdateProduct({ ...editingProduct, ...newProduct } as Product); setEditingProduct(null); } 
    else { await onAddProduct(newProduct); }
    setNewProduct({ name: '', price: 0, category: '', subCategory: '', description: '', image: '', rating: 5.0 });
  };
  const handleEditProductClick = (p: Product) => { setEditingProduct(p); setNewProduct(p); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const handleDeleteProductClick = (id: string) => { setProductToDeleteId(id); setShowProductDeleteConfirm(true); };
  const confirmDeleteProduct = () => { if (productToDeleteId) { onDeleteProduct(productToDeleteId); setProductToDeleteId(null); setShowProductDeleteConfirm(false); }};
  // #ENDREGION

  // #REGION: HANDLERS DE CATEGORIAS/SUBCATEGORIAS
  const handleSaveCategory = () => {
    if (!catName.trim()) return alert("Digite o nome!");
    if (editingCategory) { onUpdateCategory(editingCategory.id, catName); setEditingCategory(null); } else { onAddCategory(catName); }
    setCatName('');
  };
  const handleEditCategoryClick = (c: CategoryItem) => { setEditingCategory(c); setCatName(c.name); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const handleDeleteCategoryClick = (id: string) => { setCategoryToDeleteId(id); setShowCategoryDeleteConfirm(true); };
  const confirmDeleteCategory = () => { if (categoryToDeleteId) { onRemoveCategory(categoryToDeleteId); setCategoryToDeleteId(null); setShowCategoryDeleteConfirm(false); }};

  const handleSaveSubCategory = () => {
    if (!subCatName.trim() || !subCatParent) return alert("Preencha todos os campos!");
    if (editingSubCat) { onUpdateSubCategory(editingSubCat.id, subCatName, subCatParent); setEditingSubCat(null); } else { onAddSubCategory(subCatParent, subCatName); }
    setSubCatName(''); setSubCatParent('');
  };
  const handleEditSubCategoryClick = (s: SubCategoryItem) => { setEditingSubCat(s); setSubCatName(s.name); setSubCatParent(s.categoryId); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const handleDeleteSubCategoryClick = (id: string) => { setSubCategoryToDeleteId(id); setShowSubCategoryDeleteConfirm(true); };
  const confirmDeleteSubCategory = () => { if (subCategoryToDeleteId) { onRemoveSubCategory(subCategoryToDeleteId); setSubCategoryToDeleteId(null); setShowSubCategoryDeleteConfirm(false); }};
  // #ENDREGION

  // #REGION: HANDLERS DE ADICIONAIS
  const handleSaveComplement = () => {
    if (!compName.trim()) return alert("Nome obrigatório!");
    if (editingComp) { onUpdateComplement(editingComp.id, compName, compPrice, compCategories); setEditingComp(null); } else { onAddComplement(compName, compPrice, compCategories); }
    setCompName(''); setCompPrice(0); setCompCategories([]);
  };
  const handleEditComplementClick = (c: Complement) => { setEditingComp(c); setCompName(c.name); setCompPrice(c.price); setCompCategories(c.applicable_categories || []); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const toggleCompCategory = (catId: string) => { setCompCategories(prev => prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]); };
  const handleDeleteComplementClick = (id: string) => { setComplementToDeleteId(id); setShowComplementDeleteConfirm(true); };
  const confirmDeleteComplement = () => { if (complementToDeleteId) { onRemoveComplement(complementToDeleteId); setComplementToDeleteId(null); setShowComplementDeleteConfirm(false); }};
  // #ENDREGION

  // #REGION: HANDLERS DE FRETES
  const formatZipInput = (val: string) => {
    let numeric = val.replace(/\D/g, '');
    if (numeric.length > 8) numeric = numeric.substring(0, 8);
    return numeric.length > 5 ? `${numeric.substring(0, 5)}-${numeric.substring(5)}` : numeric;
  };
  const handleZipChange = (val: string, type: 'start' | 'end') => {
    const formatted = formatZipInput(val);
    type === 'start' ? setZipStart(formatted) : setZipEnd(formatted);
  };
  const handleSaveZipRange = () => {
    if (zipStart.length < 9 || zipEnd.length < 9) return alert("CEPs inválidos");
    if (editingZip) { onUpdateZipRange(editingZip.id, zipStart, zipEnd, zipFee); setEditingZip(null); } else { onAddZipRange(zipStart, zipEnd, zipFee); }
    setZipStart(''); setZipEnd(''); setZipFee(0);
  };
  const handleEditZipClick = (z: ZipRange) => { setEditingZip(z); setZipStart(z.start); setZipEnd(z.end); setZipFee(z.fee); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const handleDeleteZipClick = (id: string) => { setZipToDeleteId(id); setShowZipDeleteConfirm(true); };
  const confirmDeleteZip = () => { if (zipToDeleteId) { onRemoveZipRange(zipToDeleteId); setZipToDeleteId(null); setShowZipDeleteConfirm(false); }};
  // #ENDREGION

  // #REGION: HANDLERS DE CLIENTES
  const handleEditCustomerClick = (c: Customer) => { setEditingCustomer(c); setCustName(c.name); setCustPhone(c.phone); setCustAddress(c.address); setCustNeighborhood(c.neighborhood); setCustZip(c.zipCode); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const handleSaveCustomer = () => {
    if (!editingCustomer || !custName || !custPhone) return alert("Dados incompletos.");
    onUpdateCustomer(editingCustomer.id, { name: custName, phone: custPhone, address: custAddress, neighborhood: custNeighborhood, zipCode: custZip });
    setEditingCustomer(null); setCustName(''); setCustPhone(''); setCustAddress(''); setCustNeighborhood(''); setCustZip('');
  };
  const handleBlockCustomerClick = (c: Customer) => { setCustomerToBlock(c); setShowCustomerBlockConfirm(true); };
  const confirmBlockCustomer = () => { if (customerToBlock) { onUpdateCustomer(customerToBlock.id, { isBlocked: !customerToBlock.isBlocked }); setCustomerToBlock(null); setShowCustomerBlockConfirm(false); }};
  // #ENDREGION

  // #REGION: HANDLERS DE PAGAMENTOS
  const handleSavePayment = () => {
    if (!payName.trim()) return alert("Nome obrigatório.");
    if (editingPayment) { onUpdatePaymentSettings(editingPayment.id, { name: payName, type: payType, email: payEmail, token: payToken }); setEditingPayment(null); } else { onAddPaymentMethod(payName, payType, payEmail, payToken); }
    setPayName(''); setPayType('DELIVERY'); setPayEmail(''); setPayToken('');
  };
  const handleEditPaymentClick = (p: PaymentSettings) => { setEditingPayment(p); setPayName(p.name); setPayType(p.type); setPayEmail(p.email || ''); setPayToken(p.token || ''); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const handleDeletePaymentClick = (id: string) => { setPaymentToDeleteId(id); setShowPaymentDeleteConfirm(true); };
  const confirmDeletePayment = () => { if (paymentToDeleteId) { onRemovePaymentMethod(paymentToDeleteId); setPaymentToDeleteId(null); setShowPaymentDeleteConfirm(false); }};
  // #ENDREGION

  // #REGION: UTILITÁRIOS (FILTROS, PRINT, IA)
  const filteredSubCategories = useMemo(() => {
    if (!newProduct.category) return [];
    const cat = categories.find(c => c.name === newProduct.category);
    if (!cat) return [];
    return subCategories.filter(s => s.categoryId === cat.id);
  }, [newProduct.category, categories, subCategories]);

  const executeRealPrint = () => {
    if (!selectedOrder) return;
    let printArea = document.getElementById('printable-coupon-root');
    if (!printArea) {
        printArea = document.createElement('div');
        printArea.id = 'printable-coupon-root';
        document.body.appendChild(printArea);
    }
    const itemsHtml = selectedOrder.items.map(item => `
      <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:12px;">
        <span>${item.quantity}x ${item.name}</span>
        <span>R$ ${(item.price * item.quantity).toFixed(2)}</span>
      </div>
      ${(item.selectedComplements || []).map(c => `<div style="font-size:10px; margin-left:10px; color:#555;">+ ${c.name}</div>`).join('')}
    `).join('');

    printArea.innerHTML = `
      <div style="font-family: 'Courier New', monospace; width: 300px; margin: 0 auto; color: black; background: white; padding: 10px;">
        <div style="text-align:center; border-bottom:1px dashed black; padding-bottom:10px; margin-bottom:10px;">
          <h2 style="margin:0; font-size:16px; font-weight:bold;">NILO LANCHES</h2>
          <p style="margin:5px 0; font-size:12px;">Pedido #${selectedOrder.id.substring(0,5)}</p>
          <p style="margin:0; font-size:10px;">${new Date(selectedOrder.createdAt).toLocaleString('pt-BR')}</p>
        </div>
        <div style="border-bottom:1px dashed black; padding-bottom:10px; margin-bottom:10px; font-size:12px;">
          <p style="margin:2px 0;"><strong>Cli:</strong> ${selectedOrder.customerName}</p>
          <p style="margin:2px 0;"><strong>Tel:</strong> ${selectedOrder.customerPhone}</p>
          <p style="margin:2px 0;"><strong>End:</strong> ${selectedOrder.deliveryType === 'PICKUP' ? 'RETIRADA' : selectedOrder.customerAddress}</p>
          <p style="margin:2px 0;"><strong>Pag:</strong> ${selectedOrder.paymentMethod}</p>
          ${selectedOrder.changeFor ? `<p style="margin:2px 0;"><strong>Troco p/:</strong> R$ ${selectedOrder.changeFor}</p>` : ''}
        </div>
        <div style="border-bottom:1px dashed black; padding-bottom:10px; margin-bottom:10px;">${itemsHtml}</div>
        <div style="text-align:right; font-size:12px;">
          <p style="margin:2px 0;">Subtotal: R$ ${(selectedOrder.total - selectedOrder.deliveryFee + (selectedOrder.discountValue || 0)).toFixed(2)}</p>
          <p style="margin:2px 0;">Taxa: R$ ${selectedOrder.deliveryFee.toFixed(2)}</p>
          <p style="margin:5px 0; font-size:16px; font-weight:bold;">TOTAL: R$ ${selectedOrder.total.toFixed(2)}</p>
        </div>
      </div>
    `;
    setTimeout(() => { window.print(); }, 300);
  };

  const executeDelete = () => {
    if (!selectedOrder) return;
    const id = selectedOrder.id;
    setDeletedIds(prev => [...prev, id]);
    setShowDeleteConfirm(false);
    setSelectedOrder(null);
    onDeleteOrder(id);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'product' | 'logo') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const compressed = await compressImage(base64, 800, 800, 0.7);
      if (field === 'product') setNewProduct(prev => ({ ...prev, image: compressed }));
      else onUpdateLogo(compressed);
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
      alert("Não foi possível gerar a imagem.");
    }
    setIsGeneratingImage(false);
  };

  const filteredOrders = useMemo(() => {
    let list = orders.filter(o => !deletedIds.includes(o.id));
    if (activeOrderTab !== 'TODOS') list = list.filter(o => o.status === activeOrderTab);
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, activeOrderTab, deletedIds]);

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
  // #ENDREGION

  // #REGION: RENDERIZAÇÃO PRINCIPAL
  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans text-left">
      {/* SIDEBAR NAVEGAÇÃO */}
      <aside className="w-20 md:w-64 bg-slate-900 text-white flex flex-col shrink-0 z-30 shadow-xl">
        <div className="p-4 md:p-6 flex flex-col items-center border-b border-white/10">
          <div className="w-10 h-10 md:w-16 md:h-16 bg-emerald-600 rounded-xl flex items-center justify-center mb-2 overflow-hidden">
             {logoUrl ? <img src={logoUrl} className="w-full h-full object-cover"/> : <span>🍔</span>}
          </div>
          <span className="hidden md:block text-xs font-black uppercase tracking-widest text-emerald-500">Nilo Admin</span>
          <span className="hidden md:block text-[8px] font-bold text-slate-500 mt-1 uppercase tracking-widest">{APP_VERSION}</span>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 space-y-1">
          {navItems.map(item => {
            const novoCount = orders.filter(o => o.status === 'NOVO' && !deletedIds.includes(o.id)).length;
            return (
              <button 
                key={item.id} 
                onClick={() => { setActiveView(item.id as AdminView); setEditingSubCat(null); setEditingCustomer(null); setEditingPayment(null); }}
                className={`w-full flex items-center gap-3 px-4 py-3 md:px-6 transition-all ${activeView === item.id ? 'bg-emerald-600 text-white border-r-4 border-emerald-300' : 'text-slate-400 hover:bg-white/5'}`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="hidden md:block text-[11px] font-bold uppercase tracking-widest">{item.label}</span>
                {item.id === 'pedidos' && novoCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center animate-bounce">
                    {novoCount}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
        <div className="p-4 border-t border-white/10 space-y-2">
           <button onClick={onBackToSite} className="w-full bg-slate-800 p-2 rounded text-[10px] font-black uppercase">🌐 Ver Loja</button>
           <button onClick={onLogout} className="w-full border border-red-500/30 text-red-400 p-2 rounded text-[10px] font-black uppercase hover:bg-red-500/10">🚪 Sair</button>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 relative">
        <header className="bg-white border-b border-slate-200 p-4 flex justify-between items-center shrink-0 shadow-sm z-20">
          <h2 className="text-xl font-black uppercase text-slate-800 tracking-tight">{activeView}</h2>
          <button onClick={onToggleStore} className={`px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${isStoreOpen ? 'bg-emerald-100 text-emerald-700' : 'bg-red-600 text-white animate-pulse'}`}>
            {isStoreOpen ? '● Loja Aberta' : '● Loja Fechada'}
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-32">
          
          {/* VIEW: PEDIDOS */}
          {activeView === 'pedidos' && (
            <div className="flex flex-col h-full">
               <div className="flex gap-2 overflow-x-auto pb-4 mb-2 no-scrollbar shrink-0">
                  {['NOVO', 'PREPARANDO', 'PRONTO PARA RETIRADA', 'SAIU PARA ENTREGA', 'FINALIZADO', 'CANCELADO', 'TODOS'].map((status) => {
                    const count = orders.filter(o => o.status === status && !deletedIds.includes(o.id)).length;
                    return (
                      <button
                        key={status}
                        onClick={() => setActiveOrderTab(status as OrderStatus | 'TODOS')}
                        className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border flex items-center gap-2 ${
                          activeOrderTab === status ? 'bg-emerald-600 text-white border-emerald-600 shadow-md transform scale-105' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {status}
                        {status === 'NOVO' && count > 0 && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>}
                        {count > 0 && <span className={`ml-1 px-1.5 py-0.5 rounded text-[9px] ${activeOrderTab === status ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{count}</span>}
                      </button>
                    )
                  })}
               </div>
               <div className="grid grid-cols-1 gap-4">
                  {filteredOrders.length === 0 && (
                    <div className="text-center p-10 bg-white rounded-xl border border-dashed border-slate-300">
                      <p className="text-slate-400 font-bold uppercase text-xs">Nenhum pedido nesta aba.</p>
                    </div>
                  )}
                  {filteredOrders.map(order => (
                    <div 
                      key={order.id} 
                      onClick={() => setSelectedOrder(order)}
                      className={`bg-white p-4 rounded-xl border-l-4 shadow-sm hover:shadow-md cursor-pointer transition-all flex justify-between items-start ${selectedOrder?.id === order.id ? 'border-emerald-500 ring-2 ring-emerald-100' : 'border-slate-300'}`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-xs font-black text-white shrink-0 ${getStatusColor(order.status)}`}>
                            {order.status === 'NOVO' ? '🔔' : order.status.substring(0,2)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-black text-slate-800 uppercase text-sm">#{order.id.substring(0,5)}</h4>
                            <span className="text-[10px] text-slate-500">| {order.customerName}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">{order.deliveryType === 'DELIVERY' ? '🛵 Entrega' : '🏪 Retirada'} • {new Date(order.createdAt).toLocaleTimeString().substring(0,5)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-emerald-600 text-sm">R$ {order.total.toFixed(2)}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">{order.status}</p>
                      </div>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {/* VIEW: PRODUTOS (CARDÁPIO) */}
          {activeView === 'produtos' && (
             <div className="space-y-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-4 border-b border-slate-100 pb-2">
                    {editingProduct ? `Editando: ${editingProduct.name}` : 'Novo Produto'}
                  </h3>
                  
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="w-full md:w-48 shrink-0 flex flex-col gap-3">
                      <div className="w-full aspect-square bg-slate-100 rounded-xl overflow-hidden border-2 border-dashed border-slate-300 flex items-center justify-center relative group">
                        {newProduct.image ? (
                          <img src={newProduct.image} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-4xl">🍔</span>
                        )}
                        {isGeneratingImage && <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold text-xs">Gerando...</div>}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="bg-slate-200 text-slate-600 text-[10px] font-bold py-2 rounded-lg text-center cursor-pointer hover:bg-slate-300">
                          📷 Upload
                          <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'product')} />
                        </label>
                        <button onClick={handleGenerateAiImage} disabled={isGeneratingImage} className="bg-purple-100 text-purple-600 text-[10px] font-bold py-2 rounded-lg hover:bg-purple-200">
                          ✨ IA
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome do Lanche</label>
                          <input 
                            value={newProduct.name} 
                            onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                            placeholder="Ex: X-Salada Turbo"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-emerald-500 outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Preço (R$)</label>
                          <input 
                            type="number"
                            value={newProduct.price || ''} 
                            onChange={e => setNewProduct({...newProduct, price: parseFloat(e.target.value)})}
                            placeholder="0.00"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-emerald-500 outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoria</label>
                          <select 
                            value={newProduct.category} 
                            onChange={e => setNewProduct({...newProduct, category: e.target.value, subCategory: ''})}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-emerald-500 outline-none"
                          >
                            <option value="">Selecione...</option>
                            {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subcategoria</label>
                          <select 
                            value={newProduct.subCategory || ''} 
                            onChange={e => setNewProduct({...newProduct, subCategory: e.target.value})}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-emerald-500 outline-none"
                            disabled={!newProduct.category}
                          >
                            <option value="">Nenhuma</option>
                            {filteredSubCategories.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição</label>
                        <textarea 
                          value={newProduct.description || ''} 
                          onChange={e => setNewProduct({...newProduct, description: e.target.value})}
                          placeholder="Ingredientes deliciosos..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-emerald-500 outline-none h-20 resize-none"
                        />
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button onClick={handleSaveProduct} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-xl uppercase text-xs tracking-widest transition-all">
                          {editingProduct ? 'Salvar Alterações' : 'Cadastrar Produto'}
                        </button>
                        {editingProduct && (
                          <button 
                            onClick={() => { setEditingProduct(null); setNewProduct({ name: '', price: 0, category: '', subCategory: '', description: '', image: '', rating: 5.0 }); }}
                            className="bg-slate-200 text-slate-500 font-bold py-3 px-6 rounded-xl uppercase text-xs tracking-widest hover:bg-slate-300"
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {products.map(p => (
                      <div key={p.id} className="bg-white p-4 rounded-xl border border-slate-200 flex gap-3 shadow-sm hover:shadow-md transition-shadow">
                        <img src={p.image} className="w-16 h-16 rounded-lg object-cover bg-slate-100" />
                        <div className="flex-1 min-w-0">
                            <h4 className="font-black text-xs uppercase text-slate-800 truncate">{p.name}</h4>
                            <p className="text-[10px] text-slate-400 font-bold truncate">{p.category} {p.subCategory ? `• ${p.subCategory}` : ''}</p>
                            <p className="text-emerald-600 font-bold text-sm">R$ {p.price.toFixed(2)}</p>
                        </div>
                        <div className="flex flex-col gap-2">
                            <button onClick={() => handleEditProductClick(p)} className="bg-blue-50 hover:bg-blue-100 text-blue-600 p-2 rounded-lg text-xs transition-colors">✏️</button>
                            <button onClick={() => handleDeleteProductClick(p.id)} className="bg-red-50 hover:bg-red-100 text-red-600 p-2 rounded-lg text-xs transition-colors">🗑</button>
                        </div>
                      </div>
                    ))}
                </div>
             </div>
          )}

          {/* VIEW: CATEGORIAS */}
          {activeView === 'categorias' && (
            <div className="space-y-8">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 max-w-lg mx-auto md:mx-0">
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-4 border-b border-slate-100 pb-2">
                  {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
                </h3>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome da Categoria</label>
                    <input 
                      value={catName}
                      onChange={(e) => setCatName(e.target.value)}
                      placeholder="Ex: Hambúrgueres, Bebidas..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-emerald-500 outline-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleSaveCategory}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-xl uppercase text-xs tracking-widest transition-all"
                    >
                      {editingCategory ? 'Salvar Alteração' : 'Criar Categoria'}
                    </button>
                    {editingCategory && (
                      <button 
                        onClick={() => { setEditingCategory(null); setCatName(''); }}
                        className="bg-slate-200 text-slate-500 font-bold py-3 px-6 rounded-xl uppercase text-xs tracking-widest hover:bg-slate-300"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {categories.map(cat => (
                  <div key={cat.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between group hover:shadow-md transition-all">
                    <span className="font-black text-slate-800 uppercase text-xs tracking-wide">{cat.name}</span>
                    <div className="flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEditCategoryClick(cat)} className="text-blue-500 hover:bg-blue-50 p-1.5 rounded-lg transition-colors">✏️</button>
                      <button onClick={() => handleDeleteCategoryClick(cat.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors">🗑</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIEW: SUBCATEGORIAS */}
          {activeView === 'subcategorias' && (
            <div className="space-y-8">
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 max-w-lg mx-auto md:mx-0">
                 <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-4 border-b border-slate-100 pb-2">
                    {editingSubCat ? 'Editar Subcategoria' : 'Nova Subcategoria'}
                 </h3>
                 <div className="space-y-4">
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome da Subcategoria</label>
                       <input 
                         value={subCatName}
                         onChange={(e) => setSubCatName(e.target.value)}
                         placeholder="Ex: Artesanais, Latas 350ml..."
                         className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-emerald-500 outline-none"
                       />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoria Pai (Obrigatório)</label>
                       <select 
                         value={subCatParent}
                         onChange={(e) => setSubCatParent(e.target.value)}
                         className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-emerald-500 outline-none"
                       >
                         <option value="">Selecione uma categoria...</option>
                         {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                       </select>
                    </div>
                    <div className="flex gap-2">
                       <button 
                         onClick={handleSaveSubCategory}
                         className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-xl uppercase text-xs tracking-widest transition-all"
                       >
                         {editingSubCat ? 'Salvar Alteração' : 'Criar Subcategoria'}
                       </button>
                       {editingSubCat && (
                         <button 
                           onClick={() => { setEditingSubCat(null); setSubCatName(''); setSubCatParent(''); }}
                           className="bg-slate-200 text-slate-500 font-bold py-3 px-6 rounded-xl uppercase text-xs tracking-widest hover:bg-slate-300"
                         >
                           Cancelar
                         </button>
                       )}
                    </div>
                 </div>
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {subCategories.map(sub => {
                     const parentName = categories.find(c => c.id === sub.categoryId)?.name || 'Sem Categoria';
                     return (
                       <div key={sub.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2 group hover:shadow-md transition-all relative">
                          <div>
                            <span className="font-black text-slate-800 uppercase text-xs tracking-wide block">{sub.name}</span>
                            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md inline-block mt-1 uppercase">{parentName}</span>
                          </div>
                          <div className="absolute top-2 right-2 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                             <button onClick={() => handleEditSubCategoryClick(sub)} className="text-blue-500 hover:bg-blue-50 p-1.5 rounded-lg transition-colors">✏️</button>
                             <button onClick={() => handleDeleteSubCategoryClick(sub.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors">🗑</button>
                          </div>
                       </div>
                     );
                  })}
               </div>
            </div>
          )}

          {/* VIEW: ADICIONAIS */}
          {activeView === 'adicionais' && (
             <div className="space-y-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-4 border-b border-slate-100 pb-2">
                    {editingComp ? 'Editando Adicional' : 'Novo Adicional'}
                  </h3>
                  
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome (Ex: Bacon, Ovo)</label>
                          <input 
                            value={compName}
                            onChange={(e) => setCompName(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-emerald-500 outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Preço Adicional (R$)</label>
                          <input 
                            type="number"
                            value={compPrice}
                            onChange={(e) => setCompPrice(parseFloat(e.target.value) || 0)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-emerald-500 outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Disponível em quais categorias?</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                          {categories.map(cat => {
                            const isSelected = compCategories.includes(cat.id);
                            return (
                              <button
                                key={cat.id}
                                onClick={() => toggleCompCategory(cat.id)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold transition-all ${isSelected ? 'bg-emerald-100 border-emerald-300 text-emerald-800' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                              >
                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
                                  {isSelected && <span className="text-white text-[8px]">✓</span>}
                                </div>
                                {cat.name}
                              </button>
                            );
                          })}
                        </div>
                        <p className="text-[9px] text-slate-400 italic">* Se nenhuma for marcada, aparece em todos os produtos.</p>
                      </div>

                      <div className="flex gap-2 pt-2">
                         <button onClick={handleSaveComplement} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 px-8 rounded-xl uppercase text-xs tracking-widest transition-all">
                           {editingComp ? 'Atualizar Adicional' : 'Criar Adicional'}
                         </button>
                         {editingComp && (
                           <button onClick={() => { setEditingComp(null); setCompName(''); setCompPrice(0); setCompCategories([]); }} className="bg-slate-200 text-slate-500 font-bold py-3 px-6 rounded-xl uppercase text-xs tracking-widest hover:bg-slate-300">
                             Cancelar
                           </button>
                         )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                   {complements.map(comp => (
                     <div key={comp.id} className={`bg-white p-4 rounded-xl border flex flex-col gap-2 shadow-sm transition-all ${!comp.active ? 'opacity-60 border-slate-100' : 'border-slate-200 hover:shadow-md'}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-black text-sm uppercase text-slate-800">{comp.name}</h4>
                            <p className="text-emerald-600 font-bold text-xs">R$ {comp.price.toFixed(2)}</p>
                          </div>
                          <div className="flex gap-1">
                             <button onClick={() => onToggleComplement(comp.id)} className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs transition-colors ${comp.active ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`} title={comp.active ? "Desativar" : "Ativar"}>
                               {comp.active ? 'ON' : 'OFF'}
                             </button>
                             <button onClick={() => handleEditComplementClick(comp)} className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center hover:bg-blue-100 text-xs">✏️</button>
                             <button onClick={() => handleDeleteComplementClick(comp.id)} className="w-8 h-8 bg-red-50 text-red-600 rounded-lg flex items-center justify-center hover:bg-red-100 text-xs">🗑</button>
                          </div>
                        </div>
                        
                        <div className="mt-1 pt-2 border-t border-slate-50">
                           <p className="text-[9px] font-black uppercase text-slate-400 mb-1 tracking-widest">Categorias:</p>
                           <div className="flex flex-wrap gap-1">
                             {(!comp.applicable_categories || comp.applicable_categories.length === 0) ? (
                               <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">TODAS</span>
                             ) : (
                               comp.applicable_categories.map(catId => {
                                 const catName = categories.find(c => c.id === catId)?.name;
                                 return catName ? (
                                   <span key={catId} className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-100 truncate max-w-[100px]">{catName}</span>
                                 ) : null;
                               })
                             )}
                           </div>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
          )}

          {/* VIEW: ENTREGAS (ZIP RANGES) */}
          {activeView === 'entregas' && (
             <div className="space-y-8">
                {/* Formulário de Fretes */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-4 border-b border-slate-100 pb-2">
                    {editingZip ? 'Editar Faixa de CEP' : 'Nova Faixa de Entrega'}
                  </h3>
                  
                  <div className="flex flex-col gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CEP Inicial</label>
                        <input 
                          value={zipStart}
                          onChange={(e) => handleZipChange(e.target.value, 'start')}
                          placeholder="00000-000"
                          maxLength={9}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-emerald-500 outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CEP Final</label>
                        <input 
                          value={zipEnd}
                          onChange={(e) => handleZipChange(e.target.value, 'end')}
                          placeholder="00000-000"
                          maxLength={9}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-emerald-500 outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Taxa de Entrega (R$)</label>
                        <input 
                          type="number"
                          value={zipFee}
                          onChange={(e) => setZipFee(parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-emerald-500 outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                       <button onClick={handleSaveZipRange} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-xl uppercase text-xs tracking-widest transition-all">
                         {editingZip ? 'Salvar Alterações' : 'Cadastrar Faixa'}
                       </button>
                       {editingZip && (
                         <button onClick={() => { setEditingZip(null); setZipStart(''); setZipEnd(''); setZipFee(0); }} className="bg-slate-200 text-slate-500 font-bold py-3 px-6 rounded-xl uppercase text-xs tracking-widest hover:bg-slate-300">
                           Cancelar
                         </button>
                       )}
                    </div>
                  </div>
                </div>

                {/* Lista de Faixas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                   {zipRanges.length === 0 && (
                     <div className="col-span-full text-center py-10 text-slate-400 font-bold uppercase text-xs">
                       Nenhuma faixa de CEP cadastrada.
                     </div>
                   )}
                   {zipRanges.map(zip => (
                     <div key={zip.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2 hover:shadow-md transition-all">
                        <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                           <span className="text-emerald-600 font-black text-lg">R$ {zip.fee.toFixed(2)}</span>
                           <div className="flex gap-1">
                              <button onClick={() => handleEditZipClick(zip)} className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center hover:bg-blue-100 text-xs">✏️</button>
                              <button onClick={() => handleDeleteZipClick(zip.id)} className="w-8 h-8 bg-red-50 text-red-600 rounded-lg flex items-center justify-center hover:bg-red-100 text-xs">🗑</button>
                           </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-600 font-bold">
                           <div className="flex flex-col">
                              <span className="text-[9px] text-slate-400 uppercase tracking-wider">Início</span>
                              <span>{zip.start}</span>
                           </div>
                           <span className="text-slate-300">➝</span>
                           <div className="flex flex-col text-right">
                              <span className="text-[9px] text-slate-400 uppercase tracking-wider">Fim</span>
                              <span>{zip.end}</span>
                           </div>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
          )}

          {/* VIEW: CLIENTES */}
          {activeView === 'clientes' && (
             <div className="space-y-8">
                {/* Formulário de Edição de Cliente */}
                {editingCustomer && (
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-top-4">
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-4 border-b border-slate-100 pb-2">
                      Editar Cliente: <span className="text-emerald-600">{editingCustomer.name}</span>
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome Completo</label>
                        <input 
                          value={custName} 
                          onChange={(e) => setCustName(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-emerald-500 outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Telefone / WhatsApp</label>
                        <input 
                          value={custPhone} 
                          onChange={(e) => setCustPhone(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-emerald-500 outline-none"
                        />
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Endereço Completo</label>
                        <input 
                          value={custAddress} 
                          onChange={(e) => setCustAddress(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-emerald-500 outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bairro</label>
                        <input 
                          value={custNeighborhood} 
                          onChange={(e) => setCustNeighborhood(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-emerald-500 outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CEP</label>
                        <input 
                          value={custZip} 
                          onChange={(e) => setCustZip(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-emerald-500 outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                       <button onClick={handleSaveCustomer} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-xl uppercase text-xs tracking-widest transition-all">
                         Salvar Alterações
                       </button>
                       <button onClick={() => { setEditingCustomer(null); }} className="bg-slate-200 text-slate-500 font-bold py-3 px-6 rounded-xl uppercase text-xs tracking-widest hover:bg-slate-300">
                         Cancelar
                       </button>
                    </div>
                  </div>
                )}

                {/* Lista de Clientes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                   {customers.length === 0 && (
                     <div className="col-span-full text-center py-10 text-slate-400 font-bold uppercase text-xs">
                       Nenhum cliente cadastrado.
                     </div>
                   )}
                   {customers.map(cust => (
                     <div key={cust.id} className={`p-5 rounded-2xl border shadow-sm transition-all relative group ${cust.isBlocked ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200 hover:shadow-md'}`}>
                        {cust.isBlocked && (
                          <div className="absolute top-0 right-0 bg-red-600 text-white text-[8px] font-black px-2 py-1 rounded-bl-xl rounded-tr-xl uppercase tracking-widest">Bloqueado</div>
                        )}
                        
                        <div className="flex justify-between items-start mb-3">
                           <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-lg shadow-inner">
                              👤
                           </div>
                           <div className="flex gap-1">
                              <button onClick={() => handleEditCustomerClick(cust)} className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center hover:bg-blue-100 text-xs transition-colors" title="Editar">✏️</button>
                              <button onClick={() => handleBlockCustomerClick(cust)} className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs transition-colors ${cust.isBlocked ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-red-50 text-red-600 hover:bg-red-100'}`} title={cust.isBlocked ? "Desbloquear" : "Bloquear"}>
                                {cust.isBlocked ? '🔓' : '🔒'}
                              </button>
                           </div>
                        </div>

                        <h4 className="font-black text-slate-800 text-sm uppercase truncate">{cust.name}</h4>
                        <p className="text-xs text-slate-500 font-bold mb-2">{cust.phone}</p>
                        
                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 text-[10px] space-y-1 mb-2">
                           <p className="flex justify-between">
                             <span className="text-slate-400 font-bold uppercase">Pedidos</span>
                             <span className="font-black text-slate-800">{cust.totalOrders}</span>
                           </p>
                           <p className="flex justify-between">
                             <span className="text-slate-400 font-bold uppercase">Pontos</span>
                             <span className="font-black text-emerald-600">{cust.points} pts</span>
                           </p>
                        </div>

                        <p className="text-[10px] text-slate-400 truncate font-medium">
                          📍 {cust.address}
                        </p>
                     </div>
                   ))}
                </div>
             </div>
          )}

          {/* VIEW: PAGAMENTOS */}
          {activeView === 'pagamentos' && (
             <div className="space-y-8">
                {/* Formulário de Pagamento */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-4 border-b border-slate-100 pb-2">
                    {editingPayment ? 'Editar Forma de Pagamento' : 'Nova Forma de Pagamento'}
                  </h3>
                  
                  <div className="flex flex-col gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome (Ex: Cartão de Crédito)</label>
                        <input 
                          value={payName}
                          onChange={(e) => setPayName(e.target.value)}
                          placeholder="Digite o nome..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-emerald-500 outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</label>
                        <div className="flex bg-slate-100 rounded-xl p-1">
                          <button onClick={() => setPayType('DELIVERY')} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all ${payType === 'DELIVERY' ? 'bg-white shadow text-emerald-600' : 'text-slate-400'}`}>Entrega</button>
                          <button onClick={() => setPayType('ONLINE')} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all ${payType === 'ONLINE' ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}>Online</button>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <span>🔐 Integração PagSeguro</span>
                        <span className="bg-slate-200 text-slate-500 px-2 py-0.5 rounded text-[8px] tracking-normal">Opcional</span>
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase">E-mail da Conta</label>
                          <input 
                            value={payEmail}
                            onChange={(e) => setPayEmail(e.target.value)}
                            placeholder="seu@email.com"
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold focus:border-emerald-500 outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase">Token de Produção</label>
                          <input 
                            value={payToken}
                            onChange={(e) => setPayToken(e.target.value)}
                            type="password"
                            placeholder="••••••••••••••••"
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold focus:border-emerald-500 outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                       <button onClick={handleSavePayment} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-xl uppercase text-xs tracking-widest transition-all">
                         {editingPayment ? 'Salvar Alterações' : 'Cadastrar Forma de Pagamento'}
                       </button>
                       {editingPayment && (
                         <button onClick={() => { setEditingPayment(null); setPayName(''); setPayType('DELIVERY'); setPayEmail(''); setPayToken(''); }} className="bg-slate-200 text-slate-500 font-bold py-3 px-6 rounded-xl uppercase text-xs tracking-widest hover:bg-slate-300">
                           Cancelar
                         </button>
                       )}
                    </div>
                  </div>
                </div>

                {/* Lista de Pagamentos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                   {paymentSettings.length === 0 && (
                     <div className="col-span-full text-center py-10 text-slate-400 font-bold uppercase text-xs">
                       Nenhuma forma de pagamento cadastrada.
                     </div>
                   )}
                   {paymentSettings.map(pay => (
                     <div key={pay.id} className={`p-4 rounded-xl border shadow-sm transition-all flex flex-col gap-3 group relative ${pay.enabled ? 'bg-white border-slate-200 hover:shadow-md' : 'bg-slate-50 border-slate-200 opacity-70'}`}>
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${pay.type === 'ONLINE' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                              {pay.type === 'ONLINE' ? '🌐' : '🛵'}
                            </div>
                            <div>
                              <h4 className="font-black text-sm uppercase text-slate-800">{pay.name}</h4>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{pay.type === 'ONLINE' ? 'Online' : 'Entrega / Retirada'}</p>
                            </div>
                          </div>
                          
                          <div className="flex gap-1">
                             <button onClick={() => onTogglePaymentMethod(pay.id)} className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs transition-colors ${pay.enabled ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-400'}`} title={pay.enabled ? "Desativar" : "Ativar"}>
                               {pay.enabled ? 'ON' : 'OFF'}
                             </button>
                             <button onClick={() => handleEditPaymentClick(pay)} className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center hover:bg-blue-100 text-xs">✏️</button>
                             <button onClick={() => handleDeletePaymentClick(pay.id)} className="w-8 h-8 bg-red-50 text-red-600 rounded-lg flex items-center justify-center hover:bg-red-100 text-xs">🗑</button>
                          </div>
                        </div>

                        {pay.token && (
                          <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-1.5 flex items-center gap-2">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                            <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest">PagSeguro Integrado</span>
                          </div>
                        )}
                     </div>
                   ))}
                </div>
             </div>
          )}

          {/* VIEW: AJUSTES (IMPLEMENTAÇÃO COMPLETA) */}
          {activeView === 'ajustes' && (
            <div className="space-y-8 animate-in fade-in duration-500">
                {/* Aparência (Logo) */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-6 border-b border-slate-100 pb-4">
                    Aparência
                  </h3>
                  <div className="flex flex-col items-center gap-6">
                    <div className="w-32 h-32 bg-slate-50 rounded-3xl overflow-hidden border-2 border-dashed border-slate-300 flex items-center justify-center relative shadow-inner group">
                       {logoUrl ? <img src={logoUrl} className="w-full h-full object-cover" /> : <span className="text-4xl">🍔</span>}
                       <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-white text-xs font-bold uppercase">Alterar</span>
                       </div>
                    </div>
                    <label className="bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 px-8 rounded-xl cursor-pointer transition-all text-xs uppercase tracking-widest shadow-lg shadow-emerald-100 active:scale-95">
                       Carregar Nova Logo
                       <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'logo')} accept="image/*" />
                    </label>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center max-w-xs">
                      Recomendado: Imagem quadrada (PNG ou JPG) de alta qualidade.
                    </p>
                  </div>
                </div>

                {/* Sistema (Status, Backup, Sync) */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-6 border-b border-slate-100 pb-4">
                        Sistema
                    </h3>
                    
                    <div className="flex items-center gap-3 mb-8 p-5 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                        <div className="relative flex h-4 w-4">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white"></span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-black text-slate-700 uppercase tracking-widest">
                                Banco de Dados: <span className="text-emerald-600">Conectado e Online</span>
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                Sincronização em tempo real ativa
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button 
                            onClick={handleBackup} 
                            className="group relative overflow-hidden py-5 bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 font-black uppercase text-[10px] tracking-widest rounded-2xl border-2 border-slate-100 hover:border-emerald-200 transition-all flex flex-col items-center gap-2 active:scale-95"
                        >
                            <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">💾</span> 
                            Fazer Backup dos Dados
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-normal opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-2">Baixar arquivo JSON</span>
                        </button>
                        
                        <button 
                            onClick={handleForceSync} 
                            className="group relative overflow-hidden py-5 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-700 font-black uppercase text-[10px] tracking-widest rounded-2xl border-2 border-slate-100 hover:border-blue-200 transition-all flex flex-col items-center gap-2 active:scale-95"
                        >
                            <span className="text-2xl mb-1 group-hover:rotate-180 transition-transform duration-500">🔄</span> 
                            Forçar Sincronismo
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-normal opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-2">Recarregar Painel</span>
                        </button>
                    </div>
                </div>
            </div>
          )}

          {(activeView !== 'pedidos' && activeView !== 'produtos' && activeView !== 'categorias' && activeView !== 'subcategorias' && activeView !== 'adicionais' && activeView !== 'entregas' && activeView !== 'clientes' && activeView !== 'pagamentos' && activeView !== 'ajustes') && (
            <div className="p-10 text-center text-slate-400 font-bold uppercase text-xs">
              Selecione outra aba no menu. (Funcionalidades mantidas nos bastidores)
            </div>
          )}
        </div>
      </main>

      {/* SIDEBAR DO PEDIDO (DIREITA) */}
      {selectedOrder && (
        <aside className="fixed inset-y-0 right-0 w-full md:w-[400px] bg-white shadow-2xl z-[9999] flex flex-col border-l border-slate-200">
           <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50 shrink-0">
              <div>
                 <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Pedido #{selectedOrder.id.substring(0,5)}</h3>
                 <p className="text-xs font-bold text-slate-400 mt-1">{selectedOrder.customerName}</p>
              </div>
              <button 
                 onClick={() => setSelectedOrder(null)} 
                 className="w-10 h-10 bg-white rounded-full hover:bg-slate-100 transition-colors text-slate-500 font-bold border border-slate-200 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
           </div>
           
           <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
              <div className="space-y-4">
                 <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Status</p>
                 <div className="grid grid-cols-1 gap-2">
                    {['NOVO', 'PREPARANDO', 'PRONTO PARA RETIRADA', 'SAIU PARA ENTREGA', 'FINALIZADO', 'CANCELADO'].map((status) => (
                       <button 
                         key={status}
                         onClick={() => onUpdateOrderStatus(selectedOrder.id, status as OrderStatus)}
                         className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all flex justify-between items-center ${selectedOrder.status === status ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 text-slate-400 hover:bg-slate-50'}`}
                       >
                          <span className="text-[10px] font-black uppercase tracking-widest">{status}</span>
                       </button>
                    ))}
                 </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
                 <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Itens</p>
                 {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start text-sm border-b border-slate-200 pb-2">
                       <div>
                          <p className="font-black text-slate-700">{item.quantity}x {item.name}</p>
                          {item.selectedComplements?.map(c => <p key={c.id} className="text-[10px] text-slate-500 ml-2">+ {c.name}</p>)}
                       </div>
                       <p className="font-bold text-slate-900">R$ {(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                 ))}
                 <div className="flex justify-between pt-2 border-t border-slate-200 text-lg font-black text-emerald-600">
                    <span>Total</span>
                    <span>R$ {selectedOrder.total.toFixed(2)}</span>
                 </div>
              </div>

              <div className="space-y-2">
                 <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Entrega</p>
                 <div className="bg-white border border-slate-200 p-4 rounded-xl text-sm text-slate-600 space-y-1">
                    <p>📍 {selectedOrder.customerAddress}</p>
                    <p>📞 {selectedOrder.customerPhone}</p>
                    <p className="mt-2 pt-2 border-t border-slate-100">
                        💳 {selectedOrder.paymentMethod}
                        {selectedOrder.changeFor ? <span className="block text-xs text-orange-600 font-bold"> (Troco p/ R$ {selectedOrder.changeFor})</span> : ''}
                    </p>
                 </div>
              </div>
           </div>

           <div className="p-6 border-t border-slate-100 bg-slate-50 space-y-3 shrink-0">
              <button 
                 type="button"
                 onClick={() => setShowReceiptPreview(true)}
                 className="w-full py-4 bg-slate-800 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-900 shadow-md cursor-pointer relative z-50 flex items-center justify-center gap-2"
              >
                 🖨️ Imprimir Cupom
              </button>
              
              <button 
                 type="button"
                 onClick={() => setShowDeleteConfirm(true)}
                 className="w-full py-4 bg-white border border-red-200 text-red-500 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-red-50 hover:text-red-600 cursor-pointer relative z-50 flex items-center justify-center gap-2"
              >
                 🗑 Excluir Pedido
              </button>
           </div>
        </aside>
      )}

      {/* 🔴 MODAL DE EXCLUSÃO DE PEDIDO */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center shadow-2xl animate-bounce-subtle">
            <h3 className="text-xl font-black text-slate-800 mb-2">Excluir Pedido?</h3>
            <p className="text-sm text-slate-500 mb-6">Essa ação não pode ser desfeita. O pedido sumirá do painel.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl">Cancelar</button>
              <button onClick={executeDelete} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700">Sim, Excluir</button>
            </div>
          </div>
        </div>
      )}

      {/* 🔴 MODAL DE EXCLUSÃO DE PRODUTO */}
      {showProductDeleteConfirm && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center shadow-2xl animate-bounce-subtle">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🗑</span>
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">Excluir Produto?</h3>
            <p className="text-sm text-slate-500 mb-6">Ele será removido do cardápio imediatamente.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowProductDeleteConfirm(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl">Cancelar</button>
              <button onClick={confirmDeleteProduct} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* 🔴 MODAL DE EXCLUSÃO DE CATEGORIA */}
      {showCategoryDeleteConfirm && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center shadow-2xl animate-bounce-subtle">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🗑</span>
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">Excluir Categoria?</h3>
            <p className="text-sm text-slate-500 mb-6">Produtos nesta categoria podem ficar sem classificação.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowCategoryDeleteConfirm(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl">Cancelar</button>
              <button onClick={confirmDeleteCategory} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* 🔴 MODAL DE EXCLUSÃO DE SUBCATEGORIA */}
      {showSubCategoryDeleteConfirm && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center shadow-2xl animate-bounce-subtle">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🗑</span>
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">Excluir Subcategoria?</h3>
            <p className="text-sm text-slate-500 mb-6">Produtos nesta subcategoria perderão este filtro.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowSubCategoryDeleteConfirm(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl">Cancelar</button>
              <button onClick={confirmDeleteSubCategory} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* 🔴 MODAL DE EXCLUSÃO DE ADICIONAL */}
      {showComplementDeleteConfirm && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center shadow-2xl animate-bounce-subtle">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🗑</span>
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">Excluir Adicional?</h3>
            <p className="text-sm text-slate-500 mb-6">Este item não aparecerá mais nos produtos.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowComplementDeleteConfirm(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl">Cancelar</button>
              <button onClick={confirmDeleteComplement} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* 🔴 MODAL DE EXCLUSÃO DE FAIXA DE CEP */}
      {showZipDeleteConfirm && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center shadow-2xl animate-bounce-subtle">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🗑</span>
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">Excluir Faixa?</h3>
            <p className="text-sm text-slate-500 mb-6">A cobrança de frete para estes CEPs não será mais automática.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowZipDeleteConfirm(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl">Cancelar</button>
              <button onClick={confirmDeleteZip} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* 🔴 MODAL DE BLOQUEIO DE CLIENTE */}
      {showCustomerBlockConfirm && customerToBlock && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center shadow-2xl animate-bounce-subtle">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${customerToBlock.isBlocked ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
              <span className="text-2xl">{customerToBlock.isBlocked ? '🔓' : '🔒'}</span>
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">{customerToBlock.isBlocked ? 'Desbloquear?' : 'Bloquear Cliente?'}</h3>
            <p className="text-sm text-slate-500 mb-6">
              {customerToBlock.isBlocked 
                ? 'O cliente poderá voltar a fazer pedidos e login.' 
                : 'O cliente perderá o acesso ao sistema imediatamente.'}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowCustomerBlockConfirm(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl">Cancelar</button>
              <button onClick={confirmBlockCustomer} className={`flex-1 py-3 font-bold rounded-xl text-white ${customerToBlock.isBlocked ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔴 MODAL DE EXCLUSÃO DE PAGAMENTO */}
      {showPaymentDeleteConfirm && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center shadow-2xl animate-bounce-subtle">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🗑</span>
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">Excluir Pagamento?</h3>
            <p className="text-sm text-slate-500 mb-6">Esta opção não aparecerá mais no checkout.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowPaymentDeleteConfirm(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl">Cancelar</button>
              <button onClick={confirmDeletePayment} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* 🔴 MODAL DE CUPOM (VISUALIZAÇÃO) */}
      {showReceiptPreview && selectedOrder && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80">
          <div className="bg-white rounded-2xl w-full max-w-sm flex flex-col max-h-[90vh] shadow-2xl">
            <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-2xl">
              <h3 className="font-bold text-slate-700">Visualizar Cupom</h3>
              <button onClick={() => setShowReceiptPreview(false)} className="text-slate-400 hover:text-red-500">✕</button>
            </div>
            <div className="p-4 overflow-y-auto bg-slate-100 flex justify-center">
              <div className="bg-white p-4 w-[300px] shadow-sm text-xs font-mono text-black border border-slate-200">
                <div className="text-center border-b border-dashed border-black pb-2 mb-2">
                  <h2 className="text-sm font-bold m-0">NILO LANCHES</h2>
                  <p className="m-0">Pedido #{selectedOrder.id.substring(0,5)}</p>
                  <p className="m-0 text-[10px]">{new Date(selectedOrder.createdAt).toLocaleString('pt-BR')}</p>
                </div>
                <div className="border-b border-dashed border-black pb-2 mb-2">
                  <p className="m-0"><strong>Cli:</strong> {selectedOrder.customerName}</p>
                  <p className="m-0"><strong>Tel:</strong> {selectedOrder.customerPhone}</p>
                  <p className="m-0"><strong>End:</strong> {selectedOrder.deliveryType === 'PICKUP' ? 'RETIRADA' : selectedOrder.customerAddress}</p>
                  <p className="m-0"><strong>Pag:</strong> {selectedOrder.paymentMethod}</p>
                </div>
                <div className="border-b border-dashed border-black pb-2 mb-2">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="mb-1">
                      <div className="flex justify-between">
                        <span>{item.quantity}x {item.name}</span>
                        <span>{(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                      {item.selectedComplements?.map(c => <div key={c.id} className="text-[10px] pl-2">+ {c.name}</div>)}
                    </div>
                  ))}
                </div>
                <div className="text-right">
                  <p className="m-0">Sub: {selectedOrder.total.toFixed(2)}</p>
                  <p className="m-0 font-bold text-sm">TOTAL: {selectedOrder.total.toFixed(2)}</p>
                </div>
              </div>
            </div>
            <div className="p-4 border-t bg-white rounded-b-2xl">
              <button onClick={executeRealPrint} className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-900">🖨️ Mandar para Impressora</button>
              <p className="text-[10px] text-center text-slate-400 mt-2">Se a impressão falhar, use o print deste modal.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
