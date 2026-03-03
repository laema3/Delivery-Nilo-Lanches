
import React, { useState, useRef, useEffect } from 'react';
import { Product, CartItem, Customer } from '../types';
import { GoogleGenAI, Type, FunctionDeclaration, Schema } from "@google/genai";

interface ChatBotProps {
  products: Product[];
  cart: CartItem[];
  deliveryFee: number;
  isStoreOpen: boolean;
  currentUser: Customer | null;
  onAddToCart: (product: Product, quantity: number) => void;
}

// Inicializa o cliente Gemini
// Nota: A chave de API deve estar disponível em process.env.GEMINI_API_KEY ou VITE_API_KEY
const apiKey = process.env.GEMINI_API_KEY || import.meta.env.VITE_API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const ChatBot: React.FC<ChatBotProps> = ({ products, cart, deliveryFee, isStoreOpen, currentUser, onAddToCart }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ text: string; isUser: boolean; }[]>([
    { text: 'Olá! Sou o NiloBot 🤖. Posso te ajudar a escolher um lanche, tirar dúvidas ou até fazer seu pedido por aqui! O que você manda?', isUser: false }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatSessionRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages, isTyping]);

  // Inicializa a sessão de chat quando o componente monta ou quando os produtos mudam
  useEffect(() => {
    if (!products.length) return;

    const menuContext = products.map(p => `${p.name} (${p.category}): R$ ${p.price.toFixed(2)} - ${p.description}`).join('\n');
    
    const systemInstruction = `
      Você é o NiloBot, o assistente virtual inteligente e simpático do Nilo Lanches.
      Seu objetivo é ajudar os clientes a escolherem lanches, tirar dúvidas e realizar pedidos.
      
      CONTEXTO DA LOJA:
      - Status: ${isStoreOpen ? 'ABERTO' : 'FECHADO'}.
      - Taxa de entrega base: R$ ${deliveryFee.toFixed(2)}.
      - Horário: Terça a Domingo, das 18h às 23h.
      - Contato: (34) 99118-3728.
      - Endereço: Rua dos Andradas, 123 - Abadia.

      CARDÁPIO ATUAL:
      ${menuContext}

      REGRAS DE COMPORTAMENTO:
      1. Seja sempre educado, use emojis 🍔🍟🥤 e tenha um tom jovial.
      2. Se o cliente quiser pedir algo, USE A FERRAMENTA 'addToCart'. Não peça para ele adicionar manualmente se você pode fazer isso.
      3. Se o cliente perguntar preço, consulte o cardápio acima.
      4. Se o cliente perguntar sobre entrega, informe a taxa base e diga que depende do bairro.
      5. Se o cliente quiser finalizar, diga para ele clicar no carrinho de compras no topo ou na lateral.
      6. Se não entender algo, peça desculpas e tente oferecer opções do cardápio.
      7. Responda de forma concisa, ideal para chat.
    `;

    // Definição das ferramentas (Tools)
    const addToCartTool: FunctionDeclaration = {
      name: "addToCart",
      description: "Adiciona um item do cardápio ao carrinho de compras do cliente.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          productName: {
            type: Type.STRING,
            description: "O nome do produto a ser adicionado (ex: 'X-Tudo', 'Coca-Cola'). Tente encontrar o nome mais próximo no cardápio."
          },
          quantity: {
            type: Type.NUMBER,
            description: "A quantidade do produto. Padrão é 1."
          }
        },
        required: ["productName"]
      }
    };

    const getMenuTool: FunctionDeclaration = {
      name: "getMenu",
      description: "Retorna a lista de produtos do cardápio para consulta.",
      parameters: {
        type: Type.OBJECT,
        properties: {},
      }
    };

    try {
      chatSessionRef.current = ai.chats.create({
        model: "gemini-2.5-flash-latest", // Modelo rápido e eficiente
        config: {
          systemInstruction: systemInstruction,
          tools: [{ functionDeclarations: [addToCartTool, getMenuTool] }],
        },
      });
    } catch (e) {
      console.error("Erro ao inicializar chat Gemini:", e);
    }

  }, [products, isStoreOpen, deliveryFee]);

  const handleAddToCartTool = (productName: string, quantity: number = 1) => {
    // Busca fuzzy simples
    const normalizedSearch = productName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const product = products.find(p => 
      p.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(normalizedSearch)
    );

    if (product) {
      onAddToCart(product, quantity);
      return { success: true, message: `Adicionei ${quantity}x ${product.name} ao seu carrinho! 🛒`, product: product.name, price: product.price };
    } else {
      return { success: false, message: `Desculpe, não encontrei "${productName}" no cardápio. Tente outro nome.` };
    }
  };

  const handleSend = async (textOverride?: string) => {
    const userMsg = textOverride || input;
    if (!userMsg.trim()) return;

    setMessages(prev => [...prev, { text: userMsg, isUser: true }]);
    setInput('');
    setIsTyping(true);

    try {
      if (!chatSessionRef.current) throw new Error("Chat não inicializado");

      let response = await chatSessionRef.current.sendMessage({ message: userMsg });
      
      // Processa chamadas de função (Function Calling)
      // O SDK @google/genai lida com function calls de forma diferente do SDK antigo.
      // Precisamos verificar se há chamadas de função na resposta.
      
      const functionCalls = response.functionCalls;
      
      if (functionCalls && functionCalls.length > 0) {
        const functionResponses = [];
        
        for (const call of functionCalls) {
          let result;
          if (call.name === 'addToCart') {
            const args = call.args as any;
            result = handleAddToCartTool(args.productName, args.quantity);
          } else if (call.name === 'getMenu') {
             result = { menu: products.map(p => p.name).join(', ') };
          }

          functionResponses.push({
            name: call.name,
            response: { result: result }
          });
        }

        // Envia o resultado da função de volta para o modelo
        response = await chatSessionRef.current.sendMessage(functionResponses);
      }

      const botText = response.text || "Desculpe, tive um problema técnico. Pode tentar novamente?";
      setMessages(prev => [...prev, { text: botText, isUser: false }]);

    } catch (error) {
      console.error("Erro no chat:", error);
      setMessages(prev => [...prev, { text: "Ops! Tive um problema de conexão. Tente novamente em instantes.", isUser: false }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-emerald-600 text-white rounded-full shadow-lg flex items-center justify-center text-2xl hover:scale-110 transition-transform active:scale-95"
      >
        {isOpen ? '✕' : '💬'}
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 bg-white rounded-[32px] shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[500px] animate-in slide-in-from-bottom-10 duration-300">
          <div className="bg-emerald-600 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-xl shadow-sm border-2 border-emerald-100">🤖</div>
              <div>
                <h3 className="font-black text-white uppercase text-sm tracking-wide">NiloBot IA</h3>
                <p className="text-[10px] text-emerald-100 font-bold uppercase tracking-widest flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span> Online
                </p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white hover:bg-emerald-700 w-8 h-8 rounded-full flex items-center justify-center transition-colors">✕</button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 scroll-smooth">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                <div className={`max-w-[85%] p-3.5 rounded-2xl text-xs font-medium leading-relaxed shadow-sm ${
                  msg.isUser 
                    ? 'bg-emerald-600 text-white rounded-br-none' 
                    : 'bg-white text-slate-700 border border-slate-200 rounded-bl-none'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start animate-in fade-in">
                <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-bl-none shadow-sm flex gap-1 items-center h-10">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex gap-2 overflow-x-auto no-scrollbar">
            {['Ver Cardápio', 'Qual a taxa de entrega?', 'Quero um X-Tudo', 'Horário de funcionamento'].map(opt => (
              <button 
                key={opt} 
                onClick={() => handleSend(opt)}
                className="whitespace-nowrap px-3 py-1.5 bg-white border border-slate-200 rounded-full text-[10px] font-bold text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-all shadow-sm active:scale-95"
              >
                {opt}
              </button>
            ))}
          </div>

          <div className="p-4 bg-white border-t border-slate-100 flex gap-2">
            <input 
              type="text" 
              value={input} 
              onChange={e => setInput(e.target.value)} 
              onKeyPress={e => e.key === 'Enter' && handleSend()}
              placeholder="Digite sua mensagem..." 
              disabled={isTyping}
              className="flex-1 bg-slate-100 border-none rounded-xl px-4 py-3 text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-50 transition-all"
            />
            <button 
              onClick={() => handleSend()} 
              disabled={isTyping || !input.trim()}
              className="bg-emerald-600 text-white w-10 h-10 rounded-xl flex items-center justify-center hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-900/10 active:scale-95"
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
};
