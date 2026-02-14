
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { Product } from "../types.ts";

// Tool para Adicionar ao Carrinho
const addToCartTool: FunctionDeclaration = {
  name: "addToCart",
  description: "Adiciona itens ao carrinho. Use sempre que o cliente quiser pedir algo do menu.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      productName: { type: Type.STRING, description: "Nome EXATO do produto conforme o cardápio oficial." },
      quantity: { type: Type.NUMBER, description: "Quantidade (padrão 1)." },
      observation: { type: Type.STRING, description: "Observações como 'sem cebola' ou 'ponto da carne'." }
    },
    required: ["productName"]
  }
};

// Tool para Finalizar Pedido
const finalizeOrderTool: FunctionDeclaration = {
  name: "finalizeOrder",
  description: "Finaliza o pedido e prepara para o envio ao WhatsApp.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      customerName: { type: Type.STRING, description: "Nome do cliente." },
      address: { type: Type.STRING, description: "Endereço completo (Rua, Número, Bairro)." },
      paymentMethod: { type: Type.STRING, description: "Forma de pagamento (Dinheiro, Pix, Cartão)." },
      isDelivery: { type: Type.BOOLEAN, description: "True para Entrega, False para Retirada no local." }
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

  try {
    const productsList = allProducts.map(p => `- ${p.name}: R$ ${p.price.toFixed(2)} (${p.description})`).join("\n");
    
    let deliveryStatusInstruction = "";
    if (isLoggedIn) {
      if (currentDeliveryFee > 0) {
        deliveryStatusInstruction = `O cliente está LOGADO e a taxa para o endereço dele é EXATAMENTE R$ ${currentDeliveryFee.toFixed(2)}. Você DEVE cobrar este valor.`;
      } else {
        deliveryStatusInstruction = `O cliente está LOGADO e a taxa é R$ 0,00 (Grátis para este endereço).`;
      }
    } else {
      deliveryStatusInstruction = `O cliente NÃO está logado. Mesmo que o sistema mostre R$ 0,00, você NÃO PODE dizer que a entrega é grátis. Você DEVE dizer: "A taxa de entrega será calculada automaticamente assim que você entrar na sua conta e confirmar seu endereço".`;
    }

    const systemInstruction = `
      Você é o 'Nilo', o atendente virtual OFICIAL da Nilo Lanches. Você é preciso, focado em vendas e rigoroso com valores.

      REGRAS CRÍTICAS DE TAXA DE ENTREGA:
      1. STATUS ATUAL: ${deliveryStatusInstruction}
      2. Se o cliente perguntar a taxa e não estiver logado, peça para ele fazer login ou diga que o sistema calcula no final. NUNCA prometa frete grátis se ele não estiver logado.

      REGRAS DE CARDÁPIO:
      - Use apenas os nomes oficiais:
      ${productsList}

      FINALIZAÇÃO:
      - Explique que o pedido será enviado para o WhatsApp oficial para confirmação humana.
      - A loja está ${isStoreOpen ? 'ABERTA' : 'FECHADA'}.

      PERSONALIDADE: Amigável, usa emojis 🍔🍟, mas é um assistente sério com os números.
    `;

    // Filtra histórico: Gemini EXIGE que comece com 'user' e alterne papéis.
    let validHistory = history.map(h => ({
      role: h.role === 'model' ? 'model' : 'user',
      parts: Array.isArray(h.parts) ? h.parts : [{ text: String(h.text || h.parts) }]
    }));

    // Remove mensagens iniciais do 'model' pois o chat deve começar com 'user'
    while (validHistory.length > 0 && validHistory[0].role === 'model') {
      validHistory.shift();
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", 
      contents: [...validHistory, { role: 'user', parts: [{ text: message }] }],
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: [addToCartTool, finalizeOrderTool] }],
        temperature: 0.2, 
      }
    });

    return {
      text: response.text || "",
      functionCalls: response.functionCalls && response.functionCalls.length > 0 ? response.functionCalls : null
    };

  } catch (error) {
    console.error("Erro Chat IA:", error);
    return { text: "Tive um probleminha técnico. Pode repetir o que deseja?", functionCalls: null };
  }
};

export const generateProductImage = async (productName: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `High quality food photo of ${productName}, delicious burger style, professional lighting.` }] },
      config: { imageConfig: { aspectRatio: "1:1" } }
    });
    const candidates = response.candidates || [];
    if (candidates.length > 0) {
      for (const part of candidates[0].content.parts) {
        if (part.inlineData?.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    return null;
  } catch (e) { return null; }
};
