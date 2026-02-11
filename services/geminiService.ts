
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

  // Fallback de segurança (sua chave)
  if (!key) key = "AIzaSyBpWUIlqFnUV6lWNUdLSUACYm21SuNKNYs";

  if (key) key = key.trim().replace(/^["']|["']$/g, "");
  return key;
};

const getAIClient = () => {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error("GeminiService: API Key não encontrada!");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

// 1. Tool para Adicionar ao Carrinho
const addToCartTool: FunctionDeclaration = {
  name: "addToCart",
  description: "Adiciona itens ao carrinho. Use quando o cliente disser 'quero X', 'me vê Y', 'adiciona Z'.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      productName: { type: Type.STRING, description: "Nome do produto ou termo de busca." },
      quantity: { type: Type.NUMBER, description: "Quantidade. Padrão 1." },
      observation: { type: Type.STRING, description: "Obs: sem cebola, ponto da carne, etc." }
    },
    required: ["productName"]
  }
};

// 2. Tool para Finalizar Pedido (WhatsApp)
const finalizeOrderTool: FunctionDeclaration = {
  name: "finalizeOrder",
  description: "Finaliza o pedido e envia para o WhatsApp. Use quando o cliente disser 'fechar conta', 'enviar pedido', 'acabei', 'quanto deu'. OBRIGATÓRIO ter endereço e forma de pagamento antes de chamar.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      customerName: { type: Type.STRING, description: "Nome do cliente." },
      address: { type: Type.STRING, description: "Endereço completo de entrega (Rua, Número, Bairro)." },
      paymentMethod: { type: Type.STRING, description: "Forma de pagamento (Pix, Dinheiro, Cartão)." },
      isDelivery: { type: Type.BOOLEAN, description: "True se for entrega, False se for retirada." }
    },
    required: ["customerName", "paymentMethod"]
  }
};

export const chatWithAssistant = async (message: string, history: any[], allProducts: Product[]) => {
  const ai = getAIClient();
  
  if (!ai) {
    return { 
      text: "⚠️ Erro de API Key. Verifique as configurações.", 
      functionCalls: null 
    };
  }

  try {
    const productsList = allProducts.map(p => `- ${p.name} (R$ ${p.price.toFixed(2)})`).join("\n");
    
    const systemInstruction = `
      Você é o assistente virtual da 'Nilo Lanches'.
      
      SEU PROCESSO DE ATENDIMENTO:
      1. Receba pedidos e use a tool 'addToCart' para colocar no carrinho.
      2. Se o cliente pedir para fechar a conta ou perguntar o total, VOCÊ DEVE PERGUNTAR OS DADOS PRIMEIRO.
      
      PARA FINALIZAR O PEDIDO (REGRA DE OURO):
      NUNCA chame 'finalizeOrder' sem antes saber:
      - O nome do cliente.
      - Se é Entrega ou Retirada.
      - O endereço (se for entrega).
      - A forma de pagamento (Pix, Cartão, Dinheiro).

      Se faltar algo, PERGUNTE de forma educada: "Para finalizar, por favor, informe seu nome, endereço completo e a forma de pagamento."

      Só depois de ter esses dados, chame a tool 'finalizeOrder'.
      
      Personalidade: Profissional, educado, eficiente e prestativo.
      Tom de voz: Use um tom cordial e acolhedor, mas mantenha o respeito. Evite gírias excessivas ou intimidade forçada (não use 'chefia', 'patrão', etc). Use emojis moderadamente para manter a simpatia.
      Cardápio:
      ${productsList}
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
        temperature: 0.5,
      }
    });

    const modelText = response.text || "";
    const functionCalls = response.functionCalls;

    return {
      text: modelText,
      functionCalls: functionCalls && functionCalls.length > 0 ? functionCalls : null
    };

  } catch (error) {
    console.error("Erro Chat:", error);
    return { text: "Desculpe, tive um problema técnico momentâneo. Poderia repetir?", functionCalls: null };
  }
};

export const generateProductImage = async (productName: string) => {
  // Mantido igual (código de imagem omitido para brevidade, já que não mudou)
  const ai = getAIClient();
  if (!ai) return null;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `Delicious food photography of ${productName}, white background.` }] },
      config: { imageConfig: { aspectRatio: "1:1" } }
    });
    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData?.data) return `data:image/png;base64,${part.inlineData.data}`;
    }
    return null;
  } catch (e) { return null; }
};
