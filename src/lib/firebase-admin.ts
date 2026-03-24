import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

let adminApp: App;
let adminAuth: Auth;
let adminFirestore: Firestore;

function getAdminApp() {
  if (!adminApp) {
    if (getApps().length === 0) {
      const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
      if (serviceAccountJson) {
        const serviceAccount = JSON.parse(serviceAccountJson);
        adminApp = initializeApp({ credential: cert(serviceAccount) });
      } else {
        const localPath = path.join(process.cwd(), 'scripts', 'service-account.json');
        if (fs.existsSync(localPath)) {
          const serviceAccount = JSON.parse(fs.readFileSync(localPath, 'utf8'));
          adminApp = initializeApp({ credential: cert(serviceAccount) });
        } else {
          adminApp = initializeApp();
        }
      }
    } else {
      adminApp = getApps()[0];
    }
  }
  return adminApp;
}

export function getAdminAuth(): Auth {
  if (!adminAuth) {
    adminAuth = getAuth(getAdminApp());
  }
  return adminAuth;
}

export function getAdminFirestore(): Firestore {
  if (!adminFirestore) {
    adminFirestore = getFirestore(getAdminApp());
  }
  return adminFirestore;
}

export async function verifyIdToken(idToken: string) {
  return getAdminAuth().verifyIdToken(idToken);
}

export async function verifyIsAdmin(idToken: string): Promise<{ uid: string; email: string }> {
  const decoded = await verifyIdToken(idToken);
  const userDoc = await getAdminFirestore().collection('users').doc(decoded.uid).get();
  const data = userDoc.data();

  if (!data?.isAdmin) {
    throw new Error('Unauthorized: not an admin');
  }

  return { uid: decoded.uid, email: decoded.email || '' };
}
