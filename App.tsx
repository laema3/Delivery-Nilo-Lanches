
import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import { ProductLoader } from './components/ProductLoader.tsx';
import { dbService } from './services/dbService.ts';
import { notificationService } from './services/notificationService.ts';
import { Product, CartItem, Order, Customer, ZipRange, PaymentSettings, CategoryItem, SubCategoryItem, Complement, DeliveryType, Coupon } from './types.ts';
import { DEFAULT_LOGO } from './constants.tsx';

const safeNormalize = (val: any): string => {
  if (!val) return "";
  return String(val).toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
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
  const [kioskStarted, setKioskStarted] = useState(false);
  const [logoUrl, setLogoUrl] = useState(DEFAULT_LOGO);
  const [socialLinks, setSocialLinks] = useState({ instagram: '', whatsapp: '', facebook: '' });
  const [isAdmin, setIsAdmin] = useState(() => sessionStorage.getItem('nl_admin_auth') === 'true');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  
  // Ref para rastrear status anterior dos pedidos e evitar notificações duplicadas ou iniciais
  const prevOrdersStatus = useRef<Record<string, string>>({});

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const savedCart = localStorage.getItem('nl_cart_v1');
      const parsed = savedCart ? JSON.parse(savedCart) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [selectedSubCategoryValue, setSelectedSubCategory] = useState<string>('Todos'); 
  const [activeView, setActiveView] = useState<'home' | 'my-orders'>('home');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => sessionStorage.getItem('nl_admin_auth') === 'true');
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [toast, setToast] = useState({ show: false, msg: '', text: '', type: 'success' as 'success' | 'error' });
  const [isOrderProcessing, setIsOrderProcessing] = useState(false);

  const kioskAdminTimer = useRef<any>(null);

  const [currentUser, setCurrentUser] = useState<Customer | null>(() => {
    try {
      const saved = localStorage.getItem('nl_current_user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  // Cálculo da taxa de entrega atual baseada no CEP do usuário
  const currentDeliveryFee = useMemo(() => {
    if (!currentUser || !currentUser.zipCode) return 0;
    const numZip = parseInt(currentUser.zipCode.replace(/\D/g, ''));
    const range = zipRanges.find(r => {
      const start = parseInt(r.start.replace(/\D/g, ''));
      const end = parseInt(r.end.replace(/\D/g, ''));
      return numZip >= start && numZip <= end;
    });
    return range ? range.fee : 0;
  }, [currentUser, zipRanges]);

  // Subcategorias filtradas pela categoria selecionada
  const activeSubCategories = useMemo(() => {
    if (selectedCategory === 'Todos') return [];
    const cat = categories.find(c => c.name === selectedCategory);
    if (!cat) return [];
    return subCategories.filter(s => s.categoryId === cat.id);
  }, [selectedCategory, categories, subCategories]);

  // Cardápio filtrado por busca, categoria e subcategoria
  const groupedMenu = useMemo(() => {
    return products.filter(p => {
      const normSearch = safeNormalize(searchTerm);
      const matchesSearch = normSearch === "" || 
                           safeNormalize(p.name).includes(normSearch) || 
                           safeNormalize(p.description).includes(normSearch);
      const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory;
      const matchesSubCategory = selectedSubCategoryValue === 'Todos' || p.subCategory === selectedSubCategoryValue;
      return matchesSearch && matchesCategory && matchesSubCategory;
    });
  }, [products, searchTerm, selectedCategory, selectedSubCategoryValue]);

  useEffect(() => {
    const timer = setTimeout(() => setIsInitialLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const unsubs = [
      dbService.subscribe<Product[]>('products', setProducts),
      dbService.subscribe<Order[]>('orders', (newOrders) => {
        // Lógica de Notificação de Status
        if (currentUser && !isAdmin) {
          newOrders.forEach(order => {
            if (order.customerId === currentUser.email) {
              const prevStatus = prevOrdersStatus.current[order.id];
              if (prevStatus && prevStatus !== order.status) {
                notificationService.sendNotification(
                  `🍔 Pedido #${order.id.substring(0,4)} Atualizado!`,
                  `O status do seu lanche mudou para: ${order.status}`
                );
              }
              prevOrdersStatus.current[order.id] = order.status;
            }
          });
        }
        setOrders(newOrders);
      }),
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
          if (settings) {
            if (settings.isStoreOpen !== undefined) setIsStoreOpen(settings.isStoreOpen);
            if (settings.logoUrl) setLogoUrl(settings.logoUrl);
            setSocialLinks({ 
              instagram: settings.instagram || '', 
              whatsapp: settings.whatsapp || '', 
              facebook: settings.facebook || '' 
            });
          }
        }
      })
    ];
    return () => unsubs.forEach(u => u && u());
  }, [currentUser, isAdmin]);

  const handleAddToCart = (product: Product, quantity: number, comps?: Complement[]) => {
    const compsPrice = comps?.reduce((acc, c) => acc + (c.price || 0), 0) || 0;
    const finalPrice = product.price + compsPrice;
    setCart(prev => [...prev, { ...product, price: finalPrice, quantity, selectedComplements: comps }]);
    setToast({ show: true, msg: `${quantity}x ${product.name} no carrinho!`, text: '', type: 'success' });
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
        
        // Antes de salvar, pedimos permissão de notificação se for o primeiro pedido
        if (!isKioskMode) await notificationService.requestPermission();

        await dbService.save('orders', orderId, newOrder);
        setLastOrder(newOrder);
        setIsSuccessModalOpen(true);
        setCart([]);
        if(isKioskMode) setTimeout(() => setKioskStarted(false), 5000); 
    } catch (e) { setToast({ show: true, msg: 'Erro ao processar.', text: '', type: 'error' }); }
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
            products={products} orders={orders} customers={customers} zipRanges={zipRanges} categories={categories} subCategories={subCategories} complements={complements} coupons={coupons} 
            isStoreOpen={isStoreOpen} onToggleStore={() => { const next = !isStoreOpen; setIsStoreOpen(next); dbService.save('settings', 'general', { isStoreOpen: next }); }} 
            isKioskMode={isKioskMode} onToggleKioskMode={() => { const next = !isKioskMode; setIsKioskMode(next); localStorage.setItem('nl_kiosk_enabled', String(next)); }} 
            logoUrl={logoUrl} onUpdateLogo={(url) => dbService.save('settings', 'general', { logoUrl: url })} socialLinks={socialLinks} onUpdateSocialLinks={(links) => dbService.save('settings', 'general', { ...links })} 
            onAddProduct={(p) => dbService.save('products', Math.random().toString(36).substring(7), p)} onDeleteProduct={(id) => dbService.remove('products', id)} onUpdateProduct={(p) => dbService.save('products', p.id, p)} 
            onUpdateOrderStatus={(id, status) => dbService.save('orders', id, { status })} onDeleteOrder={(id) => dbService.remove('orders', id)} 
            onUpdateCustomer={(id, updates) => dbService.save('customers', id, updates)} onAddCategory={(name) => dbService.save('categories', Math.random().toString(36).substring(7), { name })} onRemoveCategory={(id) => dbService.remove('categories', id)} onUpdateCategory={(id, name) => dbService.save('categories', id, { name })} onAddSubCategory={(catId, name) => dbService.save('sub_categories', Math.random().toString(36).substring(7), { categoryId: catId, name })} onUpdateSubCategory={(id, name, catId) => dbService.save('sub_categories', id, { name, categoryId: catId })} onRemoveSubCategory={(id) => dbService.remove('sub_categories', id)} 
            onAddComplement={(name, price, cats) => dbService.save('complements', Math.random().toString(36).substring(7), { name, price, applicable_categories: cats, active: true })} onUpdateComplement={(id, name, price, cats) => dbService.save('complements', id, { name, price, applicable_categories: cats })} onToggleComplement={(id) => { const c = complements.find(x => x.id === id); if (c) dbService.save('complements', id, { active: !c.active }); }} onRemoveComplement={(id) => dbService.remove('complements', id)} 
            onAddZipRange={(start, end, fee) => dbService.save('zip_ranges', Math.random().toString(36).substring(7), { start, end, fee })} onUpdateZipRange={(id, start, end, fee) => dbService.save('zip_ranges', id, { start, end, fee })} onRemoveZipRange={(id) => dbService.remove('zip_ranges', id)} 
            onAddCoupon={(code, discount, type) => dbService.save('coupons', Math.random().toString(36).substring(7), { code, discount, type, active: true })} onRemoveCoupon={(id) => dbService.remove('coupons', id)} 
            paymentSettings={paymentMethods} onTogglePaymentMethod={(id) => { const p = paymentMethods.find(x => x.id === id); if (p) dbService.save('payment_methods', id, { enabled: !p.enabled }); }} onAddPaymentMethod={(name, type, email, token) => dbService.save('payment_methods', Math.random().toString(36).substring(7), { name, type, email, token, enabled: true })} onRemovePaymentMethod={(id) => dbService.remove('payment_methods', id)} onUpdatePaymentSettings={(id, updates) => dbService.save('payment_methods', id, updates)} 
            onLogout={() => { setIsAdmin(false); sessionStorage.removeItem('nl_admin_auth'); }} onBackToSite={() => setIsAdmin(false)}
          />
        ) : activeView === 'my-orders' ? (
          <CustomerOrders orders={orders.filter(o => o.customerId === currentUser?.email)} onBack={() => setActiveView('home')} onReorder={() => {}} />
        ) : (
          <div className="flex flex-col w-full items-center">
            {/* ... banner content ... */}
            <section className="relative w-full min-h-[400px] bg-slate-950 flex items-center justify-center overflow-hidden">
                <img src="https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=1920" className="absolute inset-0 w-full h-full object-cover opacity-60" alt="Banner"/>
                <div className="relative z-10 text-center px-4 flex flex-col items-center">
                    {!isStoreOpen && (
                      <div className="mb-6 bg-red-600 text-white px-6 py-2 rounded-full font-black uppercase text-xs tracking-widest animate-pulse shadow-xl border border-red-500">
                        ESTAMOS FECHADOS NO MOMENTO
                      </div>
                    )}
                    <h1 className="font-brand text-6xl sm:text-[100px] text-white uppercase leading-none">
                      <span className="text-emerald-500">NILO</span> <span className="text-red-600">LANCHES</span>
                    </h1>
                    <button onClick={() => document.getElementById('menu-anchor')?.scrollIntoView({behavior:'smooth'})} className="mt-8 bg-emerald-600 text-white px-10 py-4 rounded-2xl font-brand text-xl border-b-4 border-emerald-800 shadow-xl transition-all active:scale-95 uppercase tracking-widest">Ver Cardápio</button>
                </div>
              </section>
            
            <div id="menu-anchor" className="bg-slate-100 shadow-md border-b border-slate-200 w-full flex flex-col items-center py-4 gap-3 transition-all duration-300 sticky top-[80px] sm:top-[112px] z-[40]">
               <div className="flex justify-start md:justify-center gap-3 overflow-x-auto no-scrollbar w-full max-w-7xl px-4">
                 <button onClick={() => { setSelectedCategory('Todos'); setSelectedSubCategory('Todos'); }} className={`px-4 py-2 sm:px-6 sm:py-3 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest shrink-0 transition-all ${selectedCategory === 'Todos' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white text-slate-600 shadow-sm'}`}>Todos</button>
                 {categories.map(cat => (
                   <button key={cat.id} onClick={() => { setSelectedCategory(cat.name); setSelectedSubCategory('Todos'); }} className={`px-4 py-2 sm:px-6 sm:py-3 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest shrink-0 transition-all ${selectedCategory === cat.name ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white text-slate-600 shadow-sm'}`}>{cat.name}</button>
                 ))}
               </div>
               {activeSubCategories.length > 0 && (
                 <div className="flex justify-start md:justify-center gap-2 overflow-x-auto no-scrollbar w-full max-w-7xl px-4">
                   <button onClick={() => setSelectedSubCategory('Todos')} className={`px-4 py-1.5 rounded-full text-[9px] sm:text-[11px] font-black uppercase shrink-0 transition-all ${selectedSubCategoryValue === 'Todos' ? 'bg-yellow-400 text-slate-900 shadow-lg' : 'bg-white text-slate-600 shadow-sm'}`}>Tudo</button>
                   {activeSubCategories.map(sub => (
                     <button key={sub.id} onClick={() => setSelectedSubCategory(sub.name)} className={`px-4 py-1.5 rounded-full text-[9px] sm:text-[11px] font-black uppercase shrink-0 transition-all ${selectedSubCategoryValue === sub.name ? 'bg-yellow-400 text-slate-900 shadow-lg' : 'bg-white text-slate-600 shadow-sm'}`}>{sub.name}</button>
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

      {!isAdmin && !isKioskMode && <Footer logoUrl={logoUrl} isStoreOpen={isStoreOpen} socialLinks={socialLinks} onAdminClick={() => setIsAdminLoginOpen(true)} />}
      
      <CartSidebar 
        isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} items={cart} coupons={coupons} onUpdateQuantity={(id, delta) => setCart(prev => prev.map(item => item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item))} 
        onRemove={(id) => setCart(prev => prev.filter(item => item.id !== id))} onCheckout={handleCheckout} onAuthClick={() => setIsAuthModalOpen(true)} paymentSettings={paymentMethods} currentUser={currentUser} isKioskMode={isKioskMode} deliveryFee={currentDeliveryFee} availableCoupons={[]} isStoreOpen={isStoreOpen} isProcessing={isOrderProcessing}
      />
      <ProductModal product={selectedProduct} complements={complements} categories={categories} onClose={() => setSelectedProduct(null)} onAdd={handleAddToCart} isStoreOpen={isStoreOpen} />
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} onLogin={setCurrentUser} onSignup={() => {}} zipRanges={zipRanges} customers={customers} />
      <AdminLoginModal isOpen={isAdminLoginOpen} onClose={() => setIsAdminLoginOpen(false)} onSuccess={() => { setIsAdmin(true); sessionStorage.setItem('nl_admin_auth', 'true'); }} />
      <OrderSuccessModal isOpen={isSuccessModalOpen} onClose={() => setIsSuccessModalOpen(false)} order={lastOrder} onSendWhatsApp={() => {
        if (!lastOrder) return;
        const phone = (socialLinks.whatsapp || '5534991183728').replace(/\D/g, '');
        const text = `🍔 *NOVO PEDIDO #${lastOrder.id}*\n\n*Cliente:* ${lastOrder.customerName}\n*Itens:*\n${lastOrder.items.map(i => `▪️ ${i.quantity}x ${i.name}`).join('\n')}\n\n*Total:* R$ ${lastOrder.total.toFixed(2)}`;
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
      }} isKioskMode={isKioskMode} />
      {!isAdmin && !isKioskMode && <ChatBot products={products} cart={cart} deliveryFee={currentDeliveryFee} whatsappNumber={socialLinks.whatsapp} isStoreOpen={isStoreOpen} currentUser={currentUser} onAddToCart={handleAddToCart} onClearCart={() => setCart([])} />}
    </div>
  );
};

export default App;
