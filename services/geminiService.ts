
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
        description: "Observações opcionais (ex: sem cebola, mal passado)." 
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
      paymentMethod: { type: Type.STRING, description: "Forma de pagamento escolhida pelo cliente." },
      isDelivery: { type: Type.BOOLEAN, description: "True para entrega, False para retirada no balcão." }
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

  // Regras de negócio dinâmicas
  const deliveryInfo = isLoggedIn 
    ? `O cliente está LOGADO. A taxa de entrega para o endereço dele é R$ ${currentDeliveryFee.toFixed(2)}.`
    : `O cliente NÃO está logado. Informe que a taxa de entrega será calculada após o login/cadastro.`;

  const systemInstruction = `
    Você é o 'Nilo', o atendente virtual da Nilo Lanches em Uberaba-MG.
    
    HORÁRIO DE ATENDIMENTO: Todos os dias, das 18:30 às 23:50.
    STATUS ATUAL DA LOJA: ${isStoreOpen ? 'ABERTA (Pode aceitar pedidos)' : 'FECHADA (Apenas informações, não finalize pedidos)'}.
    
    MENU DISPONÍVEL:
    ${productsMenu}

    REGRAS DE FRETE:
    ${deliveryInfo}

    DIRETRIZES DE COMPORTAMENTO:
    1. Seja amigável, use emojis (🍔, 🍟, 🥤) e fale de forma ágil.
    2. Se o cliente quiser algo do menu, use a ferramenta 'addToCart'.
    3. Se o cliente estiver pronto para fechar, use 'finalizeOrder'.
    4. Nunca prometa frete grátis se não estiver confirmado no sistema.
    5. Se a loja estiver fechada, informe educadamente mas não processe o carrinho.
  `;

  try {
    // Tratamento de histórico para o Gemini (User -> Model -> User)
    const validHistory = history.map(h => ({
      role: h.role === 'model' ? 'model' : 'user',
      parts: [{ text: h.text }]
    })).filter(h => h.parts[0].text.trim() !== "");

    // Garante que o primeiro turno seja sempre do usuário
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
    return { text: "Ops, tive um engasgo aqui. Pode repetir?", functionCalls: null };
  }
};

export const generateProductImage = async (productName: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `Professional food photography of ${productName}, studio lighting, appetizing burger style, 4k.` }] },
      config: { imageConfig: { aspectRatio: "1:1" } }
    });
    
    // Procura a parte da imagem na resposta
    const candidates = response.candidates || [];
    if (candidates.length > 0) {
      for (const part of candidates[0].content.parts) {
        if (part.inlineData?.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    return null;
  } catch (e) {
    return null;
  }
};
