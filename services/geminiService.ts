
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { Product } from "../types.ts";

const addToCartFunction: FunctionDeclaration = {
  name: "addToCart",
  parameters: {
    type: Type.OBJECT,
    description: "Adiciona um produto do menu ao carrinho de compras.",
    properties: {
      productName: { type: Type.STRING, description: "Nome exato do produto conforme listado no menu." },
      quantity: { type: Type.NUMBER, description: "Quantidade desejada (mínimo 1)." },
      observation: { type: Type.STRING, description: "Observações opcionais." }
    },
    required: ["productName", "quantity"]
  }
};

const finalizeOrderFunction: FunctionDeclaration = {
  name: "finalizeOrder",
  parameters: {
    type: Type.OBJECT,
    description: "Finaliza o pedido atual e redireciona para o fechamento.",
    properties: {
      customerName: { type: Type.STRING },
      paymentMethod: { type: Type.STRING, description: "Dinheiro, Cartão ou Pix." },
      isDelivery: { type: Type.BOOLEAN },
      deliveryAddress: { type: Type.STRING }
    },
    required: ["customerName", "paymentMethod", "isDelivery"]
  }
};

export const chatWithAssistant = async (
  message: string, 
  history: any[], 
  allProducts: Product[], 
  isStoreOpen: boolean,
  currentDeliveryFee: number,
  isLoggedIn: boolean
) => {
  const apiKey = process.env.API_KEY || (import.meta as any).env.VITE_API_KEY;
  if (!apiKey) {
    return { 
      text: "A chave da API do Gemini não foi configurada. Por favor, adicione-a.", 
      functionCalls: null 
    };
  }
  const ai = new GoogleGenAI({ apiKey });

  const productsMenu = allProducts.map(p => 
    `- ${p.name}: R$ ${p.price.toFixed(2)} | ${p.description}`
  ).join("\n");

  const systemInstruction = `
    Você é o 'Nilo', o assistente virtual especialista da Nilo Lanches em Uberaba-MG.
    Sua missão é ser o melhor vendedor, guiando o cliente pelo cardápio e ajudando a montar e finalizar o pedido.

    **STATUS ATUAL:**
    - HORÁRIO DE ATENDIMENTO: Segunda a Sábado, das 18:00 às 23:00. Domingo é nosso dia de folga para recarregar as energias!
    - ESTADO DA LOJA: ${isStoreOpen ? 'ABERTA E PRONTA PRA CHAPA!' : 'FECHADA. Voltamos no próximo dia de funcionamento.'}
    - TAXA DE ENTREGA ATUAL: R$ ${currentDeliveryFee.toFixed(2)} (pode variar por bairro).
    - CLIENTE LOGADO: ${isLoggedIn ? 'Sim' : 'Não'}

    **NOSSO CARDÁPIO DETALHADO:**
    ${productsMenu}

    **REGRAS DE OURO DO ATENDIMENTO:**
    1.  **SEJA PROATIVO E VENDEDOR:** Não espere o cliente perguntar. Sugira combos, adicionais (ex: "Que tal uma porção de fritas pra acompanhar esse monstro?" ou "Uma coquinha gelada vai bem com isso, hein?"), e os itens mais vendidos.
    2.  **CLAREZA TOTAL:** Responda perguntas sobre o cardápio, ingredientes, preços e taxas de forma direta. Se não souber, peça para o cliente chamar no WhatsApp.
    3.  **FUNÇÕES SÃO SUAS FERRAMENTAS:**
        *   Para adicionar algo no carrinho, use a função 'addToCart'. Sempre confirme o que foi adicionado.
        *   Quando o cliente quiser fechar a conta, use 'finalizeOrder'. Você PRECISARÁ do nome, forma de pagamento e se é para entrega ou retirada.
    4.  **TOM DE VOZ:** Use uma linguagem jovem e animada. Gírias como "chapa quente", "monstro", "partiu", "fechou" são bem-vindas. Mantenha as respostas curtas e diretas (máximo 2-3 frases).
    5.  **LIDANDO COM A LOJA FECHADA:** Se a loja estiver fechada, informe o cliente e diga nosso horário de funcionamento. Não adicione itens ao carrinho.
    6.  **CLIENTE NÃO LOGADO:** Se o cliente tentar finalizar o pedido sem estar logado, peça para ele se identificar primeiro. É essencial para sabermos quem é e onde entregar.
  `;

  try {
    const formattedHistory: any[] = [];
    
    // Aumentamos o histórico para melhor contexto, mas ainda otimizado
    history.slice(-6).forEach(h => {
      const text = String(h.text || "").trim();
      if (text) {
        formattedHistory.push({
          role: h.role === 'model' ? 'model' : 'user',
          parts: [{ text }]
        });
      }
    });

    if (formattedHistory.length > 0 && formattedHistory[0].role === 'model') {
      formattedHistory.shift();
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [...formattedHistory, { role: 'user', parts: [{ text: message.trim() }] }],
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: [addToCartFunction, finalizeOrderFunction] }],
        temperature: 0.8, 
        topK: 40,
        topP: 0.95
      }
    });

    return {
      text: response.text || "Opa, bora pedir um lanche?",
      functionCalls: response.functionCalls || null
    };
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return { 
      text: "Opa, parece que o sinal da chapa caiu! Pode tentar de novo? Às vezes a internet dá uma vacilada.", 
      functionCalls: null 
    };
  }
};
