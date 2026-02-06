
import { db } from '../firebaseConfig.ts';
import { 
  collection, 
  setDoc, 
  doc, 
  deleteDoc,
  onSnapshot,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const LOCAL_KEY_PREFIX = 'nilo_storage_v3_';

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
  return JSON.parse(JSON.stringify(data, (key, value) => 
    value === undefined ? null : value
  ));
};

export const dbService = {
  isFirebaseConnected(): boolean {
    return !!db;
  },

  // Sincronização Híbrida (Local + Nuvem)
  subscribe<T>(key: string, callback: (data: T) => void) {
    const localPath = `${LOCAL_KEY_PREFIX}${key}`;
    
    // 1. Tenta carregar do LocalStorage imediatamente para a interface não ficar vazia
    const localData = localStorage.getItem(localPath);
    if (localData) {
      try {
        callback(JSON.parse(localData));
      } catch (e) {
        console.warn(`Erro ao ler cache local de ${key}:`, e);
      }
    }

    // 2. Se o Firebase não estiver configurado, paramos aqui
    if (!db) {
      console.warn(`Firebase não inicializado. Usando apenas modo offline para ${key}.`);
      return () => {};
    }
    
    const firebaseCollection = COLLECTION_MAP[key] || key;
    let q: any = collection(db, firebaseCollection);
    
    if (key === 'orders') {
      q = query(collection(db, firebaseCollection), orderBy('createdAt', 'desc'));
    }

    // 3. Conecta o listener em tempo real da nuvem
    return onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
      const data: any[] = [];
      snapshot.forEach((doc) => {
        data.push({ ...doc.data(), id: doc.id });
      });
      
      // Atualiza o localStorage com os dados mais recentes da nuvem
      localStorage.setItem(localPath, JSON.stringify(data));
      
      // Notifica o aplicativo com os dados reais
      callback(data as unknown as T);
    }, (error) => {
      console.error(`Erro de sincronização em tempo real (${key}):`, error);
    });
  },

  async getAll<T>(key: string, defaultValue: T): Promise<T> {
    const localPath = `${LOCAL_KEY_PREFIX}${key}`;
    const localData = localStorage.getItem(localPath);
    return localData ? JSON.parse(localData) : defaultValue;
  },

  async save<T>(key: string, id: string, data: T) {
    const firebaseCollection = COLLECTION_MAP[key] || key;
    const sanitized = sanitizeData(data);
    
    // Atualiza localmente primeiro para resposta imediata
    const localPath = `${LOCAL_KEY_PREFIX}${key}`;
    const current = await this.getAll(key, []);
    const exists = (current as any[]).findIndex(i => i.id === id);
    let updated;
    if (exists >= 0) {
      updated = [...(current as any[])];
      updated[exists] = { ...sanitized, id };
    } else {
      updated = [...(current as any[]), { ...sanitized, id }];
    }
    localStorage.setItem(localPath, JSON.stringify(updated));

    // Sincroniza com a nuvem
    try {
      if (db) {
        const docRef = doc(db, firebaseCollection, id);
        await setDoc(docRef, sanitized, { merge: true });
      }
    } catch (error) {
      console.error(`[Firestore] Erro ao salvar ${key}:`, error);
    }
  },

  async remove(key: string, id: string) {
    const firebaseCollection = COLLECTION_MAP[key] || key;
    
    // Remove localmente primeiro
    const localPath = `${LOCAL_KEY_PREFIX}${key}`;
    const current = await this.getAll(key, []);
    const updated = (current as any[]).filter(i => i.id !== id);
    localStorage.setItem(localPath, JSON.stringify(updated));

    try {
      if (db) {
        await deleteDoc(doc(db, firebaseCollection, id));
      }
    } catch (error) {
      console.error(`[Firestore] Erro ao remover ${key}:`, error);
    }
  }
};
