'use client';

import { initializeApp, getApps, getApp, FirebaseApp, setLogLevel } from 'firebase/app';
import { getFirestore, Firestore, initializeFirestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { firebaseConfig, isFirebaseConfigValid } from './config';
import { useRef } from 'react';

// Module-level singletons to ensure consistent instances across the client lifecycle
let cachedApp: FirebaseApp | null = null;
let cachedFirestore: Firestore | null = null;
let cachedAuth: Auth | null = null;

/**
 * Initializes Firebase services with environment-specific optimizations.
 * Strictly forces Long Polling to prevent "Unexpected state (ID: ca9)" errors
 * common in Cloud Workstation and Proxy environments.
 */
export function initializeFirebase(): {
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
} {
  // Prevent initialization if configuration is missing (e.g. during build or missing .env)
  if (!isFirebaseConfigValid) {
    return { firebaseApp: null, firestore: null, auth: null };
  }

  // Return cached instances if already initialized in this session
  if (cachedApp && cachedFirestore && cachedAuth) {
    return { firebaseApp: cachedApp, firestore: cachedFirestore, auth: cachedAuth };
  }

  try {
    // Initialize or retrieve the Firebase App
    cachedApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    
    /**
     * Configure Firestore with forced Long Polling. 
     * This is mandatory for the Firebase Studio / Cloud Workstations preview 
     * to bypass WebSocket connection drops caused by the proxy layers.
     */
    try {
      cachedFirestore = initializeFirestore(cachedApp, {
        experimentalForceLongPolling: true,
      });
    } catch (e) {
      // If Firestore was already initialized (common during Fast Refresh), 
      // we retrieve the existing instance.
      cachedFirestore = getFirestore(cachedApp);
    }

    cachedAuth = getAuth(cachedApp);

    // Suppress verbose SDK logging to focus on critical errors
    setLogLevel('error');

    return { 
      firebaseApp: cachedApp, 
      firestore: cachedFirestore, 
      auth: cachedAuth 
    };
  } catch (error) {
    console.error("Firebase: Critical Initialization failure:", error);
    return { firebaseApp: null, firestore: null, auth: null };
  }
}

/**
 * A utility hook to stabilize Firebase references (CollectionReference, DocumentReference, Query).
 * This prevents infinite re-render loops in hooks like useCollection and useDoc.
 */
export function useMemoFirebase<T>(factory: () => T, deps: any[]): T {
  const ref = useRef<T | null>(null);
  const depsRef = useRef<any[]>([]);

  // Simple comparison for dependencies
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
