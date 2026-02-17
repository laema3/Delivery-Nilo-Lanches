
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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const productsMenu = allProducts.map(p => 
    `- ${p.name}: R$ ${p.price.toFixed(2)} | ${p.description}`
  ).join("\n");

  const systemInstruction = `
    Você é o 'Nilo', assistente da Nilo Lanches em Uberaba-MG.
    DIRETRIZES:
    - HORÁRIO: 18:30 às 23:50.
    - STATUS LOJA: ${isStoreOpen ? 'ABERTA' : 'FECHADA'}.
    - PRODUTOS: ${productsMenu}
    COMPORTAMENTO: Seja rápido e amigável. Use 'addToCart' para lanches e 'finalizeOrder' para fechar pedidos.
    IMPORTANTE: Nunca comece uma conversa com 'model'.
  `;

  try {
    const cleanHistory: any[] = [];
    let lastRole = '';

    // Filtrar mensagens vazias e garantir alternância de papéis
    history.forEach(h => {
      const currentRole = h.role === 'model' ? 'model' : 'user';
      const text = String(h.text || "").trim();
      
      if (text && currentRole !== lastRole) {
        cleanHistory.push({ role: currentRole, parts: [{ text }] });
        lastRole = currentRole;
      }
    });

    // REGRA DE OURO DA API GEMINI: O histórico DEVE começar com 'user'
    if (cleanHistory.length > 0 && cleanHistory[0].role === 'model') {
      cleanHistory.shift();
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [...cleanHistory, { role: 'user', parts: [{ text: message }] }],
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: [addToCartFunction, finalizeOrderFunction] }],
        temperature: 0.4,
      }
    });

    return {
      text: response.text || "Estou aqui! O que deseja pedir?",
      functionCalls: response.functionCalls || null
    };
  } catch (error: any) {
    console.error("Gemini Assistant Error:", error);
    return { 
      text: "Opa, tive um pequeno lapso de memória aqui na chapa. Pode repetir o que você deseja pedir?", 
      functionCalls: null 
    };
  }
};
