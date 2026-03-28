import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type DocumentData, type Firestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

let adminApp: App;
let adminAuth: Auth;
let adminFirestore: Firestore;

/** Prefer hyphenated name; underscore variant matches common download naming. */
function readLocalServiceAccountJson(): object | null {
  const candidates = [
    path.join(process.cwd(), 'scripts', 'service-account.json'),
    path.join(process.cwd(), 'scripts', 'service_account.json'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, 'utf8')) as object;
    }
  }
  return null;
}

function getAdminApp() {
  if (!adminApp) {
    if (getApps().length === 0) {
      const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
      if (serviceAccountJson) {
        const serviceAccount = JSON.parse(serviceAccountJson);
        adminApp = initializeApp({ credential: cert(serviceAccount) });
      } else {
        const localAccount = readLocalServiceAccountJson();
        if (localAccount) {
          adminApp = initializeApp({ credential: cert(localAccount) });
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

function userDocIsAdmin(data: DocumentData | undefined): boolean {
  const r = data?.role;
  return !!(data?.isAdmin || r === 'admin' || r === 'dev');
}

export async function verifyIsAdmin(idToken: string): Promise<{ uid: string; email: string }> {
  const decoded = await verifyIdToken(idToken);
  const userDoc = await getAdminFirestore().collection('users').doc(decoded.uid).get();
  const data = userDoc.data();

  if (!userDocIsAdmin(data)) {
    throw new Error('Unauthorized: not an admin');
  }

  return { uid: decoded.uid, email: decoded.email || '' };
}

/** Developer Tools API routes and destructive actions — `role: dev` only. */
export async function verifyDevToolsAccess(idToken: string): Promise<{ uid: string; email: string }> {
  const decoded = await verifyIdToken(idToken);
  const userDoc = await getAdminFirestore().collection('users').doc(decoded.uid).get();
  const data = userDoc.data();

  if (data?.role !== 'dev') {
    throw new Error('Unauthorized: developer role required');
  }

  return { uid: decoded.uid, email: decoded.email || '' };
}

export async function verifyCallerIsDev(idToken: string): Promise<{ uid: string; email: string }> {
  return verifyDevToolsAccess(idToken);
}
