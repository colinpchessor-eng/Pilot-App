'use client';

import { ReactNode } from 'react';
import { initializeFirebase } from '.';
import { FirebaseProvider, type FirebaseContextValue } from './provider';

let firebasePromise: Promise<FirebaseContextValue> | null = null;

function getFirebaseClient() {
  if (firebasePromise) {
    return firebasePromise;
  }

  firebasePromise = new Promise((resolve) => {
    const firebase = initializeFirebase();
    resolve(firebase);
  });

  return firebasePromise;
}

export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  const firebase = getFirebaseClient();
  return (
    // @ts-expect-error Server Component
    <FirebaseProvider value={firebase}>{children}</FirebaseProvider>
  );
}
