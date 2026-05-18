'use client';

import { useEffect, useState } from 'react';
import { DocumentReference, onSnapshot, DocumentSnapshot, DocumentData, FirestoreError } from 'firebase/firestore';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '../errors';

export function useDoc<T = DocumentData>(ref: DocumentReference<T> | null) {
  const [data, setData] = useState<(T & { id: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!ref) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = onSnapshot(
      ref,
      (snapshot: DocumentSnapshot<T>) => {
        if (snapshot.exists()) {
          setData({ ...snapshot.data()!, id: snapshot.id });
          setError(null);
        } else {
          setData(null);
          setError(new Error("Document does not exist"));
        }
        setLoading(false);
      },
      async (serverError: FirestoreError) => {
        // SILENT LOGGING: Prevent disruptive dev overlays for connection/permission issues.

        if (serverError.code === 'permission-denied') {
          const permissionError = new FirestorePermissionError({
            path: ref.path,
            operation: 'get',
          } satisfies SecurityRuleContext);
          
          errorEmitter.emit('permission-error', permissionError);
          setError(permissionError);
        } else if (serverError.code === 'unavailable') {
          setError(new Error("Server unreachable. Operating in offline mode."));
        } else {
          console.warn("Firestore [useDoc] non-critical error:", serverError.message);
          setError(serverError);
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [ref]);

  return { data, loading, error };
}
