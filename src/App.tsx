
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Navbar } from './components/Navbar.tsx';
import { FoodCard } from './components/FoodCard.tsx';
import { CartSidebar } from './components/CartSidebar.tsx';
import { AdminPanel } from './components/AdminPanel.tsx';
import { ProductModal } from './components/ProductModal.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { AdminLoginModal } from './components/AdminLoginModal.tsx';
import { MotoboyLoginModal } from './components/MotoboyLoginModal.tsx';
import { OrderSuccessModal } from './components/OrderSuccessModal.tsx';
import { ChatBot } from './components/ChatBot.tsx';

import { Footer } from './components/Footer.tsx';
import { ProfileModal } from './components/ProfileModal.tsx';
import { Toast } from './components/Toast.tsx';
import { ProductLoader } from './components/ProductLoader.tsx';
import { InstallBanner } from './components/InstallBanner.tsx';
import { WelcomePopup } from './components/WelcomePopup.tsx';
import { RecessoBanner } from './components/RecessoBanner.tsx';
import { dbService } from './services/dbService.ts';
import { Product, CartItem, Order, Customer, ZipRange, PaymentSettings, CategoryItem, SubCategoryItem, Complement, DeliveryType, Coupon } from './types.ts';
import { safeStorage } from './utils/safeStorage.ts';
import { DEFAULT_LOGO } from './constants.tsx';

