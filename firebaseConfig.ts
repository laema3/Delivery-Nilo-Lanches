import { initializeApp } from "firebase/app";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

// As chaves do projeto Nilo Lanches (Recuperadas e fixadas para garantir conexão)
const FALLBACK_CONFIG = {
  apiKey: "AIzaSyB6YrCB2qiFY-QMS5rCZBKHK5LQcM6s7ls",
  authDomain: "nilo-lanches-f2557.firebaseapp.com",
  projectId: "nilo-lanches-f2557",
  storageBucket: "nilo-lanches-f2557.firebasestorage.app",
  messagingSenderId: "783386939201",
  appId: "1:783386939201:web:07541d706d93f6fff45bc0"
};

const getEnv = (key: string, fallback: string) => {
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch (e) {
    // Ignora erro
  }
  return fallback;
};

const firebaseConfig = {
  apiKey: getEnv("VITE_FIREBASE_API_KEY", FALLBACK_CONFIG.apiKey),
  authDomain: getEnv("VITE_FIREBASE_AUTH_DOMAIN", FALLBACK_CONFIG.authDomain),
  projectId: getEnv("VITE_FIREBASE_PROJECT_ID", FALLBACK_CONFIG.projectId),
  storageBucket: getEnv("VITE_FIREBASE_STORAGE_BUCKET", FALLBACK_CONFIG.storageBucket),
  messagingSenderId: getEnv("VITE_FIREBASE_MESSAGING_SENDER_ID", FALLBACK_CONFIG.messagingSenderId),
  appId: getEnv("VITE_FIREBASE_APP_ID", FALLBACK_CONFIG.appId)
};

let app = null;
let db = null;
let connectionError = "";

if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  try {
    app = initializeApp(firebaseConfig);
    
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    });
    
    console.log("🔥 [Firebase] Conectado (Nilo Lanches):", firebaseConfig.projectId);
  } catch (error: any) {
    console.error("❌ [Firebase] Erro:", error);
    connectionError = error.message;
  }
}

export { app, db, connectionError, firebaseConfig };