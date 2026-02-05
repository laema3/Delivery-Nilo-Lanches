
import { Product } from './types.ts';

export const DEMO_PRODUCTS: Product[] = [
  { id: 'demo1', name: 'Nilo Burger Especial', description: 'Blend bovino 180g, queijo cheddar, bacon crocante e molho especial no pão brioche.', price: 34.90, category: 'Hambúrgueres', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500', rating: 4.9 },
  { id: 'demo2', name: 'Batata Rústica Nilo', description: 'Batatas cortadas à mão, temperadas com páprica e alecrim. Acompanha maionese da casa.', price: 18.00, category: 'Acompanhamentos', image: 'https://images.unsplash.com/photo-1573016608244-7d519d2631f0?w=500', rating: 4.8 },
  { id: 'demo3', name: 'Milkshake de Paçoca', description: 'Sorvete artesanal de creme, pedaços de paçoca e calda de caramelo.', price: 22.00, category: 'Bebidas', image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500', rating: 5.0 },
];

export const DEMO_CATEGORIES = ['Hambúrgueres', 'Acompanhamentos', 'Bebidas', 'Sobremesas'];

export const PRODUCTS: Product[] = [];
export const CATEGORIES = ['Todos'];