const CustomerOrders = React.lazy(() => import('./components/CustomerOrders.tsx').then(m => ({ default: m.CustomerOrders })));
const MotoboyPortal = React.lazy(() => import('./components/MotoboyPortal.tsx').then(m => ({ default: m.MotoboyPortal })));

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
  const [flavors, setFlavors] = useState<Flavor[]>([]);
  
  const [isStoreOpen, setIsStoreOpen] = useState(true);
  const [isKioskMode, setIsKioskMode] = useState(() => safeStorage.getItem('nl_kiosk_enabled') === 'true');
  const [kioskStarted, setKioskStarted] = useState(false);
  const [logoUrl, setLogoUrl] = useState(DEFAULT_LOGO);
  const [socialLinks, setSocialLinks] = useState({ 
    instagram: '', whatsapp: '', facebook: '', 
    googleTagId: '', facebookPixelId: '', instagramPixelId: '',
    address: '', city: ''
  });

  const [paymentConfig, setPaymentConfig] = useState({
    mercadopagoAccessToken: '',
    mercadopagoPublicKey: '',
    pagseguroEmail: '',
    pagseguroToken: ''
  });

  const [authSettings, setAuthSettings] = useState({
    adminUser: 'nilo',
    adminPass: 'nilo*2026',
    motoboyPass: 'nilo123'
  });

  const [isAdmin, setIsAdmin] = useState(() => safeStorage.getSessionItem('nl_admin_auth') === 'true');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const savedCart = safeStorage.getItem('nl_cart_v1');
      return savedCart ? JSON.parse(savedCart) : [];
    } catch { return []; }
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [selectedSubCategoryValue, setSelectedSubCategory] = useState<string>('Todos'); 
  const [activeView, setActiveView] = useState<'home' | 'my-orders' | 'motoboy'>(() => {
    if (safeStorage.getSessionItem('nl_motoboy_auth') === 'true') return 'motoboy';
    return 'home';
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [isMotoboyLoginOpen, setIsMotoboyLoginOpen] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => safeStorage.getSessionItem('nl_admin_auth') === 'true');
  const [isMotoboyAuthenticated, setIsMotoboyAuthenticated] = useState(() => safeStorage.getSessionItem('nl_motoboy_auth') === 'true');
  const [motoboyName, setMotoboyName] = useState(() => safeStorage.getSessionItem('nl_motoboy_name') || '');
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' as 'success' | 'error' });
  const [isOrderProcessing, setIsOrderProcessing] = useState(false);
  const [waitingForPaymentOrderId, setWaitingForPaymentOrderId] = useState<string | null>(null);

  const previousOrdersRef = useRef<Order[]>([]);



  const [currentUser, setCurrentUser] = useState<Customer | null>(() => {
    try {
      const saved = safeStorage.getItem('nl_current_user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  // Atualiza os ícones de sistema e o MANIFESTO dinamicamente com a logomarca
  useEffect(() => {
    if (logoUrl && logoUrl !== DEFAULT_LOGO) {
      // 1. Atualiza Favicon e Apple Touch Icon
      const favicon = document.getElementById('app-favicon') as HTMLLinkElement;
      const appleIcon = document.getElementById('app-apple-touch-icon') as HTMLLinkElement;
      if (favicon) favicon.href = logoUrl;
      if (appleIcon) appleIcon.href = logoUrl;

      // 2. Gera manifesto dinâmico para garantir o ícone do App instalado
      const dynamicManifest = {
        "short_name": "Nilo Lanches",
        "name": "Nilo Lanches Delivery Oficial",
        "description": "O melhor lanche de Uberaba na palma da sua mão. Hambúrgueres artesanais, combos e muito mais!",
        "categories": ["food", "shopping"],
        "icons": [
          {
            "src": logoUrl,
            "type": "image/png",
            "sizes": "192x192",
            "purpose": "any"
          },
          {
            "src": logoUrl,
            "type": "image/png",
            "sizes": "512x512",
            "purpose": "maskable"
          }
        ],
        "screenshots": [
          {
            "src": "https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=1080&h=1920&fit=crop",
            "sizes": "1080x1920",
            "type": "image/jpeg",
            "form_factor": "narrow",
            "label": "Cardápio Nilo Lanches"
          },
          {
            "src": "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?q=80&w=1920&h=1080&fit=crop",
            "sizes": "1920x1080",
            "type": "image/jpeg",
            "form_factor": "wide",
            "label": "Nossos Combos"
          }
        ],
        "shortcuts": [
          {
            "name": "Ver Cardápio",
            "short_name": "Cardápio",
            "description": "Veja nossos lanches e combos",
            "url": "/#menu-anchor",
            "icons": [{ "src": logoUrl, "sizes": "192x192" }]
          },
          {
            "name": "Meus Pedidos",
            "short_name": "Pedidos",
            "description": "Acompanhe seus pedidos",
            "url": "/#orders",
            "icons": [{ "src": logoUrl, "sizes": "192x192" }]
          }
        ],
        "start_url": "/",
        "scope": "/",
        "display": "standalone",
        "orientation": "portrait",
        "theme_color": "#008000",
        "background_color": "#ffffff"
      };

      const stringManifest = JSON.stringify(dynamicManifest);
      const blob = new Blob([stringManifest], {type: 'application/json'});
      const manifestURL = URL.createObjectURL(blob);
      const manifestTag = document.getElementById('app-manifest') as HTMLLinkElement;
      if (manifestTag) {
        manifestTag.href = manifestURL;
      }
    }
  }, [logoUrl]);

  useEffect(() => {
    // Reduzido para 3 segundos para melhorar a percepção de velocidade
    const timer = setTimeout(() => setIsInitialLoading(false), 3000);
    
    // Fallback de segurança: se houver erro global, remove o loader
    const handleError = () => setIsInitialLoading(false);
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleError);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleError);
    };
  }, []);

  // Verifica retorno do Mercado Pago
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    const collectionStatus = params.get('collection_status');
    const orderId = safeStorage.getItem('nl_last_order_id');

    if ((status || collectionStatus) && orderId) {
      console.log("[App] Retorno MP detectado:", { status, collectionStatus, orderId });
      const finalStatus = status || collectionStatus;
      
      if (finalStatus === 'success' || finalStatus === 'approved') {
        setCart([]);
        
        // Tenta buscar o pedido no estado local para exibir no modal
        const order = orders.find(o => o.id === orderId);
        if (order) setLastOrder(order);
        
        setIsSuccessModalOpen(true);
        setToast({ show: true, msg: 'Pagamento confirmado com sucesso!', type: 'success' });
        
        // Atualiza status no banco IMEDIATAMENTE, independente do estado local
        console.log(`[App] Atualizando pedido ${orderId} para status NOVO (pago)...`);
        dbService.save('orders', orderId, { status: 'NOVO' })
            .then(() => console.log("[App] Pedido atualizado com sucesso no banco."))
            .catch(err => console.error("[App] Erro ao atualizar pedido no banco:", err));
        
      } else if (finalStatus === 'failure' || finalStatus === 'rejected') {
        setToast({ show: true, msg: 'O pagamento foi recusado ou falhou.', type: 'error' });
      } else if (finalStatus === 'pending' || finalStatus === 'in_process') {
        setCart([]);
        setIsSuccessModalOpen(true);
        setToast({ show: true, msg: 'Pagamento em processamento.', type: 'success' });
      }
      
      // Limpa a URL para evitar reprocessamento ao recarregar
      window.history.replaceState({}, document.title, window.location.pathname);
      safeStorage.removeItem('nl_last_order_id');
    }
  }, [orders]); // Mantém orders para atualizar lastOrder se necessário

  const productsRef = useRef<Product[]>([]);
  
  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  useEffect(() => {
    const unsubs = [
      dbService.subscribe<Product[]>('products', (data) => {
        if (data) {
            console.log(`[App] Produtos recebidos via subscribe: ${data.length}`);
            setProducts([...data]);
            setIsInitialLoading(false);
        }
      }),
      dbService.subscribe<CategoryItem[]>('categories', (data) => {
        if (data) setCategories([...data].sort((a, b) => a.name.localeCompare(b.name)));
      }),
      dbService.subscribe<SubCategoryItem[]>('sub_categories', (data) => {
        if (data) setSubCategories([...data].sort((a, b) => a.name.localeCompare(b.name)));
      }),
      dbService.subscribe<Complement[]>('complements', (data) => data && setComplements(data)),
      dbService.subscribe<Flavor[]>('flavors', (data) => data && setFlavors(data)),
      dbService.subscribe<ZipRange[]>('zip_ranges', (data) => data && setZipRanges(data)),
      dbService.subscribe<PaymentSettings[]>('payment_methods', (data) => {
        if (data) {
          console.log(`[App] Formas de pagamento recebidas: ${data.length}`);
          setPaymentMethods(data);
        }
      }),
      dbService.subscribe<Coupon[]>('coupons', (data) => data && setCoupons(data)),
      dbService.subscribe<any[]>('settings', (data) => {
        console.log("[App] Settings data received:", data);
        if (data && data.length > 0) {
          const settings = data.find(d => d.id === 'general');
          if (settings) {
            console.log("[App] Settings recebidas do subscribe:", settings);
            if (settings.isStoreOpen !== undefined) setIsStoreOpen(settings.isStoreOpen);
            if (settings.logoUrl) setLogoUrl(settings.logoUrl);
            setSocialLinks({ 
              instagram: settings.instagram || '', whatsapp: settings.whatsapp || '', facebook: settings.facebook || '',
              googleTagId: settings.googleTagId || '', facebookPixelId: settings.facebookPixelId || '', instagramPixelId: settings.instagramPixelId || '',
              address: settings.address || '', city: settings.city || ''
            });
            const newPaymentConfig = {
              mercadopagoAccessToken: settings.mercadopagoAccessToken || '',
              mercadopagoPublicKey: settings.mercadopagoPublicKey || '',
              pagseguroEmail: settings.pagseguroEmail || '',
              pagseguroToken: settings.pagseguroToken || ''
            };
            console.log("[App] Atualizando paymentConfig via subscribe:", newPaymentConfig);
            setPaymentConfig(newPaymentConfig);
          }
          const auth = data.find(d => d.id === 'auth');
          if (auth) {
            setAuthSettings({
              adminUser: auth.adminUser || 'nilo',
              adminPass: auth.adminPass || 'nilo*2026',
              motoboyPass: auth.motoboyPass || 'nilo123'
            });
          }
        }
      })
    ];

    if (isAdmin || currentUser || isMotoboyAuthenticated) {
      unsubs.push(dbService.subscribe<Order[]>('orders', (newOrders) => {
        if (newOrders) {
           if (currentUser && previousOrdersRef.current.length > 0) {
             newOrders.forEach(order => {
               if (order.customerId === currentUser.email) {
                 const prevOrder = previousOrdersRef.current.find(o => o.id === order.id);
                 if (prevOrder && prevOrder.status !== order.status) {
                   setToast({ show: true, msg: `Pedido #${order.id.substring(0,4)} está ${order.status}!`, type: 'success' });
                 }
               }
             });
           }
           previousOrdersRef.current = newOrders;
           setOrders(newOrders);
        }
      }));
    }

    if (isAdmin) {
       unsubs.push(dbService.subscribe<Customer[]>('customers', (data) => data && setCustomers(data)));
    }

    // Fallback: Busca manual se as subscrições falharem no carregamento inicial
    const loadInitialData = async (retryCount = 0) => {
        console.log(`Iniciando carregamento manual de fallback (Tentativa ${retryCount + 1})...`);
        
        try {
            // Produtos
            if (productsRef.current.length === 0) {
                const p = await dbService.getAll<Product>('products');
                if (p.length > 0) {
                    console.log(`Fallback: ${p.length} produtos carregados.`);
                    setProducts(p);
                    setIsInitialLoading(false);
                } else {
                    console.warn("Fallback: Nenhum produto encontrado.");
                    setIsInitialLoading(false);
                    if (retryCount < 3) setTimeout(() => loadInitialData(retryCount + 1), 3000);
                }
            } else {
                console.log("Fallback: Produtos já carregados via subscrição.");
            }
            
            if (categories.length === 0) {
                const c = await dbService.getAll<CategoryItem>('categories');
                if (c.length > 0) setCategories(c);
            }

            if (paymentMethods.length === 0) {
                const pm = await dbService.getAll<PaymentSettings>('payment_methods');
                if (pm.length > 0) {
                    console.log(`Fallback: ${pm.length} formas de pagamento carregadas.`);
                    setPaymentMethods(pm);
                }
            }

            if (coupons.length === 0) {
                const cp = await dbService.getAll<Coupon>('coupons');
                if (cp.length > 0) setCoupons(cp);
            }

            if (orders.length === 0) {
                 const o = await dbService.getAll<Order>('orders');
                 if (o.length > 0) {
                     console.log(`Fallback: ${o.length} pedidos carregados.`);
                     setOrders(o);
                 }
            }

            // Fallback para configurações (incluindo token MP) - SEMPRE TENTA CARREGAR
            const s = await dbService.getAll<any>('settings');
            if (s && s.length > 0) {
                console.log(`Fallback: Configurações carregadas (${s.length} itens).`);
                const settings = s.find(d => d.id === 'general');
                if (settings) {
                    if (settings.isStoreOpen !== undefined) setIsStoreOpen(settings.isStoreOpen);
                    if (settings.logoUrl) setLogoUrl(settings.logoUrl);
                    setSocialLinks({ 
                      instagram: settings.instagram || '', whatsapp: settings.whatsapp || '', facebook: settings.facebook || '',
                      googleTagId: settings.googleTagId || '', facebookPixelId: settings.facebookPixelId || '', instagramPixelId: settings.instagramPixelId || '',
                      address: settings.address || '', city: settings.city || ''
                    });
                    
                    // Atualiza paymentConfig de forma segura usando o estado anterior
                    setPaymentConfig(prevConfig => {
                        const newConfig = {
                          mercadopagoAccessToken: settings.mercadopagoAccessToken || prevConfig.mercadopagoAccessToken || '',
                          mercadopagoPublicKey: settings.mercadopagoPublicKey || prevConfig.mercadopagoPublicKey || '',
                          pagseguroEmail: settings.pagseguroEmail || prevConfig.pagseguroEmail || '',
                          pagseguroToken: settings.pagseguroToken || prevConfig.pagseguroToken || ''
                        };
                        console.log("Fallback: Atualizando config. Token MP:", !!newConfig.mercadopagoAccessToken);
                        return newConfig;
                    });
                }
                const auth = s.find(d => d.id === 'auth');
                if (auth) {
                    setAuthSettings({
                      adminUser: auth.adminUser || 'nilo',
                      adminPass: auth.adminPass || 'nilo*2026',
                      motoboyPass: auth.motoboyPass || 'nilo123'
                    });
                }
            }
        } catch (error) {
            console.error("Erro no fallback:", error);
            if (retryCount < 3) setTimeout(() => loadInitialData(retryCount + 1), 3000);
        }
    };
    
    // Tenta carregar manualmente após 3 segundos se ainda estiver vazio
    const fallbackTimer = setTimeout(() => loadInitialData(0), 3000);

    return () => {
        unsubs.forEach(u => u && u());
        clearTimeout(fallbackTimer);
    };
  }, [currentUser?.email, isAdmin, isMotoboyAuthenticated, categories.length, coupons.length, currentUser, orders.length, paymentMethods.length]);

  useEffect(() => {
    if (!currentUser) return;
    
    // Cancela automaticamente pedidos "AGUARDANDO PAGAMENTO" do usuário atual que passaram de 3 minutos
    const interval = setInterval(() => {
      const now = new Date().getTime();
      orders.forEach(order => {
        if (order.status === 'AGUARDANDO PAGAMENTO' && order.customerId === currentUser.email) {
          const orderTime = new Date(order.createdAt).getTime();
          const diffMinutes = (now - orderTime) / (1000 * 60);
          if (diffMinutes >= 3) {
            console.log(`[App] Cancelando pedido ${order.id} por expiração de tempo (3 min)`);
            dbService.save('orders', order.id, { status: 'CANCELADO' });
          }
        }
      });
    }, 60000); // Checa a cada 1 minuto

    return () => clearInterval(interval);
  }, [orders, currentUser]);

  // Horário de abertura e fechamento automático
  useEffect(() => {
    const checkStoreSchedule = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

      // Fecha às 23:30
      if (timeStr === "23:30") {
        if (isStoreOpen) {
          console.log("[Auto-Schedule] Fechando loja automaticamente (23:30)");
          setIsStoreOpen(false);
          dbService.save('settings', 'general', { isStoreOpen: false });
        }
      }
    };

    const scheduleInterval = setInterval(checkStoreSchedule, 60000); // Verifica a cada minuto
    checkStoreSchedule(); // Verifica imediatamente ao carregar
    
    return () => clearInterval(scheduleInterval);
  }, [isStoreOpen]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('status');

    if (status) {
      if (status === 'success') {
        setToast({ show: true, msg: 'Pagamento aprovado com sucesso!', type: 'success' });
        
        // Atualiza o status do pedido para NOVO
        const lastOrderId = safeStorage.getItem('nl_last_order_id');
        if (lastOrderId) {
          dbService.save('orders', lastOrderId, { status: 'NOVO' });
          safeStorage.removeItem('nl_last_order_id');
          setCart([]); // Limpa o carrinho após sucesso
        }
      } else if (status === 'pending') {
        setToast({ show: true, msg: 'Seu pagamento está pendente.', type: 'success' });
      } else if (status === 'failure') {
        setToast({ show: true, msg: 'Seu pagamento não foi aprovado.', type: 'error' });
      }
      // Limpa os parâmetros da URL para evitar que a mensagem apareça novamente ao recarregar
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (waitingForPaymentOrderId) {
      const order = orders.find(o => o.id === waitingForPaymentOrderId);
      if (order && order.status === 'NOVO') {
        // Pagamento aprovado via webhook!
        setToast({ show: true, msg: 'Pagamento aprovado com sucesso!', type: 'success' });
        setCart([]);
        setLastOrder(order);
        setIsSuccessModalOpen(true);
        setIsOrderProcessing(false);
        setWaitingForPaymentOrderId(null);
        setIsCartOpen(false);
      } else if (order && order.status === 'CANCELADO') {
        setToast({ show: true, msg: 'Pagamento cancelado ou expirado.', type: 'error' });
        setIsOrderProcessing(false);
        setWaitingForPaymentOrderId(null);
      }
    }
  }, [orders, waitingForPaymentOrderId]);

  const sortedCategories = useMemo(() => [...categories].sort((a, b) => a.name.localeCompare(b.name)), [categories]);
  const sortedSubCategories = useMemo(() => [...subCategories].sort((a, b) => a.name.localeCompare(b.name)), [subCategories]);
  const sortedProducts = useMemo(() => [...products].sort((a, b) => a.name.localeCompare(b.name)), [products]);
  const sortedFlavors = useMemo(() => [...flavors].sort((a, b) => a.name.localeCompare(b.name)), [flavors]);
  const currentDeliveryFee = useMemo(() => {
    if (!currentUser || !zipRanges.length || isKioskMode) return 0;
    const rawZip = currentUser.zipCode.replace(/\D/g, '');
    const numZip = parseInt(rawZip);
    if (isNaN(numZip)) return 0;

    const range = zipRanges.find(r => {
      const start = parseInt(r.start.replace(/\D/g, ''));
      const end = parseInt(r.end.replace(/\D/g, ''));
      return numZip >= start && numZip <= end;
    });
    return range ? range.fee : 0;
  }, [currentUser, zipRanges, isKioskMode]);

  const groupedMenu = useMemo(() => {
    if (!sortedProducts) return [];
    return [...sortedProducts]
      .filter(p => {
        const s = safeNormalize(searchTerm);
        const matchesSearch = !s || safeNormalize(p.name).includes(s) || safeNormalize(p.description).includes(s);
        const matchesCategory = selectedCategory === 'Todos' || safeNormalize(p.category) === safeNormalize(selectedCategory);
        const matchesSubCategory = selectedSubCategoryValue === 'Todos' || safeNormalize(p.subCategory) === safeNormalize(selectedSubCategoryValue);
        return matchesSearch && matchesCategory && matchesSubCategory;
      });
  }, [sortedProducts, searchTerm, selectedCategory, selectedSubCategoryValue]);

  const activeSubCategories = useMemo(() => {
    if (selectedCategory === 'Todos') return [];
    const currentCat = sortedCategories.find(c => safeNormalize(c.name) === safeNormalize(selectedCategory));
    if (!currentCat) return [];
    return sortedSubCategories.filter(s => s.categoryId === currentCat.id);
  }, [selectedCategory, sortedCategories, sortedSubCategories]);

  // Auto-cycle mobile subcategories
  useEffect(() => {
    if (window.innerWidth < 768 && activeSubCategories.length > 0) {
      const interval = setInterval(() => {
        const currentIndex = activeSubCategories.findIndex(sub => sub.name === selectedSubCategoryValue);
        const nextIndex = (currentIndex + 1) % activeSubCategories.length;
        setSelectedSubCategory(activeSubCategories[nextIndex].name);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [activeSubCategories, selectedSubCategoryValue]);

  const handleAddToCart = (product: Product, quantity: number, comps?: Complement[], flavor?: Flavor) => {
    // Se o produto tem sabores (vinculados diretamente, via categoria ou via subcategoria) e nenhum foi selecionado, abre o modal para escolha
    const productCategory = categories.find(c => safeNormalize(c.name) === safeNormalize(product.category));
    const productSubCategory = sortedSubCategories.find(s => safeNormalize(s.name) === safeNormalize(product.subCategory || '') && s.categoryId === productCategory?.id);
    
    const hasCategoryFlavors = flavors.some(f => f.active && productCategory && f.applicable_categories?.includes(productCategory.id));
    const hasSubCategoryFlavors = flavors.some(f => f.active && productSubCategory && f.applicable_subcategories?.includes(productSubCategory.id));
    const hasProductFlavors = product.flavors && product.flavors.length > 0;

    if ((hasProductFlavors || hasCategoryFlavors || hasSubCategoryFlavors) && !flavor) {
      setSelectedProduct(product);
      return;
    }

    const compsPrice = comps?.reduce((acc, c) => acc + (c.price || 0), 0) || 0;
    const finalPrice = product.price + compsPrice;
    setCart(prev => [...prev, { ...product, price: finalPrice, quantity, selectedComplements: comps, selectedFlavor: flavor }]);
    setToast({ show: true, msg: `${quantity}x ${product.name} no carrinho!`, type: 'success' });
    setIsCartOpen(true);
  };

  const handleCheckout = async (paymentMethod: string, fee: number, discount: number, couponCode: string, deliveryType: DeliveryType, changeFor?: number) => {
    console.log("handleCheckout iniciado. Método:", paymentMethod);
    
    if (!currentUser && !isKioskMode) return setIsAuthModalOpen(true);

    if (currentUser && !isKioskMode) {
      if (!currentUser.email || !currentUser.phone || !currentUser.address || !currentUser.neighborhood || !currentUser.zipCode) {
        setToast({ show: true, msg: 'Por favor, atualize seu cadastro com endereço completo, telefone e e-mail antes de fazer o pedido.', type: 'error' });
        setIsProfileModalOpen(true);
        return;
      }
    }

    setIsOrderProcessing(true);
    try {
        const orderId = Math.random().toString(36).substring(2, 8).toUpperCase();
        const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        const total = subtotal + fee - discount;

        console.log("Checkout iniciado:", { 
            orderId, 
            paymentMethod, 
            isKioskMode, 
            cartSize: cart.length,
            total
        });

        // Integração Mercado Pago (PIX ou Cartão via MP)
        const normalizedPayment = paymentMethod.toLowerCase().trim();
        
        // Busca a configuração do método selecionado
        const selectedMethod = paymentMethods.find(p => 
            p.name.toLowerCase().trim() === normalizedPayment || 
            p.name === paymentMethod
        );
        
        // Verifica se é PagSeguro
        const isPagSeguro = selectedMethod?.integration === 'PAGSEGURO' || 
                            normalizedPayment.includes('pagseguro') || 
                            normalizedPayment.includes('pag seguro');

        // Verifica se é Mercado Pago
        const isMercadoPago = selectedMethod?.integration === 'MERCADO_PAGO' || 
                              normalizedPayment.includes('mercado pago') || 
                              normalizedPayment.includes('mercadopago') ||
                              normalizedPayment.includes('mp');
        
        // Define se é um método online
        const isOnlineType = selectedMethod?.type === 'ONLINE' || 
                             (selectedMethod?.integration && selectedMethod.integration !== 'NONE') ||
                             isMercadoPago || isPagSeguro;
                              
        console.log("[Checkout] Verificação de Pagamento Detalhada:", { 
            original: paymentMethod, 
            normalized: normalizedPayment,
            foundMethod: selectedMethod?.name,
            methodType: selectedMethod?.type,
            methodIntegration: selectedMethod?.integration,
            isMercadoPago,
            isPagSeguro,
            isOnlineType
        });

        // Se for ONLINE e não for PagSeguro, trata como Mercado Pago
        const finalIsMercadoPago = isMercadoPago || (isOnlineType && !isPagSeguro);
        const finalIsPagSeguro = isPagSeguro;

        if (finalIsPagSeguro) {
             const psEmail = selectedMethod?.email || paymentConfig.pagseguroEmail;
             const psToken = selectedMethod?.token || paymentConfig.pagseguroToken;

             console.log("Credenciais PagSeguro:", psEmail ? "Email OK" : "Email Ausente", psToken ? "Token OK" : "Token Ausente");
             
             if (!psEmail || !psToken) {
                 console.error("ERRO: Credenciais PagSeguro ausentes.");
                 setToast({ show: true, msg: "Erro: Configuração do PagSeguro incompleta. Contate o administrador.", type: 'error' });
                 setIsOrderProcessing(false);
                 return;
             }

             try {
               console.log("Iniciando checkout PagSeguro...");
               const psPayload = {
                   items: cart.map(item => ({
                     id: item.id,
                     description: item.name,
                     quantity: item.quantity,
                     amount: item.price.toFixed(2)
                   })),
                   sender: {
                     email: currentUser?.email || 'cliente@sandbox.pagseguro.com.br', // Email sandbox padrão se não tiver
                     name: currentUser?.name || 'Cliente'
                   },
                   reference: orderId,
                   email: psEmail,
                   token: psToken
                 };
               console.log("Payload enviado para /api/create_pagseguro_checkout:", psPayload);

               const response = await fetch('/api/create_pagseguro_checkout', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify(psPayload)
               });
               
               if (!response.ok) {
                   const errorText = await response.text();
                   console.error("Erro na resposta do PagSeguro:", response.status, errorText);
                   throw new Error('Erro ao criar pagamento no PagSeguro: ' + errorText);
               }
               
               const psData = await response.json();
               console.log("Resposta do PagSeguro:", psData);
               const { code } = psData; // PagSeguro retorna um código de checkout
               
               if (!code) {
                   console.error("Código de checkout não encontrado na resposta");
                   throw new Error("Link de pagamento não gerado");
               }

               // Salva o pedido como AGUARDANDO PAGAMENTO antes de redirecionar
               const newOrder: Order = {
                 id: orderId, 
                 customerId: currentUser?.email || 'kiosk', 
                 customerName: currentUser?.name || 'Cliente Local', 
                 customerPhone: currentUser?.phone || '000',
                 customerAddress: deliveryType === 'PICKUP' ? 'RETIRADA' : (currentUser?.address || 'LOCAL'),
                 items: [...cart], 
                 total: total || 0, 
                 deliveryFee: fee || 0, 
                 deliveryType: isKioskMode ? 'PICKUP' : deliveryType, 
                 status: 'AGUARDANDO PAGAMENTO', 
                 paymentMethod: paymentMethod || 'Não informado', 
                 createdAt: new Date().toISOString(), 
                 pointsEarned: Math.floor(total || 0), 
                 changeFor: changeFor || 0, 
                 discountValue: discount || 0, 
                 couponCode: couponCode || ''
               };
               
               const orderToSave = JSON.parse(JSON.stringify(newOrder));
               await dbService.save('orders', orderId, orderToSave);
               
               // Redireciona para o checkout do PagSeguro
               safeStorage.setItem('nl_last_order_id', orderId);
               // URL de Sandbox ou Produção - idealmente configurável, mas vamos assumir produção ou sandbox baseado no token?
               // O PagSeguro tem URLs diferentes. Vamos tentar a URL padrão de redirecionamento com o código.
               // URL Padrão: https://pagseguro.uol.com.br/v2/checkout/payment.html?code=CODE
               // URL Sandbox: https://sandbox.pagseguro.uol.com.br/v2/checkout/payment.html?code=CODE
               
               // Vamos assumir produção por padrão, mas se o email for sandbox...
               const isSandbox = psEmail.includes('sandbox');
               const baseUrl = isSandbox 
                 ? 'https://sandbox.pagseguro.uol.com.br/v2/checkout/payment.html' 
                 : 'https://pagseguro.uol.com.br/v2/checkout/payment.html';
                 
               window.location.href = `${baseUrl}?code=${code}`;
               return; 
             } catch (psError) {
               console.error("Erro PagSeguro:", psError);
               alert("Erro ao processar pagamento PagSeguro: " + (psError instanceof Error ? psError.message : String(psError)));
               setIsOrderProcessing(false);
               throw psError;
             }
        }

        if (finalIsMercadoPago) {
             const mpToken = selectedMethod?.token || paymentConfig.mercadopagoAccessToken;

             console.log("[Checkout] Iniciando fluxo Mercado Pago...");
             console.log("[Checkout] Token configurado:", mpToken ? "SIM" : "NÃO");
             
             if (!mpToken) {
                 console.error("[Checkout] ERRO: Token MP ausente.");
                 setToast({ show: true, msg: "Erro: Configuração de pagamento incompleta. Contate o administrador.", type: 'error' });
                 setIsOrderProcessing(false);
                 return;
             }

             try {
               // 1. CRIA E SALVA O PEDIDO PRIMEIRO (Status: INICIANDO)
               const newOrder: Order = {
                 id: orderId, 
                 customerId: currentUser?.email || 'kiosk', 
                 customerName: currentUser?.name || 'Cliente Local', 
                 customerPhone: currentUser?.phone || '000',
                 customerAddress: deliveryType === 'PICKUP' ? 'RETIRADA' : (currentUser?.address || 'LOCAL'),
                 items: [...cart], 
                 total: total || 0, 
                 deliveryFee: fee || 0, 
                 deliveryType: isKioskMode ? 'PICKUP' : deliveryType, 
                 status: 'AGUARDANDO PAGAMENTO', // Já salva como aguardando
                 paymentMethod: paymentMethod || 'Não informado', 
                 createdAt: new Date().toISOString(), 
                 pointsEarned: Math.floor(total || 0), 
                 changeFor: changeFor || 0, 
                 discountValue: discount || 0, 
                 couponCode: couponCode || ''
               };
               
               const orderToSave = JSON.parse(JSON.stringify(newOrder));
               console.log("[Checkout] Salvando pedido PRELIMINAR no banco:", orderId);
               await dbService.save('orders', orderId, orderToSave);
               safeStorage.setItem('nl_last_order_id', orderId);

               // Abre a janela ANTES do fetch para evitar bloqueador de popups
               const paymentWindow = window.open('about:blank', '_blank');

               // 2. CHAMA A API DO MERCADO PAGO
               const mpPayload = {
                   items: cart.map(item => ({
                     id: item.id,
                     title: item.name,
                     quantity: item.quantity,
                     unit_price: item.price
                   })),
                   payer: {
                     email: currentUser?.email || 'cliente@nilo.com',
                     name: currentUser?.name || 'Cliente'
                   },
                   external_reference: orderId,
                   accessToken: mpToken
                 };
               
               console.log("[Checkout] Enviando payload para API MP:", JSON.stringify(mpPayload));

               const response = await fetch('/api/checkout/mercadopago', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify(mpPayload)
               });
               
               if (!response.ok) {
                   if (paymentWindow) paymentWindow.close();
                   const errorText = await response.text();
                   console.error("[Checkout] Erro na resposta da API:", response.status, errorText);
                   let cleanError = errorText;
                   try {
                     const errObj = JSON.parse(errorText);
                     cleanError = errObj.details || errObj.error || errorText;
                   } catch (e) {
                     // Ignora erro de parse
                   }
                   throw new Error('Erro ao criar pagamento no Mercado Pago: ' + cleanError);
               }
               
               const mpData = await response.json();
               console.log("[Checkout] Resposta da API MP:", mpData);
               const { init_point } = mpData;
               
               if (!init_point) {
                   if (paymentWindow) paymentWindow.close();
                   console.error("[Checkout] init_point não encontrado.");
                   throw new Error("Link de pagamento não gerado");
               }

               // 3. REDIRECIONA
               console.log("[Checkout] Abrindo aba de pagamento:", init_point);
               
               // Define que estamos aguardando o pagamento deste pedido
               setWaitingForPaymentOrderId(orderId);
               
               if (paymentWindow) {
                 // Se a janela abriu, redireciona para o Mercado Pago
                 paymentWindow.location.href = init_point;
                 setToast({ show: true, msg: 'Complete o pagamento na nova aba. Aguardando confirmação...', type: 'success' });
                 // Mantém o isOrderProcessing como true para mostrar o loading
               } else {
                 // Se o bloqueador de popups impedir, redireciona na mesma aba
                 window.location.href = init_point;
               }
               
               return; 
             } catch (mpError) {
               console.error("[Checkout] Exceção MP:", mpError);
               alert("Erro ao processar pagamento: " + (mpError instanceof Error ? mpError.message : String(mpError)));
               setIsOrderProcessing(false);
               throw mpError;
             }
        }

        // SEGURANÇA: Se for um método online, não deve chegar aqui
        if (isOnlineType) {
            console.error("ERRO CRÍTICO: Fluxo online não interrompido.", {
                isMercadoPago,
                isPagSeguro,
                finalIsMercadoPago,
                finalIsPagSeguro,
                normalizedPayment
            });
            setToast({ show: true, msg: "Erro no processamento do pagamento online. Verifique se o método está configurado corretamente no painel administrativo.", type: 'error' });
            setIsOrderProcessing(false);
            return;
        }

        // --- Lógica existente para outros métodos de pagamento (Dinheiro, Cartão na Entrega) --- 
        const newOrder: Order = {
          id: orderId, customerId: currentUser?.email || 'kiosk', customerName: currentUser?.name || 'Cliente Local', customerPhone: currentUser?.phone || '000',
          customerAddress: deliveryType === 'PICKUP' ? 'RETIRADA' : (currentUser?.address || 'LOCAL'),
          items: [...cart], total, deliveryFee: fee, deliveryType: isKioskMode ? 'PICKUP' : deliveryType, status: 'NOVO', paymentMethod, createdAt: new Date().toISOString(), pointsEarned: Math.floor(total), changeFor: changeFor || 0, discountValue: discount || 0, couponCode: couponCode || ''
        };
        
        // Remove campos opcionais que podem ser undefined
        const orderToSave = JSON.parse(JSON.stringify(newOrder));
        
        console.log("Salvando pedido (Outros métodos):", orderToSave);
        await dbService.save('orders', orderId, orderToSave);
        
        setLastOrder(newOrder);
        setIsSuccessModalOpen(true);
        setCart([]);
        if(isKioskMode) setTimeout(() => setKioskStarted(false), 5000); 
    } catch (e) {
        console.error("Checkout error:", e);
        setToast({ show: true, msg: 'Erro ao processar pedido. Tente novamente.', type: 'error' });
        setIsOrderProcessing(false); // Garante que o loading pare em caso de erro
    } 
  };

  const onMotoboyClick = useCallback(() => {
    if (isMotoboyAuthenticated) {
      setActiveView('motoboy');
    } else {
      setIsMotoboyLoginOpen(true);
    }
  }, [isMotoboyAuthenticated]);

  useEffect(() => {
    const handleOpenMotoboy = () => onMotoboyClick();
    window.addEventListener('open-motoboy-portal', handleOpenMotoboy);
    return () => window.removeEventListener('open-motoboy-portal', handleOpenMotoboy);
  }, [onMotoboyClick]);

  if (isKioskMode && !kioskStarted && !isAdmin) {
    return (
      <div className="fixed inset-0 z-[2000] bg-slate-950 flex flex-col items-center justify-center cursor-pointer select-none overflow-hidden" onClick={() => setKioskStarted(true)}>
        <div className="absolute inset-0 z-0">
           <img src="https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=2069" className="w-full h-full object-cover opacity-40 scale-105" alt="Background" />
           <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-950/40" />
        </div>
        <div className="relative z-10 flex flex-col items-center gap-10 animate-in zoom-in duration-500 w-full max-w-4xl px-4 text-center">
          <div className="w-48 h-48 sm:w-64 sm:h-64 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center p-4 border-4 border-white/20 shadow-[0_0_60px_rgba(16,185,129,0.3)] animate-bounce-subtle">
             <div className="w-full h-full rounded-full overflow-hidden bg-white shadow-inner flex items-center justify-center p-2">
                {logoUrl ? <img src={logoUrl} className="max-w-full max-h-full object-contain" alt="Logo" /> : <span className="text-8xl">🍔</span>}
             </div>
          </div>
          <div className="space-y-4">
            <h1 className="text-6xl sm:text-8xl font-black text-white uppercase tracking-tighter leading-none">Nilo <span className="text-emerald-500">Lanches</span></h1>
            <p className="text-xl sm:text-3xl text-slate-300 font-black uppercase tracking-[0.4em]">Autoatendimento</p>
          </div>
          <button className="mt-8 bg-emerald-700 text-white text-2xl sm:text-4xl font-black py-8 px-16 rounded-[50px] shadow-[0_0_50px_rgba(4,120,87,0.6)] border-b-[8px] border-emerald-900 active:translate-y-2 uppercase">👆 TOQUE PARA COMEÇAR</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col w-full relative">
      {isInitialLoading && <ProductLoader logoUrl={logoUrl} />}
      <Toast isVisible={toast.show} message={toast.msg} type={toast.type} onClose={() => setToast(prev => ({ ...prev, show: false }))} />
      
      <Navbar 
        cartCount={cart.reduce((acc, i) => acc + i.quantity, 0)} onCartClick={() => setIsCartOpen(true)} isAdmin={isAdmin} isKioskMode={isKioskMode}
        onToggleAdmin={() => {
          if (isAdmin) {
            setIsAdmin(false);
            setIsAdminAuthenticated(false);
            safeStorage.removeSessionItem('nl_admin_auth');
          } else {
            if (isAdminAuthenticated) {
              setIsAdmin(true);
            } else {
              setIsAdminLoginOpen(true);
            }
          }
        }} 
        searchTerm={searchTerm} onSearchChange={setSearchTerm} currentUser={currentUser} onAuthClick={() => setIsAuthModalOpen(true)} onLogout={() => { setCurrentUser(null); safeStorage.removeItem('nl_current_user'); }} onMyOrdersClick={() => setActiveView('my-orders')} onProfileClick={() => setIsProfileModalOpen(true)} isStoreOpen={isStoreOpen} logoUrl={logoUrl} 
      />
      <RecessoBanner />

      <main className="flex-1 w-full relative">
        {isAdmin ? (
          <AdminPanel 
            products={sortedProducts} orders={orders} customers={customers} zipRanges={zipRanges} categories={sortedCategories} subCategories={sortedSubCategories} complements={complements} flavors={sortedFlavors} coupons={coupons} 
            isStoreOpen={isStoreOpen} onToggleStore={() => { const next = !isStoreOpen; setIsStoreOpen(next); dbService.save('settings', 'general', { isStoreOpen: next }); }} 
            isKioskMode={isKioskMode} onToggleKioskMode={() => { const next = !isKioskMode; setIsKioskMode(next); safeStorage.setItem('nl_kiosk_enabled', String(next)); }} 
            logoUrl={logoUrl} onUpdateLogo={(url) => dbService.save('settings', 'general', { logoUrl: url })} socialLinks={socialLinks} onUpdateSocialLinks={(links) => dbService.save('settings', 'general', { ...links })} 
            authSettings={authSettings} onUpdateAuthSettings={(settings) => dbService.save('settings', 'auth', settings)}
            onAddProduct={(p) => dbService.save('products', Math.random().toString(36).substring(7), p)} onDeleteProduct={(id) => dbService.remove('products', id)} onUpdateProduct={(p) => dbService.save('products', p.id, p)} 
            onUpdateOrderStatus={(id, status) => dbService.save('orders', id, { status })} onDeleteOrder={(id) => dbService.remove('orders', id)} 
            onUpdateCustomer={(id, updates) => dbService.save('customers', id, updates)} onAddCategory={(name) => dbService.save('categories', Math.random().toString(36).substring(7), { name })} onRemoveCategory={(id) => dbService.remove('categories', id)} onUpdateCategory={(id, name) => dbService.save('categories', id, { name })} onAddSubCategory={(catId, name) => dbService.save('sub_categories', Math.random().toString(36).substring(7), { categoryId: catId, name })} onUpdateSubCategory={(id, name, catId) => dbService.save('sub_categories', id, { name, categoryId: catId })} onRemoveSubCategory={(id) => dbService.remove('sub_categories', id)} 
            onAddComplement={(name, price, cats, subs) => dbService.save('complements', Math.random().toString(36).substring(7), { name, price, applicable_categories: cats, applicable_subcategories: subs, active: true })} onUpdateComplement={(id, name, price, cats, subs) => dbService.save('complements', id, { name, price, applicable_categories: cats, applicable_subcategories: subs })} onToggleComplement={(id) => { const c = complements.find(x => x.id === id); if (c) dbService.save('complements', id, { active: !c.active }); }} onRemoveComplement={(id) => dbService.remove('complements', id)} 
            onAddFlavor={(name, cats, subs) => dbService.save('flavors', Math.random().toString(36).substring(7), { name, applicable_categories: cats, applicable_subcategories: subs, active: true })} onUpdateFlavor={(id, name, cats, subs) => dbService.save('flavors', id, { name, applicable_categories: cats, applicable_subcategories: subs })} onToggleFlavor={(id) => { const f = flavors.find(x => x.id === id); if (f) dbService.save('flavors', id, { active: !f.active }); }} onRemoveFlavor={(id) => dbService.remove('flavors', id)}
            onAddZipRange={(start, end, fee) => dbService.save('zip_ranges', Math.random().toString(36).substring(7), { start, end, fee })} onUpdateZipRange={(id, start, end, fee) => dbService.save('zip_ranges', id, { start, end, fee })} onRemoveZipRange={(id) => dbService.remove('zip_ranges', id)} 
            onAddCoupon={(code, discount, type) => dbService.save('coupons', Math.random().toString(36).substring(7), { code, discount, type, active: true })} onRemoveCoupon={(id) => dbService.remove('coupons', id)} 
            paymentSettings={paymentMethods} onTogglePaymentMethod={(id) => { const p = paymentMethods.find(x => x.id === id); if (p) dbService.save('payment_methods', id, { enabled: !p.enabled }); }} onAddPaymentMethod={(name, type) => dbService.save('payment_methods', Math.random().toString(36).substring(7), { name, type, enabled: true, integration: 'NONE' })} onRemovePaymentMethod={(id) => dbService.remove('payment_methods', id)} onUpdatePaymentSettings={(id, updates) => dbService.save('payment_methods', id, updates)} 
            paymentConfig={paymentConfig} onUpdatePaymentConfig={(config) => {
              console.log("[App] onUpdatePaymentConfig chamado com:", config);
              const newConfig = { ...paymentConfig, ...config };
              console.log("[App] Novo estado paymentConfig calculado:", newConfig);
              setPaymentConfig(newConfig);
              // Salva no banco de dados mesclando com as configurações gerais existentes
              dbService.getAll<any>('settings').then(data => {
                const currentSettings = data.find(d => d.id === 'general') || {};
                console.log("[App] Configurações atuais no banco (antes do merge):", currentSettings);
                const finalConfig = { ...currentSettings, ...newConfig };
                console.log("[App] Salvando no banco:", finalConfig);
                dbService.save('settings', 'general', finalConfig);
              });
            }}
            onLogout={() => { 
              setIsAdmin(false); 
              setIsAdminAuthenticated(false);
              safeStorage.removeSessionItem('nl_admin_auth'); 
            }} 
            onBackToSite={() => {
              setIsAdmin(false);
              setIsAdminAuthenticated(false);
              safeStorage.removeSessionItem('nl_admin_auth');
            }}
          />
        ) : activeView === 'my-orders' ? (
          <React.Suspense fallback={<div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div></div>}>
            {(() => {
              const myOrders = orders.filter(o => o.customerId === currentUser?.email);
              return (
                <CustomerOrders 
                  orders={myOrders} 
                  onBack={() => setActiveView('home')} 
                  onReorder={() => {}} 
                />
              );
            })()}
          </React.Suspense>
        ) : activeView === 'motoboy' ? (
          <React.Suspense fallback={<div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div></div>}>
            <MotoboyPortal 
              orders={orders} 
              motoboyName={motoboyName}
              onBack={() => setActiveView('home')} 
              onUpdateOrderStatus={(id, status, mName) => {
                const updateData: any = { status };
                if (mName) updateData.motoboyName = mName;
                dbService.save('orders', id, updateData);
              }} 
            />
          </React.Suspense>
        ) : (
          <div className="flex flex-col w-full items-center">
            {!isKioskMode && (
              <section className="relative w-full min-h-[400px] bg-slate-950 flex items-center justify-center overflow-hidden">
                <img src="https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=1920" className="absolute inset-0 w-full h-full object-cover opacity-60" alt="Banner"/>
                <div className="relative z-10 text-center px-4 flex flex-col items-center">
                    {!isStoreOpen && <div className="mb-6 bg-red-600 text-white px-6 py-2 rounded-full font-black uppercase text-xs animate-pulse">ESTAMOS FECHADOS NO MOMENTO</div>}
                    <h1 className="font-brand font-black text-6xl sm:text-[100px] text-white uppercase leading-none"><span className="text-emerald-500">NILO</span> <span className="text-red-600">LANCHES</span></h1>
                    <button onClick={() => document.getElementById('menu-anchor')?.scrollIntoView({behavior:'smooth'})} className="mt-8 bg-emerald-600 text-white px-10 py-4 rounded-2xl font-brand text-xl border-b-4 border-emerald-800 uppercase">Ver Cardápio</button>
                </div>
              </section>
            )}
            
            <div id="menu-anchor" className="bg-slate-100 shadow-md border-b border-slate-200 w-full flex flex-col items-center py-4 gap-3 sticky top-[80px] sm:top-[112px] z-[40]">
               <div className="flex justify-start md:justify-center gap-3 overflow-x-auto no-scrollbar w-full max-w-7xl px-4">
                 <button onClick={() => { setSelectedCategory('Todos'); setSelectedSubCategory('Todos'); }} className={`px-4 py-2 sm:px-6 sm:py-3 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest shrink-0 transition-all ${selectedCategory === 'Todos' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white text-slate-600 shadow-sm'}`}>Todos</button>
                 {sortedCategories.map(cat => (
                   <button key={cat.id} onClick={() => { setSelectedCategory(cat.name); setSelectedSubCategory('Todos'); }} className={`px-4 py-2 sm:px-6 sm:py-3 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest shrink-0 transition-all ${selectedCategory === cat.name ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white text-slate-600 shadow-sm'}`}>{cat.name}</button>
                 ))}
               </div>
               
               {activeSubCategories.length > 0 && (
                 <div className="flex justify-start md:justify-center gap-2 overflow-x-auto no-scrollbar w-full max-w-7xl px-4 pb-2 animate-in slide-in-from-top-2 duration-300">
                   <button onClick={() => setSelectedSubCategory('Todos')} className={`px-4 py-1.5 rounded-full text-[9px] sm:text-[11px] font-black uppercase shrink-0 transition-all ${selectedSubCategoryValue === 'Todos' ? 'bg-yellow-400 text-slate-900 shadow-lg' : 'bg-white text-slate-600 shadow-sm'}`}>Tudo</button>
                   {activeSubCategories.map(sub => (
                     <button key={sub.id} onClick={() => setSelectedSubCategory(sub.name)} className={`px-4 py-1.5 rounded-full text-[9px] sm:text-[11px] font-black uppercase shrink-0 transition-all ${selectedSubCategoryValue === sub.name ? 'bg-yellow-400 text-slate-900 shadow-lg' : 'bg-white text-slate-600 shadow-sm'}`}>{sub.name}</button>
                   ))}
                 </div>
               )}
            </div>

            <div className="w-full max-w-7xl mx-auto px-6 py-12">
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                  {groupedMenu.length > 0 ? (
                    groupedMenu.map(p => <FoodCard key={p.id} product={p} onAdd={handleAddToCart} onClick={setSelectedProduct} />)
                  ) : (
                    <div className="col-span-full py-20 text-center flex flex-col items-center gap-4">
                        <span className="opacity-50 font-black uppercase tracking-widest">Nenhum produto encontrado.</span>
                        <button 
                            onClick={() => window.location.reload()} 
                            className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold uppercase text-xs shadow-lg hover:bg-emerald-700 transition-colors"
                        >
                            Recarregar Cardápio
                        </button>
                    </div>
                  )}
               </div>
            </div>
          </div>
        )}
      </main>

      {/* Fallback para Erro de Conexão */}
      {!isInitialLoading && products.length === 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-50 p-4">
          <div className="text-center space-y-4">
            <div className="text-6xl">📡</div>
            <h2 className="text-xl font-black text-slate-800 uppercase">Conexão Instável</h2>
            <p className="text-slate-500 text-sm max-w-xs mx-auto">Não conseguimos carregar o cardápio. Verifique sua internet e tente novamente.</p>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-emerald-200 active:scale-95 transition-all"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      )}

      {!isAdmin && !isKioskMode && <Footer logoUrl={logoUrl} isStoreOpen={isStoreOpen} socialLinks={socialLinks} onAdminClick={() => setIsAdminLoginOpen(true)} onMotoboyClick={onMotoboyClick} />}
      
      <CartSidebar 
        isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} items={cart} coupons={coupons} onUpdateQuantity={(id, delta) => setCart(prev => prev.map(item => item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item))} 
        onRemove={(id) => setCart(prev => prev.filter(item => item.id !== id))} onCheckout={handleCheckout} onAuthClick={() => setIsAuthModalOpen(true)} paymentSettings={paymentMethods} currentUser={currentUser} isKioskMode={isKioskMode} 
        deliveryFee={currentDeliveryFee} availableCoupons={coupons} isStoreOpen={isStoreOpen} isProcessing={isOrderProcessing}
        onShowToast={(msg, type) => setToast({ show: true, msg, type })}
      />
      <ProductModal product={selectedProduct} complements={complements} flavors={flavors} categories={categories} subCategories={sortedSubCategories} onClose={() => setSelectedProduct(null)} onAdd={handleAddToCart} isStoreOpen={isStoreOpen} />
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        onLogin={(user) => {
          setCurrentUser(user);
          safeStorage.setItem('nl_current_user', JSON.stringify(user));
        }} 
        onSignup={(newCustomer) => {
          dbService.save('customers', newCustomer.id, newCustomer);
        }} 
        zipRanges={zipRanges} 
      />

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        customer={currentUser}
        onUpdate={(updatedCustomer) => {
          dbService.save('customers', updatedCustomer.id, updatedCustomer);
          setCurrentUser(updatedCustomer);
          safeStorage.setItem('nl_current_user', JSON.stringify(updatedCustomer));
          setToast({ show: true, msg: 'Perfil atualizado com sucesso!', type: 'success' });
        }}
      />
      
      <AdminLoginModal 
        isOpen={isAdminLoginOpen} 
        onClose={() => setIsAdminLoginOpen(false)} 
        onSuccess={() => { 
          setIsAdmin(true); 
          setIsAdminAuthenticated(true);
          safeStorage.setSessionItem('nl_admin_auth', 'true'); 
        }} 
        correctUser={authSettings.adminUser}
        correctPass={authSettings.adminPass}
      />
      
      <MotoboyLoginModal 
        isOpen={isMotoboyLoginOpen} 
        onClose={() => setIsMotoboyLoginOpen(false)} 
        onSuccess={(name) => { 
          setIsMotoboyAuthenticated(true); 
          setMotoboyName(name);
          safeStorage.setSessionItem('nl_motoboy_auth', 'true'); 
          safeStorage.setSessionItem('nl_motoboy_name', name);
          setActiveView('motoboy'); 
        }} 
        correctPass={authSettings.motoboyPass}
      />

      <OrderSuccessModal isOpen={isSuccessModalOpen} onClose={() => setIsSuccessModalOpen(false)} order={lastOrder} onSendWhatsApp={() => {
        if (!lastOrder) return;
        const phone = (socialLinks.whatsapp || '5534991183728').replace(/\D/g, '');
        const text = `🍔 *NOVO PEDIDO #${lastOrder.id}*\n\n*Cliente:* ${lastOrder.customerName}\n*Itens:*\n${lastOrder.items.map(i => `▪️ ${i.quantity}x ${i.name}`).join('\n')}\n\n*Total:* R$ ${lastOrder.total.toFixed(2)}`;
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
      }} isKioskMode={isKioskMode} />

      {!isAdmin && !isKioskMode && <ChatBot products={products} cart={cart} deliveryFee={currentDeliveryFee} isStoreOpen={isStoreOpen} currentUser={currentUser} onAddToCart={handleAddToCart} />}
      {!isAdmin && !isKioskMode && <InstallBanner logoUrl={logoUrl} />}
      {!isAdmin && !isKioskMode && <WelcomePopup />}
    </div>
  );
};

export default App;
