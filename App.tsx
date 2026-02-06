
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
import { dbService } from './services/dbService.ts';
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

  const [currentUser, setCurrentUser] = useState<Customer | null>(() => {
    const saved = localStorage.getItem('nl_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
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
        if (data && data[0]) {
          setIsStoreOpen(data[0].isStoreOpen !== false);
          setLogoUrl(data[0].logoUrl || '');
        }
      })
    ];
    return () => unsubs.forEach(unsub => unsub());
  }, []);

  const cartCount = useMemo(() => cart.reduce((acc, i) => acc + i.quantity, 0), [cart]);

  const activeSubCategories = useMemo(() => {
    if (selectedCategory === 'Todos') return [];
    const cat = categories.find(c => c.name === selectedCategory);
    if (!cat) return [];
    return subCategories.filter(s => s.categoryId === cat.id);
  }, [selectedCategory, categories, subCategories]);

  const groupedMenu = useMemo(() => {
    return products.filter(p => {
      const s = safeNormalize(searchTerm);
      const matchesSearch = safeNormalize(p.name).includes(s) || safeNormalize(p.description).includes(s);
      const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory;
      const matchesSubCategory = selectedSubCategory === 'Todos' || p.subCategory === selectedSubCategory;
      return matchesSearch && matchesCategory && matchesSubCategory;
    });
  }, [products, searchTerm, selectedCategory, selectedSubCategory]);

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
      customerAddress: deliveryType === 'PICKUP' ? 'RETIRADA' : `${currentUser.address}`,
      items: [...cart], total: subtotal + fee - discount, deliveryFee: fee, deliveryType, status: 'NOVO',
      paymentMethod, changeFor, pointsEarned: Math.floor(subtotal), createdAt: new Date().toISOString()
    };
    await dbService.save('orders', orderId, newOrder);
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
            onToggleStore={async () => { await dbService.save('settings', 'general', { id: 'general', isStoreOpen: !isStoreOpen, logoUrl }); }} 
            logoUrl={logoUrl} 
            onUpdateLogo={async (url) => { await dbService.save('settings', 'general', { id: 'general', isStoreOpen, logoUrl: url }); }}
            onAddProduct={async (p) => { const id = `prod_${Date.now()}`; await dbService.save('products', id, {...p, id} as Product); }} 
            onUpdateProduct={async (p) => { await dbService.save('products', p.id, p); }} 
            onDeleteProduct={async (id) => { await dbService.remove('products', id); }}
            onUpdateOrderStatus={async (id, s) => { const o = orders.find(x => x.id === id); if(o) await dbService.save('orders', id, {...o, status: s}); }}
            onUpdateCustomer={async (id, u) => { const c = customers.find(x => x.id === id); if(c) await dbService.save('customers', id, {...c, ...u}); }}
            onAddCategory={async (n) => { const id = `cat_${Date.now()}`; await dbService.save('categories', id, {id, name: n}); }}
            onRemoveCategory={async (id) => { await dbService.remove('categories', id); }}
            onAddSubCategory={async (catId, n) => { const id = `sub_${Date.now()}`; await dbService.save('sub_categories', id, {id, categoryId: catId, name: n}); }}
            onRemoveSubCategory={async (id) => { await dbService.remove('sub_categories', id); }}
            onAddComplement={async (n, p, c) => { const id = `comp_${Date.now()}`; await dbService.save('complements', id, {id, name: n, price: Number(p), active: true, applicable_categories: c}); }}
            onToggleComplement={async (id) => { const comp = complements.find(x => x.id === id); if(comp) await dbService.save('complements', id, {...comp, active: !comp.active}); }}
            onRemoveComplement={async (id) => { await dbService.remove('complements', id); }}
            onAddZipRange={async (s, e, f) => { const id = `zip_${Date.now()}`; await dbService.save('zip_ranges', id, {id, start: s, end: e, fee: Number(f)}); }}
            onRemoveZipRange={async (id) => { await dbService.remove('zip_ranges', id); }}
            onAddCoupon={async (c, d, t) => { const id = `coup_${Date.now()}`; await dbService.save('coupons', id, {id, code: c.toUpperCase(), discount: Number(d), type: t, active: true}); }}
            onRemoveCoupon={async (id) => { await dbService.remove('coupons', id); }}
            paymentSettings={paymentMethods} 
            onTogglePaymentMethod={async (id) => { const p = paymentMethods.find(x => x.id === id); if(p) await dbService.save('payment_methods', id, {...p, enabled: !p.enabled}); }}
            onAddPaymentMethod={async (n, t) => { const id = `pay_${Date.now()}`; await dbService.save('payment_methods', id, {id, name: n, type: t, enabled: true}); }}
            onRemovePaymentMethod={async (id) => { await dbService.remove('payment_methods', id); }}
            onUpdatePaymentSettings={async (id, u) => { const p = paymentMethods.find(x => x.id === id); if(p) await dbService.save('payment_methods', id, {...p, ...u}); }}
            onLogout={() => { setIsAdmin(false); setIsAdminAuthenticated(false); sessionStorage.removeItem('nl_admin_auth'); }} 
            onBackToSite={() => setIsAdmin(false)}
          />
        ) : activeView === 'my-orders' ? (
          <CustomerOrders orders={orders.filter(o => o.customerId === currentUser?.email)} onBack={() => setActiveView('home')} />
        ) : (
          <div className="flex flex-col w-full items-center">
            {/* HERO */}
            <section className="relative w-full min-h-[400px] sm:min-h-[500px] bg-slate-950 flex items-center justify-center overflow-hidden">
               <img src="https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=1920" className="absolute inset-0 w-full h-full object-cover opacity-60" alt="Hero" />
               <div className="max-w-5xl mx-auto px-6 relative z-10 w-full text-center">
                  <h1 className="font-brand text-6xl sm:text-[120px] leading-none uppercase text-white drop-shadow-2xl">
                    <span className="text-emerald-500">NILO</span> <span className="text-red-600">LANCHES</span>
                  </h1>
                  <button onClick={() => document.getElementById('menu-anchor')?.scrollIntoView({behavior:'smooth'})} className="mt-10 bg-emerald-600 text-white px-12 py-5 rounded-2xl font-brand text-2xl tracking-widest border-b-4 border-emerald-800 shadow-xl transition-all active:scale-95">VER CARDÁPIO</button>
               </div>
            </section>
            
            {/* BARRA DE CATEGORIAS */}
            <div id="menu-anchor" className="sticky top-20 z-30 bg-white/95 backdrop-blur-md shadow-sm border-b w-full flex justify-center py-4 px-6 gap-3 overflow-x-auto no-scrollbar">
               <button onClick={() => { setSelectedCategory('Todos'); setSelectedSubCategory('Todos'); }} className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${selectedCategory === 'Todos' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}>Todos</button>
               {categories.map(cat => (
                 <button key={cat.id} onClick={() => { setSelectedCategory(cat.name); setSelectedSubCategory('Todos'); }} className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${selectedCategory === cat.name ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}>{cat.name}</button>
               ))}
            </div>

            {/* BARRA DE SUBCATEGORIAS - BOTÕES EM VERMELHO */}
            {activeSubCategories.length > 0 && (
              <div className="sticky top-[148px] z-20 bg-red-50/90 backdrop-blur-sm border-b w-full flex justify-center py-3 px-6 gap-2 overflow-x-auto no-scrollbar">
                 <button onClick={() => setSelectedSubCategory('Todos')} className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all shrink-0 ${selectedSubCategory === 'Todos' ? 'bg-red-600 text-white shadow-lg' : 'bg-white text-red-400 border border-red-100'}`}>Todas as opções</button>
                 {activeSubCategories.map(sub => (
                   <button key={sub.id} onClick={() => setSelectedSubCategory(sub.name)} className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all shrink-0 ${selectedSubCategory === sub.name ? 'bg-red-600 text-white shadow-lg' : 'bg-white text-red-400 border border-red-100'}`}>{sub.name}</button>
                 ))}
              </div>
            )}

            {/* GRID DE PRODUTOS - CENTRALIZADO */}
            <div className="w-full max-w-7xl mx-auto px-6 py-12 flex flex-col items-center">
               <div className="w-full mb-10 text-center">
                  <h2 className="text-2xl font-black text-emerald-600 uppercase inline-block border-l-4 border-emerald-600 pl-4">
                    {selectedCategory === 'Todos' ? 'Nosso Cardápio' : (selectedSubCategory === 'Todos' ? selectedCategory : `${selectedCategory} > ${selectedSubCategory}`)}
                  </h2>
               </div>
               
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 w-full max-w-7xl mx-auto justify-items-center justify-center">
                  {groupedMenu.map(p => <FoodCard key={p.id} product={p} onAdd={handleAddToCart} onClick={setSelectedProduct} />)}
               </div>

               {groupedMenu.length === 0 && (
                 <div className="py-20 text-center opacity-40 flex flex-col items-center">
                    <span className="text-5xl mb-4">🔍</span>
                    <p className="font-black uppercase text-xs tracking-widest">Nenhum item encontrado nesta seleção.</p>
                 </div>
               )}
            </div>
          </div>
        )}
      </main>

      <Footer logoUrl={logoUrl} onAdminClick={() => setIsAdminLoginOpen(true)} />
      <CartSidebar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} items={cart} coupons={coupons} onUpdateQuantity={(id, d) => setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: Math.max(1, i.quantity + d) } : i))} onRemove={id => setCart(prev => prev.filter(i => i.id !== id))} onCheckout={handleCheckout} onAuthClick={() => setIsAuthModalOpen(true)} paymentSettings={paymentMethods} currentUser={currentUser} deliveryFee={0} availableCoupons={[]} isStoreOpen={isStoreOpen} />
      <ProductModal product={selectedProduct} complements={complements} categories={categories} onClose={() => setSelectedProduct(null)} onAdd={handleAddToCart} isStoreOpen={isStoreOpen} />
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} onLogin={setCurrentUser} onSignup={async (u) => { setCustomers(prev => [...prev, u]); setCurrentUser(u); await dbService.save('customers', u.email, u); }} zipRanges={zipRanges} customers={customers} />
      <AdminLoginModal isOpen={isAdminLoginOpen} onClose={() => setIsAdminLoginOpen(false)} onSuccess={() => { setIsAdminAuthenticated(true); sessionStorage.setItem('nl_admin_auth', 'true'); setIsAdmin(true); }} />
      <OrderSuccessModal isOpen={isSuccessModalOpen} onClose={() => setIsSuccessModalOpen(false)} orderId={lastOrder?.id || ''} />
      {!isAdmin && <ChatBot products={products} />}
    </div>
  );
};

export default App;
