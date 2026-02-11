
import React, { useState, useRef, useEffect } from 'react';
import { chatWithAssistant } from '../services/geminiService.ts';
import { Product, CartItem } from '../types.ts';

interface Message {
  role: 'user' | 'model';
  text: string;
}

interface ChatBotProps {
  products: Product[];
  cart: CartItem[];         // Novo: Acesso ao carrinho real
  deliveryFee: number;      // Novo: Taxa de entrega atual
  onAddToCart?: (product: Product, quantity: number) => void;
  onClearCart?: () => void; // Novo: Para limpar após envio
}

export const ChatBot: React.FC<ChatBotProps> = ({ products, cart, deliveryFee, onAddToCart, onClearCart }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Olá! Bem-vindo ao Nilo Lanches. Como posso ajudar você a escolher seu pedido hoje? 🍔' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, isOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    const history = messages.map(m => ({ role: m.role, parts: [{ text: m.text }] }));
    const response = await chatWithAssistant(userMsg, history, products);
    
    let finalText = response.text;
    let autoWhatsAppUrl = '';

    if (response.functionCalls) {
      for (const call of response.functionCalls) {
        
        // --- 1. ADICIONAR AO CARRINHO ---
        if (call.name === 'addToCart' && onAddToCart) {
          const args = call.args as any;
          const searchName = (args.productName || '').toLowerCase();
          const qty = Number(args.quantity) || 1;

          const foundProduct = products.find(p => 
            p.name.toLowerCase().includes(searchName) || 
            searchName.includes(p.name.toLowerCase())
          );

          if (foundProduct) {
            onAddToCart(foundProduct, qty);
            setMessages(prev => [...prev, { 
              role: 'model', 
              text: `✅ Adicionei ${qty}x *${foundProduct.name}* ao seu pedido. (Subtotal: R$ ${((foundProduct.price * qty) + cart.reduce((acc, i) => acc + (i.price * i.quantity), 0)).toFixed(2)})` 
            }]);
            if (!finalText) finalText = "Deseja adicionar mais alguma coisa ou podemos finalizar?";
          }
        }

        // --- 2. FINALIZAR PEDIDO (WHATSAPP) ---
        if (call.name === 'finalizeOrder') {
          const args = call.args as any;
          
          // Cálculo real usando o estado do React (mais seguro que a memória da IA)
          const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
          // Se o bot detectou que é entrega, usa a taxa do App, senão 0
          const finalDeliveryFee = args.isDelivery ? deliveryFee : 0; 
          const total = subtotal + finalDeliveryFee;

          // Montagem da mensagem do WhatsApp
          let itemsList = cart.map(item => `▪️ ${item.quantity}x *${item.name}* (R$ ${(item.price * item.quantity).toFixed(2)})`).join('\n');
          
          // Caso o carrinho esteja vazio (usuário pediu direto sem adicionar antes)
          if (itemsList.length === 0) {
            itemsList = "(Cliente pediu diretamente pelo chat)";
          }

          const whatsappText = `*NOVO PEDIDO VIA CHAT* 🤖\n--------------------------------\n👤 *Cliente:* ${args.customerName}\n📍 *Endereço:* ${args.address || 'Retirada no Balcão'}\n💳 *Pagamento:* ${args.paymentMethod}\n--------------------------------\n${itemsList}\n--------------------------------\n🛵 *Taxa Entrega:* R$ ${finalDeliveryFee.toFixed(2)}\n💰 *TOTAL FINAL: R$ ${total.toFixed(2)}*`;
          
          autoWhatsAppUrl = `https://wa.me/5534991183728?text=${encodeURIComponent(whatsappText)}`;
          
          // Mensagem visual no chat
          setMessages(prev => [...prev, { 
            role: 'model', 
            text: `📝 *PEDIDO CONFIRMADO!*\n\nCliente: ${args.customerName}\nTotal: R$ ${total.toFixed(2)}\n\nEstou abrindo o WhatsApp para o envio...` 
          }]);

          if (!finalText) finalText = "Muito obrigado pela preferência! Seu pedido está sendo processado. 🍔";
          
          // Abre o WhatsApp e limpa carrinho
          setTimeout(() => {
            window.open(autoWhatsAppUrl, '_blank');
            if (onClearCart) onClearCart();
          }, 1500);
        }
      }
    }

    if (finalText) {
      setMessages(prev => [...prev, { role: 'model', text: finalText }]);
    }
    
    setIsLoading(false);
  };

  return (
    <div className={`fixed z-[100] flex flex-col items-end ${isOpen ? 'inset-0 sm:inset-auto sm:bottom-6 sm:right-6' : 'bottom-6 right-6'}`}>
      {isOpen && (
        <div className="w-full h-full sm:w-[400px] sm:h-[550px] bg-white sm:rounded-[32px] shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-emerald-600 p-5 flex items-center justify-between shrink-0 shadow-md z-10">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-white rounded-full flex items-center justify-center text-2xl border-2 border-emerald-500 shadow-sm relative overflow-hidden">
                🤖
                <div className="absolute inset-0 bg-emerald-500/10 animate-pulse"></div>
              </div>
              <div>
                <h3 className="text-white font-black text-sm uppercase tracking-widest">Nilo Assistente</h3>
                <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 opacity-90">
                   <span className="w-1.5 h-1.5 bg-emerald-300 rounded-full animate-pulse shadow-[0_0_5px_#fff]"></span> Online
                </p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="w-8 h-8 flex items-center justify-center text-white hover:bg-white/20 rounded-full transition-colors font-bold">✕</button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50 no-scrollbar overscroll-contain">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm font-medium shadow-sm leading-relaxed ${
                  m.role === 'user' 
                  ? 'bg-emerald-600 text-white rounded-tr-none' 
                  : 'bg-white text-slate-700 rounded-tl-none border border-slate-100'
                }`}>
                  {m.text.split('\n').map((line, lIdx) => (
                    <p key={lIdx} className={lIdx > 0 ? "mt-1" : ""}>
                      {line.split('*').map((part, idx) => idx % 2 === 1 ? <strong key={idx} className="font-black">{part}</strong> : part)}
                    </p>
                  ))}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start animate-fade-in">
                <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-none border border-slate-100 flex items-center gap-2 shadow-sm">
                   <span className="text-lg">🍔</span>
                   <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSend} className="p-4 bg-white border-t flex gap-2 sm:mb-0 pb-8 sm:pb-4 safe-area-bottom shadow-[0_-5px_15px_rgba(0,0,0,0.02)] z-10">
            <input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite sua mensagem..." 
              className="flex-1 bg-slate-100 border-2 border-transparent focus:border-emerald-500 rounded-xl px-5 py-4 text-sm font-bold outline-none transition-all placeholder:text-slate-400"
            />
            <button disabled={isLoading || !input.trim()} className="bg-emerald-600 disabled:bg-slate-300 text-white w-14 h-14 flex items-center justify-center rounded-xl hover:bg-emerald-700 transition-all shadow-lg active:scale-90 shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>
        </div>
      )}

      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="group relative w-16 h-16 bg-emerald-600 rounded-full shadow-[0_8px_30px_rgba(16,185,129,0.4)] flex items-center justify-center transition-all hover:scale-110 active:scale-95 border-4 border-white"
        >
          <span className="text-3xl group-hover:hidden">💬</span>
          <span className="text-3xl hidden group-hover:block">🍔</span>
          {cart.length > 0 && <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 border-2 border-white rounded-full animate-bounce"></span>}
        </button>
      )}
    </div>
  );
};
