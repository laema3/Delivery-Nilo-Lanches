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
  // Prioriza VITE_API_KEY que é padrão do Vite, mas aceita API_KEY como fallback
  const key = env.VITE_API_KEY || env.API_KEY || "";
  
  // Validação básica para evitar chaves "lixo" ou vazias
  if (!key || key.includes(" ") || key.length < 20) return "";
  return key;
};

const getAIClient = () => {
  const apiKey = getApiKey();
  if (!apiKey) {
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
  
  // FALLBACK: Se não tiver chave configurada, usa respostas "dummy" inteligentes
  // Isso evita que o chat pare de funcionar completamente
  if (!ai) {
    const msg = message.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    if (msg.includes('ola') || msg.includes('oi') || msg.includes('bom dia') || msg.includes('boa noite') || msg.includes('tarde')) {
       return "Olá! Sou o assistente virtual do Nilo. Como posso te ajudar hoje? 🍔";
    }
    if (msg.includes('cardapio') || msg.includes('lanche') || msg.includes('preco') || msg.includes('fome') || msg.includes('menu')) {
       return "Dê uma olhada no nosso cardápio completo logo acima! Temos Hambúrgueres Artesanais deliciosos e Combos. Basta clicar no item para adicionar.";
    }
    if (msg.includes('horario') || msg.includes('aberto') || msg.includes('funcionamento') || msg.includes('abre')) {
       return "Estamos abertos de Segunda a Domingo, das 18:30 às 23:00 (exceto Terças-feiras, que é nosso descanso).";
    }
    if (msg.includes('endereco') || msg.includes('local') || msg.includes('onde fica') || msg.includes('fica onde')) {
       return "Estamos na Av. Lucas Borges, 317 - Fabrício, Uberaba - MG. Venha nos visitar ou peça delivery!";
    }
    if (msg.includes('entrega') || msg.includes('taxa') || msg.includes('delivery') || msg.includes('moto')) {
       return "Entregamos em toda Uberaba! A taxa é calculada automaticamente quando você coloca seu CEP no carrinho. É rapidinho!";
    }
    if (msg.includes('contato') || msg.includes('telefone') || msg.includes('zap') || msg.includes('whatsapp')) {
       return "Nosso WhatsApp para contato é (34) 9 9118-3728. Se precisar falar com um humano, chama lá!";
    }
    if (msg.includes('pagamento') || msg.includes('pix') || msg.includes('cartao')) {
      return "Aceitamos Pix, Cartão de Crédito/Débito e Dinheiro. Você escolhe a forma de pagamento na hora de finalizar o pedido.";
    }

    // Resposta genérica amigável em vez de erro técnico
    return "Humm, essa eu vou ficar te devendo! 😅 Mas olha, nosso X-Bacon é campeão de vendas. Que tal experimentar? Dê uma olhada no cardápio acima ou chame no WhatsApp se for algo muito específico!";
  }

  try {
    const productsList = allProducts.map(p => `${p.name}: R$ ${p.price}`).join("\n");
    const systemInstruction = `Você é o Nilo, assistente da Nilo Lanches. Cardápio:\n${productsList}\nSeja breve, divertido e muito educado. O objetivo é vender lanches.`;

    const validHistory = history.filter(h => h.role === 'user' || h.role === 'model');

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [...validHistory, { role: 'user', parts: [{ text: message }] }],
      config: { systemInstruction }
    });

    return extractTextOnly(response);
  } catch (error) {
    return "Desculpe, tive um pequeno engasgo na conexão. Pode repetir? 🍔";
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