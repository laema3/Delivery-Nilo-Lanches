
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
  currentDeliveryFee: number
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const productsList = allProducts.map(p => `- ${p.name}: R$ ${p.price.toFixed(2)} (${p.description})`).join("\n");
    
    const systemInstruction = `
      Você é o 'Nilo', o atendente virtual OFICIAL da Nilo Lanches. Você é preciso, focado em vendas e rigoroso com valores.

      REGRAS CRÍTICAS DE TAXA DE ENTREGA:
      1. VALOR REAL DA TAXA: O sistema informa que a taxa para este cliente é EXATAMENTE R$ ${currentDeliveryFee.toFixed(2)}.
      2. PROIBIÇÃO DE CORTESIA: Se o valor acima (R$ ${currentDeliveryFee.toFixed(2)}) for maior que zero, é TERMINANTEMENTE PROIBIDO dizer que a entrega é cortesia ou grátis. Você deve informar o valor de R$ ${currentDeliveryFee.toFixed(2)}.
      3. LOGICA DE ZERO: Se o valor for 0.00, verifique o contexto:
         - Se o cliente ainda NÃO informou o endereço ou não está logado: Diga "A taxa de entrega será calculada automaticamente assim que você informar seu endereço no fechamento".
         - Se o cliente JÁ informou o endereço e o valor retornado é 0.00: Aí sim você pode dizer que para esse endereço a entrega é por nossa conta.
      4. CÁLCULO TOTAL: Sempre some: (Valor dos Produtos) + (Taxa de R$ ${currentDeliveryFee.toFixed(2)}) = Total.

      REGRAS DE CARDÁPIO:
      - Use apenas os nomes oficiais:
      ${productsList}

      FINALIZAÇÃO:
      - Explique que o pedido será enviado para o WhatsApp oficial para confirmação humana.
      - A loja está ${isStoreOpen ? 'ABERTA' : 'FECHADA'}. Se fechada, avise que a produção inicia às 18:30.

      PERSONALIDADE: Amigável, usa emojis 🍔🍟, mas é um assistente de vendas sério com os números.
    `;

    const validHistory = history.map(h => ({
      role: h.role,
      parts: Array.isArray(h.parts) ? h.parts : [{ text: String(h.text || h.parts) }]
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", 
      contents: [...validHistory, { role: 'user', parts: [{ text: message }] }],
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: [addToCartTool, finalizeOrderTool] }],
        temperature: 0.1, // Temperatura baixíssima para evitar "criatividade" em valores
      }
    });

    return {
      text: response.text || "",
      functionCalls: response.functionCalls && response.functionCalls.length > 0 ? response.functionCalls : null
    };

  } catch (error) {
    console.error("Erro Chat IA:", error);
    return { text: "Tive um probleminha técnico nos cálculos. Pode repetir o que deseja?", functionCalls: null };
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
