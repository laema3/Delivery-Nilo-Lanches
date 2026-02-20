
import React, { useState, useRef, useEffect } from 'react';
import { chatWithAssistant } from '../services/geminiService.ts';
import { Product, CartItem, Customer, Complement } from '../types.ts';

interface Message {
  role: 'user' | 'model';
  text: string;
}

interface ChatBotProps {
  products: Product[];
  cart: CartItem[];
  deliveryFee: number;
  whatsappNumber?: string;
  isStoreOpen: boolean;
  currentUser: Customer | null;
  onAddToCart?: (product: Product, quantity: number, comps?: Complement[]) => void;
  onClearCart?: () => void;
}

export const ChatBot: React.FC<ChatBotProps> = ({ 
  products, cart, deliveryFee, whatsappNumber, isStoreOpen, currentUser, onAddToCart, onClearCart 
}) => {
  const [isOpen, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'E aí! Sou o Nilo. 🍔 Pronto para o melhor lanche da sua vida? O que vai ser hoje?' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, isOpen]);

  // Prevenir que o scroll do fundo se mova quando o chat estiver aberto no mobile
  useEffect(() => {
    if (isOpen && window.innerWidth < 640) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    const userMessage: Message = { role: 'user', text: trimmedInput };
    const newMessages = [...messages, userMessage];

    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await chatWithAssistant(
        trimmedInput, 
        newMessages, 
        products, 
        isStoreOpen, 
        deliveryFee, 
        !!currentUser
      );

      if (response.functionCalls) {
        for (const call of response.functionCalls) {
          if (call.name === 'addToCart' && onAddToCart) {
            const { productName, quantity } = call.args as any;
            const found = products.find(p => 
              p.name.toLowerCase().includes(productName.toLowerCase()) ||
              productName.toLowerCase().includes(p.name.toLowerCase())
            );

            if (found) {
              onAddToCart(found, quantity || 1);
              setMessages(prev => [...prev, { 
                role: 'model', 
                text: `✅ Adicionei **${quantity}x ${found.name}** ao seu carrinho! Quer algo para acompanhar? 🍟🥤` 
              }]);
            } else {
              setMessages(prev => [...prev, { 
                role: 'model', 
                text: `Humm, não achei o "${productName}" no menu. Pode confirmar o nome pra mim?` 
              }]);
            }
          }

          if (call.name === 'finalizeOrder') {
            if (cart.length === 0) {
              setMessages(prev => [...prev, { 
                role: 'model', 
                text: "Seu carrinho está vazio! Escolha uma delícia do menu primeiro. 🍔" 
              }]);
              continue;
            }

            const args = call.args as any;
            const subtotal = cart.reduce((acc, i) => acc + (i.price * i.quantity), 0);
            const total = subtotal + (args.isDelivery ? deliveryFee : 0);
            
            const summary = cart.map(i => `▪️ ${i.quantity}x ${i.name}`).join('\n');
            const waText = `🍔 *PEDIDO NILO LANCHES*\n\n*Cliente:* ${args.customerName}\n*Tipo:* ${args.isDelivery ? '🚀 Entrega' : '🏪 Retirada'}\n*Endereço:* ${args.isDelivery ? args.deliveryAddress : 'BALCÃO'}\n*Pagamento:* ${args.paymentMethod}\n\n*ITENS:*\n${summary}\n\n*TOTAL: R$ ${total.toFixed(2)}*`;
            
            const phone = (whatsappNumber || '5534991183728').replace(/\D/g, '');
            
            setMessages(prev => [...prev, { role: 'model', text: "🎯 Tudo pronto! Clique no botão do WhatsApp para confirmar o pedido." }]);
            
            setTimeout(() => {
              window.open(`https://wa.me/${phone}?text=${encodeURIComponent(waText)}`, '_blank');
              if (onClearCart) onClearCart();
              setOpen(false);
            }, 1000);
          }
        }
      }

      if (response.text) {
        setMessages(prev => [...prev, { role: 'model', text: response.text }]);
      }
    } catch (err) {
      console.error("Chat Error Catch:", err);
      setMessages(prev => [...prev, { role: 'model', text: "Minha conexão falhou por um momento. Pode tentar enviar de novo?" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`fixed z-[300] flex flex-col items-end transition-all duration-300 ${isOpen ? 'inset-0 sm:inset-auto sm:bottom-6 sm:right-6' : 'bottom-6 right-6'}`}>
      {isOpen && (
        <div className="w-full h-full sm:h-auto sm:w-[400px] sm:max-h-[600px] bg-white sm:rounded-[32px] shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-emerald-600 p-5 flex items-center justify-between shrink-0 shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-xl shadow-inner">🤖</div>
              <div>
                <h3 className="text-white font-black text-xs uppercase tracking-widest">Nilo Assistente</h3>
                <p className="text-emerald-100 text-[9px] font-bold uppercase flex items-center gap-1.5">
                   <span className={`w-1.5 h-1.5 rounded-full ${isStoreOpen ? 'bg-emerald-300 animate-pulse' : 'bg-red-400'}`}></span>
                   {isStoreOpen ? 'Online Agora' : 'Loja Fechada'}
                </p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white p-2 hover:bg-white/20 rounded-full transition-colors font-bold">✕</button>
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
                      {line.split('**').map((part, idx) => idx % 2 === 1 ? <strong key={idx} className="font-black text-emerald-800">{part}</strong> : part)}
                    </p>
                  ))}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white px-4 py-3 rounded-2xl border border-slate-100 flex items-center gap-2 shadow-sm">
                   <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                  </div>
                  <span className="text-[9px] font-black uppercase text-slate-400">Nilo está conferindo...</span>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSend} className="p-4 bg-white border-t flex gap-2 pb-10 sm:pb-4 shrink-0">
            <input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Fale com o Nilo..." 
              className="flex-1 bg-slate-100 border-2 border-transparent focus:border-emerald-500 rounded-xl px-5 py-3.5 text-sm font-bold outline-none transition-all"
            />
            <button disabled={isLoading || !input.trim()} className="bg-emerald-600 disabled:bg-slate-300 text-white w-12 h-12 flex items-center justify-center rounded-xl shadow-lg transition-all active:scale-90">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>
        </div>
      )}

      {!isOpen && (
        <button 
          onClick={() => setOpen(true)}
          className="group w-16 h-16 bg-emerald-600 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 border-4 border-white relative active:scale-90"
        >
          <span className="text-3xl">💬</span>
          {cart.length > 0 && <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-[10px] font-black border-2 border-white rounded-full flex items-center justify-center animate-bounce">{cart.length}</span>}
        </button>
      )}
    </div>
  );
};
