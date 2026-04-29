import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  onSnapshot,
  addDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from './firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// User Profile
export const getUserProfile = async (uid: string) => {
  const path = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? snap.data() : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
};

export const createUserProfile = async (uid: string, data: any) => {
  const path = `users/${uid}`;
  try {
    await setDoc(doc(db, 'users', uid), {
      ...data,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

// Families
export const getFamily = async (familyId: string) => {
  const path = `families/${familyId}`;
  try {
    const snap = await getDoc(doc(db, 'families', familyId));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
};

// Dependents
export const getDependentsByFamily = (familyId: string, callback: (data: any[]) => void) => {
  const path = 'dependents';
  
  if (!auth.currentUser) {
    console.warn("Firestore: Skipping local listener for unauthenticated user.");
    callback([]);
    return () => {};
  }

  const q = query(collection(db, path), where('familyId', '==', familyId));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
};

export const createDependent = async (data: any) => {
  const path = 'dependents';
  try {
    await addDoc(collection(db, path), {
      ...data,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

// Medical Records, Growth, Vaccines
export const getRecordsByDependent = (collectionName: string, dependentId: string, callback: (data: any[]) => void) => {
  if (!auth.currentUser) {
    callback([]);
    return () => {};
  }
  const q = query(collection(db, collectionName), where('dependentId', '==', dependentId));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, collectionName);
  });
};

export const addRecord = async (collectionName: string, data: any) => {
  try {
    await addDoc(collection(db, collectionName), data);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, collectionName);
  }
};
