'use client';

import { useEffect, useState } from 'react';

import {
  User,
  onAuthStateChanged,
} from 'firebase/auth';

import { useAuth, useFirestore } from '../provider';

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';

async function syncUserProfile(
  db: any,
  firebaseUser: User
) {
  const userRef = doc(db, 'users', firebaseUser.uid);

  const userSnap = await getDoc(userRef);

  // New User
  if (!userSnap.exists()) {
    await setDoc(
      userRef,
      {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName:
          firebaseUser.displayName || 'User',
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
      },
      { merge: true }
    );
  }

  // Existing User
  else {
    await setDoc(
      userRef,
      {
        lastActive: serverTimestamp(),
      },
      { merge: true }
    );
  }
}

export function useUser() {
  const auth = useAuth();

  const db = useFirestore();

  // IMPORTANT:
  // Firebase User me custom role nahi hota
  // Isliye "any" use kar rahe hain
  const [user, setUser] = useState<any>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth || !db) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        // Logged Out
        if (!firebaseUser) {
          setUser(null);
          setLoading(false);
          return;
        }

        try {
          // Ensure user profile exists
          await syncUserProfile(
            db,
            firebaseUser
          );

          // Fetch firestore user data
          const userRef = doc(
            db,
            'users',
            firebaseUser.uid
          );

          const userSnap = await getDoc(userRef);

          const firestoreData =
            userSnap.data();

          // Merge firebase auth + firestore data
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName:
              firebaseUser.displayName,
            photoURL:
              firebaseUser.photoURL,

            ...firestoreData,
          });
        } catch (err) {
          console.error(
            'Profile sync error:',
            err
          );
        } finally {
          setLoading(false);
        }
      }
    );

    return () => unsubscribe();
  }, [auth, db]);

  return {
    user,
    loading,
  };
}
