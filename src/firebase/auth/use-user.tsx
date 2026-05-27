'use client';

import { useEffect, useState } from 'react';
import { User, onAuthStateChanged, getRedirectResult } from 'firebase/auth';
import { useAuth, useFirestore } from '../provider';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

async function syncUserProfile(db: any, firebaseUser: User) {
  const userRef = doc(db, "users", firebaseUser.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    await setDoc(userRef, {
      uid: firebaseUser.uid,
      email: firebaseUser.email || "",
      displayName: firebaseUser.displayName || "User",
      photoURL: firebaseUser.photoURL || "",
      role: "student",
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
}

export function useUser() {
  const auth = useAuth();
  const db = useFirestore();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth || !db) return;

    // ✅ Google Redirect ke baad result pakdo
    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user) {
          await syncUserProfile(db, result.user);
          setUser(result.user);
        }
      })
      .catch((error) => {
        console.error("Redirect Result Error:", error);
      });

    // Normal auth state listener
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        await syncUserProfile(db, firebaseUser);
        setUser(firebaseUser);
      } catch (error) {
        console.error("Auth State Sync Error:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [auth, db]);

  return { user, loading };
}
