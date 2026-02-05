
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  subCategory?: string;
  image: string;
  rating: number;
  calories?: number;
  complements?: string[];
}

export interface CategoryItem { 
  id: string; 
  name: string; 
}

export interface SubCategoryItem { 
  id: string; 
  categoryId: string; 
  name: string; 
}

export interface Complement { 
  id: string; 
  name: string; 
  price: number; 
  active: boolean; 
  applicable_categories?: string[]; 
}

export interface CartItem extends Product { 
  quantity: number; 
  selectedComplements?: Complement[]; 
}

export type OrderStatus = 'NOVO' | 'PREPARANDO' | 'PRONTO PARA RETIRADA' | 'SAIU PARA ENTREGA' | 'FINALIZADO' | 'CANCELADO';
export type DeliveryType = 'DELIVERY' | 'PICKUP';

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  items: CartItem[];
  total: number;
  deliveryFee: number;
  deliveryType: DeliveryType;
  discountValue?: number;
  couponCode?: string;
  pointsEarned: number;
  paymentMethod: string;
  changeFor?: number;
  status: OrderStatus;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  password?: string;
  address: string;
  neighborhood: string;
  zipCode: string;
  totalOrders: number;
  points: number;
  lastOrder: string;
  isBlocked?: boolean;
}

export interface ZipRange { id: string; start: string; end: string; fee: number; }

export interface PaymentSettings { 
  id: string; 
  name: string; 
  enabled: boolean; 
  type: 'ONLINE' | 'DELIVERY'; 
  token?: string;
  email?: string;
  description?: string;
}

export interface Coupon {
  id: string;
  code: string;
  discount: number;
  type: 'PERCENT' | 'FIXED';
  active: boolean;
}
