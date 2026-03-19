'use client';
import { useState, useEffect } from 'react';
import {
  onSnapshot,
  getDocs,
  type Query,
  type DocumentData,
} from 'firebase/firestore';

export function useCollection<T extends DocumentData>(
  q: Query<DocumentData> | undefined | null,
  options: { listen: boolean } = { listen: true }
) {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!q) {
      setLoading(false);
      return;
    }

    if (options.listen) {
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const docs = snapshot.docs.map((doc) => doc.data() as T);
          setData(docs);
          setLoading(false);
        },
        (err) => {
          setError(err);
          setLoading(false);
        }
      );
      return () => unsubscribe();
    } else {
      getDocs(q)
        .then((snapshot) => {
          const docs = snapshot.docs.map((doc) => doc.data() as T);
          setData(docs);
          setLoading(false);
        })
        .catch((err) => {
          setError(err);
          setLoading(false);
        });
    }
  }, [q, options.listen]);

  return { data, loading, error };
}
