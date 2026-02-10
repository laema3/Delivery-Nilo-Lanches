
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

// Remove valores undefined para evitar erros no Firestore
const sanitizeData = (data: any) => {
  return JSON.parse(JSON.stringify(data));
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
      console.error("Erro ao ler localStorage:", e);
      return [];
    }
  },

  setLocal(key: string, data: any) {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(data));
    } catch (e) {
      console.error("Erro ao salvar localStorage:", e);
    }
  },

  subscribe<T>(key: string, callback: (data: T) => void) {
    // 1. Carrega local imediatamente
    const localData = this.getLocal(key);
    if (localData && localData.length > 0) callback(localData as T);

    if (!db) return () => {};

    try {
      const collectionName = COLLECTION_MAP[key] || key;
      const q = query(collection(db, collectionName));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        }));
        // Atualiza cache local
        this.setLocal(key, data);
        callback(data as unknown as T);
      }, (error) => {
        console.warn(`⚠️ [Sync] Erro na leitura '${key}':`, error.message);
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
      } catch (e) {
        // Silencioso, usa local
      }
    }
    return (this.getLocal(key) as unknown as T) || defaultValue;
  },

  async save(key: string, id: string, data: any) {
    if (!id) return;

    try {
      // 1. Sanitização
      const cleanData = sanitizeData({ ...data });
      delete cleanData.id; 

      // 2. Salva Local (Garantia de Offline)
      const currentList = this.getLocal(key) as any[];
      const index = currentList.findIndex(item => item.id === id);
      const newItem = { ...cleanData, id };
      
      let newList = index >= 0 ? [...currentList] : [...currentList, newItem];
      if (index >= 0) newList[index] = newItem;
      this.setLocal(key, newList);

      // 3. Salva Nuvem (Firebase)
      if (db) {
        const collectionName = COLLECTION_MAP[key] || key;
        // Importante: setDoc é await, mas se falhar pegamos no catch
        await setDoc(doc(db, collectionName, id), cleanData, { merge: true });
        console.log(`✅ [Cloud] Salvo: ${key}/${id}`);
      } else {
        console.warn("⚠️ [Cloud] Firebase não conectado. Salvo apenas localmente.");
      }
    } catch (e: any) {
      console.error(`❌ [Save Error] Erro ao salvar '${key}':`, e);
      // NÃO lançamos o erro. O app segue assumindo que salvou localmente.
      // Isso evita tela de erro pro usuário final.
    }
  },

  async remove(key: string, id: string) {
    try {
      // 1. Remove Local
      const currentList = this.getLocal(key) as any[];
      const newList = currentList.filter(item => item.id !== id);
      this.setLocal(key, newList);

      // 2. Remove Nuvem
      if (db) {
        const collectionName = COLLECTION_MAP[key] || key;
        await deleteDoc(doc(db, collectionName, id));
      }
    } catch (e) {
      console.error(`❌ [Remove Error] Erro ao deletar '${key}':`, e);
    }
  },

  async forceSync() {
    window.location.reload();
  }
};
