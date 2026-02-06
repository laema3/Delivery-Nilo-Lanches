
import { db } from '../firebaseConfig.ts';
import { 
  collection, 
  setDoc, 
  doc, 
  deleteDoc,
  onSnapshot,
  query
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const LOCAL_KEY_PREFIX = 'nilo_storage_v6_';

const COLLECTION_MAP: Record<string, string> = {
  'orders': 'nilo_orders',
  'products': 'products',
  'categories': 'categories',
  'sub_categories': 'sub_categories',
  'complements': 'complements',
  'customers': 'customers',
  'zip_ranges': 'zip_ranges',
  'payment_methods': 'payment_methods',
  'settings': 'settings',
  'coupons': 'coupons'
};

export const dbService = {
  isFirebaseConnected(): boolean {
    return !!db;
  },

  subscribe<T>(key: string, callback: (data: T) => void) {
    const localPath = `${LOCAL_KEY_PREFIX}${key}`;
    
    // Feedback imediato do cache
    const localData = localStorage.getItem(localPath);
    if (localData) {
      try { callback(JSON.parse(localData)); } catch (e) {}
    }

    if (!db) return () => {};
    
    const firebaseCollection = COLLECTION_MAP[key] || key;
    const q = query(collection(db, firebaseCollection));

    return onSnapshot(q, (snapshot) => {
      const data: any[] = [];
      snapshot.forEach((doc) => {
        data.push({ ...doc.data(), id: doc.id });
      });
      
      try {
        localStorage.setItem(localPath, JSON.stringify(data));
      } catch (e) {}
      
      callback(data as unknown as T);
    }, (error) => {
      console.warn(`Sync ${key} suspenso. Usando cache local.`);
    });
  },

  async getAll<T>(key: string, defaultValue: T): Promise<T> {
    const localPath = `${LOCAL_KEY_PREFIX}${key}`;
    const localData = localStorage.getItem(localPath);
    return localData ? JSON.parse(localData) : defaultValue;
  },

  async save<T>(key: string, id: string, data: T) {
    if (!id) throw new Error("ID de referência ausente.");
    
    const firebaseCollection = COLLECTION_MAP[key] || key;
    const toSave = { ...data } as any;
    delete toSave.id; // Remove ID do corpo do documento para o Firestore

    const cleanData = JSON.parse(JSON.stringify(toSave, (k, v) => v === undefined ? null : v));

    // 1. Atualiza LocalStorage Imediatamente
    const localPath = `${LOCAL_KEY_PREFIX}${key}`;
    try {
      const current = await this.getAll(key, [] as any);
      const updated = Array.isArray(current) ? [...current] : [];
      const idx = updated.findIndex((i: any) => i.id === id);
      
      const itemWithId = { ...cleanData, id };
      if (idx >= 0) updated[idx] = itemWithId;
      else updated.push(itemWithId);
      
      localStorage.setItem(localPath, JSON.stringify(updated));
    } catch (e) {}

    // 2. Persiste no Firebase em segundo plano
    if (db) {
      try {
        const docRef = doc(db, firebaseCollection, id);
        await setDoc(docRef, cleanData, { merge: true });
      } catch (err) {
        console.error("Erro ao persistir na nuvem:", err);
      }
    }
  },

  async remove(key: string, id: string) {
    if (!id) return;
    const firebaseCollection = COLLECTION_MAP[key] || key;
    
    // 1. Remove do LocalStorage Imediatamente
    const localPath = `${LOCAL_KEY_PREFIX}${key}`;
    try {
      const current = await this.getAll(key, [] as any);
      if (Array.isArray(current)) {
        const updated = current.filter((i: any) => i.id !== id);
        localStorage.setItem(localPath, JSON.stringify(updated));
      }
    } catch (e) {}

    // 2. Remove do Firebase em segundo plano
    if (db) {
      try {
        await deleteDoc(doc(db, firebaseCollection, id));
      } catch (err) {
        console.error("Erro ao remover da nuvem:", err);
      }
    }
  }
};
