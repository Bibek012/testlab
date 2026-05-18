import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { firebaseConfig, isFirebaseConfigValid } from './config';

export function initializeFirebase(): {
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
} {
  if (!isFirebaseConfigValid) {
    console.warn("Firebase: Skipping initialization - Missing configuration keys in .env");
    return { firebaseApp: null, firestore: null, auth: null };
  }

  try {
    console.log("Firebase: Initializing app...");
    const firebaseApp =
      getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    
    console.log("Firebase: Connecting to Firestore...");
    const firestore = getFirestore(firebaseApp);
    
    console.log("Firebase: Connecting to Auth...");
    const auth = getAuth(firebaseApp);

    console.log("Firebase: Successfully initialized services.");
    return { firebaseApp, firestore, auth };
  } catch (error) {
    console.error("Firebase: Initialization failed critical check:", error);
    return { firebaseApp: null, firestore: null, auth: null };
  }
}

export * from './provider';
export * from './client-provider';
export * from './auth/use-user';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './errors';
export * from './error-emitter';
