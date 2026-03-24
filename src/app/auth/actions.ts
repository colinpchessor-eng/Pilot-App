'use server';

import { cookies } from 'next/headers';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase-admin';

const SESSION_COOKIE = 'ff_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 5; // 5 days in seconds

export async function createSessionCookie(idToken: string) {
  try {
    const decodedToken = await getAdminAuth().verifyIdToken(idToken);
    const sessionCookie = await getAdminAuth().createSessionCookie(idToken, {
      expiresIn: SESSION_MAX_AGE * 1000,
    });

    const db = getAdminFirestore();
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    const userData = userDoc.data();

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, sessionCookie, {
      maxAge: SESSION_MAX_AGE,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax',
    });

    return {
      success: true,
      role: userData?.isAdmin ? 'admin' : (userData?.role || ''),
      status: userData?.status || 'pending',
    };
  } catch (error) {
    console.error('Failed to create session cookie:', error);
    return { success: false, role: '', status: 'pending' };
  }
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function verifySessionCookie(): Promise<{
  authenticated: boolean;
  uid: string;
  role: string;
  status: string;
} | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE)?.value;

    if (!sessionCookie) return null;

    const decodedClaims = await getAdminAuth().verifySessionCookie(sessionCookie, true);
    const db = getAdminFirestore();
    const userDoc = await db.collection('users').doc(decodedClaims.uid).get();
    const userData = userDoc.data();

    return {
      authenticated: true,
      uid: decodedClaims.uid,
      role: userData?.isAdmin ? 'admin' : (userData?.role || ''),
      status: userData?.status || 'pending',
    };
  } catch {
    return null;
  }
}
