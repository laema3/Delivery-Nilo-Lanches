
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
import { DEMO_CATEGORIES, DEMO_SUB_CATEGORIES, DEMO_PRODUCTS, DEMO_COMPLEMENTS, DEMO_SETTINGS, DEFAULT_LOGO } from './constants.tsx';

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
  
  // CORREÇÃO: Inicializa isAdmin verificando o sessionStorage para persistir após F5
  const [isAdmin, setIsAdmin] = useState(() => sessionStorage.getItem('nl_admin_auth') === 'true');
  
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const savedCart = localStorage.getItem('nl_cart_v1');
      const parsed = savedCart ? JSON.parse(savedCart) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

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
  const [isOrderProcessing, setIsOrderProcessing] = useState(false);

  const [currentUser, setCurrentUser] = useState<Customer | null>(() => {
    try {
      const saved = localStorage.getItem('nl_current_user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  useEffect(() => {
    if (logoUrl) {
      const favicon = document.getElementById('app-favicon') as HTMLLinkElement;
      const appleIcon = document.getElementById('app-apple-touch-icon') as HTMLLinkElement;
      if (favicon) favicon.href = logoUrl;
      if (appleIcon) appleIcon.href = logoUrl;
    }
  }, [logoUrl]);

  useEffect(() => {
    if (Array.isArray(cart)) {
      try {
        localStorage.setItem('nl_cart_v1', JSON.stringify(cart));
      } catch (error: any) {
        if (error.name === 'QuotaExceededError' || error.code === 22) {
          try {
            const lightCart = cart.map(item => ({ ...item, image: '' }));
            localStorage.setItem('nl_cart_v1', JSON.stringify(lightCart));
          } catch (e2) {}
        }
      }
    }
  }, [cart]);

  useEffect(() => {
    const timer = setTimeout(() => setIsInitialLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const initApp = async () => {
      const currentCats = await dbService.getAll<CategoryItem[]>('categories', []);
      if (currentCats.length === 0) {
        await Promise.all([
             ...DEMO_CATEGORIES.map(c => dbService.save('categories', c.id, c)),
             ...DEMO_SUB_CATEGORIES.map(s => dbService.save('sub_categories', s.id, s)),
             ...DEMO_PRODUCTS.map(p => dbService.save('products', p.id, p)),
             ...DEMO_COMPLEMENTS.map(c => dbService.save('complements', c.id, c)),
             dbService.save('settings', 'general', { ...DEMO_SETTINGS[0], isStoreOpen: true })
        ]);
      }
    };
    initApp();

    const unsubs = [
      dbService.subscribe<Product[]>('products', setProducts),
      dbService.subscribe<Order[]>('orders', setOrders),
      dbService.subscribe<CategoryItem[]>('categories', (data) => {
        const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
        setCategories(sorted);
      }),
      dbService.subscribe<SubCategoryItem[]>('sub_categories', (data) => {
        const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
        setSubCategories(sorted);
      }),
      dbService.subscribe<Complement[]>('complements', setComplements),
      dbService.subscribe<ZipRange[]>('zip_ranges', setZipRanges),
      dbService.subscribe<PaymentSettings[]>('payment_methods', setPaymentMethods),
      dbService.subscribe<Coupon[]>('coupons', setCoupons),
      dbService.subscribe<Customer[]>('customers', setCustomers),
      dbService.subscribe<any[]>('settings', (data) => {
        if (data && data.length > 0) {
          const settings = data.find(d => d.id === 'general') || data[0];
          setIsStoreOpen(settings.isStoreOpen !== false);
          setLogoUrl(settings.logoUrl || DEFAULT_LOGO);
        }
      })
    ];
    return () => unsubs.forEach(u => u && u());
  }, []);

  const groupedMenu = useMemo(() => {
    if (!products || products.length === 0) return [];
    return [...products]
      .filter(p => {
        const s = safeNormalize(searchTerm);
        const matchesSearch = !s || safeNormalize(p.name).includes(s) || safeNormalize(p.description).includes(s);
        const matchesCategory = selectedCategory === 'Todos' || safeNormalize(p.category) === safeNormalize(selectedCategory);
        const matchesSubCategory = selectedSubCategory === 'Todos' || safeNormalize(p.subCategory) === safeNormalize(selectedSubCategory);
        return matchesSearch && matchesCategory && matchesSubCategory;
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [products, searchTerm, selectedCategory, selectedSubCategory]);

  const activeSubCategories = useMemo(() => {
    if (selectedCategory === 'Todos') return [];
    const currentCat = categories.find(c => safeNormalize(c.name) === safeNormalize(selectedCategory));
    if (!currentCat) return [];
    return subCategories.filter(s => s.categoryId === currentCat.id).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
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

  const handleAddToCart = (product: Product, quantity: number, comps?: Complement[]) => {
    const compsPrice = comps?.reduce((acc, c) => acc + (c.price || 0), 0) || 0;
    const finalPrice = product.price + compsPrice;
    setCart(prev => [...prev, { ...product, price: finalPrice, quantity, selectedComplements: comps }]);
    setToast({ show: true, msg: `${quantity}x ${product.name} no carrinho!`, type: 'success' });
    setIsCartOpen(true);
    setSelectedProduct(null);
  };

  const handleUpdateQuantity = (id: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.id === id) {
          const newQty = item.quantity + delta;
          return { ...item, quantity: newQty };
        }
        return item;
      }).filter(item => item.quantity > 0);
    });
  };

  const handleReorder = (order: Order) => {
    const itemsToAdd = order.items.map(item => ({...item}));
    setCart(prev => [...prev, ...itemsToAdd]);
    setToast({ show: true, msg: 'Itens do pedido anterior adicionados!', type: 'success' });
    setActiveView('home');
    setIsCartOpen(true);
  };

  const handleCheckout = async (paymentMethod: string, fee: number, discount: number, couponCode: string, deliveryType: DeliveryType, changeFor?: number) => {
    if (!currentUser) return setIsAuthModalOpen(true);
    setIsOrderProcessing(true);
    try {
        const orderId = Math.random().toString(36).substring(2, 8).toUpperCase();
        const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        const total = subtotal + fee - discount;
        const newOrder: Order = {
          id: orderId, 
          customerId: currentUser.email, 
          customerName: currentUser.name, 
          customerPhone: currentUser.phone,
          customerAddress: deliveryType === 'PICKUP' ? 'RETIRADA' : `${currentUser.address}`,
          items: [...cart], 
          total, 
          deliveryFee: fee, 
          deliveryType, 
          status: 'NOVO', 
          paymentMethod, 
          createdAt: new Date().toISOString(), 
          pointsEarned: Math.floor(total),
          changeFor: changeFor || 0,
          discountValue: discount || 0,
          couponCode: couponCode || ''
        };
        await dbService.save('orders', orderId, newOrder);
        if (currentUser) {
          const updatedUser = { 
             ...currentUser, 
             lastOrder: new Date().toISOString(),
             totalOrders: (currentUser.totalOrders || 0) + 1,
             points: (currentUser.points || 0) + Math.floor(total)
          };
          setCurrentUser(updatedUser);
          await dbService.save('customers', currentUser.email, updatedUser);
        }
        setLastOrder(newOrder);
        setIsSuccessModalOpen(true);
        setCart([]);
    } catch (e) { 
      setToast({ show: true, msg: 'Erro ao processar. Tente novamente.', type: 'error' }); 
    } finally {
      setIsOrderProcessing(false);
    }
  };

  const handleSendWhatsApp = () => {
    if (!lastOrder) return;

    const itemsList = lastOrder.items.map(item => 
      `▪️ ${item.quantity}x *${item.name}*${item.selectedComplements?.length ? `\n   + ${item.selectedComplements.map(c => c.name).join(', ')}` : ''}`
    ).join('\n');

    const whatsappText = `🍔 *PEDIDO #${lastOrder.id.substring(0,6)}*
--------------------------------
👤 *Cliente:* ${lastOrder.customerName}
📍 *Tipo:* ${lastOrder.deliveryType === 'DELIVERY' ? 'Entrega' : 'Retirada'}
🏠 *Endereço:* ${lastOrder.customerAddress}
💳 *Pagamento:* ${lastOrder.paymentMethod} ${lastOrder.changeFor ? `(Troco p/ ${lastOrder.changeFor})` : ''}
--------------------------------
*ITENS:*
${itemsList}
--------------------------------
💵 *Total:* R$ ${lastOrder.total.toFixed(2)}
🛵 *Taxa:* R$ ${lastOrder.deliveryFee.toFixed(2)}
`;
    
    const url = `https://wa.me/5534991183728?text=${encodeURIComponent(whatsappText)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col w-full overflow-x-hidden">
      {isInitialLoading && <ProductLoader />}
      <Toast isVisible={toast.show} message={toast.msg} type={toast.type} onClose={() => setToast(prev => ({ ...prev, show: false }))} />
      <InstallBanner logoUrl={logoUrl} />
      
      {!isStoreOpen && !isAdmin && (
        <div className="w-full bg-red-600 text-white py-2.5 text-center text-[10px] font-black uppercase tracking-[0.2em] z-[60] relative animate-pulse flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(220,38,38,0.3)]">
          <span className="text-sm">⚠️</span>
          LOJA FECHADA - ATENDIMENTO DAS 18:30 ÀS 23:50
          <span className="text-sm">⚠️</span>
        </div>
      )}

      <Navbar 
        cartCount={Array.isArray(cart) ? cart.reduce((acc, i) => acc + i.quantity, 0) : 0} 
        onCartClick={() => setIsCartOpen(true)} 
        isAdmin={isAdmin} 
        onToggleAdmin={() => isAdmin ? setIsAdmin(false) : (isAdminAuthenticated ? setIsAdmin(true) : setIsAdminLoginOpen(true))} 
        searchTerm={searchTerm} 
        onSearchChange={setSearchTerm} 
        currentUser={currentUser} 
        onAuthClick={() => setIsAuthModalOpen(true)} 
        onLogout={() => { setCurrentUser(null); localStorage.removeItem('nl_current_user'); }} 
        isStoreOpen={isStoreOpen} 
        logoUrl={logoUrl} 
        onMyOrdersClick={() => setActiveView('my-orders')} 
      />

      <main className="flex-1 w-full relative">
        {isAdmin ? (
          <AdminPanel 
            products={products} orders={orders} customers={customers} zipRanges={zipRanges} categories={categories} subCategories={subCategories} complements={complements} coupons={coupons} isStoreOpen={isStoreOpen} 
            onToggleStore={async () => { await dbService.save('settings', 'general', { id: 'general', isStoreOpen: !isStoreOpen, logoUrl }); }} 
            logoUrl={logoUrl} onUpdateLogo={async (url) => { await dbService.save('settings', 'general', { id: 'general', isStoreOpen, logoUrl: url }); }}
            onAddProduct={async (p) => { const id = `prod_${Date.now()}`; await dbService.save('products', id, {...p, id} as Product); }} 
            onDeleteProduct={async (id) => { await dbService.remove('products', id); }}
            onAddCategory={async (n) => { const id = `cat_${Date.now()}`; await dbService.save('categories', id, {id, name: n}); }}
            onRemoveCategory={async (id) => { await dbService.remove('categories', id); }}
            onUpdateCategory={async (id, name) => { await dbService.save('categories', id, {id, name}); setToast({show:true, msg:'Categoria salva!', type:'success'}); }}
            onAddSubCategory={async (catId, n) => { const id = `sub_${Date.now()}`; await dbService.save('sub_categories', id, {id, categoryId: catId, name: n}); }}
            onUpdateSubCategory={async (id, name, catId) => { await dbService.save('sub_categories', id, {id, name, categoryId: catId}); setToast({show:true, msg:'Subcategoria salva!', type:'success'}); }}
            onRemoveSubCategory={async (id) => { await dbService.remove('sub_categories', id); }}
            onAddComplement={async (n, p, c) => { const id = `comp_${Date.now()}`; await dbService.save('complements', id, {id, name: n, price: p, active: true, applicable_categories: c}); }}
            onToggleComplement={async (id) => { const comp = complements.find(x => x.id === id); if(comp) await dbService.save('complements', id, {...comp, active: !comp.active}); }}
            onUpdateComplement={async (id, name, price, cats) => { const comp = complements.find(x => x.id === id); if(comp) await dbService.save('complements', id, {...comp, name, price, applicable_categories: cats}); setToast({show:true, msg:'Adicional salvo!', type:'success'}); }}
            onRemoveComplement={async (id) => { await dbService.remove('complements', id); }}
            onAddZipRange={async (s, e, f) => { const id = `zip_${Date.now()}`; await dbService.save('zip_ranges', id, {id, start: s, end: e, fee: f}); }}
            onUpdateZipRange={async (id, s, e, f) => { const zip = zipRanges.find(z => z.id === id); if(zip) await dbService.save('zip_ranges', id, {...zip, start: s, end: e, fee: f}); setToast({show:true, msg:'Faixa de CEP salva!', type:'success'}); }}
            onRemoveZipRange={async (id) => { await dbService.remove('zip_ranges', id); }}
            onAddCoupon={async (c, d, t) => { const id = `cp_${Date.now()}`; await dbService.save('coupons', id, {id, code: c.toUpperCase(), discount: d, type: t, active: true}); }}
            onRemoveCoupon={async (id) => { await dbService.remove('coupons', id); }}
            paymentSettings={paymentMethods} 
            onTogglePaymentMethod={async (id) => { const p = paymentMethods.find(x => x.id === id); if(p) await dbService.save('payment_methods', id, {...p, enabled: !p.enabled}); }}
            onAddPaymentMethod={async (n, t, e, tk) => { const id = `pay_${Date.now()}`; await dbService.save('payment_methods', id, {id, name: n, type: t, email: e, token: tk, enabled: true}); }}
            onRemovePaymentMethod={async (id) => { await dbService.remove('payment_methods', id); }}
            onUpdatePaymentSettings={async (id, u) => { const p = paymentMethods.find(x => x.id === id); if(p) await dbService.save('payment_methods', id, {...p, ...u}); setToast({show:true, msg:'Pagamento atualizado!', type:'success'}); }}
            onLogout={() => { setIsAdmin(false); setIsAdminAuthenticated(false); sessionStorage.removeItem('nl_admin_auth'); }} 
            onBackToSite={() => setIsAdmin(false)}
            onUpdateProduct={async (p) => { await dbService.save('products', p.id, p); }}
            onUpdateOrderStatus={async (id, s) => { const o = orders.find(x => x.id === id); if(o) await dbService.save('orders', id, {...o, status: s}); }}
            onDeleteOrder={async (id) => { await dbService.remove('orders', id); }}
            onUpdateCustomer={async (id, u) => { const c = customers.find(x => x.id === id); if(c) await dbService.save('customers', id, {...c, ...u}); }}
          />
        ) : activeView === 'my-orders' ? (
          <CustomerOrders 
            orders={orders.filter(o => o.customerId === currentUser?.email)} 
            onBack={() => setActiveView('home')} 
            onReorder={handleReorder}
          />
        ) : (
          <div className="flex flex-col w-full items-center">
            <section className="relative w-full min-h-[400px] bg-slate-950 flex items-center justify-center overflow-hidden">
               <img src="https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=1920" className="absolute inset-0 w-full h-full object-cover opacity-60" alt="Banner"/>
               <div className="relative z-10 text-center px-4">
                  <h1 className="font-brand text-6xl sm:text-[100px] text-white uppercase leading-none">
                    <span className="text-emerald-500">NILO</span> <span className="text-red-600">LANCHES</span>
                  </h1>
                  <button onClick={() => document.getElementById('menu-anchor')?.scrollIntoView({behavior:'smooth'})} className="mt-8 bg-emerald-600 text-white px-10 py-4 rounded-2xl font-brand text-xl border-b-4 border-emerald-800 shadow-xl transition-all active:scale-95 uppercase tracking-widest">Ver Cardápio</button>
               </div>
            </section>
            
            <div id="menu-anchor" className="bg-white shadow-md border-b border-slate-200 w-full flex flex-col items-center py-4 gap-3 transition-all duration-300">
               <div className="flex justify-start md:justify-center gap-3 overflow-x-auto no-scrollbar w-full max-w-7xl px-4">
                 <button onClick={() => { setSelectedCategory('Todos'); setSelectedSubCategory('Todos'); }} className={`px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest shrink-0 transition-all ${selectedCategory === 'Todos' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-100 text-slate-600'}`}>Todos</button>
                 {categories.map(cat => (
                   <button key={cat.id} onClick={() => { setSelectedCategory(cat.name); setSelectedSubCategory('Todos'); }} className={`px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest shrink-0 transition-all ${selectedCategory === cat.name ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-100 text-slate-600'}`}>{cat.name}</button>
                 ))}
               </div>
               {activeSubCategories.length > 0 && (
                 <div className="flex justify-start md:justify-center gap-2 overflow-x-auto no-scrollbar w-full max-w-7xl px-4 animate-fade-in">
                   <button onClick={() => setSelectedSubCategory('Todos')} className={`px-5 py-2 rounded-full text-[11px] font-black uppercase shrink-0 ${selectedSubCategory === 'Todos' ? 'text-emerald-700 border-b-2 border-emerald-600' : 'text-slate-500'}`}>Tudo</button>
                   {activeSubCategories.map(sub => (
                     <button key={sub.id} onClick={() => setSelectedSubCategory(sub.name)} className={`px-5 py-2 rounded-full text-[11px] font-black uppercase shrink-0 ${selectedSubCategory === sub.name ? 'text-emerald-700 border-b-2 border-emerald-600' : 'text-slate-500'}`}>{sub.name}</button>
                   ))}
                 </div>
               )}
            </div>

            <div className="w-full max-w-7xl mx-auto px-6 py-12">
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                  {groupedMenu.map(p => <FoodCard key={p.id} product={p} onAdd={handleAddToCart} onClick={setSelectedProduct} />)}
               </div>
            </div>
          </div>
        )}
      </main>

      <Footer logoUrl={logoUrl} onAdminClick={() => setIsAdminLoginOpen(true)} />
      <CartSidebar 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)} 
        items={cart || []} 
        coupons={coupons} 
        onUpdateQuantity={handleUpdateQuantity} 
        onRemove={(id) => setCart(prev => prev.filter(i => i.id !== id))} 
        onCheckout={handleCheckout} 
        onAuthClick={() => setIsAuthModalOpen(true)} 
        paymentSettings={paymentMethods} 
        currentUser={currentUser} 
        deliveryFee={currentDeliveryFee || 0} 
        availableCoupons={[]} 
        isStoreOpen={isStoreOpen} 
        isProcessing={isOrderProcessing}
      />
      <ProductModal product={selectedProduct} complements={complements} categories={categories} onClose={() => setSelectedProduct(null)} onAdd={handleAddToCart} isStoreOpen={isStoreOpen} />
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} onLogin={setCurrentUser} onSignup={async (u) => { setCurrentUser(u); await dbService.save('customers', u.email, u); }} zipRanges={zipRanges} customers={customers} />
      <AdminLoginModal isOpen={isAdminLoginOpen} onClose={() => setIsAdminLoginOpen(false)} onSuccess={() => { setIsAdminAuthenticated(true); sessionStorage.setItem('nl_admin_auth', 'true'); setIsAdmin(true); }} />
      <OrderSuccessModal isOpen={isSuccessModalOpen} onClose={() => setIsSuccessModalOpen(false)} order={lastOrder} onSendWhatsApp={handleSendWhatsApp} />
      {!isAdmin && <ChatBot products={products} cart={Array.isArray(cart) ? cart : []} deliveryFee={currentDeliveryFee} isStoreOpen={isStoreOpen} onAddToCart={handleAddToCart} onClearCart={() => setCart([])} />}
    </div>
  );
};

export default App;
