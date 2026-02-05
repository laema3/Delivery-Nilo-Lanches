
// Add React to the imports to resolve the missing namespace error
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
import { InstallBanner } from './components/InstallBanner.tsx'; 
import { dbService } from './services/dbService.ts';
import { DEMO_PRODUCTS } from './constants.tsx';
import { Product, CartItem, Order, Customer, ZipRange, PaymentSettings, CategoryItem, SubCategoryItem, Complement, OrderStatus, DeliveryType, Coupon } from './types.ts';

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
  const [logoUrl, setLogoUrl] = useState('');
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const [isAdmin, setIsAdmin] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
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
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);

  const [currentUser, setCurrentUser] = useState<Customer | null>(() => {
    const saved = localStorage.getItem('nl_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    const loadAllData = async () => {
      const [
        p, o, c, cats, subs, comps, zips, pays, coups, settings
      ] = await Promise.all([
        dbService.getAll('products', DEMO_PRODUCTS),
        dbService.getAll('orders', []),
        dbService.getAll('customers', []),
        dbService.getAll('categories', []),
        dbService.getAll('sub_categories', []),
        dbService.getAll('complements', []),
        dbService.getAll('zip_ranges', []),
        dbService.getAll<PaymentSettings[]>('payment_methods', [
          { id: 'p1', name: 'Cartão na Entrega', enabled: true, type: 'DELIVERY' },
          { id: 'p2', name: 'Dinheiro', enabled: true, type: 'DELIVERY' },
          { id: 'p3', name: 'Pix na Entrega', enabled: true, type: 'DELIVERY' }
        ]),
        dbService.getAll('coupons', []),
        dbService.getAll('settings', [{ id: 'general', isStoreOpen: true, logoUrl: '' }])
      ]);

      setProducts(p);
      setOrders(o);
      setCustomers(c);
      setCategories(cats);
      setSubCategories(subs);
      setComplements(comps);
      setZipRanges(zips);
      setPaymentMethods(pays);
      setCoupons(coups);
      
      if (settings && (settings as any)[0]) {
        setIsStoreOpen((settings as any)[0].isStoreOpen);
        setLogoUrl((settings as any)[0].logoUrl);
      }
      
      setIsInitialLoad(false);
    };
    loadAllData();
  }, []);

  const cartCount = useMemo(() => cart.reduce((acc, i) => acc + i.quantity, 0), [cart]);

  const currentDeliveryFee = useMemo(() => {
    if (!currentUser || !currentUser.zipCode || zipRanges.length === 0) return 0;
    const numZip = parseInt(currentUser.zipCode.replace(/\D/g, ''));
    const range = zipRanges.find(r => {
      const start = parseInt(r.start.replace(/\D/g, ''));
      const end = parseInt(r.end.replace(/\D/g, ''));
      return numZip >= start && numZip <= end;
    });
    return range ? range.fee : 0;
  }, [currentUser, zipRanges]);

  const handleSendWhatsApp = () => {
    if (!lastOrder) return;
    
    const itemsList = lastOrder.items.map(i => {
      const comps = i.selectedComplements?.map(c => `   + ${c.name}`).join('\n') || '';
      return `*${i.quantity}x ${i.name.toUpperCase()}*\n${comps}`;
    }).join('\n\n');

    const message = encodeURIComponent(
      `🍔 *NOVO PEDIDO: #${lastOrder.id}*\n\n` +
      `👤 *Cliente:* ${lastOrder.customerName}\n` +
      `📞 *Tel:* ${lastOrder.customerPhone}\n` +
      `📍 *Endereço:* ${lastOrder.customerAddress}\n\n` +
      `🛒 *Itens:*\n${itemsList}\n\n` +
      `💳 *Pagamento:* ${lastOrder.paymentMethod}\n` +
      `${lastOrder.changeFor ? `💵 *Troco para:* R$ ${lastOrder.changeFor.toFixed(2)}\n` : ''}` +
      `🚀 *Tipo:* ${lastOrder.deliveryType}\n` +
      `💰 *Total:* R$ ${lastOrder.total.toFixed(2)}`
    );

    window.open(`https://wa.me/5534991183728?text=${message}`, '_blank');
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const s = safeNormalize(searchTerm);
      const matchesSearch = safeNormalize(p.name).includes(s) || safeNormalize(p.description).includes(s);
      const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory;
      const matchesSubCategory = selectedSubCategory === 'Todos' || p.subCategory === selectedSubCategory;
      return matchesSearch && matchesCategory && matchesSubCategory;
    });
  }, [products, searchTerm, selectedCategory, selectedSubCategory]);

  const activeSubCategories = useMemo(() => {
    if (selectedCategory === 'Todos') return [];
    const cat = categories.find(c => c.name === selectedCategory);
    return cat ? subCategories.filter(s => s.categoryId === cat.id) : [];
  }, [selectedCategory, categories, subCategories]);

  const handleCategoryChange = (name: string) => {
    setSelectedCategory(name);
    setSelectedSubCategory('Todos');
    setSearchTerm('');
  };

  const groupedMenu = useMemo(() => {
    if (selectedSubCategory !== 'Todos') return [{ title: selectedSubCategory, items: filteredProducts }];
    if (selectedCategory === 'Todos') {
      return categories.map(cat => ({
        title: cat.name,
        items: filteredProducts.filter(p => p.category === cat.name)
      })).filter(g => g.items.length > 0);
    } else {
      const catObj = categories.find(c => c.name === selectedCategory);
      if (!catObj) return [];
      const catSubCats = subCategories.filter(s => s.categoryId === catObj.id);
      const groups = catSubCats.map(sub => ({
        title: sub.name,
        items: filteredProducts.filter(p => p.subCategory === sub.name)
      }));
      const others = filteredProducts.filter(p => p.category === selectedCategory && (!p.subCategory || !catSubCats.some(s => s.name === p.subCategory)));
      if (others.length > 0) groups.push({ title: 'Geral', items: others });
      return groups.filter(g => g.items.length > 0);
    }
  }, [selectedCategory, selectedSubCategory, categories, subCategories, filteredProducts]);

  const handleAddToCart = (product: Product, quantity: number, comps?: Complement[]) => {
    const compsPrice = comps?.reduce((acc, c) => acc + (c.price || 0), 0) || 0;
    const finalPrice = product.price + compsPrice;
    setCart(prev => [...prev, { ...product, price: finalPrice, quantity, selectedComplements: comps }]);
    setIsCartOpen(true);
    setSelectedProduct(null);
  };

  const handleCheckout = async (paymentMethod: string, fee: number, discount: number, couponCode: string, deliveryType: DeliveryType, changeFor?: number) => {
    if (!currentUser) return setIsAuthModalOpen(true);
    const orderId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const subtotal = cart.reduce((acc, i) => acc + (i.price * i.quantity), 0);
    const newOrder: Order = {
      id: orderId, customerId: currentUser.email, customerName: currentUser.name, customerPhone: currentUser.phone,
      customerAddress: deliveryType === 'PICKUP' ? 'RETIRADA NA LOJA' : `${currentUser.address}, ${currentUser.neighborhood}`,
      items: [...cart], total: subtotal + fee - discount, deliveryFee: fee, deliveryType, status: 'NOVO',
      paymentMethod, changeFor, pointsEarned: Math.floor(subtotal), createdAt: new Date().toISOString()
    };
    await dbService.save('orders', orderId, newOrder);
    setOrders(prev => [newOrder, ...prev]);
    setLastOrder(newOrder);
    setIsSuccessModalOpen(true);
    setCart([]);
    setIsCartOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col w-full overflow-x-hidden">
      <Navbar 
        cartCount={cartCount} onCartClick={() => setIsCartOpen(true)} 
        isAdmin={isAdmin} onToggleAdmin={() => isAdmin ? setIsAdmin(false) : (isAdminAuthenticated ? setIsAdmin(true) : setIsAdminLoginOpen(true))} 
        searchTerm={searchTerm} onSearchChange={setSearchTerm} currentUser={currentUser} 
        onAuthClick={() => setIsAuthModalOpen(true)} onLogout={() => { setCurrentUser(null); localStorage.removeItem('nl_current_user'); }} 
        isStoreOpen={isStoreOpen} logoUrl={logoUrl} onMyOrdersClick={() => setActiveView('my-orders')} 
      />

      <main className="flex-1 w-full relative">
        {isAdmin ? (
          <AdminPanel 
            products={products} orders={orders} customers={customers} zipRanges={zipRanges} categories={categories} subCategories={subCategories} complements={complements} coupons={coupons} isStoreOpen={isStoreOpen} 
            onToggleStore={async () => { const newVal = !isStoreOpen; setIsStoreOpen(newVal); await dbService.save('settings', 'general', { id: 'general', isStoreOpen: newVal, logoUrl }); }} 
            logoUrl={logoUrl} onUpdateLogo={async (url) => { setLogoUrl(url); await dbService.save('settings', 'general', { id: 'general', isStoreOpen, logoUrl: url }); }}
            onAddProduct={async (p) => { const id = Date.now().toString(); const fullP = {...p, id} as Product; setProducts(prev => [fullP, ...prev]); await dbService.save('products', id, fullP); }} 
            onUpdateProduct={async (p) => { setProducts(prev => prev.map(x => x.id === p.id ? p : x)); await dbService.save('products', p.id, p); }} 
            onDeleteProduct={async (id) => { setProducts(prev => prev.filter(p => p.id !== id)); await dbService.remove('products', id); }}
            onUpdateOrderStatus={async (id, s) => { 
              setOrders(prevOrders => {
                const orderIndex = prevOrders.findIndex(o => o.id === id);
                if (orderIndex === -1) return prevOrders;
                
                const updatedOrder = { ...prevOrders[orderIndex], status: s };
                const newOrders = [...prevOrders];
                newOrders[orderIndex] = updatedOrder;
                
                // Salva no banco de forma assíncrona fora da renderização
                dbService.save('orders', id, updatedOrder);
                return newOrders;
              });
            }} 
            onUpdateCustomer={async (id, u) => { setCustomers(prev => prev.map(c => c.id === id ? {...c, ...u} : c)); const c = customers.find(x => x.id === id); if(c) await dbService.save('customers', id, {...c, ...u}); }}
            onAddCategory={async (n) => { const id = Date.now().toString(); setCategories(prev => [...prev, {id, name: n}]); await dbService.save('categories', id, {id, name: n}); }}
            onRemoveCategory={async (id) => { setCategories(prev => prev.filter(c => c.id !== id)); await dbService.remove('categories', id); }}
            onAddSubCategory={async (catId, n) => { const id = Date.now().toString(); setSubCategories(prev => [...prev, {id, categoryId: catId, name: n}]); await dbService.save('sub_categories', id, {id, categoryId: catId, name: n}); }}
            onRemoveSubCategory={async (id) => { setSubCategories(prev => prev.filter(s => s.id !== id)); await dbService.remove('sub_categories', id); }}
            onAddComplement={async (n, p, c) => { const id = Date.now().toString(); const comp = {id, name: n, price: Number(p), active: true, applicable_categories: c}; setComplements(prev => [...prev, comp]); await dbService.save('complements', id, comp); }}
            onToggleComplement={async (id) => { const comp = complements.find(c => c.id === id); if(comp) { const upd = {...comp, active: !comp.active}; setComplements(prev => prev.map(c => c.id === id ? upd : c)); await dbService.save('complements', id, upd); } }}
            onRemoveComplement={async (id) => { setComplements(prev => prev.filter(c => c.id !== id)); await dbService.remove('complements', id); }}
            onAddZipRange={async (s, e, f) => { const id = Date.now().toString(); const range = {id, start: s, end: e, fee: Number(f)}; setZipRanges(prev => [...prev, range]); await dbService.save('zip_ranges', id, range); }}
            onRemoveZipRange={async (id) => { setZipRanges(prev => prev.filter(z => z.id !== id)); await dbService.remove('zip_ranges', id); }}
            onAddCoupon={async (c, d, t) => { const id = Date.now().toString(); const cp = {id, code: c.toUpperCase(), discount: Number(d), type: t, active: true}; setComplements(prev => [...prev, cp]); await dbService.save('coupons', id, cp); }}
            onRemoveCoupon={async (id) => { setCoupons(prev => prev.filter(c => c.id !== id)); await dbService.remove('coupons', id); }}
            paymentSettings={paymentMethods} 
            onTogglePaymentMethod={async (id) => { const p = paymentMethods.find(x => x.id === id); if(p) { const upd = {...p, enabled: !p.enabled}; setPaymentMethods(prev => prev.map(x => x.id === id ? upd : x)); await dbService.save('payment_methods', id, upd); } }}
            onAddPaymentMethod={async (n, t) => { const id = Date.now().toString(); const pay = {id, name: n, type: t, enabled: true}; setPaymentMethods(prev => [...prev, pay]); await dbService.save('payment_methods', id, pay); }}
            onRemovePaymentMethod={async (id) => { setPaymentMethods(prev => prev.filter(p => p.id !== id)); await dbService.remove('payment_methods', id); }}
            onUpdatePaymentSettings={async (id, u) => { const p = paymentMethods.find(x => x.id === id); if(p) { const upd = {...p, ...u}; setPaymentMethods(prev => prev.map(x => x.id === id ? upd : x)); await dbService.save('payment_methods', id, upd); } }}
            onLogout={() => { setIsAdmin(false); setIsAdminAuthenticated(false); sessionStorage.removeItem('nl_admin_auth'); }} 
            onBackToSite={() => setIsAdmin(false)} isAudioUnlocked={isAudioUnlocked} onUnlockAudio={() => setIsAudioUnlocked(true)}
          />
        ) : activeView === 'my-orders' ? (
          <CustomerOrders orders={orders.filter(o => o.customerId === currentUser?.email)} onBack={() => setActiveView('home')} />
        ) : (
          <div className="flex flex-col w-full">
            <section className="relative w-full h-[350px] bg-slate-900 flex items-center overflow-hidden">
               <img src="https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=1920" className="absolute inset-0 w-full h-full object-cover brightness-[0.7]" />
               <div className="max-w-7xl mx-auto px-6 relative z-10 w-full text-left">
                  <h1 className="text-7xl sm:text-8xl font-black uppercase tracking-tighter drop-shadow-lg flex flex-col leading-[0.85]">
                    <span className="text-emerald-500">NILO</span>
                    <span className="text-red-600">Lanches</span>
                  </h1>
                  <p className="text-white font-black uppercase tracking-widest text-sm mt-4 drop-shadow-md">O sabor artesanal de Uberaba na sua casa</p>
               </div>
            </section>

            <div className="sticky top-20 sm:top-28 z-30 bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-100">
               <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3 overflow-x-auto no-scrollbar w-full">
                  <button onClick={() => handleCategoryChange('Todos')} className={`px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest border-2 transition-all shrink-0 ${selectedCategory === 'Todos' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-400 border-slate-100'}`}>🍴 Todos</button>
                  {categories.map(cat => <button key={cat.id} onClick={() => handleCategoryChange(cat.name)} className={`px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest border-2 transition-all shrink-0 ${selectedCategory === cat.name ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-400 border-slate-100'}`}>{cat.name}</button>)}
               </div>
               {activeSubCategories.length > 0 && (
                 <div className="max-w-7xl mx-auto px-6 pb-4 flex items-center gap-2 overflow-x-auto no-scrollbar w-full border-t border-slate-50 pt-2">
                    <button onClick={() => setSelectedSubCategory('Todos')} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${selectedSubCategory === 'Todos' ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>Tudo</button>
                    {activeSubCategories.map(sub => <button key={sub.id} onClick={() => setSelectedSubCategory(sub.name)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${selectedSubCategory === sub.name ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>{sub.name}</button>)}
                 </div>
               )}
            </div>

            <div className="max-w-7xl mx-auto px-6 py-12 space-y-16">
               {groupedMenu.length === 0 ? (
                 <div className="py-20 text-center space-y-4">
                    <span className="text-5xl block">🍔</span>
                    <p className="text-slate-400 font-black uppercase text-xs tracking-widest">Nenhum produto cadastrado nesta categoria.</p>
                 </div>
               ) : (
                 groupedMenu.map((group, idx) => (
                   <div key={idx} className="space-y-8">
                      <h2 className="text-2xl font-black text-red-600 uppercase tracking-tighter border-l-4 border-emerald-600 pl-4">
                        {group.title}
                      </h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                         {group.items.map(p => <FoodCard key={p.id} product={p} onAdd={handleAddToCart} onClick={setSelectedProduct} />)}
                      </div>
                   </div>
                 ))
               )}

               <div className="pt-12 pb-8 text-center animate-fade-in">
                 <p className="text-red-600 font-black text-[11px] uppercase tracking-[0.2em] opacity-80">
                   ⚠️ Imagens meramente ilustrativas
                 </p>
               </div>
            </div>
          </div>
        )}
      </main>

      {!isAdmin && cartCount > 0 && (
        <button 
          onClick={() => setIsCartOpen(true)}
          className="fixed bottom-24 right-6 z-[45] md:hidden bg-emerald-600 text-white p-5 rounded-full shadow-2xl animate-bounce-subtle border-4 border-white active:scale-95"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-full ring-2 ring-white">
            {cartCount}
          </span>
        </button>
      )}

      <Footer logoUrl={logoUrl} />
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
      {!isAdmin && <ChatBot products={products} />}
      {!isAdmin && <InstallBanner />}
    </div>
  );
};

export default App;
