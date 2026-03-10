'use client';

import { ReactNode } from 'react';
import { initializeFirebase } from '.';
import { FirebaseProvider, type FirebaseContextValue } from './provider';

// This pattern ensures that Firebase is initialized only once on the client.
let firebaseInstance: FirebaseContextValue | null = null;
function getFirebaseInstance() {
  if (!firebaseInstance) {
    firebaseInstance = initializeFirebase();
  }
  return firebaseInstance;
}

export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  const firebase = getFirebaseInstance();

  return <FirebaseProvider value={firebase}>{children}</FirebaseProvider>;
}
