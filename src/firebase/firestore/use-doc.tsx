'use client';

import { useState, useEffect } from 'react';
import {
  onSnapshot,
  getDoc,
  type DocumentReference,
  type DocumentData,
} from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';

export function useDoc<T extends DocumentData>(
  ref: DocumentReference<DocumentData> | undefined | null,
  options: { listen: boolean } = { listen: true }
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const firestore = useFirestore();

  useEffect(() => {
    if (!ref) {
      // No document to load (e.g. signed out — user doc ref cleared). Reset so callers
      // don't keep stale data / spinners from the previous ref.
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true); // Ensure loading is true when we start fetching a new ref

    if (options.listen) {
      const unsubscribe = onSnapshot(
        ref,
        (doc) => {
          setData((doc.exists() ? (doc.data() as T) : null) as T | null);
          setLoading(false);
        },
        (err) => {
          setError(err);
          setLoading(false);
        }
      );
      return () => unsubscribe();
    } else {
      getDoc(ref)
        .then((doc) => {
          setData((doc.exists() ? (doc.data() as T) : null) as T | null);
          setLoading(false);
        })
        .catch((err) => {
          setError(err);
          setLoading(false);
        });
    }
  }, [ref?.path, options.listen]);

  return { data, loading, error };
}
