
import React, { useState, useRef, useEffect } from 'react';
import { chatWithAssistant } from '../services/geminiService.ts';
import { Product, CartItem, Customer } from '../types.ts';

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
  onAddToCart?: (product: Product, quantity: number) => void;
  onClearCart?: () => void;
}

export const ChatBot: React.FC<ChatBotProps> = ({ products, cart, deliveryFee, whatsappNumber, isStoreOpen, currentUser, onAddToCart, onClearCart }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Fala aí! Sou o Nilo, seu assistente de lanches. 🍔 Pronto para a melhor experiência de Uberaba? O que vai ser hoje?' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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
    
    // Passing !!currentUser to let the AI know if the fee is "Real" or "Unknown"
    const response = await chatWithAssistant(userMsg, history, products, isStoreOpen, deliveryFee, !!currentUser);
    
    let finalText = response.text;

    if (response.functionCalls) {
      for (const call of response.functionCalls) {
        
        // 1. ADICIONAR AO CARRINHO
        if (call.name === 'addToCart' && onAddToCart) {
          const args = call.args as any;
          const searchName = (args.productName || '').toLowerCase();
          const qty = Number(args.quantity) || 1;

          const foundProduct = products.find(p => 
            p.name.toLowerCase() === searchName ||
            p.name.toLowerCase().includes(searchName) ||
            searchName.includes(p.name.toLowerCase())
          );

          if (foundProduct) {
            onAddToCart(foundProduct, qty);
            
            const subtotalAtual = cart.reduce((acc, i) => acc + (i.price * i.quantity), 0) + (foundProduct.price * qty);
            
            let feedback = `✅ Adicionado: *${foundProduct.name}* (${qty}x).\n💰 Subtotal: R$ ${subtotalAtual.toFixed(2)}`;
            
            if (currentUser && deliveryFee >= 0) {
              feedback += `\n🛵 Taxa de entrega: R$ ${deliveryFee.toFixed(2)}\n💵 Total com entrega: R$ ${(subtotalAtual + deliveryFee).toFixed(2)}`;
            } else if (!currentUser) {
              feedback += `\n\n💡 *Dica:* Entre na sua conta para calcularmos a entrega exata para você!`;
            }

            if (!isStoreOpen) {
              feedback += `\n\n🕒 *Agendado:* Produção inicia às 18:30!`;
            }

            setMessages(prev => [...prev, { role: 'model', text: feedback }]);
          } else {
            setMessages(prev => [...prev, { role: 'model', text: `Não encontrei o item "${args.productName}" no cardápio. Pode confirmar o nome?` }]);
          }
        }

        // 2. FINALIZAR PEDIDO
        if (call.name === 'finalizeOrder') {
          const args = call.args as any;
          
          if (cart.length === 0) {
            setMessages(prev => [...prev, { role: 'model', text: "Putz! Seu carrinho está vazio. Escolha um lanche primeiro! 🍔" }]);
            continue;
          }

          const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
          const finalFee = args.isDelivery ? (deliveryFee || 0) : 0; 
          const totalFinal = subtotal + finalFee;

          const itemsList = cart.map(item => `▪️ ${item.quantity}x *${item.name}*`).join('\n');
          const headerStatus = !isStoreOpen ? '📝 *PEDIDO AGENDADO (Abertura 18:30)*' : '🍔 *NOVO PEDIDO NILO LANCHES*';
          
          const whatsappText = `${headerStatus}
--------------------------------
👤 *Cliente:* ${args.customerName}
📍 *Tipo:* ${args.isDelivery ? '🚀 Entrega' : '🏪 Retirada'}
🏠 *Endereço:* ${args.isDelivery ? (args.address || 'N/A') : 'RETIRADA NO BALCÃO'}
💳 *Pagamento:* ${args.paymentMethod}
--------------------------------
*ITENS:*
${itemsList}
--------------------------------
💵 *Subtotal:* R$ ${subtotal.toFixed(2)}
🛵 *Taxa de Entrega:* R$ ${finalFee.toFixed(2)}
💰 *TOTAL: R$ ${totalFinal.toFixed(2)}*
--------------------------------
_Gerado por Nilo Assistente Virtual_`;
          
          const officialPhone = (whatsappNumber || '5534991183728').replace(/\D/g, '');
          const url = `https://wa.me/${officialPhone}?text=${encodeURIComponent(whatsappText)}`;
          
          setMessages(prev => [...prev, { 
            role: 'model', 
            text: `🎯 *Tudo pronto!* \n\nTotal Final: *R$ ${totalFinal.toFixed(2)}*.\n\nEstou te levando para o WhatsApp para confirmar seu pedido! 🚀` 
          }]);

          setTimeout(() => {
            window.open(url, '_blank');
            if (onClearCart) onClearCart();
            setIsOpen(false);
          }, 3500);
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
        <div className="w-full h-full sm:w-[400px] sm:h-[600px] bg-white sm:rounded-[32px] shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-emerald-600 p-5 flex items-center justify-between shrink-0 shadow-md z-10">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-white rounded-full flex items-center justify-center text-2xl border-2 border-emerald-500 relative overflow-hidden shadow-inner">
                🤖
              </div>
              <div>
                <h3 className="text-white font-black text-sm uppercase tracking-widest">Nilo Assistente</h3>
                <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5">
                   <span className={`w-1.5 h-1.5 rounded-full ${isStoreOpen ? 'bg-emerald-300 animate-pulse' : 'bg-red-400'}`}></span> 
                   {isStoreOpen ? 'Online' : 'Agendando'}
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
              <div className="flex justify-start">
                <div className="bg-white px-4 py-3 rounded-2xl border border-slate-100 flex items-center gap-2 shadow-sm">
                   <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                  </div>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Nilo está conferindo...</span>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSend} className="p-4 bg-white border-t flex gap-2 pb-8 sm:pb-4">
            <input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite sua mensagem..." 
              className="flex-1 bg-slate-100 border-2 border-transparent focus:border-emerald-500 rounded-xl px-5 py-4 text-sm font-bold outline-none transition-all placeholder:text-slate-400"
            />
            <button disabled={isLoading || !input.trim()} className="bg-emerald-600 disabled:bg-slate-300 text-white w-14 h-14 flex items-center justify-center rounded-xl shadow-lg active:scale-90 transition-all">
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
          className="group w-16 h-16 bg-emerald-600 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 border-4 border-white relative"
        >
          <span className="text-3xl">💬</span>
          {cart.length > 0 && <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-[10px] font-black border-2 border-white rounded-full flex items-center justify-center animate-bounce">{cart.length}</span>}
        </button>
      )}
    </div>
  );
};
