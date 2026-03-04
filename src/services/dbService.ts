
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
  subscribe: <T>(collectionName: string, callback: (data: T | null) => void) => {
    if (!db) return () => {};
    const q = query(collection(db, collectionName));
    return onSnapshot(q, (querySnapshot) => {
      const data: any[] = [];
      querySnapshot.forEach((doc) => {
        // Garante que o ID do documento seja o ID real do Firestore, sobrescrevendo qualquer ID interno que possa estar errado
        data.push({ ...doc.data(), id: doc.id });
      });
      console.log(`[dbService] Sincronizado ${collectionName}: ${data.length} itens`);
      callback(data as T);
    });
  },
  auth: auth
};
