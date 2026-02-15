
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
    description: "Finaliza o pedido atual e prepara para envio via WhatsApp.",
    properties: {
      customerName: { type: Type.STRING },
      deliveryAddress: { type: Type.STRING, description: "Endereço completo de entrega." },
      paymentMethod: { type: Type.STRING, description: "Forma de pagamento escolhida." },
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

  // Lista de produtos formatada para a IA
  const productsMenu = allProducts.map(p => 
    `- ${p.name}: R$ ${p.price.toFixed(2)} | Descrição: ${p.description} | Categoria: ${p.category}`
  ).join("\n");

  const deliveryInfo = isLoggedIn 
    ? `O cliente está LOGADO. A taxa de entrega para o endereço dele é R$ ${currentDeliveryFee.toFixed(2)}.`
    : `O cliente NÃO está logado. Informe que a taxa de entrega será calculada após o login/cadastro (varia de R$ 5 a R$ 15 em Uberaba).`;

  const systemInstruction = `
    Você é o 'Nilo', assistente da Nilo Lanches em Uberaba-MG.
    
    HORÁRIO: 18:30 às 23:50 (Cozinha fecha às 23:50 em ponto!).
    STATUS ATUAL: ${isStoreOpen ? 'ABERTA' : 'FECHADA'}.
    
    MENU:
    ${productsMenu}

    ENTREGA:
    ${deliveryInfo}

    COMPORTAMENTO:
    1. Seja amigável e use emojis 🍔 Fries 🍟 Soda 🥤.
    2. Sempre use 'addToCart' se o cliente pedir comida.
    3. Use 'finalizeOrder' se ele estiver pronto para fechar.
    4. Se a loja estiver FECHADA, informe educadamente que voltamos às 18:30.
    5. Não invente produtos que não estão no menu.
  `;

  try {
    const validHistory = history.map(h => ({
      role: h.role === 'model' ? 'model' : 'user',
      parts: [{ text: h.text }]
    })).filter(h => h.parts[0].text.trim() !== "");

    // Turno inicial deve ser user
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
    console.error("Gemini Chat Error:", error);
    return { text: "Ops, tive um probleminha. Pode repetir? 🍔", functionCalls: null };
  }
};
