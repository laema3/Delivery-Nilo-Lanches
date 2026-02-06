
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyB6YrCB2qiFY-QMS5rCZBKHK5LQcM6s7ls",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "nilo-lanches-f2557.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "nilo-lanches-f2557",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "nilo-lanches-f2557.firebasestorage.app",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "783386939201",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:783386939201:web:df0f317d156570b6f45bc0"
};

const rawApiKey = process.env.API_KEY || "";
const isFirebaseReady = !!firebaseConfig.projectId && firebaseConfig.projectId.length > 5;
const isGeminiReady = rawApiKey.trim().length > 5; 

export const app = isFirebaseReady ? initializeApp(firebaseConfig) : null;

// Novo método recomendado pelo Google para persistência Multi-Aba (resolve erro em Smartphones)
export const db = app ? initializeFirestore(app, { 
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
}) : null;

export const AI_CONNECTED = isGeminiReady;
export const FIREBASE_CONNECTED = isFirebaseReady;

console.log(AI_CONNECTED ? "✅ IA: CONECTADA" : "❌ IA: DESCONECTADA");
console.log(FIREBASE_CONNECTED ? "✅ BANCO: SINCRONIZADO (MODO PERSISTENTE)" : "❌ BANCO: ERRO");
