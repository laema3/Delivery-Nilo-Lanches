
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { Product } from "../types.ts";

// Tool para Adicionar ao Carrinho
const addToCartFunction: FunctionDeclaration = {
  name: "addToCart",
  parameters: {
    type: Type.OBJECT,
    description: "Adiciona um produto do menu ao carrinho de compras.",
    properties: {
      productName: { 
        type: Type.STRING, 
        description: "Nome exato do produto conforme listado no menu." 
      },
      quantity: { 
        type: Type.NUMBER, 
        description: "Quantidade desejada (mínimo 1)." 
      },
      observation: { 
        type: Type.STRING, 
        description: "Observações opcionais (ex: sem cebola)." 
      }
    },
    required: ["productName", "quantity"]
  }
};

// Tool para Finalizar Pedido
const finalizeOrderFunction: FunctionDeclaration = {
  name: "finalizeOrder",
  parameters: {
    type: Type.OBJECT,
    description: "Finaliza o pedido atual e redireciona para o fechamento.",
    properties: {
      customerName: { type: Type.STRING },
      paymentMethod: { type: Type.STRING, description: "Dinheiro, Cartão ou Pix." },
      isDelivery: { type: Type.BOOLEAN, description: "True para entrega, False para retirada." },
      deliveryAddress: { type: Type.STRING, description: "Endereço de entrega completo." }
    },
    required: ["customerName", "paymentMethod", "isDelivery"]
  }
};

export const chatWithAssistant = async (
  message: string, 
  history: any[], 
  allProducts: Product[], 
  isStoreOpen: boolean,
  currentDeliveryFee: number,
  isLoggedIn: boolean
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const productsMenu = allProducts.map(p => 
    `- ${p.name}: R$ ${p.price.toFixed(2)} | Descrição: ${p.description}`
  ).join("\n");

  const deliveryInfo = isLoggedIn 
    ? `O cliente está LOGADO. A taxa de entrega é R$ ${currentDeliveryFee.toFixed(2)}.`
    : `O cliente NÃO está logado. Informe que a entrega em Uberaba varia de R$ 5 a R$ 15.`;

  const systemInstruction = `
    Você é o 'Nilo', assistente da Nilo Lanches em Uberaba-MG.
    
    DIRETRIZES:
    - HORÁRIO: 18:30 às 23:50.
    - STATUS LOJA: ${isStoreOpen ? 'ABERTA' : 'FECHADA'}.
    - PRODUTOS: ${productsMenu}
    - TAXA: ${deliveryInfo}
    
    COMPORTAMENTO:
    1. Seja rápido e amigável 🍔.
    2. Se o cliente quiser um lanche, use a ferramenta 'addToCart'.
    3. Se ele quiser pagar ou finalizar, use 'finalizeOrder'.
    4. Se a loja estiver fechada, diga que voltamos amanhã às 18:30.
    5. Nunca invente lanches que não estão na lista acima.
  `;

  try {
    // HIGIENIZAÇÃO RIGOROSA DO HISTÓRICO PARA MOBILE
    const cleanHistory: any[] = [];
    let lastRole = '';

    history.forEach(h => {
      const currentRole = h.role === 'model' ? 'model' : 'user';
      const text = String(h.text || "").trim();
      
      // Ignora mensagens vazias e evita roles duplicados seguidos
      if (text && currentRole !== lastRole) {
        cleanHistory.push({
          role: currentRole,
          parts: [{ text }]
        });
        lastRole = currentRole;
      }
    });

    // A API exige que o histórico comece com 'user'
    if (cleanHistory.length > 0 && cleanHistory[0].role === 'model') {
      cleanHistory.shift();
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [...cleanHistory, { role: 'user', parts: [{ text: message }] }],
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: [addToCartFunction, finalizeOrderFunction] }],
        temperature: 0.4,
      }
    });

    return {
      text: response.text || "Estou aqui! Como posso te ajudar?",
      functionCalls: response.functionCalls || null
    };
  } catch (error: any) {
    console.error("DEBUG Gemini Service Error:", error);
    
    // Retorna mensagens amigáveis baseadas no tipo de erro
    if (error?.message?.includes('400')) {
      return { text: "Opa, me perdi um pouco. Pode falar de novo o que você queria?", functionCalls: null };
    }
    
    return { 
      text: "Minha conexão falhou por um segundo! Pode tentar enviar sua mensagem de novo?", 
      functionCalls: null 
    };
  }
};
