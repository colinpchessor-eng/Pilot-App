'use client';

import { useState, useEffect } from 'react';
import {
  onSnapshot,
  doc,
  getDoc,
  type DocumentReference,
  type DocumentData,
} from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';

export function useDoc<T extends DocumentData>(
  ref: DocumentReference<T> | undefined | null,
  options: { listen: boolean } = { listen: true }
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const firestore = useFirestore();

  useEffect(() => {
    if (!ref) {
      // If there's no ref, we are still waiting for it, so loading is not finished.
      // We keep loading as true and wait for a valid ref.
      return;
    }

    setLoading(true); // Ensure loading is true when we start fetching a new ref

    if (options.listen) {
      const unsubscribe = onSnapshot(
        ref,
        (doc) => {
          setData(doc.exists() ? doc.data() : null);
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
          setData(doc.exists() ? doc.data() : null);
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
