
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
    const cleanHistory: any[] = [];
    let lastRole = '';

    // Filtra e limpa o histórico para garantir alternância User/Model
    history.forEach(h => {
      const currentRole = h.role === 'model' ? 'model' : 'user';
      const text = String(h.text || "").trim();
      
      if (text && currentRole !== lastRole) {
        cleanHistory.push({
          role: currentRole,
          parts: [{ text }]
        });
        lastRole = currentRole;
      }
    });

    // REGRA CRUCIAL: O histórico para o Gemini DEVE começar com 'user'
    // Se a primeira mensagem for 'model' (ex: a saudação inicial), removemos ela do contexto enviado à API
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
      text: response.text || "Estou aqui! O que posso preparar para você?",
      functionCalls: response.functionCalls || null
    };
  } catch (error: any) {
    console.error("Gemini Error:", error);
    
    // Fallback amigável caso ocorra erro de contexto
    if (error?.message?.includes('400')) {
      return { 
        text: "Opa, tive um pequeno lapso de memória aqui na cozinha. Pode repetir seu último pedido ou me dizer o que deseja?", 
        functionCalls: null 
      };
    }
    
    return { 
      text: "Minha conexão com a cozinha falhou por um segundo! Pode tentar me enviar essa mensagem de novo?", 
      functionCalls: null 
    };
  }
};
