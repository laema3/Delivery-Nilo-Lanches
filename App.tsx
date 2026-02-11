
import React, { useState, useEffect, useMemo } from 'react';
import { Navbar } from './components/Navbar.tsx';
import { FoodCard } from './components/FoodCard.tsx';
import { CartSidebar } from './components/CartSidebar.tsx';
import { AdminPanel } from './components/AdminPanel.tsx';
import { ProductModal } from './components/ProductModal.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { AdminLoginModal } from './components/AdminLoginModal.tsx';
import { OrderSuccessModal } from './components/OrderSuccessModal.tsx';
import { ChatBot } from './components/ChatBot.tsx';
import { Footer } from './components/Footer.tsx';
import { CustomerOrders } from './components/CustomerOrders.tsx';
import { Toast } from './components/Toast.tsx';
import { InstallBanner } from './components/InstallBanner.tsx';
import { ProductLoader } from './components/ProductLoader.tsx';
import { dbService } from './services/dbService.ts';
import { db } from './firebaseConfig.ts';
import { Product, CartItem, Order, Customer, ZipRange, PaymentSettings, CategoryItem, SubCategoryItem, Complement, OrderStatus, DeliveryType, Coupon } from './types.ts';
import { DEMO_CATEGORIES, DEMO_PRODUCTS, DEMO_COMPLEMENTS, DEMO_SETTINGS, DEFAULT_LOGO } from './constants.tsx';

const safeNormalize = (val: any): string => {
  if (!val) return "";
  return String(val).toLowerCase().trim().normalize("NFD").replace(/[\u0300./\u036f]/g, "");
};

