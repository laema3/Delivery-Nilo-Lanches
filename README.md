
# 🍔 Nilo Lanches - Delivery App

## 👋 Olá! Seu app já está funcionando!
Atualmente ele está rodando em **Modo Demonstração (Offline)**. Isso significa que:
1. Os dados (produtos, pedidos) ficam salvos **apenas no seu navegador**.
2. Se você abrir em outro celular, os dados não aparecerão lá.
3. Não é necessário configurar nada para testar.

---

## ☁️ Como Configurar o Firebase (Modo Online Real)

Para que os pedidos cheguem em tempo real no painel do administrador em outro computador, você precisa conectar ao Google Firebase:

1. Acesse [console.firebase.google.com](https://console.firebase.google.com) e crie um projeto novo.
2. Crie um app **Web** dentro do projeto (ícone `</>`).
3. Copie as chaves geradas e crie um arquivo chamado `.env` na raiz do projeto (onde está o `package.json`).
4. Cole as chaves no arquivo `.env` seguindo este modelo exato:

```env
# ARQUIVO: .env

VITE_FIREBASE_API_KEY=AIzaSyD... (sua chave)
VITE_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu-projeto
VITE_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456...
VITE_FIREBASE_APP_ID=1:123456:web:abcdef...

# (Opcional) Chave Gemini AI para o Chatbot
API_KEY=...
```

5. No Console do Firebase, vá em **Firestore Database** e clique em "Criar Banco de Dados" (em modo de teste).
6. Reinicie seu projeto (`npm run dev`) e o aviso de "Modo Offline" desaparecerá!

---

## 🔐 Acesso Admin
- **Usuário:** `nilo`
- **Senha:** `nilo123`
