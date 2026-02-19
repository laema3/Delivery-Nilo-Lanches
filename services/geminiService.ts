
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
  // Inicialização com a API KEY do ambiente para maior segurança e estabilidade
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || (import.meta as any).env.VITE_API_KEY });

  const productsMenu = allProducts.map(p => 
    `- ${p.name}: R$ ${p.price.toFixed(2)} | ${p.description}`
  ).join("\n");

  const systemInstruction = `
    Você é o 'Nilo', assistente oficial da Nilo Lanches em Uberaba-MG.
    - STATUS LOJA: ${isStoreOpen ? 'ABERTA' : 'FECHADA'}.
    - PRODUTOS DISPONÍVEIS: ${productsMenu}
    - TAXA DE ENTREGA: R$ ${currentDeliveryFee.toFixed(2)}
    
    Regras:
    1. Seja extremamente ágil e amigável. Use termos como "chapa", "lanche top", "bora comer".
    2. Se o cliente quer algo do menu, use addToCart imediatamente.
    3. Se o cliente quer fechar o pedido, use finalizeOrder.
    4. Mantenha as respostas curtas (máximo 2-3 frases) para facilitar leitura no celular.
  `;

  try {
    const formattedHistory: any[] = [];
    
    // REDUÇÃO AGRESSIVA DO HISTÓRICO: Mantemos apenas as últimas 4 mensagens para estabilidade em 4G/5G
    history.slice(-4).forEach(h => {
      const text = String(h.text || "").trim();
      if (text) {
        formattedHistory.push({
          role: h.role === 'model' ? 'model' : 'user',
          parts: [{ text }]
        });
      }
    });

    // O Gemini exige que a primeira mensagem do histórico seja do 'user' se ele existir
    if (formattedHistory.length > 0 && formattedHistory[0].role === 'model') {
      formattedHistory.shift();
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", // Modelo rápido ideal para smartphones
      contents: [...formattedHistory, { role: 'user', parts: [{ text: message }] }],
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: [addToCartFunction, finalizeOrderFunction] }],
        temperature: 0.6,
        topK: 32,
        topP: 0.9
      }
    });

    return {
      text: response.text || "Opa! No que posso te ajudar com o cardápio hoje?",
      functionCalls: response.functionCalls || null
    };
  } catch (error: any) {
    console.error("Gemini Error:", error);
    return { 
      text: "Minha conexão falhou por um momento devido ao sinal. 🍟 Pode tentar enviar de novo? Estou pronto pra anotar seu pedido!", 
      functionCalls: null 
    };
  }
};
