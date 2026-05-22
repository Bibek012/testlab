'use client';

import { initializeApp, getApps, getApp, FirebaseApp, setLogLevel } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { firebaseConfig, isFirebaseConfigValid } from './config';
import { useMemo, useRef } from 'react';

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
    const firebaseApp =
      getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    const firestore = getFirestore(firebaseApp);
    const auth = getAuth(firebaseApp);

    // Suppress verbose connection warnings that trigger Next.js error overlays
    setLogLevel('error');

    console.log("Firebase: Successfully initialized services.");
    return { firebaseApp, firestore, auth };
  } catch (error) {
    console.error("Firebase: Initialization failed:", error);
    return { firebaseApp: null, firestore: null, auth: null };
  }
}

/**
 * A utility hook to stabilize Firebase references (CollectionReference, DocumentReference, Query).
 * This prevents infinite re-render loops in hooks like useCollection and useDoc.
 */
export function useMemoFirebase<T>(factory: () => T, deps: any[]): T {
  const ref = useRef<T>(null);
  const depsRef = useRef<any[]>([]);

  const depsChanged = deps.some((dep, i) => dep !== depsRef.current[i]);

  if (depsChanged || !ref.current) {
    ref.current = factory();
    depsRef.current = deps;
  }

  return ref.current;
}

export * from './provider';
export * from './client-provider';
export * from './auth/use-user';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './errors';
export * from './error-emitter';
