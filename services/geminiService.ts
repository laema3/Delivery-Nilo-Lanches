
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { Product } from "../types.ts";

// Configuração segura da API Key
const getApiKey = () => {
  try {
    // @ts-ignore
    const env = import.meta.env;
    let key = env.VITE_API_KEY || env.API_KEY || "";
    
    // Sanitização para evitar erros se o usuário colou texto extra no .env
    key = key.trim();
    if (key.includes('\n')) key = key.split('\n')[0];
    if (key.includes(' ')) key = key.split(' ')[0];
    // Remove emojis ou avisos colados acidentalmente
    key = key.replace(/[^\w\-\_]/g, '');

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
      text: "⚠️ Configuração necessária: Adicione sua VITE_API_KEY no arquivo .env para ativar meu cérebro!", 
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
      text: "Ops! Tive um problema de comunicação com a cozinha. Pode repetir?", 
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
