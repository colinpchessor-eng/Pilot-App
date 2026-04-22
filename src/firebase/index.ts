import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';

import { firebaseConfig } from './config';

export function initializeFirebase(): {
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  storage: FirebaseStorage;
} {
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

  if (typeof window !== 'undefined') {
    if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN) {
      // @ts-expect-error -- Firebase reads this global to enable debug mode
      self.FIREBASE_APPCHECK_DEBUG_TOKEN = process.env.NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN;
    }

    const recaptchaKey = process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY;
    if (recaptchaKey && recaptchaKey !== "your-recaptcha-enterprise-site-key") {
      initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(recaptchaKey),
        isTokenAutoRefreshEnabled: true,
      });
    } else {
      console.warn("Skipping App Check initialization because NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY is not set.");
    }
  }

  const auth = getAuth(app);
  const firestore = getFirestore(app);
  const storage = getStorage(app);

  return { app, auth, firestore, storage };
}

export * from './provider';
export * from './auth/use-user';
export * from './auth/use-id-token';
export * from './firestore/use-doc';
export * from './firestore/use-collection';
