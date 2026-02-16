
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { Product } from "../types.ts";

// Tool para Adicionar ao Carrinho
const addToCartFunction: FunctionDeclaration = {
  name: "addToCart",
  parameters: {
    type: Type.OBJECT,
    description: "Adiciona um produto do menu ao carrinho de compras.",
    properties: {
      productName: { 
        type: Type.STRING, 
        description: "Nome exato do produto conforme listado no menu." 
      },
      quantity: { 
        type: Type.NUMBER, 
        description: "Quantidade desejada (mínimo 1)." 
      },
      observation: { 
        type: Type.STRING, 
        description: "Observações opcionais (ex: sem cebola)." 
      }
    },
    required: ["productName", "quantity"]
  }
};

// Tool para Finalizar Pedido
const finalizeOrderFunction: FunctionDeclaration = {
  name: "finalizeOrder",
  parameters: {
    type: Type.OBJECT,
    description: "Finaliza o pedido atual e redireciona para o fechamento.",
    properties: {
      customerName: { type: Type.STRING },
      paymentMethod: { type: Type.STRING, description: "Dinheiro, Cartão ou Pix." },
      isDelivery: { type: Type.BOOLEAN, description: "True para entrega, False para retirada." },
      deliveryAddress: { type: Type.STRING, description: "Endereço de entrega completo." }
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
  // Fix: Initializing GoogleGenAI using strictly process.env.API_KEY as per mandatory guidelines.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const productsMenu = allProducts.map(p => 
    `- ${p.name}: R$ ${p.price.toFixed(2)} | Descrição: ${p.description}`
  ).join("\n");

  const deliveryInfo = isLoggedIn 
    ? `O cliente está LOGADO. A taxa de entrega é R$ ${currentDeliveryFee.toFixed(2)}.`
    : `O cliente NÃO está logado. Informe que a entrega em Uberaba varia de R$ 5 a R$ 15.`;

  const systemInstruction = `
    Você é o 'Nilo', assistente da Nilo Lanches em Uberaba-MG.
    
    DIRETRIZES:
    - HORÁRIO: 18:30 às 23:50.
    - STATUS LOJA: ${isStoreOpen ? 'ABERTA' : 'FECHADA'}.
    - PRODUTOS: ${productsMenu}
    - TAXA: ${deliveryInfo}
    
    COMPORTAMENTO:
    1. Seja rápido e amigável 🍔.
    2. Se o cliente quiser um lanche, use a ferramenta 'addToCart'.
    3. Se ele quiser pagar ou finalizar, use 'finalizeOrder'.
    4. Se a loja estiver fechada, diga que voltamos amanhã às 18:30.
    5. Nunca invente lanches que não estão na lista acima.
    6. Se o cliente perguntar de rastreio, diga que em breve teremos acompanhamento em tempo real no mapa!
  `;

  try {
    // Limpeza rigorosa para garantir alternância de turnos: USER -> MODEL -> USER -> MODEL
    let validHistory: any[] = [];
    let lastRole = '';

    const processedHistory = history.map(h => ({
      role: h.role === 'model' ? 'model' : 'user',
      parts: [{ text: h.text || "Entendi, vou verificar." }] // Garante que nunca haja partes vazias
    }));

    for (const turn of processedHistory) {
      if (turn.role !== lastRole) {
        validHistory.push(turn);
        lastRole = turn.role;
      }
    }

    // A conversa DEVE começar com 'user'
    if (validHistory.length > 0 && validHistory[0].role === 'model') {
      validHistory.shift();
    }

    // Se após o shift o histórico ficou vazio ou o último turno é 'user', 
    // a API vai aceitar o novo turno 'user' que estamos enviando agora.
    if (validHistory.length > 0 && validHistory[validHistory.length - 1].role === 'user') {
        // Remove o último turno se for USER, pois vamos adicionar o novo USER agora
        validHistory.pop();
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [...validHistory, { role: 'user', parts: [{ text: message }] }],
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: [addToCartFunction, finalizeOrderFunction] }],
        temperature: 0.4,
      }
    });

    if (!response) throw new Error("Sem resposta da API");

    // Fix: Access response.text as a property, not a method, as per guidelines.
    return {
      text: response.text || "Entendido! O que mais posso fazer por você?",
      functionCalls: response.functionCalls || null
    };
  } catch (error) {
    console.error("Gemini Critical Error:", error);
    return { 
      text: "Foi mal, tive um pequeno soluço aqui no sistema! 🍔 Pode tentar falar comigo de novo?", 
      functionCalls: null 
    };
  }
};
