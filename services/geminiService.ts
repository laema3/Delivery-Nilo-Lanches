import { GoogleGenAI, Type, FunctionDeclaration, Content } from "@google/genai";
import { Product } from "../types.ts";

const apiKey = (import.meta as any).env.VITE_API_KEY;
let ai: GoogleGenAI;
if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
}

const tools: FunctionDeclaration[] = [
  {
    name: "addToCart",
    parameters: {
      type: Type.OBJECT,
      description: "Adiciona um ou mais produtos do menu ao carrinho de compras do cliente.",
      properties: {
        items: {
          type: Type.ARRAY,
          description: "Uma lista de itens para adicionar ao carrinho.",
          items: {
            type: Type.OBJECT,
            properties: {
              productName: { type: Type.STRING, description: "Nome exato do produto como listado no menu." },
              quantity: { type: Type.NUMBER, description: "Quantidade do produto a ser adicionado." },
            },
            required: ["productName", "quantity"]
          }
        }
      },
      required: ["items"]
    }
  },
  {
    name: "showMenu",
    parameters: {
      type: Type.OBJECT,
      description: "Mostra o cardápio completo ou uma categoria específica para o cliente.",
      properties: {
        category: { type: Type.STRING, description: "A categoria do cardápio a ser exibida (opcional)." }
      },
    }
  }
];

const getSystemInstruction = (allProducts: Product[], isStoreOpen: boolean, currentDeliveryFee: number, isLoggedIn: boolean): string => {
  const productsMenu = allProducts.map(p => 
    `- ${p.name}: R$ ${p.price.toFixed(2)} (${p.category}) - ${p.description}`
  ).join("\n");

  return `
    Você é 'Nilo', o assistente virtual especialista da Nilo Lanches em Uberaba-MG.
    Sua missão é ser o melhor vendedor, guiando o cliente pelo cardápio e ajudando a montar o pedido de forma proativa e amigável.

    **INFORMAÇÕES CRÍTICAS:**
    - HORÁRIO DE FUNCIONAMENTO: Segunda a Sábado, das 18:00 às 23:00. Domingo estamos fechados.
    - ESTADO DA LOJA: ${isStoreOpen ? 'ABERTA E PRONTA PRA CHAPA!' : 'FECHADA. Avise o cliente e informe o horário de funcionamento.'}
    - TAXA DE ENTREGA ATUAL: R$ ${currentDeliveryFee.toFixed(2)} (pode variar por bairro, sempre confirme o endereço para ter o valor exato).
    - CLIENTE LOGADO: ${isLoggedIn ? 'Sim' : 'Não. Se o cliente quiser finalizar o pedido, peça para ele se identificar primeiro.'}

    **CARDÁPIO COMPLETO:**
    ${productsMenu}

    **COMO VOCÊ DEVE AGIR:**
    1.  **SEJA UM VENDEDOR PROATIVO:** Não seja passivo. Se o cliente pedir um lanche, sugira uma bebida ou um acompanhamento. Ex: "Ótima pedida! Para acompanhar seu ${'productName'}, que tal uma porção de fritas crocantes e uma Coca-Cola geladinha?"
    2.  **USE AS FERRAMENTAS:** Use a função 'addToCart' para adicionar itens ao pedido. Use 'showMenu' se o cliente estiver indeciso ou pedir para ver o cardápio.
    3.  **MANTENHA O TOM:** Use uma linguagem jovem e animada. Gírias como "chapa quente", "partiu", "fechou" são bem-vindas. Mantenha as respostas curtas e diretas (máximo 2-3 frases).
    4.  **LOJA FECHADA:** Se a loja estiver fechada, informe o cliente e o horário que voltamos. Não adicione itens ao carrinho.
    5.  **FINALIZE O PEDIDO:** Quando o cliente estiver satisfeito, pergunte se deseja fechar o pedido. Se sim, instrua-o a clicar no botão 'Finalizar Pedido' no carrinho.
  `;
};

export const startChat = async (
  history: Content[],
  message: string,
  allProducts: Product[], 
  isStoreOpen: boolean,
  currentDeliveryFee: number,
  isLoggedIn: boolean
) => {
  const apiKey = (import.meta as any).env.VITE_API_KEY;
  if (!apiKey) {
    return { text: "A chave da API do Gemini não está configurada corretamente.", functionCalls: undefined };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const systemInstruction = getSystemInstruction(allProducts, isStoreOpen, currentDeliveryFee, isLoggedIn);
    
    const contents = [...history, { role: 'user', parts: [{ text: message }] }];

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents,
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: tools }],
      }
    });

    return response;

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    let friendlyErrorMessage = 'Opa! Tive um probleminha de conexão. Você pode tentar de novo?';
    
    // Verifica se o erro é de limite de cota excedido (código 429)
    if (error.message && (error.message.includes('429') || error.message.toLowerCase().includes('quota exceeded'))) {
      friendlyErrorMessage = "Nosso atendimento via inteligência artificial atingiu o limite por hoje. Por favor, continue seu pedido diretamente pelo site ou nos chame no WhatsApp!";
    }

    return { text: friendlyErrorMessage, functionCalls: undefined };
  }
};
