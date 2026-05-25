'use client';

import { useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { useAuth, useFirestore } from '../provider';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

/**
 * A centralized authentication hook that ensures a Firestore user profile
 * is synchronized with the Firebase Auth state.
 * 
 * This listener handles both standard logins and post-redirect Google Sign-Ins,
 * ensuring the user document exists before clearing the loading state.
 */
export function useUser() {
  const auth = useAuth();
  const db = useFirestore();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth || !db) return;
    
    // Global listener for auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        // Source of truth: Firestore user profile
        const userRef = doc(db, "users", firebaseUser.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          // Auto-create missing profile (Critical for Google Redirect users)
          await setDoc(userRef, {
            uid: firebaseUser.uid,
            email: firebaseUser.email || "",
            displayName: firebaseUser.displayName || "User",
            photoURL: firebaseUser.photoURL || "",
            role: "student", // Secure default role
            status: "active",
            subscriptionType: "free",
            testsAttempted: 0,
            totalScore: 0,
            streak: 0,
            preferredLanguage: "en",
            createdAt: serverTimestamp(),
            lastActive: serverTimestamp()
          }, { merge: true });
        }
        
        // Update local state once profile is confirmed to exist
        setUser(firebaseUser);
      } catch (error) {
        console.error("Auth State Sync Error:", error);
      } finally {
        // Only stop loading once the profile check/creation is complete
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [auth, db]);

  return { user, loading };
}
