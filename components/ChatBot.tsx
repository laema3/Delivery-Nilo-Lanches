import React, { useState, useRef, useEffect } from 'react';
import { startChat } from '../services/geminiService.ts';
import { Product, CartItem, Customer, Complement } from '../types.ts';
import { Content, FunctionCall } from '@google/genai';

interface ChatBotProps {
  products: Product[];
  cart: CartItem[];
  deliveryFee: number;
  isStoreOpen: boolean;
  currentUser: Customer | null;
  onAddToCart: (product: Product, quantity: number, comps?: Complement[]) => void;
}

export const ChatBot: React.FC<ChatBotProps> = ({ 
  products, cart, deliveryFee, isStoreOpen, currentUser, onAddToCart 
}) => {
  const [isOpen, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<Content[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, isLoading, isOpen]);

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

    const userMessage: Content = { role: 'user', parts: [{ text: trimmedInput }] };
    const newHistory = [...history, userMessage];

    setHistory(newHistory);
    setInput('');
    setIsLoading(true);

    try {
      const result = await startChat(
        newHistory,
        trimmedInput,
        products,
        isStoreOpen,
        deliveryFee,
        !!currentUser
      );

      const modelResponse: Content = { role: 'model', parts: [] };
      const response = result; // A resposta já é o objeto que precisamos

      if (response.functionCalls) {
        response.functionCalls.forEach((call: FunctionCall) => {
          if (call.name === 'addToCart') {
            const { items } = call.args as any;
            let itemsAddedText = 'Adicionei no seu carrinho:';
            items.forEach((item: { productName: string, quantity: number }) => {
              const found = products.find(p => 
                p.name.toLowerCase().includes(item.productName.toLowerCase()) ||
                item.productName.toLowerCase().includes(p.name.toLowerCase())
              );
              if (found) {
                onAddToCart(found, item.quantity || 1);
                itemsAddedText += `\n- ${item.quantity}x ${found.name}`;
              }
            });
            modelResponse.parts.push({ text: itemsAddedText });
          }
        });
      }

      // A resposta de texto agora é uma propriedade da resposta
      const text = response.text;
      if (text) {
        modelResponse.parts.push({ text });
      }

      if (modelResponse.parts.length > 0) {
        setHistory(prev => [...prev, modelResponse]);
      }

    } catch (err: any) {
      console.error("Chat Error:", err);
      const errorMessage = err.message || "Opa, minha chapa esfriou! Tive um problema de conexão. Pode tentar de novo?";
      const errorResponse: Content = { role: 'model', parts: [{ text: errorMessage }] };
      setHistory(prev => [...prev, errorResponse]);
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
            {history.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm font-medium shadow-sm leading-relaxed ${ 
                  msg.role === 'user' 
                  ? 'bg-emerald-600 text-white rounded-tr-none' 
                  : 'bg-white text-slate-700 rounded-tl-none border border-slate-100'
                }`}>
                  {msg.parts.map((part, pIdx) => part.text && <p key={pIdx}>{part.text}</p>)}
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
                  <span className="text-[9px] font-black uppercase text-slate-400">Nilo está pensando...</span>
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
