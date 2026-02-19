
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
  // Garantir inicialização limpa a cada chamada para evitar stale key em redes móveis
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const productsMenu = allProducts.map(p => 
    `- ${p.name}: R$ ${p.price.toFixed(2)} | ${p.description}`
  ).join("\n");

  const systemInstruction = `
    Você é o 'Nilo', assistente da Nilo Lanches em Uberaba-MG.
    - STATUS LOJA: ${isStoreOpen ? 'ABERTA' : 'FECHADA'}.
    - PRODUTOS DISPONÍVEIS: ${productsMenu}
    - TAXA DE ENTREGA: R$ ${currentDeliveryFee.toFixed(2)}
    
    Diretrizes:
    1. Seja amigável, rápido e use gírias leves de lanchonete.
    2. Se o cliente escolher um lanche, use addToCart.
    3. Se o cliente quiser fechar a conta, use finalizeOrder.
    4. Mantenha as respostas curtas e focadas em converter a venda.
  `;

  try {
    const formattedHistory: any[] = [];
    
    // Filtragem agressiva do histórico para evitar estouro de tokens ou formatação inválida no mobile
    history.slice(-6).forEach(h => {
      const text = String(h.text || "").trim();
      if (text) {
        formattedHistory.push({
          role: h.role === 'model' ? 'model' : 'user',
          parts: [{ text }]
        });
      }
    });

    // O Gemini exige que se houver histórico, ele comece obrigatoriamente com o papel 'user'
    if (formattedHistory.length > 0 && formattedHistory[0].role === 'model') {
      formattedHistory.shift();
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", // Modelo leve ideal para conexões instáveis
      contents: [...formattedHistory, { role: 'user', parts: [{ text: message }] }],
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: [addToCartFunction, finalizeOrderFunction] }],
        temperature: 0.7, // Um pouco mais criativo e humano
        topK: 40,
        topP: 0.95
      }
    });

    return {
      text: response.text || "Estou aqui! O que deseja pedir hoje?",
      functionCalls: response.functionCalls || null
    };
  } catch (error: any) {
    console.error("Gemini Assistant Critical Error:", error);
    // Erros 400 no Gemini geralmente indicam histórico mal formado ou bloqueio de segurança
    return { 
      text: "Opa, deu um estalo aqui na chapa! 🍳 Pode repetir o que você disse? Estou pronto pra anotar seu pedido.", 
      functionCalls: null 
    };
  }
};
