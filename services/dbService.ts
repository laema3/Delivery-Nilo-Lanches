
import { db } from '../firebaseConfig.ts';
import { 
  collection, 
  setDoc, 
  doc, 
  deleteDoc,
  onSnapshot, 
  query, 
  getDocs 
} from "firebase/firestore";

const STORAGE_PREFIX = 'nilo_v2_';

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

const sanitizeData = (data: any) => {
  const clean = JSON.parse(JSON.stringify(data));
  return clean;
};

export const dbService = {
  isFirebaseConnected() {
    return !!db;
  },

  getLocal(key: string) {
    try {
      const item = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
      return item ? JSON.parse(item) : [];
    } catch (e) {
      return [];
    }
  },

  setLocal(key: string, data: any) {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(data));
    } catch (e) {}
  },

  subscribe<T>(key: string, callback: (data: T) => void) {
    // Carrega do local para resposta imediata na UI
    const localData = this.getLocal(key);
    if (localData && Array.isArray(localData) && localData.length > 0) {
      callback(localData as unknown as T);
    }

    if (!db) return () => {};

    try {
      const collectionName = COLLECTION_MAP[key] || key;
      const q = query(collection(db, collectionName));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        }));
        
        // CRÍTICO: Atualiza o cache local e emite o callback com os dados REAIS da nuvem
        // Isso garante que mudanças como o status da loja se propaguem instantaneamente.
        this.setLocal(key, data);
        callback(data as unknown as T);
      }, (error) => {
        console.warn(`⚠️ [Sync] Erro '${key}':`, error.message);
      });

      return unsubscribe;
    } catch (error) {
      console.error(`❌ [Sync] Erro fatal em '${key}':`, error);
      return () => {};
    }
  },

  async getAll<T>(key: string, defaultValue: T): Promise<T> {
    if (db) {
      try {
        const collectionName = COLLECTION_MAP[key] || key;
        const snapshot = await getDocs(collection(db, collectionName));
        if (!snapshot.empty) {
          const data = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
          this.setLocal(key, data);
          return data as unknown as T;
        }
      } catch (e) {}
    }
    return (this.getLocal(key) as unknown as T) || defaultValue;
  },

  async save(key: string, id: string, data: any) {
    if (!id) return;

    try {
      const cleanData = sanitizeData({ ...data });
      
      // 1. Atualiza Local para feedback instantâneo no dispositivo que originou a mudança
      const currentList = this.getLocal(key) as any[];
      const index = currentList.findIndex(item => item.id === id);
      const newItem = { ...cleanData, id };
      let newList = [...currentList];
      if (index >= 0) newList[index] = newItem;
      else newList.push(newItem);
      this.setLocal(key, newList);

      // 2. Salva no Firestore
      if (db) {
        const collectionName = COLLECTION_MAP[key] || key;
        const docRef = doc(db, collectionName, id);
        const toSave = { ...cleanData };
        delete (toSave as any).id;
        await setDoc(docRef, toSave, { merge: true });
      }
    } catch (e: any) {
      console.error(`❌ [Save Error] '${key}':`, e);
    }
  },

  async remove(key: string, id: string) {
    try {
      const currentList = this.getLocal(key) as any[];
      const newList = currentList.filter(item => item.id !== id);
      this.setLocal(key, newList);

      if (db) {
        const collectionName = COLLECTION_MAP[key] || key;
        await deleteDoc(doc(db, collectionName, id));
      }
    } catch (e) {
      console.error(`❌ [Remove Error] '${key}':`, e);
    }
  },

  async forceSync() {
    window.location.reload();
  }
};