const App: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategoryItem[]>([]);
  const [complements, setComplements] = useState<Complement[]>([]);
  const [zipRanges, setZipRanges] = useState<ZipRange[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentSettings[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  
  const [isStoreOpen, setIsStoreOpen] = useState(true);
  const [logoUrl, setLogoUrl] = useState(DEFAULT_LOGO);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProductLoading, setIsProductLoading] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('Todos');
  const [activeView, setActiveView] = useState<'home' | 'my-orders'>('home');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => sessionStorage.getItem('nl_admin_auth') === 'true');
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' as 'success' | 'error' });

  const [currentUser, setCurrentUser] = useState<Customer | null>(() => {
    try {
      const saved = localStorage.getItem('nl_current_user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  // ATUALIZAÇÃO DO ÍCONE DO SITE (FAVICON) E DO PWA (MANIFEST) COM O LOGO
  useEffect(() => {
    const safeLogo = logoUrl || DEFAULT_LOGO;
    
    // 1. Atualiza Favicon da aba
    const link = document.getElementById('favicon') as HTMLLinkElement;
    if (link) {
      link.href = safeLogo;
      link.type = safeLogo.startsWith('data:') ? safeLogo.split(';')[0].split(':')[1] : "image/png";
    }

    // 2. Atualiza ícone Apple (iOS)
    const appleLink = document.getElementById('apple-icon') as HTMLLinkElement;
    if (appleLink) {
      appleLink.href = safeLogo;
    }

    // 3. Atualiza MANIFEST Dinamicamente para o PWA (Instalação)
    const mimeType = safeLogo.startsWith('data:') ? safeLogo.split(';')[0].split(':')[1] : 'image/png';
    
    const dynamicManifest = {
      short_name: "Nilo Lanches",
      name: "Nilo Lanches Delivery",
      description: "O melhor lanche de Uberaba na palma da sua mão.",
      icons: [
        {
          src: safeLogo,
          type: mimeType,
          sizes: "192x192",
          purpose: "any maskable"
        },
        {
          src: safeLogo,
          type: mimeType,
          sizes: "512x512",
          purpose: "any maskable"
        }
      ],
      start_url: "/",
      scope: "/",
      display: "standalone",
      orientation: "portrait",
      theme_color: "#008000",
      background_color: "#ffffff"
    };

    const stringManifest = JSON.stringify(dynamicManifest);
    const blob = new Blob([stringManifest], { type: 'application/json' });
    const manifestURL = URL.createObjectURL(blob);
    
    const manifestLink = document.querySelector('link[rel="manifest"]');
    if (manifestLink) {
      manifestLink.setAttribute('href', manifestURL);
    }
  }, [logoUrl]);

  // INITIALIZATION & SYNC
  useEffect(() => {
    const initApp = async () => {
      console.log("🚀 Iniciando Nilo Lanches...");
      
      const currentProds = await dbService.getAll<Product[]>('products', []);
      const currentCats = await dbService.getAll<CategoryItem[]>('categories', []);

      if (currentProds.length === 0 || currentCats.length === 0) {
        console.log("📦 Populando dados iniciais (Demo)...");
        
        await Promise.all([
             ...DEMO_CATEGORIES.map(c => dbService.save('categories', c.id, c)),
             ...DEMO_PRODUCTS.map(p => dbService.save('products', p.id, p)),
             ...DEMO_COMPLEMENTS.map(c => dbService.save('complements', c.id, c)),
             dbService.save('settings', 'general', { ...DEMO_SETTINGS[0], isStoreOpen: true })
        ]);

        setCategories(DEMO_CATEGORIES);
        setProducts(DEMO_PRODUCTS);
        setComplements(DEMO_COMPLEMENTS);
        setIsStoreOpen(true);
      }
    };

    initApp();

    const unsubs = [
      dbService.subscribe<Product[]>('products', setProducts),
      dbService.subscribe<Order[]>('orders', setOrders),
      dbService.subscribe<CategoryItem[]>('categories', setCategories),
      dbService.subscribe<SubCategoryItem[]>('sub_categories', setSubCategories),
      dbService.subscribe<Complement[]>('complements', setComplements),
      dbService.subscribe<ZipRange[]>('zip_ranges', setZipRanges),
      dbService.subscribe<PaymentSettings[]>('payment_methods', setPaymentMethods),
      dbService.subscribe<Coupon[]>('coupons', setCoupons),
      dbService.subscribe<Customer[]>('customers', setCustomers),
      dbService.subscribe<any[]>('settings', (data) => {
        if (data && data.length > 0) {
          const settings = data.find(d => d.id === 'general') || data[0];
          setIsStoreOpen(settings.isStoreOpen !== false);
          // Se vier vazio do banco, usa o padrão, senão usa o que está no banco
          setLogoUrl(settings.logoUrl || DEFAULT_LOGO);
        }
      })
    ];

    return () => unsubs.forEach(u => u && u());
  }, []);

  // --- AGENDAMENTO AUTOMÁTICO (Abrir 18:30 / Fechar 00:00) ---
  useEffect(() => {
    const checkSchedule = async () => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      // 1. FECHAMENTO AUTOMÁTICO (Segurança da Madrugada)
      // REGRA: Entre 00:00 e 06:00, se a loja estiver "Aberta", força o fechamento.
      // Isso garante que se você esquecer aberta, o sistema fecha.
      if (currentHour >= 0 && currentHour < 6 && isStoreOpen) {
        console.log("🌙 Fechamento Automático: Horário limite atingido (00:00).");
        
        setIsStoreOpen(false);
        setToast({ show: true, msg: 'Loja fechada automaticamente (Horário limite atingido)', type: 'error' });

        try {
          await dbService.save('settings', 'general', { 
            id: 'general', 
            isStoreOpen: false, 
            logoUrl: logoUrl || DEFAULT_LOGO 
          });
        } catch (error) {
          console.error("Erro ao fechar loja automaticamente:", error);
        }
      }

      // 2. ABERTURA AUTOMÁTICA (18:30)
      // REGRA: Se for exatamente 18h e 30min e a loja estiver "Fechada", força a abertura.
      // Usamos o minuto exato para permitir que você feche manualmente depois (ex: as 19:00) sem que o sistema reabra sozinho.
      if (currentHour === 18 && currentMinute === 30 && !isStoreOpen) {
        console.log("☀️ Abertura Automática: Horário de início atingido (18:30).");
        
        setIsStoreOpen(true);
        setToast({ show: true, msg: 'Loja aberta automaticamente (18:30)', type: 'success' });

        try {
          await dbService.save('settings', 'general', { 
            id: 'general', 
            isStoreOpen: true, 
            logoUrl: logoUrl || DEFAULT_LOGO 
          });
        } catch (error) {
          console.error("Erro ao abrir loja automaticamente:", error);
        }
      }
    };

    // Verifica agora e a cada 30 segundos para não perder o minuto exato de abertura
    checkSchedule();
    const interval = setInterval(checkSchedule, 30000); // 30s

    return () => clearInterval(interval);
  }, [isStoreOpen, logoUrl]);

  // ORDENAÇÃO ALFABÉTICA DOS PRODUTOS
  const groupedMenu = useMemo(() => {
    if (!products || products.length === 0) return [];
    
    return [...products]
      .filter(p => {
        const s = safeNormalize(searchTerm);
        const matchesSearch = !s || safeNormalize(p.name).includes(s) || safeNormalize(p.description).includes(s);
        const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory;
        const matchesSubCategory = selectedSubCategory === 'Todos' || p.subCategory === selectedSubCategory;
        return matchesSearch && matchesCategory && matchesSubCategory;
      })
      .sort((a, b) => {
        const nameA = a.name.toLowerCase().trim();
        const nameB = b.name.toLowerCase().trim();
        return nameA.localeCompare(nameB, 'pt-BR', { sensitivity: 'base' });
      });
  }, [products, searchTerm, selectedCategory, selectedSubCategory]);

  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [categories]);

  const activeSubCategories = useMemo(() => {
    if (selectedCategory === 'Todos') return [];
    const cat = categories.find(c => c.name === selectedCategory);
    if (!cat) return [];
    return subCategories
      .filter(s => s.categoryId === cat.id)
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [selectedCategory, categories, subCategories]);

  const currentDeliveryFee = useMemo(() => {
    if (!currentUser?.zipCode || zipRanges.length === 0) return 0;
    const cleanZip = parseInt(currentUser.zipCode.replace(/\D/g, ''));
    
    const range = zipRanges.find(z => {
      const start = parseInt(z.start.replace(/\D/g, ''));
      const end = parseInt(z.end.replace(/\D/g, ''));
      return cleanZip >= start && cleanZip <= end;
    });

    return range ? range.fee : 0;
  }, [currentUser, zipRanges]);

  const handleProductClick = (product: Product) => {
    setIsProductLoading(true);
    setTimeout(() => {
      setIsProductLoading(false);
      setSelectedProduct(product);
    }, 300);
  };

  const handleAddToCart = (product: Product, quantity: number, comps?: Complement[]) => {
    const compsPrice = comps?.reduce((acc, c) => acc + (c.price || 0), 0) || 0;
    const finalPrice = product.price + compsPrice;
    setCart(prev => [...prev, { ...product, price: finalPrice, quantity, selectedComplements: comps }]);
    setToast({ show: true, msg: `${quantity}x ${product.name} no carrinho!`, type: 'success' });
    setIsCartOpen(true);
    setSelectedProduct(null);
  };

  const handleCheckout = async (paymentMethod: string, fee: number, discount: number, couponCode: string, deliveryType: DeliveryType, changeFor?: number) => {
    if (!currentUser) return setIsAuthModalOpen(true);
    
    try {
        const orderId = Math.random().toString(36).substring(2, 8).toUpperCase();
        const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        const total = subtotal + fee - discount;

        const newOrder: Order = {
        id: orderId, 
        customerId: currentUser.email, 
        customerName: currentUser.name, 
        customerPhone: currentUser.phone,
        customerAddress: deliveryType === 'PICKUP' ? 'RETIRADA NO BALCÃO' : `${currentUser.address} - ${currentUser.neighborhood}`,
        items: [...cart], 
        total: total, 
        deliveryFee: fee, 
        deliveryType, 
        status: 'NOVO',
        paymentMethod, 
        changeFor, 
        discountValue: discount,
        couponCode, 
        pointsEarned: Math.floor(total), 
        createdAt: new Date().toISOString()
        };

        await dbService.save('orders', orderId, newOrder);
        setLastOrder(newOrder);
        setIsSuccessModalOpen(true);
        setCart([]);
        setIsCartOpen(false);
    } catch (e: any) {
        console.error("Erro no checkout:", e);
        setToast({ show: true, msg: 'Erro ao enviar pedido.', type: 'error' });
    }
  };

  const handleSendWhatsApp = () => {
    if (!lastOrder) return;
    const itemsList = lastOrder.items.map(item => `▪️ ${item.quantity}x *${item.name}*\n   R$ ${(item.price * item.quantity).toFixed(2)}`).join('\n\n');
    const text = `*NOVO PEDIDO #${lastOrder.id}* 🍔\n--------------------------------\n👤 *Cliente:* ${lastOrder.customerName}\n📍 *Entrega:* ${lastOrder.customerAddress}\n--------------------------------\n${itemsList}\n--------------------------------\n💰 *TOTAL: R$ ${lastOrder.total.toFixed(2)}*\n💳 *Pagamento:* ${lastOrder.paymentMethod}`;
    window.open(`https://wa.me/5534991183728?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col w-full overflow-x-hidden">
      
      {isProductLoading && <ProductLoader />}
      <Toast isVisible={toast.show} message={toast.msg} type={toast.type} onClose={() => setToast(prev => ({ ...prev, show: false }))} />
      <InstallBanner logoUrl={logoUrl} />

      {!db && (
        <div className="bg-slate-800 text-white text-[10px] font-bold text-center py-2 px-4 flex justify-between items-center mt-12 md:mt-0">
          <span>⚠️ Modo Offline (Dados locais).</span>
          <span className="opacity-50 text-[8px] uppercase tracking-widest">Sem conexão Firebase</span>
        </div>
      )}

      {!isStoreOpen && !isAdmin && (
        <div className="w-full bg-red-600 text-white py-3 px-6 text-center animate-pulse flex items-center justify-center gap-3 shadow-lg z-[100] relative">
          <span className="font-black uppercase text-[10px] tracking-widest text-white">Fechado no momento. Horário de atendimento das 18:30h às 23:00h</span>
        </div>
      )}

      <Navbar 
        cartCount={cart.reduce((acc, i) => acc + i.quantity, 0)} onCartClick={() => setIsCartOpen(true)} 
        isAdmin={isAdmin} onToggleAdmin={() => isAdmin ? setIsAdmin(false) : (isAdminAuthenticated ? setIsAdmin(true) : setIsAdminLoginOpen(true))} 
        searchTerm={searchTerm} onSearchChange={setSearchTerm} currentUser={currentUser} 
        onAuthClick={() => setIsAuthModalOpen(true)} onLogout={() => { setCurrentUser(null); localStorage.removeItem('nl_current_user'); }} 
        isStoreOpen={isStoreOpen} logoUrl={logoUrl || DEFAULT_LOGO} onMyOrdersClick={() => setActiveView('my-orders')} 
      />

      <main className="flex-1 w-full relative">
        {isAdmin ? (
          <AdminPanel 
            products={products} orders={orders} customers={customers} zipRanges={zipRanges} categories={categories} subCategories={subCategories} complements={complements} coupons={coupons} isStoreOpen={isStoreOpen} 
            onToggleStore={async () => { await dbService.save('settings', 'general', { id: 'general', isStoreOpen: !isStoreOpen, logoUrl: logoUrl || DEFAULT_LOGO }); }} 
            logoUrl={logoUrl || DEFAULT_LOGO} 
            onUpdateLogo={async (url) => { await dbService.save('settings', 'general', { id: 'general', isStoreOpen, logoUrl: url }); }}
            onAddProduct={async (p) => { try { const id = `prod_${Date.now()}`; await dbService.save('products', id, {...p, id} as Product); } catch(e) { setToast({show:true, msg:'Erro ao salvar produto', type:'error'}); } }} 
            onDeleteProduct={async (id) => { await dbService.remove('products', id); }}
            onUpdateProduct={async (p) => { await dbService.save('products', p.id, p); }} 
            onUpdateOrderStatus={async (id, s) => { 
                setOrders(prev => prev.map(o => o.id === id ? { ...o, status: s } : o));
                const o = orders.find(x => x.id === id); 
                if(o) await dbService.save('orders', id, {...o, status: s}); 
            }}
            onDeleteOrder={async (id) => {
                if(window.confirm('Tem certeza que deseja excluir este pedido do histórico?')) {
                    setOrders(prev => prev.filter(o => o.id !== id));
                    await dbService.remove('orders', id);
                    setToast({show: true, msg: 'Pedido excluído.', type: 'success'});
                }
            }}
            onUpdateCustomer={async (id, u) => { const c = customers.find(x => x.id === id); if(c) await dbService.save('customers', id, {...c, ...u}); }}
            onAddCategory={async (n) => { const id = `cat_${Date.now()}`; await dbService.save('categories', id, {id, name: n}); }}
            onRemoveCategory={async (id) => { await dbService.remove('categories', id); }}
            onAddSubCategory={async (catId, n) => { const id = `sub_${Date.now()}`; await dbService.save('sub_categories', id, {id, categoryId: catId, name: n}); }}
            onRemoveSubCategory={async (id) => { await dbService.remove('sub_categories', id); }}
            onAddComplement={async (n, p, c) => { const id = `comp_${Date.now()}`; await dbService.save('complements', id, {id, name: n, price: Number(p), active: true, applicable_categories: c}); }}
            onToggleComplement={async (id) => { const comp = complements.find(x => x.id === id); if(comp) await dbService.save('complements', id, {...comp, active: !comp.active}); }}
            onRemoveComplement={async (id) => { await dbService.remove('complements', id); }}
            onAddZipRange={async (start, end, fee) => { const id = `zip_${Date.now()}`; await dbService.save('zip_ranges', id, {id, start, end, fee: Number(fee)}); }}
            onRemoveZipRange={async (id) => { await dbService.remove('zip_ranges', id); }}
            onAddCoupon={async (code, discount, type) => { const id = `coup_${Date.now()}`; await dbService.save('coupons', id, {id, code: code.toUpperCase(), discount: Number(discount), type, active: true}); }}
            onRemoveCoupon={async (id) => { await dbService.remove('coupons', id); }}
            paymentSettings={paymentMethods} 
            onTogglePaymentMethod={async (id) => { const p = paymentMethods.find(x => x.id === id); if(p) await dbService.save('payment_methods', id, {...p, enabled: !p.enabled}); }}
            onAddPaymentMethod={async (name, type) => { const id = `pay_${Date.now()}`; await dbService.save('payment_methods', id, {id, name, type, enabled: true}); }}
            onRemovePaymentMethod={async (id) => { await dbService.remove('payment_methods', id); }}
            onUpdatePaymentSettings={async (id, updates) => { const p = paymentMethods.find(x => x.id === id); if(p) await dbService.save('payment_methods', id, {...p, ...updates}); }}
            onLogout={() => { setIsAdmin(false); setIsAdminAuthenticated(false); sessionStorage.removeItem('nl_admin_auth'); }} 
            onBackToSite={() => setIsAdmin(false)}
          />
        ) : activeView === 'my-orders' ? (
          <CustomerOrders orders={orders.filter(o => o.customerId === currentUser?.email)} onBack={() => setActiveView('home')} />
        ) : (
          <div className="flex flex-col w-full items-center">
            {/* Hero */}
            <section className="relative w-full min-h-[400px] bg-slate-950 flex items-center justify-center overflow-hidden">
               <img src="https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=1920" className="absolute inset-0 w-full h-full object-cover opacity-60" />
               <div className="relative z-10 text-center px-4">
                  <h1 className="font-brand text-6xl sm:text-[100px] text-white uppercase leading-none">
                    <span className="text-emerald-500">NILO</span> <span className="text-red-600">LANCHES</span>
                  </h1>
                  <button onClick={() => document.getElementById('menu-anchor')?.scrollIntoView({behavior:'smooth'})} className="mt-8 bg-emerald-600 text-white px-10 py-4 rounded-2xl font-brand text-xl border-b-4 border-emerald-800 shadow-xl transition-all active:scale-95 uppercase tracking-widest">Ver Cardápio</button>
               </div>
            </section>
            
            {/* MENU: Sticky Category Bar */}
            <div id="menu-anchor" className="sticky top-20 sm:top-28 z-30 bg-white/95 backdrop-blur-md shadow-sm border-b w-full flex flex-col items-center py-4 gap-3 transition-all duration-300">
               <div className="flex justify-start md:justify-center gap-3 overflow-x-auto no-scrollbar w-full max-w-7xl px-4">
                 <button onClick={() => { setSelectedCategory('Todos'); setSelectedSubCategory('Todos'); }} className={`px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest shrink-0 transition-all ${selectedCategory === 'Todos' ? 'bg-emerald-600 text-white shadow-lg transform scale-105' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Todos</button>
                 {sortedCategories.map(cat => (
                   <button key={cat.id} onClick={() => { setSelectedCategory(cat.name); setSelectedSubCategory('Todos'); }} className={`px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest shrink-0 transition-all ${selectedCategory === cat.name ? 'bg-emerald-600 text-white shadow-lg transform scale-105' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{cat.name}</button>
                 ))}
               </div>
               
               {activeSubCategories.length > 0 && (
                 <div className="flex justify-start md:justify-center gap-2 overflow-x-auto no-scrollbar w-full max-w-7xl animate-fade-in px-4 pb-1">
                   <button onClick={() => setSelectedSubCategory('Todos')} className={`px-5 py-2 rounded-full text-[11px] font-black uppercase tracking-widest shrink-0 transition-all ${selectedSubCategory === 'Todos' ? 'text-emerald-700 border-b-2 border-emerald-600 bg-emerald-50' : 'text-slate-500 hover:text-slate-700'}`}>Tudo</button>
                   {activeSubCategories.map(sub => (
                     <button key={sub.id} onClick={() => setSelectedSubCategory(sub.name)} className={`px-5 py-2 rounded-full text-[11px] font-black uppercase tracking-widest shrink-0 transition-all ${selectedSubCategory === sub.name ? 'text-emerald-700 border-b-2 border-emerald-600 bg-emerald-50' : 'text-slate-500 hover:text-slate-700'}`}>{sub.name}</button>
                   ))}
                 </div>
               )}
            </div>

            <div className="w-full max-w-7xl mx-auto px-6 py-12">
               {groupedMenu.length > 0 ? (
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {groupedMenu.map(p => <FoodCard key={p.id} product={p} onAdd={handleAddToCart} onClick={handleProductClick} />)}
                 </div>
               ) : (
                 <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in bg-white rounded-[40px] border-2 border-dashed border-slate-200">
                   <span className="text-6xl mb-6">🍔</span>
                   <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Ops... Cardápio vazio</h3>
                   <p className="text-slate-400 font-bold text-sm mt-2 max-w-xs uppercase tracking-widest">Nenhum produto cadastrado no momento.</p>
                 </div>
               )}
            </div>
          </div>
        )}
      </main>

      <Footer logoUrl={logoUrl || DEFAULT_LOGO} onAdminClick={() => setIsAdminLoginOpen(true)} />
      
      <CartSidebar 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)} 
        items={cart} 
        coupons={coupons} 
        onUpdateQuantity={(id, d) => setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: Math.max(1, i.quantity + d) } : i))} 
        onRemove={id => setCart(prev => prev.filter(i => i.id !== id))} 
        onCheckout={handleCheckout} 
        onAuthClick={() => setIsAuthModalOpen(true)} 
        paymentSettings={paymentMethods} 
        currentUser={currentUser} 
        deliveryFee={currentDeliveryFee} 
        availableCoupons={[]} 
        isStoreOpen={isStoreOpen} 
      />

      <ProductModal product={selectedProduct} complements={complements} categories={categories} onClose={() => setSelectedProduct(null)} onAdd={handleAddToCart} isStoreOpen={isStoreOpen} />
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} onLogin={setCurrentUser} onSignup={async (u) => { setCustomers(prev => [...prev, u]); setCurrentUser(u); await dbService.save('customers', u.email, u); }} zipRanges={zipRanges} customers={customers} />
      <AdminLoginModal isOpen={isAdminLoginOpen} onClose={() => setIsAdminLoginOpen(false)} onSuccess={() => { setIsAdminAuthenticated(true); sessionStorage.setItem('nl_admin_auth', 'true'); setIsAdmin(true); }} />
      <OrderSuccessModal isOpen={isSuccessModalOpen} onClose={() => setIsSuccessModalOpen(false)} orderId={lastOrder?.id || ''} onSendWhatsApp={handleSendWhatsApp} />
      
      {/* CHATBOT REATIVADO E COM PODERES DE FINALIZAÇÃO */}
      {!isAdmin && (
        <ChatBot 
          products={products} 
          cart={cart}
          deliveryFee={currentDeliveryFee}
          onAddToCart={handleAddToCart} 
          onClearCart={() => setCart([])}
        />
      )}
    </div>
  );
};

export default App;
