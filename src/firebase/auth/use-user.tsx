'use client';

import { useEffect, useState } from 'react';
import { User, onAuthStateChanged, getRedirectResult } from 'firebase/auth';
import { useAuth, useFirestore } from '../provider';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

async function syncUserProfile(db: any, firebaseUser: User) {
  const userRef = doc(db, 'users', firebaseUser.uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) {
    await setDoc(userRef, {
      uid: firebaseUser.uid,
      email: firebaseUser.email || '',
      displayName: firebaseUser.displayName || 'User',
      photoURL: firebaseUser.photoURL || '',
      role: 'student',
      status: 'active',
      subscriptionType: 'free',
      testsAttempted: 0,
      totalScore: 0,
      streak: 0,
      preferredLanguage: 'en',
      createdAt: serverTimestamp(),
      lastActive: serverTimestamp(),
    }, { merge: true });
  }
}

export function useUser() {
  const auth = useAuth();
  const db = useFirestore();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth || !db) {
      setLoading(false);
      return;
    }

    let redirectHandled = false;

    // Step 1: Google redirect ke baad result check karo
    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user) {
          redirectHandled = true;
          await syncUserProfile(db, result.user);
          setUser(result.user);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('getRedirectResult error:', err.code, err.message);
      });

    // Step 2: Normal auth state listener
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (redirectHandled) return; // redirect already handle ho gaya
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }
      try {
        await syncUserProfile(db, firebaseUser);
        setUser(firebaseUser);
      } catch (err) {
        console.error('Profile sync error:', err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [auth, db]);

  return { user, loading };
}
