import { doc, getDoc, type Firestore } from 'firebase/firestore';

export type AuthorizedAdminRole = 'admin' | 'dev';

/**
 * Returns the assigned staff role if this email is listed and active in authorizedAdmins.
 * Document ID must be the lowercased email.
 */
export async function checkAuthorizedAdminRole(
  firestore: Firestore,
  email: string
): Promise<AuthorizedAdminRole | null> {
  const e = email.trim().toLowerCase();
  if (!e) return null;
  const ref = doc(firestore, 'authorizedAdmins', e);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const d = snap.data();
  if (d.active !== true) return null;
  const r = d.role;
  if (r === 'dev' || r === 'admin') return r;
  return null;
}
