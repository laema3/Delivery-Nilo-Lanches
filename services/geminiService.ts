import { GoogleGenAI, Type } from "@google/genai";
import { Product } from "../types.ts";

const getSafeEnv = () => {
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      return import.meta.env;
    }
  } catch (e) {
    return {};
  }
  return {};
};

const getApiKey = () => {
  const env = getSafeEnv();
  return env.API_KEY || env.VITE_API_KEY || "";
};

const getAIClient = () => {
  const apiKey = getApiKey();
  if (!apiKey || apiKey.includes("undefined")) {
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

const extractTextOnly = (response: any): string => {
  return response.text || "";
};

export const getAiRecommendation = async (cart: any[], allProducts: Product[]) => {
  const ai = getAIClient();
  if (!ai) return null;

  try {
    const cartDesc = cart.map(i => `${i.quantity}x ${i.name}`).join(", ");
    const productsList = allProducts.map(p => `${p.name} (R$ ${p.price})`).join(", ");
    
    const prompt = `Sugira um item do menu: [${productsList}] que combine com: [${cartDesc}]. Retorne JSON: { "suggestion": "Nome", "reasoning": "Motivo" }`;

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
  } catch (error) {
    console.error("AI Error:", error);
    return null;
  }
};

export const chatWithAssistant = async (message: string, history: any[], allProducts: Product[]) => {
  const ai = getAIClient();
  if (!ai) return "O ChatBot está offline no momento (API Key não configurada). Mas você pode fazer seu pedido normalmente pelo cardápio! 🍔";

  try {
    const productsList = allProducts.map(p => `${p.name}: R$ ${p.price}`).join("\n");
    const systemInstruction = `Você é o Nilo, assistente da Nilo Lanches. Cardápio:\n${productsList}\nSeja breve e amigável.`;

    const validHistory = history.filter(h => h.role === 'user' || h.role === 'model');

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [...validHistory, { role: 'user', parts: [{ text: message }] }],
      config: { systemInstruction }
    });

    return extractTextOnly(response);
  } catch (error) {
    return "Desculpe, tive um erro de conexão. Tente novamente!";
  }
};

export const generateProductImage = async (productName: string) => {
  const ai = getAIClient();
  if (!ai) return null;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `Foto profissional de ${productName}, fundo branco, alta qualidade.` }] },
      config: { imageConfig: { aspectRatio: "1:1" } }
    });

    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    return null;
  } catch (error) {
    return null;
  }
};