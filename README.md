
# 🍔 Nilo Lanches - Delivery App

Sistema completo de delivery com Inteligência Artificial (Gemini), Cardápio Digital e Painel Administrativo.

## 🚀 Funcionalidades
- **Cardápio Digital:** Produtos, categorias e adicionais.
- **Carrinho e Checkout:** Cálculo de frete por CEP e cupom de desconto.
- **IA do Nilo:** Chatbot que sugere lanches e tira dúvidas (Gemini AI).
- **Painel Admin:** Gerenciamento de pedidos, produtos e clientes.
- **PWA:** Instalável no celular (Android/iOS).

---

## ⚠️ Segurança e Configuração (.env)

Este projeto utiliza chaves de API sensíveis (Firebase e Google AI).
**NUNCA suba o arquivo `.env` para o GitHub.**

O arquivo `.gitignore` já está configurado para impedir isso.

### Como configurar localmente:
1. Crie um arquivo `.env` na raiz.
2. Copie o conteúdo de `.env.example`.
3. Preencha com suas chaves reais.

---

## ☁️ Como fazer Deploy (Colocar no ar)

A maneira mais fácil é usar a **Vercel**.

1. Suba este código para o seu GitHub.
2. Crie uma conta na [Vercel](https://vercel.com) e importe o projeto.
3. **PASSO IMPORTANTE:**
   Na tela de configuração da Vercel, vá em **Environment Variables** e adicione as mesmas chaves que estão no seu arquivo `.env` local:

   - `VITE_API_KEY`
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - etc...

Se você não fizer isso, o site entrará no ar mas o banco de dados e a IA não funcionarão.

---

## 🔐 Acesso Admin Padrão
- **Usuário:** `nilo`
- **Senha:** `nilo123`
