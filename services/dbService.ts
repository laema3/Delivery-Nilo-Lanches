import { db } from '../firebaseConfig.ts';
import { 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  deleteDoc,
  getDoc
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

// Função auxiliar para remover campos undefined que quebram o Firestore
const sanitizeData = (data: any) => {
  return JSON.parse(JSON.stringify(data, (key, value) => 
    value === undefined ? null : value
  ));
};

export const dbService = {
  isFirebaseConnected(): boolean {
    return !!db;
  },

  async getAll<T>(key: string, defaultValue: T): Promise<T> {
    const localPath = `${LOCAL_KEY_PREFIX}${key}`;
    const firebaseCollection = COLLECTION_MAP[key] || key;
    
    try {
      if (db) {
        if (key === 'settings') {
          const docRef = doc(db, firebaseCollection, 'general');
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = [docSnap.data()];
            localStorage.setItem(localPath, JSON.stringify(data));
            return data as unknown as T;
          }
        } else {
          const querySnapshot = await getDocs(collection(db, firebaseCollection));
          const cloudData: any[] = [];
          querySnapshot.forEach((d) => {
            cloudData.push({ ...d.data(), id: d.id });
          });

          if (cloudData.length > 0) {
            localStorage.setItem(localPath, JSON.stringify(cloudData));
            return cloudData as unknown as T;
          }
        }
      }
    } catch (error) {
      console.warn(`[Nilo Offline] Erro ao sincronizar '${firebaseCollection}'.`);
    }
    
    const localData = localStorage.getItem(localPath);
    return localData ? JSON.parse(localData) : defaultValue;
  },

  async save<T>(key: string, id: string, data: T) {
    const localPath = `${LOCAL_KEY_PREFIX}${key}`;
    const firebaseCollection = COLLECTION_MAP[key] || key;
    
    const sanitized = sanitizeData(data);
    
    const localRaw = localStorage.getItem(localPath);
    let localData = localRaw ? JSON.parse(localRaw) : [];
    
    if (key === 'settings') {
      localData = [{ ...sanitized, id }];
    } else {
      if (!Array.isArray(localData)) localData = [];
      const index = localData.findIndex((item: any) => item.id === id);
      const newItem = { ...sanitized, id };
      if (index > -1) localData[index] = newItem;
      else localData.push(newItem);
    }
    localStorage.setItem(localPath, JSON.stringify(localData));

    try {
      if (db) {
        const docRef = doc(db, firebaseCollection, id);
        await setDoc(docRef, sanitized, { merge: true });
      }
    } catch (error) {
      console.error(`[Firestore Erro] Falha ao salvar na nuvem:`, error);
    }
  },

  async remove(key: string, id: string) {
    const localPath = `${LOCAL_KEY_PREFIX}${key}`;
    const firebaseCollection = COLLECTION_MAP[key] || key;

    const localRaw = localStorage.getItem(localPath);
    if (localRaw) {
      const localData = JSON.parse(localRaw);
      if (Array.isArray(localData)) {
        const filtered = localData.filter((item: any) => item.id !== id);
        localStorage.setItem(localPath, JSON.stringify(filtered));
      }
    }

    try {
      if (db) {
        await deleteDoc(doc(db, firebaseCollection, id));
      }
    } catch (error) {
      console.error(`[Firestore Erro] Falha ao remover.`, error);
    }
  }
};