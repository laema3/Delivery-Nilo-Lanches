
import { GoogleGenAI, Type } from "@google/genai";
import { Product } from "../types.ts";

export const getAiRecommendation = async (cart: any[], allProducts: Product[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const cartDesc = cart.map(i => `${i.quantity}x ${i.name}`).join(", ");
  const productsList = allProducts.map(p => `${p.name} (R$ ${p.price})`).join(", ");
  
  const prompt = `O usuário tem no carrinho: [${cartDesc}]. 
  Com base no nosso menu: [${productsList}], sugira UM item que combine bem com o que ele já escolheu. 
  Responda estritamente em JSON com os campos 'suggestion' (nome do produto) e 'reasoning' (por que combina).`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestion: { 
              type: Type.STRING,
              description: 'O nome do produto sugerido pelo assistente.'
            },
            reasoning: { 
              type: Type.STRING,
              description: 'O motivo da sugestão baseada nos itens do carrinho.'
            }
          },
          propertyOrdering: ["suggestion", "reasoning"]
        }
      }
    });
    
    // Extrai apenas as partes de texto para evitar o aviso de 'thoughtSignature'
    const text = response.candidates?.[0]?.content?.parts
      ?.filter(part => part.text)
      ?.map(part => part.text)
      ?.join('') || "";

    return text ? JSON.parse(text) : null;
  } catch (error) {
    console.error("Erro na recomendação AI:", error);
    return null;
  }
};

export const chatWithAssistant = async (message: string, history: any[], allProducts: Product[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const productsList = allProducts.map(p => `${p.name}: R$ ${p.price} (${p.description})`).join("\n");
  
  const systemInstruction = `
    Você é o "Nilo", o assistente virtual da Nilo Lanches em Uberaba-MG.
    Seja curto, amigável e use emojis. Foque no cardápio:
    ${productsList}
  `;

  // A API do Gemini exige que o histórico comece com uma mensagem de 'user'.
  const validHistory = history.filter(h => h.role === 'user' || h.role === 'model');
  if (validHistory.length > 0 && validHistory[0].role === 'model') {
    validHistory.shift();
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [...validHistory, { role: 'user', parts: [{ text: message }] }],
      config: {
        systemInstruction,
        temperature: 0.7
      }
    });

    // Extrai apenas as partes de texto para evitar o aviso de 'thoughtSignature'
    const text = response.candidates?.[0]?.content?.parts
      ?.filter(part => part.text)
      ?.map(part => part.text)
      ?.join('') || "";

    return text || "Ops, tive um probleminha. Pode repetir? 🍔";
  } catch (error) {
    console.error("Erro no chat AI:", error);
    return "Ops, tive um probleminha. Pode repetir? 🍔";
  }
};

export const generateProductImage = async (productName: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Professional food photography of a ${productName}, studio lighting, appetizing, high resolution, white background.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: { aspectRatio: "1:1" }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Erro ao gerar imagem:", error);
    return null;
  }
};
