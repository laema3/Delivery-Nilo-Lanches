
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

const STORAGE_PREFIX = 'nilo_v2_'; // Prefixo atualizado para evitar conflitos antigos

// Mapeamento para garantir que os nomes das coleções no Firebase sejam consistentes
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
  // Verifica se estamos online com o Firebase
  isFirebaseConnected() {
    return !!db;
  },

  // Helper para ler do LocalStorage
  getLocal(key: string) {
    try {
      const item = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
      return item ? JSON.parse(item) : [];
    } catch (e) {
      console.error("Erro ao ler localStorage:", e);
      return [];
    }
  },

  // Helper para salvar no LocalStorage
  setLocal(key: string, data: any) {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(data));
    } catch (e) {
      console.error("Erro ao salvar localStorage:", e);
    }
  },

  // Inscreve para receber atualizações em tempo real (ou carrega local se offline)
  subscribe<T>(key: string, callback: (data: T) => void) {
    // 1. Sempre carrega o dado local primeiro (Instantâneo)
    const localData = this.getLocal(key);
    if (localData) callback(localData as T);

    // 2. Se não tem Firebase, paramos por aqui (Modo Offline)
    if (!db) {
      return () => {};
    }

    // 3. Se tem Firebase, conecta no Realtime
    try {
      const collectionName = COLLECTION_MAP[key] || key;
      const q = query(collection(db, collectionName));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        }));
        
        // Atualiza o cache local com os dados frescos da nuvem
        this.setLocal(key, data);
        
        // Atualiza a tela com o dado REAL da nuvem
        callback(data as unknown as T);
        console.log(`🔄 [Sync] Recebido update de ${key}: ${data.length} items`);
        
      }, (error) => {
        console.warn(`⚠️ [Sync] Erro ao sincronizar '${key}':`, error.code);
      });

      return unsubscribe;
    } catch (error) {
      console.error(`❌ [Sync] Erro fatal em '${key}':`, error);
      return () => {};
    }
  },

  // Busca dados uma única vez (Get)
  async getAll<T>(key: string, defaultValue: T): Promise<T> {
    // Tenta pegar do Firebase se conectado
    if (db) {
      try {
        const collectionName = COLLECTION_MAP[key] || key;
        const snapshot = await getDocs(collection(db, collectionName));
        if (!snapshot.empty) {
          const data = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
          this.setLocal(key, data); // Atualiza cache
          return data as unknown as T;
        }
      } catch (e) {
        // Se falhar a rede, cai para o local silenciosamente
      }
    }
    // Retorna local ou o valor padrão
    return (this.getLocal(key) as unknown as T) || defaultValue;
  },

  // Salva dados (Insert/Update)
  async save(key: string, id: string, data: any) {
    if (!id) return;
    const cleanData = { ...data };
    
    // Remove campo id do objeto para não duplicar no Firestore (o ID já é a chave do documento)
    delete cleanData.id; 

    // 1. Salva Localmente (Optimistic UI update)
    const currentList = this.getLocal(key) as any[];
    const index = currentList.findIndex(item => item.id === id);
    const newItem = { ...cleanData, id };

    let newList;
    if (index >= 0) {
      newList = [...currentList];
      newList[index] = newItem;
    } else {
      newList = [...currentList, newItem];
    }
    this.setLocal(key, newList);

    // 2. Salva no Firebase se conectado
    if (db) {
      try {
        const collectionName = COLLECTION_MAP[key] || key;
        await setDoc(doc(db, collectionName, id), cleanData, { merge: true });
        // Log para confirmar que o envio para a nuvem ocorreu
        console.log(`☁️ [Cloud] Dado enviado para ${key}/${id}`);
      } catch (e: any) {
        console.error(`❌ Erro ao salvar no Firebase (${key}):`, e);
        // Opcional: Mostrar toast de erro para o usuário
      }
    } else {
      console.warn("⚠️ [Cloud] Tentativa de salvar sem conexão (Modo Offline)");
    }
  },

  // Remove dados (Delete)
  async remove(key: string, id: string) {
    // 1. Remove Local
    const currentList = this.getLocal(key) as any[];
    const newList = currentList.filter(item => item.id !== id);
    this.setLocal(key, newList);

    // 2. Remove do Firebase
    if (db) {
      try {
        const collectionName = COLLECTION_MAP[key] || key;
        await deleteDoc(doc(db, collectionName, id));
        console.log(`🗑️ [Cloud] Dado removido de ${key}/${id}`);
      } catch (e) {
        console.error(`❌ Erro ao deletar no Firebase (${key}):`, e);
      }
    }
  },

  // Força recarregamento da página (útil para "resetar" estados)
  async forceSync() {
    window.location.reload();
  }
};
