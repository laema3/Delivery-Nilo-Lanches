
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
  // Inicialização robusta usando a chave de ambiente
  const apiKey = process.env.API_KEY || (import.meta as any).env.VITE_API_KEY;
  const ai = new GoogleGenAI({ apiKey });

  const productsMenu = allProducts.map(p => 
    `- ${p.name}: R$ ${p.price.toFixed(2)} | ${p.description}`
  ).join("\n");

  const systemInstruction = `
    Você é o 'Nilo', assistente oficial da Nilo Lanches em Uberaba-MG.
    - LOJA: ${isStoreOpen ? 'ABERTA' : 'FECHADA'}.
    - CARDÁPIO: ${productsMenu}
    - TAXA: R$ ${currentDeliveryFee.toFixed(2)}
    
    Regras:
    1. Responda com no máximo 2 frases curtas. Seja muito rápido.
    2. Use gírias como "chapa", "top", "bora".
    3. Para pedidos, use addToCart. Para fechar, finalizeOrder.
    4. Não enrole, foque em colocar o lanche no carrinho.
  `;

  try {
    const formattedHistory: any[] = [];
    
    // REDUÇÃO RADICAL PARA MOBILE: Mantemos apenas o contexto imediato para evitar timeouts em redes instáveis
    history.slice(-2).forEach(h => {
      const text = String(h.text || "").trim();
      if (text) {
        formattedHistory.push({
          role: h.role === 'model' ? 'model' : 'user',
          parts: [{ text }]
        });
      }
    });

    // Garante que o histórico não comece com 'model' (exigência da API)
    if (formattedHistory.length > 0 && formattedHistory[0].role === 'model') {
      formattedHistory.shift();
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [...formattedHistory, { role: 'user', parts: [{ text: message.trim() }] }],
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: [addToCartFunction, finalizeOrderFunction] }],
        temperature: 0.7, // Um pouco mais de criatividade para evitar respostas robóticas
        topK: 40,
        topP: 0.95
      }
    });

    return {
      text: response.text || "Opa, bora pedir um lanche?",
      functionCalls: response.functionCalls || null
    };
  } catch (error: any) {
    console.error("Gemini Mobile Connection Error:", error);
    // Retorno amigável em caso de queda de sinal no smartphone
    return { 
      text: "Minha chapa esfriou um pouco por causa do sinal! 🍟 Pode repetir o que você queria? Agora vai!", 
      functionCalls: null 
    };
  }
};
