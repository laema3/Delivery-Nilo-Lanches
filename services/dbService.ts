
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
    // 1. Carrega dados locais imediatamente para a UI aparecer rápido
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
        // Atualiza o cache local com os dados novos da nuvem
        this.setLocal(key, data);
        callback(data as unknown as T);
      }, (error) => {
        console.warn(`⚠️ [Sync] Modo Offline para '${key}':`, error.message);
      });

      return unsubscribe;
    } catch (error) {
      console.error(`❌ [Sync] Erro fatal em '${key}':`, error);
      return () => {};
    }
  },

  async getAll<T>(key: string, defaultValue: T): Promise<T> {
    // Tenta pegar da nuvem primeiro se conectado
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
        console.warn("⚠️ Falha ao buscar online, usando cache local.");
      }
    }
    // Fallback para local
    return (this.getLocal(key) as unknown as T) || defaultValue;
  },

  async save(key: string, id: string, data: any) {
    if (!id) return;
    const cleanData = { ...data };
    delete cleanData.id; 

    // 1. SALVAMENTO LOCAL (Garantido)
    // Isso assegura que o pedido apareça na tela do Admin (se for na mesma máquina) 
    // ou no "Meus Pedidos" do cliente, mesmo sem internet.
    const currentList = this.getLocal(key) as any[];
    const index = currentList.findIndex(item => item.id === id);
    const newItem = { ...cleanData, id };

    let newList = index >= 0 ? [...currentList] : [...currentList, newItem];
    if (index >= 0) newList[index] = newItem;
    this.setLocal(key, newList);

    // 2. SALVAMENTO EM NUVEM (Tentativa)
    if (db) {
      try {
        const collectionName = COLLECTION_MAP[key] || key;
        await setDoc(doc(db, collectionName, id), cleanData, { merge: true });
        console.log(`✅ [Cloud] Salvo com sucesso: ${key}/${id}`);
      } catch (e: any) {
        // MUDANÇA CRÍTICA: Não lançamos erro (throw) aqui.
        // Se falhar no Firebase (cota, permissão, internet), apenas logamos.
        // O app considera sucesso porque salvou localmente.
        console.error(`⚠️ [Cloud] Falha no upload (mas salvo localmente):`, e.message);
      }
    } else {
      console.warn("⚠️ [Cloud] Desconectado. Dados salvos apenas neste dispositivo.");
    }
  },

  async remove(key: string, id: string) {
    // 1. Remove Local
    const currentList = this.getLocal(key) as any[];
    const newList = currentList.filter(item => item.id !== id);
    this.setLocal(key, newList);

    // 2. Remove Nuvem
    if (db) {
      try {
        const collectionName = COLLECTION_MAP[key] || key;
        await deleteDoc(doc(db, collectionName, id));
      } catch (e: any) {
        console.error(`⚠️ [Cloud] Erro ao deletar online:`, e.message);
      }
    }
  },

  async forceSync() {
    window.location.reload();
  }
};
