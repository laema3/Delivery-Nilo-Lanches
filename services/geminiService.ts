
import { GoogleGenAI, Type } from "@google/genai";
import { Product } from "../types.ts";

// Função simplificada e segura para pegar a chave
const getApiKey = () => {
  try {
    let rawKey = "";
    
    // Acesso seguro ao ambiente Vite
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      const env = import.meta.env;
      rawKey = env.VITE_API_KEY || env.API_KEY || "";
    }

    if (!rawKey) return "";

    // 1. Tenta extrair a chave EXATA usando padrão do Google (AIza + 35 chars)
    // Isso resolve o problema de textos colados junto com a chave (ex: "AIza...eu só colei...")
    const googleKeyPattern = /AIza[0-9A-Za-z\-_]{35}/;
    const match = rawKey.match(googleKeyPattern);
    
    if (match) {
      return match[0];
    }

    // 2. Fallback: Limpeza manual se o regex falhar
    let clean = rawKey.trim();
    if (clean.includes(' ')) clean = clean.split(' ')[0]; // Pega só a primeira palavra
    if (clean.includes('\n')) clean = clean.split('\n')[0];

    // Validação básica de segurança
    if (clean.length > 20 && !clean.includes('?') && !clean.includes('Olá')) {
      return clean;
    }
  } catch (e) {
    console.error("Erro ao ler API Key:", e);
  }
  return "";
};

const getAIClient = () => {
  const apiKey = getApiKey();
  if (!apiKey) {
    // Retorna null silenciosamente para não quebrar a app, o chat tratará isso
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

const extractTextOnly = (response: any): string => {
  return response.text || "";
};

export const chatWithAssistant = async (message: string, history: any[], allProducts: Product[]) => {
  const ai = getAIClient();
  
  if (!ai) {
    return "Olá! 🤖 Para conversar comigo, o dono do site precisa verificar a configuração da Chave de API (Gemini Key).";
  }

  try {
    const productsList = allProducts.map(p => `${p.name}: R$ ${p.price} - ${p.description}`).join("\n");
    const systemInstruction = `
      Você é o "Nilo", o assistente virtual gente fina da Nilo Lanches.
      Seu objetivo é ser um vendedor consultivo e amigável.
      
      REGRAS DE OURO:
      1. Use gírias leves de lanchonete (ex: "Fala mestre", "Caprichado", "Mata a fome").
      2. Se o cliente estiver em dúvida, sugira o "X-Bacon Artesanal" ou o "Combo Casal".
      3. Incentive o cliente a adicionar itens ao carrinho clicando no botão (+) verde do cardápio.
      4. Sempre pergunte: "Vai querer uma Coca geladinha para acompanhar?" ou "Aceita um adicional de Bacon?".
      5. Se ele perguntar sobre o pedido, explique que após adicionar ao carrinho, ele deve clicar no ícone da sacola e preencher os dados.
      
      CARDÁPIO ATUAL:
      ${productsList}
      
      Seja breve, direto e foque em converter a conversa em um pedido.
    `;

    const validHistory = history.filter(h => h.role === 'user' || h.role === 'model');

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [...validHistory, { role: 'user', parts: [{ text: message }] }],
      config: { systemInstruction }
    });

    return extractTextOnly(response);
  } catch (error) {
    console.error("Erro no Chat Gemini:", error);
    return "Ops! Tive um problema de conexão com minha inteligência. Pode repetir?";
  }
};

export const getAiRecommendation = async (cart: any[], allProducts: Product[]) => {
  const ai = getAIClient();
  if (!ai) return null;
  try {
    const cartDesc = cart.map(i => `${i.quantity}x ${i.name}`).join(", ");
    const productsList = allProducts.map(p => `${p.name} (R$ ${p.price})`).join(", ");
    const prompt = `Com base no carrinho [${cartDesc}], sugira um acompanhamento ou lanche do menu [${productsList}]. Retorne JSON: { "suggestion": "Nome", "reasoning": "Motivo" }`;
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestion: { type: Type.STRING },
            reasoning: { type: Type.STRING }
          }
        }
      }
    });
    const text = extractTextOnly(response);
    return text ? JSON.parse(text) : null;
  } catch (e) { return null; }
};

export const generateProductImage = async (productName: string) => {
  const ai = getAIClient();
  if (!ai) return null;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `Professional food photography of ${productName}, delicious burger, studio lighting, white background, high quality.` }] },
      config: { imageConfig: { aspectRatio: "1:1" } }
    });
    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    return null;
  } catch (e) { return null; }
};
