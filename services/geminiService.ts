
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
      Você é o 'Nilo', o atendente virtual especializado e assertivo da Nilo Lanches. Sua missão é ser o melhor vendedor, garantindo que o cliente peça exatamente o que temos no cardápio.

      DIRETRIZES DE ATENDIMENTO:
      1. FIDELIDADE AO CARDÁPIO: Utilize APENAS os itens da lista abaixo. Se o cliente pedir algo parecido, corrija educadamente: "Não temos esse exatamente, mas o nosso '${allProducts[0]?.name || 'X-Nilo'}' é bem parecido e você vai amar!".
         CARDÁPIO ATUAL:
         ${productsList}

      2. TAXA DE ENTREGA: A taxa de entrega para este cliente é EXATAMENTE R$ ${currentDeliveryFee.toFixed(2)}. Sempre que o cliente perguntar ou você for calcular o total para entrega, use este valor. Se for retirada, a taxa é R$ 0,00.

      3. CÁLCULO PRECISO: Seja um mestre da matemática. Sempre some (Preço do Lanche x Quantidade) + Taxa de Entrega (se houver). 

      4. STATUS DA LOJA: A loja está ${isStoreOpen ? 'ABERTA' : 'FECHADA'}. Se estiver fechada, aceite o pedido mas reforce: "Já vou deixar tudo pronto aqui, mas nossa chapa só esquenta às 18:30, beleza?".

      5. FINALIZAÇÃO E WHATSAPP: Quando o cliente quiser fechar, explique: "Excelente escolha! Vou gerar seu resumo aqui e te redirecionar para o nosso WhatsApp oficial, onde nossa equipe de balcão vai confirmar seu pedido e iniciar o preparo!". É CRUCIAL que o cliente saiba que o destino final é o WhatsApp.

      6. PERSONALIDADE: Amigável, ágil, assertivo e usa emojis de comida. Não enrole, seja direto e vendedor.
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
        temperature: 0.5, // Menor temperatura para respostas mais factuais e menos criativas
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
