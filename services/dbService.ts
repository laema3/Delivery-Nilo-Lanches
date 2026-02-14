
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
    // Carrega do local para resposta imediata na UI, mas não bloqueia a rede
    const localData = this.getLocal(key);
    if (localData && Array.isArray(localData) && localData.length > 0) {
      callback(localData as unknown as T);
    }

    if (!db) return () => {};

    try {
      const collectionName = COLLECTION_MAP[key] || key;
      // Snapshot em tempo real sem filtros para garantir recebimento instantâneo
      const q = query(collection(db, collectionName));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        // Se o snapshot veio do servidor ou é uma mudança local, processamos
        const data = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        }));
        
        // Atualiza cache e emite para a UI
        this.setLocal(key, data);
        callback(data as unknown as T);
      }, (error) => {
        console.error(`⚠️ [DB Sync Error] ${key}:`, error);
      });

      return unsubscribe;
    } catch (error) {
      console.error(`❌ [DB Fatal Error] ${key}:`, error);
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
      
      // Salva no Firestore primeiro para garantir a verdade no servidor
      if (db) {
        const collectionName = COLLECTION_MAP[key] || key;
        const docRef = doc(db, collectionName, id);
        const toSave = { ...cleanData };
        delete (toSave as any).id;
        await setDoc(docRef, toSave, { merge: true });
      }

      // Atualiza local após sucesso ou em paralelo
      const currentList = this.getLocal(key) as any[];
      const index = currentList.findIndex(item => item.id === id);
      const newItem = { ...cleanData, id };
      let newList = [...currentList];
      if (index >= 0) newList[index] = newItem;
      else newList.push(newItem);
      this.setLocal(key, newList);
      
    } catch (e: any) {
      console.error(`❌ [Save Error] '${key}':`, e);
    }
  },

  async remove(key: string, id: string) {
    try {
      if (db) {
        const collectionName = COLLECTION_MAP[key] || key;
        await deleteDoc(doc(db, collectionName, id));
      }
      const currentList = this.getLocal(key) as any[];
      const newList = currentList.filter(item => item.id !== id);
      this.setLocal(key, newList);
    } catch (e) {
      console.error(`❌ [Remove Error] '${key}':`, e);
    }
  },

  async forceSync() {
    window.location.reload();
  }
};
