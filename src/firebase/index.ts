'use client';

import { initializeApp, getApps, getApp, FirebaseApp, setLogLevel } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { firebaseConfig, isFirebaseConfigValid } from './config';
import { useRef } from 'react';

let cachedApp: FirebaseApp | null = null;
let cachedFirestore: Firestore | null = null;
let cachedAuth: Auth | null = null;

export function initializeFirebase(): {
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
} {
  if (!isFirebaseConfigValid) {
    return { firebaseApp: null, firestore: null, auth: null };
  }

  if (cachedApp && cachedFirestore && cachedAuth) {
    return { firebaseApp: cachedApp, firestore: cachedFirestore, auth: cachedAuth };
  }

  try {
    cachedApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

    // ✅ experimentalForceLongPolling HATAYA — Vercel pe getRedirectResult tod deta tha
    cachedFirestore = getFirestore(cachedApp);

    cachedAuth = getAuth(cachedApp);

    setLogLevel('error');

    return {
      firebaseApp: cachedApp,
      firestore: cachedFirestore,
      auth: cachedAuth,
    };
  } catch (error) {
    console.error('Firebase: Critical Initialization failure:', error);
    return { firebaseApp: null, firestore: null, auth: null };
  }
}

export function useMemoFirebase<T>(factory: () => T, deps: any[]): T {
  const ref = useRef<T | null>(null);
  const depsRef = useRef<any[]>([]);

  const depsChanged = deps.length !== depsRef.current.length ||
    deps.some((dep, i) => dep !== depsRef.current[i]);

  if (depsChanged || !ref.current) {
    ref.current = factory();
    depsRef.current = deps;
  }

  return ref.current as T;
}

export * from './provider';
export * from './client-provider';
export * from './auth/use-user';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './errors';
export * from './error-emitter';
