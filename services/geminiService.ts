
import { GoogleGenAI, FunctionDeclaration, SchemaType } from "@google/genai";
import { Product } from "../types.ts";

// Configuração segura da API Key
const getApiKey = () => {
  try {
    // @ts-ignore
    const env = import.meta.env;
    let key = env.VITE_API_KEY || env.API_KEY || "";
    
    // Limpeza básica caso tenha sido copiado com espaços ou quebras de linha
    key = key.trim();
    if (key.includes('\n')) key = key.split('\n')[0];
    if (key.includes(' ')) key = key.split(' ')[0];

    return key;
  } catch (e) {
    console.error("Erro ao ler API Key:", e);
    return "";
  }
};

const getAIClient = () => {
  const apiKey = getApiKey();
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

// Definição da Ferramenta de Adicionar ao Carrinho
const addToCartTool: FunctionDeclaration = {
  name: "addToCart",
  description: "Adiciona um item do cardápio ao carrinho de compras do cliente. Use isso quando o cliente confirmar que quer pedir algo.",
  parameters: {
    type: "OBJECT" as SchemaType,
    properties: {
      productName: {
        type: "STRING" as SchemaType,
        description: "O nome exato ou aproximado do produto que o cliente quer."
      },
      quantity: {
        type: "NUMBER" as SchemaType,
        description: "A quantidade desejada. Padrão é 1."
      },
      observation: {
        type: "STRING" as SchemaType,
        description: "Observação sobre o item (ex: sem cebola), se houver."
      }
    },
    required: ["productName"]
  }
};

export const chatWithAssistant = async (message: string, history: any[], allProducts: Product[]) => {
  const ai = getAIClient();
  
  if (!ai) {
    return { 
      text: "⚠️ Configuração necessária: Adicione sua VITE_API_KEY no arquivo .env para ativar meu cérebro!", 
      toolCalls: null 
    };
  }

  try {
    // Cria um contexto rico com o cardápio atualizado
    const productsList = allProducts.map(p => `- ${p.name} (R$ ${p.price.toFixed(2)}): ${p.description}`).join("\n");
    
    const systemInstruction = `
      Você é o Nilo, o assistente virtual gente fina da hamburgueria Nilo Lanches.
      
      SUA PERSONALIDADE:
      - Amigável, usa gírias leves ("Mestre", "Meu chapa", "Bora pedir").
      - Vendedor nato: Sempre sugira uma bebida ou batata para acompanhar.
      - Objetivo: Fazer o cliente fechar o pedido.

      SEUS SUPER PODERES (TOOLS):
      - Você tem a ferramenta 'addToCart'.
      - QUANDO USAR: Se o cliente disser "quero um X-Bacon", "me vê dois coca", "adiciona o combo", USE A FERRAMENTA IMEDIATAMENTE.
      - Não pergunte "posso adicionar?". Se a intenção for clara, adicione e avise: "Já coloquei no carrinho, chefia!".
      
      CARDÁPIO ATUALIZADO:
      ${productsList}

      REGRAS:
      1. Se o cliente pedir algo que não está na lista, peça desculpas e sugira algo parecido.
      2. Se for adicionar ao carrinho, chame a tool e responda no texto algo como "Beleza, adicionando [produto]...".
    `;

    // Filtra histórico para garantir formato correto
    const validHistory = history.map(h => ({
      role: h.role,
      parts: h.parts || [{ text: h.text }]
    }));

    const model = ai.models;

    const response = await model.generateContent({
      model: "gemini-2.5-flash", // Modelo rápido e bom com tools
      contents: [...validHistory, { role: 'user', parts: [{ text: message }] }],
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: [addToCartTool] }],
        temperature: 0.7
      }
    });

    // Processamento da resposta
    const candidate = response.candidates?.[0];
    const modelText = candidate?.content?.parts?.find(p => p.text)?.text || "";
    
    // Extração de chamadas de função (Tools)
    const functionCalls = candidate?.content?.parts
      ?.filter(p => p.functionCall)
      .map(p => p.functionCall) || [];

    return {
      text: modelText,
      toolCalls: functionCalls.length > 0 ? functionCalls : null
    };

  } catch (error) {
    console.error("Erro no Chat Gemini:", error);
    return { 
      text: "Ops! Tive um problema de conexão com a cozinha (Erro na IA). Tente novamente.", 
      toolCalls: null 
    };
  }
};

// Mantém a função de gerar imagem funcionando
export const generateProductImage = async (productName: string) => {
  const ai = getAIClient();
  if (!ai) return null;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image', // Modelo otimizado para imagens
      contents: { parts: [{ text: `Professional food photography of ${productName}, delicious burger, studio lighting, white background, high quality.` }] },
      config: { imageConfig: { aspectRatio: "1:1" } }
    });
    
    // Maneira segura de pegar a imagem
    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (e) { return null; }
};
