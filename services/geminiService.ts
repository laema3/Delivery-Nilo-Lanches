
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
      isDelivery: { type: Type.BOOLEAN, description: "True para entrega, False para retirada." }
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
    `- ${p.name}: R$ ${p.price.toFixed(2)} (${p.description})`
  ).join("\n");

  const deliveryInfo = isLoggedIn 
    ? `O cliente está LOGADO. A taxa de entrega confirmada é R$ ${currentDeliveryFee.toFixed(2)}.`
    : `O cliente NÃO está logado. Informe que a taxa em Uberaba varia de R$ 5,00 a R$ 15,00 e será calculada no login.`;

  const systemInstruction = `
    Você é o 'Nilo', assistente virtual da Nilo Lanches (Uberaba-MG).
    
    REGRAS DE OURO:
    1. HORÁRIO: 18:30 às 23:50. Fora disso, diga que voltamos amanhã às 18:30.
    2. STATUS: A loja está ${isStoreOpen ? 'ABERTA' : 'FECHADA agora'}.
    3. CARDÁPIO: ${productsMenu}
    4. FRETE: ${deliveryInfo}
    5. PERSONALIDADE: Amigável, ágil e usa emojis (🍔🍟🥤).
    
    AÇÕES:
    - Se o cliente escolher um lanche, use 'addToCart'.
    - Se ele quiser fechar a conta, use 'finalizeOrder'.
    - Sempre confirme se ele quer adicionar batata ou refri.
    - Se a loja estiver fechada, não use tools de pedido, apenas converse.
  `;

  try {
    const validHistory = history.map(h => ({
      role: h.role === 'model' ? 'model' : 'user',
      parts: [{ text: h.text }]
    })).filter(h => h.parts[0].text.trim() !== "");

    if (validHistory.length > 0 && validHistory[0].role === 'model') {
      validHistory.shift();
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [...validHistory, { role: 'user', parts: [{ text: message }] }],
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: [addToCartFunction, finalizeOrderFunction] }],
        temperature: 0.3,
      }
    });

    return {
      text: response.text || "",
      functionCalls: response.functionCalls || null
    };
  } catch (error) {
    console.error("Gemini Error:", error);
    return { text: "Foi mal, meu sistema deu um soluço! Pode repetir? 🍔", functionCalls: null };
  }
};
