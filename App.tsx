
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
  const [isKioskMode, setIsKioskMode] = useState(() => localStorage.getItem('nl_kiosk_enabled') === 'true');
  const [showKioskWelcome, setShowKioskWelcome] = useState(isKioskMode);
  const [logoUrl, setLogoUrl] = useState(DEFAULT_LOGO);
  const [socialLinks, setSocialLinks] = useState({ instagram: '', whatsapp: '', facebook: '' });
  const [isAdmin, setIsAdmin] = useState(() => sessionStorage.getItem('nl_admin_auth') === 'true');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const savedCart = localStorage.getItem('nl_cart_v1');
      const parsed = savedCart ? JSON.parse(savedCart) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
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
    const timer = setTimeout(() => setIsInitialLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const unsubs = [
      dbService.subscribe<Product[]>('products', setProducts),
      dbService.subscribe<Order[]>('orders', setOrders),
      dbService.subscribe<CategoryItem[]>('categories', (data) => setCategories([...data].sort((a, b) => a.name.localeCompare(b.name)))),
      dbService.subscribe<SubCategoryItem[]>('sub_categories', (data) => setSubCategories([...data].sort((a, b) => a.name.localeCompare(b.name)))),
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
          setSocialLinks({ instagram: settings.instagramUrl || '', whatsapp: settings.whatsappUrl || '', facebook: settings.facebookUrl || '' });
        }
      })
    ];
    return () => unsubs.forEach(u => u && u());
  }, []);

  const groupedMenu = useMemo(() => {
    if (!products) return [];
    return [...products].filter(p => {
        const s = safeNormalize(searchTerm);
        const matchesSearch = !s || safeNormalize(p.name).includes(s) || safeNormalize(p.description).includes(s);
        const matchesCategory = selectedCategory === 'Todos' || safeNormalize(p.category) === safeNormalize(selectedCategory);
        const matchesSubCategory = selectedSubCategory === 'Todos' || safeNormalize(p.subCategory) === safeNormalize(selectedSubCategory);
        return matchesSearch && matchesCategory && matchesSubCategory;
      }).sort((a, b) => a.name.localeCompare(b.name));
  }, [products, searchTerm, selectedCategory, selectedSubCategory]);

  const activeSubCategories = useMemo(() => {
    if (selectedCategory === 'Todos') return [];
    const currentCat = categories.find(c => safeNormalize(c.name) === safeNormalize(selectedCategory));
    if (!currentCat) return [];
    return subCategories.filter(s => s.categoryId === currentCat.id);
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
  };

  const handleCheckout = async (paymentMethod: string, fee: number, discount: number, couponCode: string, deliveryType: DeliveryType, changeFor?: number) => {
    if (!currentUser && !isKioskMode) return setIsAuthModalOpen(true);
    setIsOrderProcessing(true);
    try {
        const orderId = Math.random().toString(36).substring(2, 8).toUpperCase();
        const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        const total = subtotal + fee - discount;
        const newOrder: Order = {
          id: orderId, customerId: currentUser?.email || 'kiosk', customerName: currentUser?.name || 'Cliente Local', customerPhone: currentUser?.phone || '000',
          customerAddress: deliveryType === 'PICKUP' ? 'RETIRADA' : (currentUser?.address || 'LOCAL'),
          items: [...cart], total, deliveryFee: fee, deliveryType: isKioskMode ? 'PICKUP' : deliveryType, status: 'NOVO', paymentMethod, createdAt: new Date().toISOString(), pointsEarned: Math.floor(total), changeFor: changeFor || 0, discountValue: discount || 0, couponCode: couponCode || ''
        };
        await dbService.save('orders', orderId, newOrder);
        setLastOrder(newOrder);
        setIsSuccessModalOpen(true);
        setCart([]);
    } catch (e) { setToast({ show: true, msg: 'Erro ao processar.', type: 'error' }); }
    finally { setIsOrderProcessing(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col w-full relative">
      {isInitialLoading && <ProductLoader />}
      <Toast isVisible={toast.show} message={toast.msg} type={toast.type} onClose={() => setToast(prev => ({ ...prev, show: false }))} />
      
      <Navbar 
        cartCount={cart.reduce((acc, i) => acc + i.quantity, 0)} onCartClick={() => setIsCartOpen(true)} isAdmin={isAdmin} isKioskMode={isKioskMode}
        onToggleAdmin={() => isAdmin ? setIsAdmin(false) : (isAdminAuthenticated ? setIsAdmin(true) : setIsAdminLoginOpen(true))} 
        searchTerm={searchTerm} onSearchChange={setSearchTerm} currentUser={currentUser} onAuthClick={() => setIsAuthModalOpen(true)} onLogout={() => { setCurrentUser(null); localStorage.removeItem('nl_current_user'); }} onMyOrdersClick={() => setActiveView('my-orders')} isStoreOpen={isStoreOpen} logoUrl={logoUrl} 
      />

      <main className="flex-1 w-full relative">
        {isAdmin ? (
          <AdminPanel 
            products={products} orders={orders} customers={customers} zipRanges={zipRanges} categories={categories} subCategories={subCategories} complements={complements} coupons={coupons} isStoreOpen={isStoreOpen} onToggleStore={async () => {}} isKioskMode={isKioskMode} onToggleKioskMode={() => {}} logoUrl={logoUrl} onUpdateLogo={() => {}} socialLinks={socialLinks} onUpdateSocialLinks={() => {}} 
            onAddProduct={async (p) => {}} onDeleteProduct={() => {}} onUpdateProduct={() => {}} onUpdateOrderStatus={() => {}} onDeleteOrder={() => {}} onUpdateCustomer={() => {}} onAddCategory={() => {}} onRemoveCategory={() => {}} onUpdateCategory={() => {}} onAddSubCategory={() => {}} onUpdateSubCategory={() => {}} onRemoveSubCategory={() => {}} onAddComplement={() => {}} onToggleComplement={() => {}} onRemoveComplement={() => {}} onUpdateComplement={() => {}} onAddZipRange={() => {}} onRemoveZipRange={() => {}} onUpdateZipRange={() => {}} onAddCoupon={() => {}} onRemoveCoupon={() => {}} paymentSettings={paymentMethods} onTogglePaymentMethod={() => {}} onAddPaymentMethod={() => {}} onRemovePaymentMethod={() => {}} onUpdatePaymentSettings={() => {}} onLogout={() => {}} onBackToSite={() => setIsAdmin(false)}
          />
        ) : activeView === 'my-orders' ? (
          <CustomerOrders orders={orders.filter(o => o.customerId === currentUser?.email)} onBack={() => setActiveView('home')} onReorder={() => {}} />
        ) : (
          <div className="flex flex-col w-full items-center">
            {/* BANNER PRINCIPAL */}
            {!isKioskMode && (
              <section className="relative w-full min-h-[400px] bg-slate-950 flex items-center justify-center overflow-hidden">
                <img src="https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=1920" className="absolute inset-0 w-full h-full object-cover opacity-60" alt="Banner"/>
                <div className="relative z-10 text-center px-4">
                    <h1 className="font-brand text-6xl sm:text-[100px] text-white uppercase leading-none">
                      <span className="text-emerald-500">NILO</span> <span className="text-red-600">LANCHES</span>
                    </h1>
                    <button onClick={() => document.getElementById('menu-anchor')?.scrollIntoView({behavior:'smooth'})} className="mt-8 bg-emerald-600 text-white px-10 py-4 rounded-2xl font-brand text-xl border-b-4 border-emerald-800 shadow-xl transition-all active:scale-95 uppercase tracking-widest">Ver Cardápio</button>
                </div>
              </section>
            )}
            
            {/* O MENU FIXO - Top em pixels batendo com a Navbar fixa (80px mobile / 112px desktop) */}
            <div id="menu-anchor" className="bg-white shadow-md border-b border-slate-200 w-full flex flex-col items-center py-4 gap-3 transition-all duration-300 sticky top-[80px] sm:top-[112px] z-[45]">
               <div className="flex justify-start md:justify-center gap-3 overflow-x-auto no-scrollbar w-full max-w-7xl px-4">
                 <button onClick={() => { setSelectedCategory('Todos'); setSelectedSubCategory('Todos'); }} className={`px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest shrink-0 transition-all ${selectedCategory === 'Todos' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-100 text-slate-600'}`}>Todos</button>
                 {categories.map(cat => (
                   <button key={cat.id} onClick={() => { setSelectedCategory(cat.name); setSelectedSubCategory('Todos'); }} className={`px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest shrink-0 transition-all ${selectedCategory === cat.name ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-100 text-slate-600'}`}>{cat.name}</button>
                 ))}
               </div>
               {activeSubCategories.length > 0 && (
                 <div className="flex justify-start md:justify-center gap-2 overflow-x-auto no-scrollbar w-full max-w-7xl px-4">
                   <button onClick={() => setSelectedSubCategory('Todos')} className={`px-5 py-2 rounded-full text-[11px] font-black uppercase shrink-0 ${selectedSubCategory === 'Todos' ? 'text-emerald-700 border-b-2 border-emerald-600' : 'text-slate-500'}`}>Tudo</button>
                   {activeSubCategories.map(sub => (
                     <button key={sub.id} onClick={() => setSelectedSubCategory(sub.name)} className={`px-5 py-2 rounded-full text-[11px] font-black uppercase shrink-0 ${selectedSubCategory === sub.name ? 'text-emerald-700 border-b-2 border-emerald-600' : 'text-slate-500'}`}>{sub.name}</button>
                   ))}
                 </div>
               )}
            </div>

            <div className="w-full max-w-7xl mx-auto px-6 py-12 scroll-mt-[180px]">
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                  {groupedMenu.map(p => <FoodCard key={p.id} product={p} onAdd={handleAddToCart} onClick={setSelectedProduct} />)}
               </div>
            </div>
          </div>
        )}
      </main>

      {!isAdmin && !isKioskMode && <Footer logoUrl={logoUrl} isStoreOpen={isStoreOpen} socialLinks={socialLinks} onAdminClick={() => setIsAdminLoginOpen(true)} />}
      
      <CartSidebar 
        isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} items={cart} coupons={coupons} onUpdateQuantity={(id, d) => {}} onRemove={() => {}} onCheckout={handleCheckout} onAuthClick={() => setIsAuthModalOpen(true)} paymentSettings={paymentMethods} currentUser={currentUser} isKioskMode={isKioskMode} deliveryFee={currentDeliveryFee} availableCoupons={[]} isStoreOpen={isStoreOpen} isProcessing={isOrderProcessing}
      />
      <ProductModal product={selectedProduct} complements={complements} categories={categories} onClose={() => setSelectedProduct(null)} onAdd={handleAddToCart} isStoreOpen={isStoreOpen} />
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} onLogin={setCurrentUser} onSignup={() => {}} zipRanges={zipRanges} customers={customers} />
      <AdminLoginModal isOpen={isAdminLoginOpen} onClose={() => setIsAdminLoginOpen(false)} onSuccess={() => setIsAdmin(true)} />
      <OrderSuccessModal isOpen={isSuccessModalOpen} onClose={() => setIsSuccessModalOpen(false)} order={lastOrder} onSendWhatsApp={() => {}} isKioskMode={isKioskMode} />
      {!isAdmin && !isKioskMode && <ChatBot products={products} cart={cart} deliveryFee={currentDeliveryFee} whatsappNumber={socialLinks.whatsapp} isStoreOpen={isStoreOpen} currentUser={currentUser} onAddToCart={handleAddToCart} onClearCart={() => setCart([])} />}
    </div>
  );
};

export default App;
