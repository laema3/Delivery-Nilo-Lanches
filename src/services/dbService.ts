
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
    if (!db) return;
    try {
      await deleteDoc(doc(db, collectionName, id));
    } catch (e) {
      console.error("Error removing document: ", e);
    }
  },
  subscribe: <T>(collectionName: string, callback: (data: T | null) => void) => {
    if (!db) return () => {};
    const q = query(collection(db, collectionName));
    return onSnapshot(q, (querySnapshot) => {
      const data: any[] = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      callback(data as T);
    });
  },
  auth: auth
};
