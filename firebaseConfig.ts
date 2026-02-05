import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { initializeFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Configuração centralizada
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyB6YrCB2qiFY-QMS5rCZBKHK5LQcM6s7ls",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "nilo-lanches-f2557.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "nilo-lanches-f2557",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "nilo-lanches-f2557.firebasestorage.app",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "783386939201",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:783386939201:web:df0f317d156570b6f45bc0"
};

// Verifica se as chaves do banco de dados estão presentes
const isFirebaseReady = !!firebaseConfig.projectId && firebaseConfig.projectId.length > 5;
const isGeminiReady = !!process.env.API_KEY;

export const app = isFirebaseReady ? initializeApp(firebaseConfig) : null;

// Inicializa o Firestore com Long Polling para evitar erros de conexão (Backend didn't respond)
export const db = app ? initializeFirestore(app, {
  experimentalForceLongPolling: true
}) : null;

export const AI_CONNECTED = isGeminiReady;
export const FIREBASE_CONNECTED = isFirebaseReady;

console.group("🚀 NILO LANCHES: SISTEMA DE DADOS");
console.log(FIREBASE_CONNECTED ? "✅ NUVEM: ATIVA (Modo Long Polling)" : "⚠️ LOCAL: ATIVO (Só você vê por enquanto)");
console.log(AI_CONNECTED ? "✅ INTELIGÊNCIA ARTIFICIAL: CONECTADA" : "❌ AI: AGUARDANDO CONFIGURAÇÃO");
console.groupEnd();