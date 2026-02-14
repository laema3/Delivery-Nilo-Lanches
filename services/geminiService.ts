
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
    ? `O cliente está LOGADO. A taxa de entrega para o endereço dele é EXATAMENTE R$ ${currentDeliveryFee.toFixed(2)}.`
    : `O cliente NÃO está logado. Informe que a taxa de entrega varia entre R$ 5,00 e R$ 15,00 em Uberaba e será calculada após ele entrar/cadastrar.`;

  const systemInstruction = `
    Você é o 'Nilo', o atendente virtual da Nilo Lanches em Uberaba-MG.
    
    HORÁRIO DE FUNCIONAMENTO: Todos os dias, das 18:30 às 23:50. Fora desse horário a cozinha está fechada.
    STATUS ATUAL DA LOJA NO SISTEMA: ${isStoreOpen ? 'ABERTA (Recebendo pedidos!)' : 'FECHADA (Apenas tirando dúvidas, sem pedidos agora)'}.
    
    CARDÁPIO ATUALIZADO:
    ${productsMenu}

    POLÍTICA DE ENTREGAS:
    ${deliveryInfo}

    DIRETRIZES DE ATENDIMENTO:
    1. Seja extremamente amigável e use gírias leves de lanchonete (🍔, 🍟, 🥤, "bora comer?").
    2. Sempre tente vender um acompanhamento (batata ou refri).
    3. Quando o cliente escolher um lanche, use a ferramenta 'addToCart'.
    4. Quando ele estiver pronto para finalizar, use 'finalizeOrder'.
    5. Se a loja estiver fechada ou passar das 23:50, diga que voltamos amanhã às 18:30.
    6. Seja conciso: não responda com textos gigantescos.
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
    console.error("Gemini Chat Error:", error);
    return { text: "Foi mal, deu um erro aqui no meu sistema. Pode perguntar de novo? 🍔", functionCalls: null };
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
