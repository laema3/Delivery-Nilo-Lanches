
import { Product, CategoryItem, SubCategoryItem, Complement } from './types.ts';

export const DEFAULT_LOGO = 'https://cdn-icons-png.flaticon.com/512/3075/3075977.png';

export const DEMO_CATEGORIES: CategoryItem[] = [
  { id: 'cat_1', name: 'Hambúrgueres' },
  { id: 'cat_2', name: 'Combos' },
  { id: 'cat_3', name: 'Bebidas' },
  { id: 'cat_4', name: 'Sobremesas' }
];

export const DEMO_SUB_CATEGORIES: SubCategoryItem[] = [
  { id: 'sub_1', categoryId: 'cat_3', name: 'Refrigerantes' },
  { id: 'sub_2', categoryId: 'cat_3', name: 'Sucos Naturais' },
  { id: 'sub_3', categoryId: 'cat_3', name: 'Cervejas' },
  { id: 'sub_4', categoryId: 'cat_1', name: 'Artesanais' },
  { id: 'sub_5', categoryId: 'cat_1', name: 'Smashes' }
];

export const DEMO_PRODUCTS: Product[] = [
  { 
    id: 'prod_1', 
    name: 'X-Bacon Artesanal', 
    description: 'Pão brioche selado na manteiga, burger 180g de costela, muito bacon crocante, queijo cheddar derretido e maionese da casa.', 
    price: 32.90, 
    category: 'Hambúrgueres', 
    subCategory: 'Artesanais',
    image: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=600', 
    rating: 4.9 
  },
  { 
    id: 'prod_2', 
    name: 'Smash Duplo Salad', 
    description: 'Dois burgers de 90g prensados na chapa, queijo prato, alface americana, tomate fresco e cebola roxa.', 
    price: 28.50, 
    category: 'Hambúrgueres', 
    subCategory: 'Smashes',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600', 
    rating: 4.7 
  },
  { 
    id: 'prod_3', 
    name: 'Combo Casal', 
    description: '2 X-Bacon Artesanais + 1 Batata Frita Grande com Cheddar e Bacon + 1 Coca-Cola 1.5L.', 
    price: 89.90, 
    category: 'Combos', 
    image: 'https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=600', 
    rating: 5.0 
  },
  { 
    id: 'prod_4', 
    name: 'Coca-Cola Lata', 
    description: '350ml, estupidamente gelada.', 
    price: 6.00, 
    category: 'Bebidas', 
    subCategory: 'Refrigerantes',
    image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600', 
    rating: 5.0 
  },
  { 
    id: 'prod_4b', 
    name: 'Suco de Laranja', 
    description: '500ml, fruta pura, sem conservantes.', 
    price: 12.00, 
    category: 'Bebidas', 
    subCategory: 'Sucos Naturais',
    image: 'https://images.unsplash.com/photo-1600266175161-cfaa218bbd4b?w=600', 
    rating: 4.9 
  },
  { 
    id: 'prod_5', 
    name: 'Milkshake de Morango', 
    description: 'Feito com sorvete de creme e pedaços de fruta de verdade.', 
    price: 18.00, 
    category: 'Sobremesas', 
    image: 'https://images.unsplash.com/photo-1579954115563-e72bf1381629?w=600', 
    rating: 4.8 
  }
];

export const DEMO_COMPLEMENTS: Complement[] = [
  { id: 'comp_1', name: 'Bacon Extra', price: 4.00, active: true },
  { id: 'comp_2', name: 'Ovo', price: 2.00, active: true },
  { id: 'comp_3', name: 'Molho Especial', price: 0.00, active: true }
];

export const DEMO_SETTINGS = [
  { id: 'general', isStoreOpen: true, logoUrl: DEFAULT_LOGO }
];

export const PRODUCTS: Product[] = [];
export const CATEGORIES = ['Todos'];
