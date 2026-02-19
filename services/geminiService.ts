
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
  // Inicialização garantida a cada chamada
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || (import.meta as any).env.VITE_API_KEY });

  const productsMenu = allProducts.map(p => 
    `- ${p.name}: R$ ${p.price.toFixed(2)} | ${p.description}`
  ).join("\n");

  const systemInstruction = `
    Você é o 'Nilo', assistente oficial da Nilo Lanches em Uberaba-MG.
    - LOJA: ${isStoreOpen ? 'ABERTA' : 'FECHADA'}.
    - CARDÁPIO: ${productsMenu}
    - TAXA: R$ ${currentDeliveryFee.toFixed(2)}
    
    Regras:
    1. Responda com no máximo 2 frases. Seja muito rápido.
    2. Use "chapa", "top", "bora".
    3. Para pedidos, use addToCart. Para fechar, finalizeOrder.
    4. Ignore saudações longas, foque na venda.
  `;

  try {
    const formattedHistory: any[] = [];
    
    // REDUÇÃO PARA MOBILE: Mantemos apenas as últimas 3 mensagens para evitar erro 400 por tamanho de buffer em redes móveis
    history.slice(-3).forEach(h => {
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
        temperature: 0.5,
        topK: 20,
        topP: 0.8
      }
    });

    return {
      text: response.text || "Opa! No que posso te ajudar?",
      functionCalls: response.functionCalls || null
    };
  } catch (error: any) {
    console.error("Gemini Critical Mobile Error:", error);
    // Erros de conexão em smartphones geralmente são recuperáveis com uma nova tentativa
    return { 
      text: "Minha chapa esfriou por um segundo (instabilidade no sinal)! 🍟 Pode repetir o que você queria? Estou aqui.", 
      functionCalls: null 
    };
  }
};
