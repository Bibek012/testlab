'use client';

import { useEffect, useState } from 'react';
import { Query, onSnapshot, QuerySnapshot, DocumentData, FirestoreError } from 'firebase/firestore';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '../errors';

export function useCollection<T = DocumentData>(query: Query<T> | null) {
  const [data, setData] = useState<(T & { id: string })[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | any>(null);

  useEffect(() => {
    if (!query) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = onSnapshot(
      query,
      (snapshot: QuerySnapshot<T>) => {
        const items = snapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        }));
        setData(items);
        setLoading(false);
        setError(null);
      },
      async (serverError: FirestoreError) => {
        if (serverError.code === 'permission-denied') {
          const permissionError = new FirestorePermissionError({
            path: (query as any)._query?.path?.toString() || 'unknown',
            operation: 'list',
          } satisfies SecurityRuleContext);
          
          errorEmitter.emit('permission-error', permissionError);
          setError(permissionError);
        } else if (serverError.code === 'unavailable' || serverError.code === 'deadline-exceeded') {
          // Handle connection timeouts or offline states without logging critical console errors
          const connError = new Error("The database is currently unreachable. Please check your internet connection.");
          (connError as any).code = serverError.code;
          setError(connError);
        } else {
          setError(serverError);
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [query]);

  return { data, loading, error };
}
