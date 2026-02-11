
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { Product } from "../types.ts";

// Configuração segura da API Key
const getApiKey = () => {
  let key = "";
  try {
    // @ts-ignore
    if (typeof import.meta !== "undefined" && import.meta.env) {
      // @ts-ignore
      key = import.meta.env.VITE_API_KEY || import.meta.env.API_KEY || "";
    }
  } catch (e) {}

  if (!key) {
    try {
      // @ts-ignore
      if (typeof process !== "undefined" && process.env) {
        // @ts-ignore
        key = process.env.VITE_API_KEY || process.env.API_KEY || "";
      }
    } catch (e) {}
  }

  // Fallback de segurança
  if (!key) key = "AIzaSyBpWUIlqFnUV6lWNUdLSUACYm21SuNKNYs";

  if (key) key = key.trim().replace(/^["']|["']$/g, "");
  return key;
};

const getAIClient = () => {
  const apiKey = getApiKey();
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

// Tool para Adicionar ao Carrinho
const addToCartTool: FunctionDeclaration = {
  name: "addToCart",
  description: "Adiciona itens ao carrinho. Use quando o cliente disser que quer algo do cardápio.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      productName: { type: Type.STRING, description: "Nome exato do produto conforme o cardápio." },
      quantity: { type: Type.NUMBER, description: "Quantidade (padrão 1)." },
      observation: { type: Type.STRING, description: "Observações (ex: sem cebola)." }
    },
    required: ["productName"]
  }
};

// Tool para Finalizar Pedido
const finalizeOrderTool: FunctionDeclaration = {
  name: "finalizeOrder",
  description: "Finaliza o pedido. Use apenas quando tiver nome, endereço (se entrega) e forma de pagamento.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      customerName: { type: Type.STRING, description: "Nome do cliente." },
      address: { type: Type.STRING, description: "Endereço completo (Rua, Nº, Bairro)." },
      paymentMethod: { type: Type.STRING, description: "Forma de pagamento escolhida." },
      isDelivery: { type: Type.BOOLEAN, description: "Verdadeiro para entrega, falso para retirada." }
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
  const ai = getAIClient();
  if (!ai) return { text: "⚠️ Erro de conexão com a IA.", functionCalls: null };

  try {
    const productsList = allProducts.map(p => `- ${p.name}: R$ ${p.price.toFixed(2)} (${p.description})`).join("\n");
    
    const systemInstruction = `
      Você é o 'Nilo', assistente virtual da Nilo Lanches. 
      
      HORÁRIO DE FUNCIONAMENTO: 18:30 às 23:50 todos os dias.
      STATUS ATUAL DA LOJA: ${isStoreOpen ? 'ABERTA' : 'FECHADA'}.
      TAXA DE ENTREGA PARA ESTE CLIENTE: R$ ${currentDeliveryFee.toFixed(2)}.
      
      REGRAS DE OURO:
      1. Se a loja estiver FECHADA: Você DEVE aceitar o pedido normalmente, mas AVISE que a produção e entrega só começarão às 18:30. Use frases como: "Vou agendar seu pedido aqui, assim que abrirmos às 18:30 ele será o primeiro a ser preparado!".
      2. Cardápio Oficial: Utilize APENAS os itens da lista abaixo. Se o cliente pedir algo fora disso, informe que não temos hoje.
      ${productsList}
      3. Cálculos de Valor:
         - Sempre some o valor unitário dos lanches pela quantidade.
         - Se for entrega, some explicitamente a taxa de R$ ${currentDeliveryFee.toFixed(2)}.
         - Informe o total parcial a cada item adicionado.
      4. Finalização: Ao usar 'finalizeOrder', o sistema gerará um link de WhatsApp. Informe ao cliente que o pedido será confirmado por lá.
      5. Seja muito prestativo, use gírias leves de lanchonete e emojis! 🍔🔥🥤
    `;

    const validHistory = history.map(h => ({
      role: h.role,
      parts: h.parts || [{ text: h.text }]
    }));

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", 
      contents: [...validHistory, { role: 'user', parts: [{ text: message }] }],
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: [addToCartTool, finalizeOrderTool] }],
        temperature: 0.7,
      }
    });

    return {
      text: response.text || "",
      functionCalls: response.functionCalls && response.functionCalls.length > 0 ? response.functionCalls : null
    };

  } catch (error) {
    console.error("Erro Chat IA:", error);
    return { text: "Tive um pequeno soluço técnico. Pode repetir o que deseja?", functionCalls: null };
  }
};

export const generateProductImage = async (productName: string) => {
  const ai = getAIClient();
  if (!ai) return null;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `High quality food photo of ${productName}, studio lighting, appetizing.` }] },
      config: { imageConfig: { aspectRatio: "1:1" } }
    });
    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData?.data) return `data:image/png;base64,${part.inlineData.data}`;
    }
    return null;
  } catch (e) { return null; }
};
