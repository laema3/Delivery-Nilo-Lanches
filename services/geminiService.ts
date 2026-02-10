
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { Product } from "../types.ts";

// Configuração segura da API Key
const getApiKey = () => {
  let key = "";
  
  try {
    // 1. Tenta via import.meta.env (Padrão Vite)
    // @ts-ignore
    if (typeof import.meta !== "undefined" && import.meta.env) {
      // @ts-ignore
      key = import.meta.env.VITE_API_KEY || import.meta.env.API_KEY || "";
    }
  } catch (e) {
    console.warn("GeminiService: Erro ao ler import.meta.env", e);
  }

  // 2. Tenta via process.env (Compatibilidade)
  if (!key) {
    try {
      // @ts-ignore
      if (typeof process !== "undefined" && process.env) {
        // @ts-ignore
        key = process.env.VITE_API_KEY || process.env.API_KEY || "";
      }
    } catch (e) {}
  }

  // 3. Fallback de Segurança (Baseado no .env fornecido)
  // Útil se o servidor de desenvolvimento não recarregou as variáveis de ambiente ainda
  if (!key) {
    key = "AIzaSyBpWUIlqFnUV6lWNUdLSUACYm21SuNKNYs";
  }

  // Limpeza final
  if (key) {
    key = key.trim();
    // Remove aspas simples ou duplas que podem ter vindo do .env
    key = key.replace(/^["']|["']$/g, "");
  }

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

// Definição da Ferramenta (Tool) usando o enum Type correto
const addToCartTool: FunctionDeclaration = {
  name: "addToCart",
  description: "Adiciona itens ao carrinho. Use SEMPRE que o usuário demonstrar intenção clara de pedir algo específico.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      productName: {
        type: Type.STRING,
        description: "Nome do produto ou termo de busca para identificar o item."
      },
      quantity: {
        type: Type.NUMBER,
        description: "Quantidade do item. Se não especificado, assuma 1."
      },
      observation: {
        type: Type.STRING,
        description: "Observações extras (ex: sem cebola, ponto da carne), se houver."
      }
    },
    required: ["productName"]
  }
};

export const chatWithAssistant = async (message: string, history: any[], allProducts: Product[]) => {
  const ai = getAIClient();
  
  if (!ai) {
    return { 
      text: "⚠️ Configuração necessária: A chave de API não foi detectada. Verifique o console para mais detalhes.", 
      functionCalls: null 
    };
  }

  try {
    // Cria um resumo do cardápio para contexto
    const productsList = allProducts.map(p => `- ${p.name} (R$ ${p.price.toFixed(2)}) | ${p.category}`).join("\n");
    
    const systemInstruction = `
      Você é o Nilo, atendente virtual da 'Nilo Lanches'.
      
      SUA MISSÃO:
      Atender clientes com agilidade e simpatia, tirar dúvidas do cardápio e ADICIONAR ITENS AO CARRINHO.
      
      PERSONALIDADE:
      - Gente boa, usa gírias leves ("Meu patrão", "Chefia", "Bora").
      - Objetivo e vendedor.
      
      FERRAMENTA 'addToCart':
      - Se o cliente disser "quero um X-Tudo", "manda 2 coquinhas", "vou querer o combo", NÃO PERGUNTE SE PODE ADICIONAR.
      - CHAME A TOOL 'addToCart' IMEDIATAMENTE.
      - Apenas confirme no texto: "Beleza, já coloquei no carrinho!".
      
      CARDÁPIO ATUAL:
      ${productsList}
    `;

    // Filtra histórico para garantir formato correto
    const validHistory = history.map(h => ({
      role: h.role,
      parts: h.parts || [{ text: h.text }]
    }));

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", 
      contents: [...validHistory, { role: 'user', parts: [{ text: message }] }],
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: [addToCartTool] }],
        temperature: 0.7,
      }
    });

    // Acessa o texto de resposta
    const modelText = response.text || "";
    
    // Acessa as chamadas de função (Tools) usando a propriedade direta do SDK
    const functionCalls = response.functionCalls;

    return {
      text: modelText,
      functionCalls: functionCalls && functionCalls.length > 0 ? functionCalls : null
    };

  } catch (error) {
    console.error("Erro no Chat Gemini:", error);
    return { 
      text: "Ops! Tive um problema de comunicação com a cozinha (Erro na API). Tente novamente em alguns instantes.", 
      functionCalls: null 
    };
  }
};

export const generateProductImage = async (productName: string) => {
  const ai = getAIClient();
  if (!ai) return null;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `Delicious food photography of ${productName}, professional lighting, centered, white background.` }] },
      config: { imageConfig: { aspectRatio: "1:1" } }
    });
    
    // Itera para encontrar a parte da imagem
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    return null;
  } catch (e) { return null; }
};
