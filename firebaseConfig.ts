
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/**
 * Configurações dinâmicas. 
 * Se os valores abaixo estiverem vazios, o sistema usará automaticamente o LocalStorage.
 * Configure essas variáveis no painel da Vercel para ativar a sincronização em nuvem.
 */
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.VITE_FIREBASE_APP_ID || ""
};

const rawApiKey = process.env.API_KEY || "";
const isFirebaseReady = !!firebaseConfig.projectId && firebaseConfig.projectId.length > 5;
const isGeminiReady = rawApiKey.trim().length > 5; 

// Só inicializa o Firebase se houver um Project ID configurado
export const app = isFirebaseReady ? initializeApp(firebaseConfig) : null;

// Configuração de cache persistente para performance mobile
export const db = app ? initializeFirestore(app, { 
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
}) : null;

export const AI_CONNECTED = isGeminiReady;
export const FIREBASE_CONNECTED = isFirebaseReady;

// Logs de diagnóstico (visíveis no console do navegador)
if (typeof window !== 'undefined') {
  console.log(AI_CONNECTED ? "✅ IA: PRONTA" : "💡 IA: MODO OFFLINE (Sem API_KEY)");
  console.log(FIREBASE_CONNECTED ? "✅ NUVEM: ATIVA" : "💡 NUVEM: MODO LOCAL (LocalStorage)");
}
