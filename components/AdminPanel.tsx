
/* 
   🛡️ PAINEL ADMINISTRATIVO - VERSÃO ESTÁVEL 🛡️
   Foco: Menu Lateral de Pedidos e Controle de Status/Som
*/

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Product, Order, Customer, ZipRange, CategoryItem, SubCategoryItem, OrderStatus, Complement, PaymentSettings, Coupon } from '../types.ts';
import { generateProductImage } from '../services/geminiService.ts';
import { compressImage } from '../services/imageService.ts';

const NOTIFICATION_SOUND = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
const APP_VERSION = "v2.5 (Progressive SQL Import)";

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
  socialLinks: {
    instagram?: string;
    whatsapp?: string;
    facebook?: string;
  };
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

type AdminView = 'dashboard' | 'pedidos' | 'produtos' | 'categorias' | 'subcategorias' | 'adicionais' | 'entregas' | 'clientes' | 'pagamentos' | 'ajustes';

export const AdminPanel: React.FC<AdminPanelProps> = (props) => {
  const { 
    products, orders, customers, zipRanges, categories, subCategories, complements, coupons, isStoreOpen, onToggleStore, logoUrl, onUpdateLogo, socialLinks, onUpdateSocialLinks, onAddProduct, onDeleteProduct, 
    onUpdateProduct, onUpdateOrderStatus, onDeleteOrder, onUpdateCustomer, onAddCategory, onRemoveCategory, onUpdateCategory, onAddSubCategory, onUpdateSubCategory, onRemoveSubCategory,
    onAddComplement, onToggleComplement, onRemoveComplement, onUpdateComplement, onAddZipRange, onRemoveZipRange, onUpdateZipRange,
    onLogout, onBackToSite,
    paymentSettings, onTogglePaymentMethod, onAddPaymentMethod, onRemovePaymentMethod, onUpdatePaymentSettings
  } = props;

  const [activeView, setActiveView] = useState<AdminView>('dashboard');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [activeOrderTab, setActiveOrderTab] = useState<OrderStatus | 'TODOS'>('NOVO');
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showProductDeleteConfirm, setShowProductDeleteConfirm] = useState(false);
  const [productToDeleteId, setProductToDeleteId] = useState<string | null>(null);

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

  // States para Importação de SQL com Progresso
  const [selectedSqlFile, setSelectedSqlFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });

  // Local state for social links in Adjustments
  const [localInstagram, setLocalInstagram] = useState(socialLinks?.instagram || '');
  const [localWhatsapp, setLocalWhatsapp] = useState(socialLinks?.whatsapp || '');
  const [localFacebook, setLocalFacebook] = useState(socialLinks?.facebook || '');

  useEffect(() => {
    setLocalInstagram(socialLinks?.instagram || '');
    setLocalWhatsapp(socialLinks?.whatsapp || '');
    setLocalFacebook(socialLinks?.facebook || '');
  }, [socialLinks]);

  // ------------------------------------------------------------------
  // CONTROLE DE SOM E NOTIFICAÇÕES
  // ------------------------------------------------------------------
  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND);
    audioRef.current.loop = true;
  }, []);

  useEffect(() => {
    const hasNewOrders = orders.some(o => o.status === 'NOVO' && !deletedIds.includes(o.id));
    if (hasNewOrders) {
      if (audioRef.current && audioRef.current.paused) {
        audioRef.current.play().catch(e => console.log("Interação necessária para tocar som:", e));
      }
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }
  }, [orders, deletedIds]);

  const handleOrderStatusChange = (status: OrderStatus) => {
    if (!selectedOrder) return;
    setSelectedOrder(prev => prev ? { ...prev, status } : null);
    onUpdateOrderStatus(selectedOrder.id, status);
  };

  // Handlers Produtos
  const handleSaveProduct = async () => {
    if (!newProduct.name || !newProduct.price || !newProduct.category) return alert("Preencha nome, preço e categoria.");
    if (editingProduct) { onUpdateProduct({ ...editingProduct, ...newProduct } as Product); setEditingProduct(null); } 
    else { await onAddProduct(newProduct); }
    setNewProduct({ name: '', price: 0, category: '', subCategory: '', description: '', image: '', rating: 5.0 });
  };
  const handleEditProductClick = (p: Product) => { setEditingProduct(p); setNewProduct(p); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const handleDeleteProductClick = (id: string) => { setProductToDeleteId(id); setShowProductDeleteConfirm(true); };
  const confirmDeleteProduct = () => { if (productToDeleteId) { onDeleteProduct(productToDeleteId); setProductToDeleteId(null); setShowProductDeleteConfirm(false); }};

  // Handlers Categorias
  const handleSaveCategory = () => {
    if (!catName.trim()) return alert("Digite o nome!");
    if (editingCategory) { onUpdateCategory(editingCategory.id, catName); setEditingCategory(null); } else { onAddCategory(catName); }
    setCatName('');
  };
  const handleEditCategoryClick = (c: CategoryItem) => { setEditingCategory(c); setCatName(c.name); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  // Handlers SubCategorias
  const handleSaveSubCategory = () => {
    if (!subCatName.trim() || !subCatParent) return alert("Preencha todos os campos!");
    if (editingSubCat) { onUpdateSubCategory(editingSubCat.id, subCatName, subCatParent); setEditingSubCat(null); } else { onAddSubCategory(subCatParent, subCatName); }
    setSubCatName(''); setSubCatParent('');
  };
  const handleEditSubCategoryClick = (s: SubCategoryItem) => { setEditingSubCat(s); setSubCatName(s.name); setSubCatParent(s.categoryId); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  // Handlers Adicionais
  const handleSaveComplement = () => {
    if (!compName.trim()) return alert("Nome obrigatório!");
    if (editingComp) { onUpdateComplement(editingComp.id, compName, compPrice, compCategories); setEditingComp(null); } else { onAddComplement(compName, compPrice, compCategories); }
    setCompName(''); setCompPrice(0); setCompCategories([]);
  };
  const handleEditComplementClick = (c: Complement) => { setEditingComp(c); setCompName(c.name); setCompPrice(c.price); setCompCategories(c.applicable_categories || []); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const toggleCompCategory = (catId: string) => { setCompCategories(prev => prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]); };

  // Handlers Frete
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

  // Handlers Clientes
  const handleEditCustomerClick = (c: Customer) => { setEditingCustomer(c); setCustName(c.name); setCustPhone(c.phone); setCustAddress(c.address); setCustNeighborhood(c.neighborhood); setCustZip(c.zipCode); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const handleSaveCustomer = () => {
    if (!editingCustomer || !custName || !custPhone) return alert("Dados incompletos.");
    onUpdateCustomer(editingCustomer.id, { name: custName, phone: custPhone, address: custAddress, neighborhood: custNeighborhood, zipCode: custZip });
    setEditingCustomer(null); setCustName(''); setCustPhone(''); setCustAddress(''); setCustNeighborhood(''); setCustZip('');
  };

  const handleSqlFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedSqlFile(file);
      setImportProgress({ current: 0, total: 0 });
    }
  };

  const handleExecuteSqlImport = async () => {
    if (!selectedSqlFile) return;
    setIsImporting(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const regex = /INSERT INTO .*?VALUES\s*\((.*?)\);/gi;
      const allMatches = [...text.matchAll(regex)];
      const total = allMatches.length;
      setImportProgress({ current: 0, total });

      let count = 0;

      for (const match of allMatches) {
        try {
          const valuesStr = match[1];
          const parts = valuesStr.split(/,(?=(?:(?:[^']*'){2})*[^']*$)/).map(v => v.trim().replace(/^'|'$/g, ''));
          
          if (parts.length > 2) {
            let email = parts.find(p => p.includes('@')) || `import_${Date.now()}_${count}@nilo.com`;
            let phone = parts.find(p => p.replace(/\D/g, '').length >= 8 && !p.includes('@')) || '0000000000';
            let name = parts.find(p => isNaN(Number(p)) && !p.includes('@') && p.length > 2) || 'Cliente Importado';
            let address = parts.find(p => p.length > 10 && p !== name && !p.includes('@')) || '';

            const importedCustomer: Customer = {
              id: email,
              name: name,
              email: email,
              phone: phone,
              address: address,
              neighborhood: '',
              zipCode: '',
              totalOrders: 0,
              points: 0,
              lastOrder: new Date().toISOString()
            };
            
            await onUpdateCustomer(importedCustomer.id, importedCustomer);
            count++;
            setImportProgress(prev => ({ ...prev, current: count }));
          }
        } catch (err) {
          console.error("Erro ao processar linha SQL:", err);
        }
      }
      alert(`${count} clientes importados com sucesso!`);
      setSelectedSqlFile(null);
      setIsImporting(false);
      setImportProgress({ current: 0, total: 0 });
    };
    reader.readAsText(selectedSqlFile);
  };

  // Handlers Pagamento
  const handleSavePayment = () => {
    if (!payName.trim()) return alert("Nome obrigatório.");
    if (editingPayment) { onUpdatePaymentSettings(editingPayment.id, { name: payName, type: payType, email: payEmail, token: payToken }); setEditingPayment(null); } else { onAddPaymentMethod(payName, payType, payEmail, payToken); }
    setPayName(''); setPayType('DELIVERY'); setPayEmail(''); setPayToken('');
  };
  const handleEditPaymentClick = (p: PaymentSettings) => { setEditingPayment(p); setPayName(p.name); setPayType(p.type); setPayEmail(p.email || ''); setPayToken(p.token || ''); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  // Utilitários
  const filteredSubCategories = useMemo(() => {
    if (!newProduct.category) return [];
    const cat = categories.find(c => c.name === newProduct.category);
    if (!cat) return [];
    return subCategories.filter(s => s.categoryId === cat.id);
  }, [newProduct.category, categories, subCategories]);

  const dashboardStats = useMemo(() => {
    const validOrders = orders.filter(o => o.status !== 'CANCELADO' && !deletedIds.includes(o.id));
    const today = new Date().toDateString();
    const todayOrders = validOrders.filter(o => new Date(o.createdAt).toDateString() === today);
    const totalRevenue = validOrders.reduce((acc, o) => acc + o.total, 0);
    const todayRevenue = todayOrders.reduce((acc, o) => acc + o.total, 0);
    return { totalRevenue, todayRevenue, totalCount: validOrders.length, todayCount: todayOrders.length };
  }, [orders, deletedIds]);

  const executeRealPrint = () => {
    if (!selectedOrder) return;
    const itemsHtml = selectedOrder.items.map(item => `
      <div class="item-row">
        <span>${item.quantity}x ${item.name}</span>
        <span>R$ ${(item.price * item.quantity).toFixed(2)}</span>
      </div>
      ${(item.selectedComplements || []).map(c => `<div style="font-size:10px; padding-left:10px; color:#555;">+ ${c.name}</div>`).join('')}
    `).join('');

    const printContent = `
      <html>
      <head>
        <title>Cupom #${selectedOrder.id.substring(0, 5)}</title>
        <style>
          body { margin: 0; padding: 10px; font-family: 'Courier New', Courier, monospace; background: #fff; color: #000; width: 300px; }
          .coupon-content { width: 100%; font-size: 12px; line-height: 1.2; }
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
            body { margin: 0; padding: 5px; } 
          }
        </style>
      </head>
      <body>
        <div class="coupon-content">
          <div class="header">
            <h1>NILO LANCHES</h1>
            <h2>Pedido #${selectedOrder.id.substring(0,5)}</h2>
            <p>${new Date(selectedOrder.createdAt).toLocaleString('pt-BR')}</p>
          </div>
          <div class="info">
            <p><strong>Cli:</strong> ${selectedOrder.customerName}</p>
            <p><strong>Tel:</strong> ${selectedOrder.customerPhone}</p>
            <p><strong>End:</strong> ${selectedOrder.deliveryType === 'PICKUP' ? 'RETIRADA' : selectedOrder.customerAddress}</p>
            <p><strong>Pag:</strong> ${selectedOrder.paymentMethod}</p>
            ${selectedOrder.changeFor ? `<p><strong>Troco p/:</strong> R$ ${selectedOrder.changeFor.toFixed(2)}</p>` : ''}
          </div>
          <div class="items">${itemsHtml}</div>
          <div class="totals">
            <p><span>Subtotal:</span> <span>R$ ${(selectedOrder.total - selectedOrder.deliveryFee + (selectedOrder.discountValue || 0)).toFixed(2)}</span></p>
            <p><span>Taxa:</span> <span>R$ ${selectedOrder.deliveryFee.toFixed(2)}</span></p>
            <div class="total-final">
              <span>TOTAL:</span>
              <span>R$ ${selectedOrder.total.toFixed(2)}</span>
            </div>
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
            alert("Bloqueio de Pop-up detectado.");
        }
    } catch (e) {
        alert("Erro ao tentar imprimir.");
    }
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
    { id: 'dashboard', label: 'Visão Geral', icon: '📊' },
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
      case 'PREPARANDO': return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'PRONTO PARA RETIRADA': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'SAIU PARA ENTREGA': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'FINALIZADO': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'CANCELADO': return 'bg-red-50 text-red-800 border-red-200';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const handleSaveSocialLinks = () => {
    onUpdateSocialLinks({
      instagram: localInstagram,
      whatsapp: localWhatsapp,
      facebook: localFacebook
    });
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans text-left">
      <aside className="w-20 md:w-64 bg-slate-900 text-white flex flex-col shrink-0 z-30 shadow-xl">
        <div className="p-4 md:p-6 flex flex-col items-center border-b border-white/10">
          <div className="w-10 h-10 md:w-16 md:h-16 bg-emerald-600 rounded-xl flex items-center justify-center mb-2 overflow-hidden">
             {logoUrl ? <img src={logoUrl} className="w-full h-full object-cover" alt="Logo"/> : <span>🍔</span>}
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

      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 relative">
        <header className="bg-white border-b border-slate-200 p-4 flex justify-between items-center shrink-0 shadow-sm z-20">
          <h2 className="text-xl font-black uppercase text-slate-800 tracking-tight">{activeView}</h2>
          <button onClick={onToggleStore} className={`px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${isStoreOpen ? 'bg-emerald-100 text-emerald-700' : 'bg-red-600 text-white animate-pulse'}`}>
            {isStoreOpen ? '● Loja Aberta' : '● Loja Fechada'}
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-32">
          {activeView === 'dashboard' && (
            <div className="space-y-8 animate-in fade-in duration-500">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col relative overflow-hidden">
                     <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 z-10">Vendas Hoje</span>
                     <span className="text-3xl font-black text-emerald-600 z-10">R$ {dashboardStats.todayRevenue.toFixed(2)}</span>
                     <div className="absolute right-[-10px] bottom-[-10px] text-9xl opacity-5 text-emerald-600 z-0">💰</div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col relative overflow-hidden">
                     <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 z-10">Pedidos Hoje</span>
                     <span className="text-3xl font-black text-slate-800 z-10">{dashboardStats.todayCount}</span>
                      <div className="absolute right-[-10px] bottom-[-10px] text-9xl opacity-5 text-slate-800 z-0">🧾</div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col relative overflow-hidden">
                     <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 z-10">Faturamento Total</span>
                     <span className="text-3xl font-black text-blue-600 z-10">R$ {dashboardStats.totalRevenue.toFixed(2)}</span>
                     <div className="absolute right-[-10px] bottom-[-10px] text-9xl opacity-5 text-blue-600 z-0">📈</div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col relative overflow-hidden">
                     <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 z-10">Total Pedidos</span>
                     <span className="text-3xl font-black text-purple-600 z-10">{dashboardStats.totalCount}</span>
                     <div className="absolute right-[-10px] bottom-[-10px] text-9xl opacity-5 text-purple-600 z-0">📦</div>
                  </div>
               </div>
            </div>
          )}

          {activeView === 'produtos' && (
             <div className="space-y-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-4 border-b border-slate-100 pb-2">
                    {editingProduct ? `Editando: ${editingProduct.name}` : 'Novo Produto'}
                  </h3>
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="w-full md:w-48 shrink-0 flex flex-col gap-3">
                      <div className="w-full aspect-square bg-slate-100 rounded-xl overflow-hidden border-2 border-dashed border-slate-300 flex items-center justify-center relative group">
                        {newProduct.image ? <img src={newProduct.image} className="w-full h-full object-cover" alt="Preview"/> : <span className="text-4xl">🍔</span>}
                        {isGeneratingImage && <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold text-xs">Gerando...</div>}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="bg-slate-200 text-slate-600 text-[10px] font-bold py-2 rounded-lg text-center cursor-pointer hover:bg-slate-300">
                          📷 Upload <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'product')} />
                        </label>
                        <button onClick={handleGenerateAiImage} disabled={isGeneratingImage} className="bg-purple-100 text-purple-600 text-[10px] font-bold py-2 rounded-lg hover:bg-purple-200"> ✨ IA </button>
                      </div>
                    </div>
                    <div className="flex-1 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} placeholder="Nome do lanche" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-emerald-500 outline-none" />
                        <input type="number" value={newProduct.price || ''} onChange={e => setNewProduct({...newProduct, price: parseFloat(e.target.value)})} placeholder="Preço (R$)" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-emerald-500 outline-none" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <select value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none">
                           <option value="">Selecione a Categoria</option>
                           {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                        <select value={newProduct.subCategory || ''} onChange={e => setNewProduct({...newProduct, subCategory: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none" disabled={!newProduct.category}>
                           <option value="">Subcategoria (Opcional)</option>
                           {filteredSubCategories.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                        </select>
                      </div>
                      <textarea value={newProduct.description || ''} onChange={e => setNewProduct({...newProduct, description: e.target.value})} placeholder="Descrição deliciosa..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-emerald-500 outline-none h-20 resize-none" />
                      <div className="flex gap-3">
                         <button onClick={handleSaveProduct} className="flex-1 bg-emerald-600 text-white font-black py-3 rounded-xl uppercase text-xs"> {editingProduct ? 'Salvar' : 'Cadastrar'} </button>
                         {editingProduct && <button onClick={() => setEditingProduct(null)} className="bg-slate-200 text-slate-500 font-bold py-3 px-6 rounded-xl uppercase text-xs">Cancelar</button>}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                   {products.map(p => (
                     <div key={p.id} className="bg-white p-4 rounded-xl border border-slate-200 flex gap-3 shadow-sm">
                        <img src={p.image} className="w-16 h-16 rounded-lg object-cover" alt={p.name} />
                        <div className="flex-1 min-w-0">
                           <h4 className="font-black text-xs uppercase truncate">{p.name}</h4>
                           <p className="text-emerald-600 font-bold text-sm">R$ {p.price.toFixed(2)}</p>
                        </div>
                        <div className="flex flex-col gap-2">
                           <button onClick={() => handleEditProductClick(p)} className="bg-blue-50 text-blue-600 p-2 rounded-lg text-xs">✏️</button>
                           <button onClick={() => handleDeleteProductClick(p.id)} className="bg-red-50 text-red-600 p-2 rounded-lg text-xs">🗑️</button>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
          )}

          {activeView === 'pedidos' && (
             <div className="space-y-4">
               <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                  {['NOVO', 'PREPARANDO', 'PRONTO PARA RETIRADA', 'SAIU PARA ENTREGA', 'FINALIZADO', 'CANCELADO', 'TODOS'].map(status => (
                    <button key={status} onClick={() => setActiveOrderTab(status as any)} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase whitespace-nowrap transition-all ${activeOrderTab === status ? 'bg-emerald-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200'}`}>
                      {status}
                    </button>
                  ))}
               </div>
               <div className="grid grid-cols-1 gap-4">
                  {filteredOrders.length === 0 ? (
                    <div className="text-center py-20 text-slate-400 font-bold uppercase text-xs">Nenhum pedido encontrado.</div>
                  ) : (
                    filteredOrders.map(order => {
                      const isNew = order.status === 'NOVO';
                      return (
                        <div 
                          key={order.id} 
                          onClick={() => setSelectedOrder(order)} 
                          className={`p-4 rounded-xl border-l-4 ${getStatusColor(order.status).split(' ')[0]} border-opacity-100 shadow-sm cursor-pointer hover:scale-[1.01] transition-all ${isNew ? 'bg-blue-600 text-white shadow-blue-200' : 'bg-white text-slate-800 hover:bg-slate-50'}`}
                        >
                          <div className="flex justify-between items-center">
                             <div>
                                <h4 className={`font-black text-sm uppercase ${isNew ? 'text-white' : 'text-slate-800'}`}>#{order.id.substring(0,5)} - {order.customerName}</h4>
                                <p className={`text-[10px] font-bold uppercase ${isNew ? 'text-blue-100' : 'text-slate-400'}`}>{order.deliveryType} • {new Date(order.createdAt).toLocaleTimeString()}</p>
                             </div>
                             <div className="text-right">
                                <p className={`font-black text-sm ${isNew ? 'text-white' : 'text-emerald-600'}`}>R$ {order.total.toFixed(2)}</p>
                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${isNew ? 'bg-white text-blue-600 shadow-sm' : getStatusColor(order.status)}`}>{order.status}</span>
                             </div>
                          </div>
                        </div>
                      );
                    })
                  )}
               </div>
             </div>
          )}

          {activeView === 'categorias' && (
            <div className="space-y-6">
               <div className="bg-white p-6 rounded-2xl border border-slate-200 flex gap-4">
                  <input value={catName} onChange={e => setCatName(e.target.value)} placeholder="Nova Categoria (ex: Hambúrgueres)" className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-bold outline-none" />
                  <button onClick={handleSaveCategory} className="bg-emerald-600 text-white font-black px-6 rounded-xl uppercase text-xs">{editingCategory ? 'Atualizar' : 'Adicionar'}</button>
               </div>
               <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {categories.map(c => (
                     <div key={c.id} className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center">
                        <span className="font-bold text-sm">{c.name}</span>
                        <div className="flex gap-2">
                           <button onClick={() => handleEditCategoryClick(c)} className="text-blue-500">✏️</button>
                           <button onClick={() => onRemoveCategory(c.id)} className="text-red-500">🗑️</button>
                        </div>
                     </div>
                  ))}
               </div>
            </div>
          )}

          {activeView === 'subcategorias' && (
            <div className="space-y-6">
               <div className="bg-white p-6 rounded-2xl border border-slate-200 flex flex-col md:flex-row gap-4">
                  <select value={subCatParent} onChange={e => setSubCatParent(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none">
                     <option value="">Selecione a Categoria Pai</option>
                     {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <input value={subCatName} onChange={e => setSubCatName(e.target.value)} placeholder="Nome da Subcategoria" className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none" />
                  <button onClick={handleSaveSubCategory} className="bg-emerald-600 text-white font-black px-6 py-3 rounded-xl uppercase text-xs">{editingSubCat ? 'Salvar' : 'Adicionar'}</button>
               </div>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {subCategories.map(s => {
                    const parent = categories.find(c => c.id === s.categoryId);
                    return (
                       <div key={s.id} className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center">
                          <div>
                             <span className="text-[9px] font-black uppercase text-slate-400 block">{parent?.name || 'Sem Pai'}</span>
                             <span className="font-bold text-sm">{s.name}</span>
                          </div>
                          <div className="flex gap-2">
                             <button onClick={() => handleEditSubCategoryClick(s)} className="text-blue-500">✏️</button>
                             <button onClick={() => onRemoveSubCategory(s.id)} className="text-red-500">🗑️</button>
                          </div>
                       </div>
                    );
                  })}
               </div>
            </div>
          )}

          {activeView === 'adicionais' && (
            <div className="space-y-6">
               <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex flex-col md:flex-row gap-4">
                     <input value={compName} onChange={e => setCompName(e.target.value)} placeholder="Nome do Adicional (ex: Bacon Extra)" className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none" />
                     <input type="number" value={compPrice} onChange={e => setCompPrice(parseFloat(e.target.value))} placeholder="Preço" className="w-32 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none" />
                  </div>
                  <div>
                     <p className="text-xs font-black uppercase text-slate-400 mb-2">Disponível em quais categorias?</p>
                     <div className="flex flex-wrap gap-2">
                        {categories.map(cat => (
                           <button 
                             key={cat.id} 
                             onClick={() => toggleCompCategory(cat.id)}
                             className={`px-3 py-1 rounded-lg text-[10px] font-bold border transition-all ${compCategories.includes(cat.id) ? 'bg-emerald-100 border-emerald-500 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                           >
                             {cat.name}
                           </button>
                        ))}
                     </div>
                  </div>
                  <button onClick={handleSaveComplement} className="w-full bg-emerald-600 text-white font-black py-3 rounded-xl uppercase text-xs">{editingComp ? 'Salvar Alterações' : 'Adicionar Extra'}</button>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {complements.map(c => (
                     <div key={c.id} className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center">
                        <div>
                           <span className="font-bold text-sm">{c.name}</span>
                           <span className="ml-2 text-xs font-black text-emerald-600">+ R$ {c.price.toFixed(2)}</span>
                           <div className="text-[9px] text-slate-400 mt-1">{c.applicable_categories?.length || 0} categorias vinculadas</div>
                        </div>
                        <div className="flex gap-2">
                           <button onClick={() => onToggleComplement(c.id)} className={`text-[10px] px-2 py-1 rounded ${c.active ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>{c.active ? 'Ativo' : 'Inativo'}</button>
                           <button onClick={() => handleEditComplementClick(c)} className="text-blue-500">✏️</button>
                           <button onClick={() => onRemoveComplement(c.id)} className="text-red-500">🗑️</button>
                        </div>
                     </div>
                  ))}
               </div>
            </div>
          )}

          {activeView === 'entregas' && (
            <div className="space-y-6">
               <div className="bg-white p-6 rounded-2xl border border-slate-200 flex flex-col md:flex-row gap-4">
                  <input value={zipStart} onChange={e => handleZipChange(e.target.value, 'start')} placeholder="CEP Inicial (00000-000)" className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none" maxLength={9} />
                  <input value={zipEnd} onChange={e => handleZipChange(e.target.value, 'end')} placeholder="CEP Final (00000-000)" className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none" maxLength={9} />
                  <input type="number" value={zipFee} onChange={e => setZipFee(parseFloat(e.target.value))} placeholder="Taxa (R$)" className="w-32 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none" />
                  <button onClick={handleSaveZipRange} className="bg-emerald-600 text-white font-black px-6 py-3 rounded-xl uppercase text-xs">{editingZip ? 'Salvar' : 'Adicionar'}</button>
               </div>
               <div className="space-y-2">
                  {zipRanges.map(z => (
                     <div key={z.id} className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center">
                        <span className="font-bold text-xs text-slate-600">De <span className="text-slate-900">{z.start}</span> até <span className="text-slate-900">{z.end}</span></span>
                        <div className="flex items-center gap-4">
                           <span className="font-black text-emerald-600">R$ {z.fee.toFixed(2)}</span>
                           <div className="flex gap-2">
                              <button onClick={() => handleEditZipClick(z)} className="text-blue-500">✏️</button>
                              <button onClick={() => onRemoveZipRange(z.id)} className="text-red-500">🗑️</button>
                           </div>
                        </div>
                     </div>
                  ))}
               </div>
            </div>
          )}

          {activeView === 'clientes' && (
             <div className="space-y-6">
                <div className="flex flex-col gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex gap-3">
                    <input value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} placeholder="Buscar cliente por nome ou telefone..." className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none shadow-sm" />
                    
                    {!selectedSqlFile ? (
                      <label className="shrink-0 bg-slate-800 text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-slate-700 transition-all flex items-center gap-2 shadow-lg active:scale-95">
                        📂 Selecionar SQL
                        <input type="file" accept=".sql" className="hidden" onChange={handleSqlFileSelect} />
                      </label>
                    ) : (
                      <div className="flex gap-2 animate-in fade-in zoom-in-95">
                        <button onClick={handleExecuteSqlImport} disabled={isImporting} className="bg-emerald-600 text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg active:scale-95">
                          {isImporting ? `⏳ ${importProgress.current}/${importProgress.total}` : '🚀 EXECUTAR IMPORTAÇÃO'}
                        </button>
                        <button onClick={() => setSelectedSqlFile(null)} className="bg-red-100 text-red-600 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-200">
                          ✕ Cancelar
                        </button>
                      </div>
                    )}
                  </div>

                  {selectedSqlFile && (
                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">📄</span>
                        <div className="flex-1">
                          <p className="text-[10px] font-black text-blue-800 uppercase tracking-widest">Arquivo Selecionado:</p>
                          <p className="text-xs font-bold text-blue-600">{selectedSqlFile.name}</p>
                        </div>
                      </div>
                      
                      {isImporting && (
                        <div className="space-y-1.5">
                          <div className="w-full bg-blue-100 h-2.5 rounded-full overflow-hidden">
                            <div 
                              className="bg-blue-600 h-full transition-all duration-300"
                              style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                            ></div>
                          </div>
                          <p className="text-[9px] font-black uppercase text-blue-500 text-right">
                            Processando: {importProgress.current} de {importProgress.total} clientes...
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="bg-slate-100 p-4 rounded-xl border-l-4 border-slate-400">
                  <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Dica de Importação</p>
                  <p className="text-[10px] text-slate-500 mt-1">Arquivos grandes podem levar alguns segundos. O progresso aparecerá acima assim que você clicar em executar.</p>
                </div>

                {editingCustomer && (
                   <div className="bg-white p-6 rounded-2xl border border-emerald-500 shadow-md animate-fade-in mb-4">
                      <h4 className="font-black text-xs uppercase mb-4 text-emerald-600">Editando: {editingCustomer.name}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                         <input value={custName} onChange={e => setCustName(e.target.value)} placeholder="Nome" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2" />
                         <input value={custPhone} onChange={e => setCustPhone(e.target.value)} placeholder="Telefone" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2" />
                         <input value={custAddress} onChange={e => setCustAddress(e.target.value)} placeholder="Endereço" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2" />
                         <input value={custNeighborhood} onChange={e => setCustNeighborhood(e.target.value)} placeholder="Bairro" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2" />
                      </div>
                      <div className="flex gap-3">
                         <button onClick={handleSaveCustomer} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase">Salvar Dados</button>
                         <button onClick={() => setEditingCustomer(null)} className="bg-slate-200 text-slate-500 px-4 py-2 rounded-xl text-xs font-bold uppercase">Cancelar</button>
                      </div>
                   </div>
                )}
                <div className="space-y-2">
                   {customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone.includes(customerSearch)).map(c => (
                      <div key={c.id} className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center hover:bg-slate-50">
                         <div>
                            <p className="font-bold text-sm text-slate-800">{c.name} {c.isBlocked && <span className="text-red-500 text-[10px] uppercase font-black">(BLOQUEADO)</span>}</p>
                            <p className="text-xs text-slate-400">{c.phone} • {c.email} • {c.totalOrders || 0} pedidos</p>
                         </div>
                         <div className="flex gap-2">
                            <button onClick={() => onUpdateCustomer(c.id, { isBlocked: !c.isBlocked })} className={`text-[10px] font-black uppercase px-3 py-1 rounded ${c.isBlocked ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                               {c.isBlocked ? 'Desbloquear' : 'Bloquear'}
                            </button>
                            <button onClick={() => handleEditCustomerClick(c)} className="bg-blue-50 text-blue-600 p-2 rounded-lg">✏️</button>
                         </div>
                      </div>
                   ))}
                </div>
             </div>
          )}

          {activeView === 'pagamentos' && (
             <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 flex flex-col md:flex-row gap-4 items-end">
                   <div className="flex-1 w-full space-y-2">
                      <input value={payName} onChange={e => setPayName(e.target.value)} placeholder="Nome (ex: Cartão de Crédito)" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold outline-none" />
                      <select value={payType} onChange={e => setPayType(e.target.value as any)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold outline-none">
                         <option value="DELIVERY">Pagamento na Entrega/Retirada</option>
                         <option value="ONLINE">Pagamento Online (Pix/Cartão)</option>
                      </select>
                   </div>
                   <button onClick={handleSavePayment} className="bg-emerald-600 text-white font-black px-6 py-3 rounded-xl uppercase text-xs h-10">{editingPayment ? 'Salvar' : 'Adicionar'}</button>
                </div>
                <div className="space-y-2">
                   {paymentSettings.map(p => (
                      <div key={p.id} className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center">
                         <div>
                            <span className="font-bold text-sm block">{p.name}</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase">{p.type === 'ONLINE' ? 'Online' : 'Presencial'}</span>
                         </div>
                         <div className="flex items-center gap-3">
                            <button onClick={() => onTogglePaymentMethod(p.id)} className={`w-10 h-6 rounded-full p-1 transition-colors ${p.enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                               <div className={`w-4 h-4 bg-white rounded-full transition-transform ${p.enabled ? 'translate-x-4' : ''}`}></div>
                            </button>
                            <button onClick={() => handleEditPaymentClick(p)} className="text-blue-500">✏️</button>
                            <button onClick={() => onRemovePaymentMethod(p.id)} className="text-red-500">🗑️</button>
                         </div>
                      </div>
                   ))}
                </div>
             </div>
          )}
          
          {activeView === 'ajustes' && (
             <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200">
                   <h3 className="font-black text-sm uppercase mb-4 text-slate-700 tracking-widest flex items-center gap-2">
                      <span>🖼️</span> Logo da Loja
                   </h3>
                   <div className="flex items-center gap-6">
                      <div className="w-24 h-24 bg-slate-100 rounded-xl flex items-center justify-center overflow-hidden border">
                         {logoUrl ? <img src={logoUrl} className="w-full h-full object-cover" /> : <span className="text-2xl">🍔</span>}
                      </div>
                      <label className="bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-bold cursor-pointer hover:bg-slate-700">
                         Alterar Logo
                         <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'logo')} />
                      </label>
                   </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200">
                   <h3 className="font-black text-sm uppercase mb-4 text-slate-700 tracking-widest flex items-center gap-2">
                      <span>🌐</span> Redes Sociais
                   </h3>
                   <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Instagram URL</label>
                            <input value={localInstagram} onChange={e => setLocalInstagram(e.target.value)} placeholder="https://instagram.com/seuperfil" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none" />
                         </div>
                         <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">WhatsApp (Número com DDD)</label>
                            <input value={localWhatsapp} onChange={e => setLocalWhatsapp(e.target.value)} placeholder="5534991183728" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none" />
                         </div>
                         <div className="space-y-1 md:col-span-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Facebook URL</label>
                            <input value={localFacebook} onChange={e => setLocalFacebook(e.target.value)} placeholder="https://facebook.com/seuperfil" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none" />
                         </div>
                      </div>
                      <button onClick={handleSaveSocialLinks} className="bg-emerald-600 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest w-full border-b-4 border-emerald-800 active:translate-y-1">Salvar Redes Sociais</button>
                   </div>
                </div>
                
                <div className="bg-white p-6 rounded-2xl border border-slate-200">
                   <h3 className="font-black text-sm uppercase mb-4 text-slate-700 tracking-widest flex items-center gap-2">
                      <span>🏪</span> Controles de Loja
                   </h3>
                   <button onClick={onToggleStore} className={`w-full py-4 rounded-xl font-black uppercase tracking-widest transition-all ${isStoreOpen ? 'bg-emerald-100 text-emerald-600 border border-emerald-200' : 'bg-red-600 text-white shadow-lg animate-pulse'}`}>
                      {isStoreOpen ? 'Loja Aberta (Clique para Fechar)' : 'Loja Fechada (Clique para Abrir)'}
                   </button>
                </div>
             </div>
          )}

        </div>
      </main>

      {/* MODAIS DE APOIO */}
      {selectedOrder && (
        <aside className="fixed inset-y-0 right-0 w-full md:w-[400px] bg-white shadow-2xl z-[9999] flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300">
          <div className="p-6 border-b flex justify-between items-center bg-slate-900 text-white">
            <div>
               <h3 className="text-xl font-black uppercase">Pedido #{selectedOrder.id.substring(0, 5)}</h3>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(selectedOrder.createdAt).toLocaleString('pt-BR')}</p>
            </div>
            <button onClick={() => setSelectedOrder(null)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white font-black bg-white/10 rounded-full">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-sm">
               <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 flex items-center gap-2">
                  <span>⚡ Atualizar Status</span>
                  <span className="h-px bg-slate-200 flex-1"></span>
               </p>
               <div className="grid grid-cols-2 gap-2">
                  {['NOVO', 'PREPARANDO', 'PRONTO PARA RETIRADA', 'SAIU PARA ENTREGA', 'FINALIZADO', 'CANCELADO'].map(s => {
                    const isActive = selectedOrder.status === s;
                    return (
                      <button key={s} onClick={() => handleOrderStatusChange(s as OrderStatus)} className={`p-3 rounded-xl text-[9px] font-black uppercase border-2 transition-all active:scale-95 ${isActive ? 'bg-slate-800 border-slate-800 text-white shadow-md transform scale-105' : 'bg-white border-slate-200 text-slate-500 hover:border-emerald-400 hover:text-emerald-600'}`}>{isActive && '✔ '} {s}</button>
                    );
                  })}
               </div>
            </div>
            <div className="space-y-4">
               <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Cliente</p>
                  <div className="bg-white p-3 rounded-xl border border-slate-100">
                     <p className="font-bold text-sm text-slate-800">{selectedOrder.customerName}</p>
                     <p className="text-xs text-slate-500">{selectedOrder.customerPhone}</p>
                  </div>
               </div>
               <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Endereço de Entrega</p>
                  <div className="bg-white p-3 rounded-xl border border-slate-100">
                     <p className="font-bold text-xs text-slate-700 leading-relaxed">{selectedOrder.deliveryType === 'PICKUP' ? '🏪 Retirada no Balcão' : selectedOrder.customerAddress}</p>
                  </div>
               </div>
               <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Pagamento</p>
                  <div className="bg-white p-3 rounded-xl border border-slate-100">
                     <p className="font-bold text-xs text-slate-700">{selectedOrder.paymentMethod} {selectedOrder.changeFor ? `(Troco p/ ${selectedOrder.changeFor})` : ''}</p>
                  </div>
               </div>
            </div>
            <div className="border-t-2 border-dashed border-slate-200 pt-6">
               <p className="text-[10px] font-black uppercase text-slate-400 mb-3">Itens do Pedido</p>
               <div className="space-y-3">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start text-xs bg-white p-2 rounded-lg border border-slate-50">
                       <div>
                          <span className="font-bold text-slate-800 block">{item.quantity}x {item.name}</span>
                          {item.selectedComplements && item.selectedComplements.length > 0 && <span className="text-[10px] text-slate-400 block mt-0.5">+ {item.selectedComplements.map(c => c.name).join(', ')}</span>}
                       </div>
                       <span className="font-black text-slate-900">R$ {(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
               </div>
               <div className="mt-6 bg-slate-900 text-white p-4 rounded-xl flex justify-between items-center shadow-lg">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Total Final</span>
                  <span className="font-black text-xl text-emerald-400">R$ {selectedOrder.total.toFixed(2)}</span>
               </div>
            </div>
          </div>
          <div className="p-6 border-t bg-slate-50 space-y-3">
            <button onClick={executeRealPrint} className="w-full py-4 bg-emerald-600 text-white rounded-xl font-black uppercase text-xs flex justify-center gap-2 items-center hover:bg-emerald-700 shadow-lg transition-all active:scale-95"><span>🖨️</span> Imprimir Cupom</button>
            <button onClick={() => setShowDeleteConfirm(true)} className="w-full py-4 bg-white text-red-500 border border-red-100 rounded-xl font-black uppercase text-xs hover:bg-red-50 transition-all">🗑️ Excluir Pedido</button>
          </div>
        </aside>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 p-4">
          <div className="bg-white p-8 rounded-3xl text-center max-w-sm w-full animate-in zoom-in-95">
            <h3 className="font-black text-xl mb-2 text-slate-800">Confirmar Exclusão?</h3>
            <p className="text-slate-500 text-xs mb-6">Essa ação não pode ser desfeita.</p>
            <div className="flex gap-4">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-3 bg-slate-100 rounded-xl font-bold text-slate-600 uppercase text-xs">Cancelar</button>
              <button onClick={executeDelete} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold uppercase text-xs shadow-lg shadow-red-200">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
