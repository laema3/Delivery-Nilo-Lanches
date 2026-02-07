
import React, { useState, useRef, useEffect } from 'react';
import { chatWithAssistant } from '../services/geminiService.ts';
import { Product } from '../types.ts';

interface Message {
  role: 'user' | 'model';
  text: string;
}

export const ChatBot: React.FC<{ products: Product[] }> = ({ products }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Olá! Sou o Nilo. Tá com fome de quê hoje? 🍔' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Previne scroll do body quando o chat está aberto no mobile
  useEffect(() => {
    if (isOpen && window.innerWidth < 640) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [isOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    const history = messages.map(m => ({
      role: m.role,
      parts: [{ text: m.text }]
    }));

    const response = await chatWithAssistant(userMsg, history, products);
    
    setMessages(prev => [...prev, { role: 'model', text: response || '' }]);
    setIsLoading(false);
  };

  return (
    <div className={`fixed z-[100] flex flex-col items-end ${isOpen ? 'inset-0 sm:inset-auto sm:bottom-6 sm:right-6' : 'bottom-6 right-6'}`}>
      {isOpen && (
        <div className="w-full h-full sm:w-[400px] sm:h-[500px] bg-white sm:rounded-[32px] shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="bg-emerald-600 p-6 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-xl">🤖</div>
              <div>
                <h3 className="text-white font-black text-xs uppercase tracking-widest">Nilo Assistente</h3>
                <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5">
                   <span className="w-1.5 h-1.5 bg-emerald-300 rounded-full animate-pulse"></span> Online agora
                </p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-2 text-white/60 hover:text-white transition-colors bg-white/10 rounded-full">✕</button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50 no-scrollbar overscroll-contain">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm font-medium shadow-sm leading-relaxed ${
                  m.role === 'user' 
                  ? 'bg-emerald-600 text-white rounded-tr-none' 
                  : 'bg-white text-slate-700 rounded-tl-none border border-slate-100'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start animate-fade-in">
                <div className="bg-white px-5 py-4 rounded-2xl rounded-tl-none border border-slate-100 flex flex-col gap-2 shadow-sm">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                  </div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Nilo está pensando...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="p-4 bg-white border-t flex gap-2 sm:mb-0 pb-10 sm:pb-4 safe-area-bottom">
            <input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="O que deseja saber?" 
              className="flex-1 bg-slate-100 border-none rounded-xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
            />
            <button className="bg-emerald-600 text-white w-12 h-12 flex items-center justify-center rounded-xl hover:bg-emerald-700 transition-all shadow-lg active:scale-90 shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>
        </div>
      )}

      {/* Toggle Button (escondido se aberto no mobile) */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="w-16 h-16 bg-emerald-600 rounded-full shadow-2xl flex items-center justify-center text-2xl hover:scale-110 active:scale-95 transition-all shadow-emerald-200 border-4 border-white"
        >
          💬
        </button>
      )}
    </div>
  );
};
