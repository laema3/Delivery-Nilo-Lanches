
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { Product } from "../types.ts";

// Tool para Adicionar ao Carrinho
const addToCartTool: FunctionDeclaration = {
  name: "addToCart",
  description: "Adiciona itens ao carrinho. Use sempre que o cliente quiser pedir algo do menu.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      productName: { type: Type.STRING, description: "Nome EXATO do produto conforme o cardápio oficial." },
      quantity: { type: Type.NUMBER, description: "Quantidade (padrão 1)." },
      observation: { type: Type.STRING, description: "Observações como 'sem cebola' ou 'ponto da carne'." }
    },
    required: ["productName"]
  }
};

// Tool para Finalizar Pedido
const finalizeOrderTool: FunctionDeclaration = {
  name: "finalizeOrder",
  description: "Finaliza o pedido e prepara para o envio ao WhatsApp.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      customerName: { type: Type.STRING, description: "Nome do cliente." },
      address: { type: Type.STRING, description: "Endereço completo (Rua, Número, Bairro)." },
      paymentMethod: { type: Type.STRING, description: "Forma de pagamento (Dinheiro, Pix, Cartão)." },
      isDelivery: { type: Type.BOOLEAN, description: "True para Entrega, False para Retirada no local." }
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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const productsList = allProducts.map(p => `- ${p.name}: R$ ${p.price.toFixed(2)} (${p.description})`).join("\n");
    
    const systemInstruction = `
      Você é o 'Nilo', o assistente virtual OFICIAL da Nilo Lanches. Você é extremamente assertivo, vendedor e não comete erros de cálculo.

      REGRAS DE OURO:
      1. NOMES DOS PRODUTOS: Se o cliente pedir um item, você DEVE conferir se o nome bate com a lista abaixo. Se o cliente falar "X-Salada" e o nome for "Nilo X-Salada", use o nome oficial "Nilo X-Salada" e adicione ao carrinho.
         CARDÁPIO REAL:
         ${productsList}

      2. TAXA DE ENTREGA (ORDEM SUPREMA):
         - A TAXA DE ENTREGA ATUAL É EXATAMENTE: R$ ${currentDeliveryFee.toFixed(2)}.
         - Se o valor acima for maior que 0, VOCÊ DEVE informar ao cliente que existe essa taxa para entrega.
         - Se o valor for 0.00, diga que a taxa será confirmada no fechamento (caso ele não esteja logado) ou que é cortesia (caso ele já tenha cadastrado o endereço).
         - NUNCA invente outros valores de frete.

      3. CÁLCULO DE FECHAMENTO: Antes de finalizar, você deve dizer: "O total dos lanches deu R$ X + R$ ${currentDeliveryFee.toFixed(2)} de entrega, totalizando R$ Y".

      4. DESTINO DO PEDIDO: Sempre deixe claro: "Vou gerar seu pedido agora e te encaminhar para o nosso WhatsApp oficial, onde nossa equipe de balcão vai confirmar e já mandar para a chapa!".

      5. STATUS DA LOJA: A loja está ${isStoreOpen ? 'ABERTA' : 'FECHADA'}. Se estiver fechada, aceite o pedido para agendamento, mas avise que a produção começa às 18:30.

      6. PERSONALIDADE: Rápido, direto, usa emojis (🍔🍟🥤) e é muito educado.
    `;

    const validHistory = history.map(h => ({
      role: h.role,
      parts: Array.isArray(h.parts) ? h.parts : [{ text: String(h.text || h.parts) }]
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", 
      contents: [...validHistory, { role: 'user', parts: [{ text: message }] }],
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: [addToCartTool, finalizeOrderTool] }],
        temperature: 0.2, // Baixa temperatura para máxima precisão
      }
    });

    return {
      text: response.text || "",
      functionCalls: response.functionCalls && response.functionCalls.length > 0 ? response.functionCalls : null
    };

  } catch (error) {
    console.error("Erro Chat IA:", error);
    return { text: "Tive um pequeno soluço aqui. Pode repetir?", functionCalls: null };
  }
};

export const generateProductImage = async (productName: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `High quality food photo of ${productName}, delicious burger style, professional lighting.` }] },
      config: { imageConfig: { aspectRatio: "1:1" } }
    });
    const candidates = response.candidates || [];
    if (candidates.length > 0) {
      for (const part of candidates[0].content.parts) {
        if (part.inlineData?.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    return null;
  } catch (e) { return null; }
};
