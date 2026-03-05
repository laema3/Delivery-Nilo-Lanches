
import { collection, doc, setDoc, deleteDoc, onSnapshot, getDocs, query, where } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { app, db } from "../firebaseConfig";

const auth = app ? getAuth(app) : null;

export const dbService = {
  save: async (collectionName: string, id: string, data: any) => {
    if (!db) return;
    try {
      await setDoc(doc(db, collectionName, id), data, { merge: true });
    } catch (e) {
      console.error("Error saving document: ", e);
    }
  },
  remove: async (collectionName: string, id: string) => {
    if (!db) throw new Error("Database not initialized");
    console.log(`[dbService] Tentando excluir documento: ${collectionName}/${id}`);
    try {
      await deleteDoc(doc(db, collectionName, id));
      console.log(`[dbService] Documento excluído com sucesso: ${collectionName}/${id}`);
    } catch (e) {
      console.error(`[dbService] Erro ao excluir ${collectionName}/${id}:`, e);
      throw e;
    }
  },
  getAll: async <T>(collectionName: string): Promise<T[]> => {
    if (!db) return [];
    try {
      console.log(`[dbService] Buscando todos (getAll) de: ${collectionName}`);
      
      // Timeout aumentado para 30 segundos
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Timeout ao buscar dados de ${collectionName} (30s)`)), 30000)
      );
      
      const q = query(collection(db, collectionName));
      // @ts-ignore
      const querySnapshot = await Promise.race([getDocs(q), timeoutPromise]);
      
      const data: any[] = [];
      // @ts-ignore
      querySnapshot.forEach((doc) => {
        data.push({ ...doc.data(), id: doc.id });
      });
      console.log(`[dbService] getAll ${collectionName}: ${data.length} itens encontrados`);
      return data as T[];
    } catch (e) {
      console.error(`[dbService] Erro ao buscar (getAll) ${collectionName}:`, e);
      // Retorna array vazio em caso de erro para não quebrar a UI, mas loga o erro
      return [];
    }
  },
  subscribe: <T>(collectionName: string, callback: (data: T | null) => void) => {
    console.log(`[dbService] Iniciando subscrição para: ${collectionName}`);
    if (!db) {
        console.error(`[dbService] Erro: DB não inicializado ao tentar subscrever ${collectionName}`);
        return () => {};
    }
    try {
        const q = query(collection(db, collectionName));
        return onSnapshot(q, (querySnapshot) => {
          const data: any[] = [];
          querySnapshot.forEach((doc) => {
            data.push({ ...doc.data(), id: doc.id });
          });
          console.log(`[dbService] Sincronizado ${collectionName}: ${data.length} itens`);
          callback(data as T);
        }, (error) => {
            console.error(`[dbService] Erro no onSnapshot de ${collectionName}:`, error);
        });
    } catch (err) {
        console.error(`[dbService] Erro ao criar query para ${collectionName}:`, err);
        return () => {};
    }
  },
  auth: auth
};
