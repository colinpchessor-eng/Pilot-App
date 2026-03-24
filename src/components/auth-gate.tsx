'use client';

import { useEffect, useMemo, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import type { ApplicantData, VerificationStatus } from '@/lib/types';
import { buildDefaultApplicantData } from '@/lib/default-applicant';
import { createSessionCookie, clearSessionCookie } from '@/app/auth/actions';

function normalizeStatus(value: unknown): VerificationStatus {
  if (value === 'token_sent' || value === 'verified') return value;
  return 'pending';
}

function getRedirectForStatus(pathname: string, status: VerificationStatus) {
  if (pathname.startsWith('/admin')) return null;
  if (pathname.startsWith('/verify/request')) return null;
  if (pathname.startsWith('/verify/token')) return null;
  if (pathname === '/login' || pathname === '/signup' || pathname === '/' || pathname === '/dashboard') return null;
  return null;
}

export function AuthGate() {
  const router = useRouter();
  const pathname = usePathname();
  const firestore = useFirestore();
  const { user, loading: authLoading } = useUser();
  const ranRef = useRef(false);

  const shouldProtect = useMemo(() => {
    if (pathname === '/login' || pathname === '/signup' || pathname === '/') return false;
    return pathname.startsWith('/dashboard') || pathname.startsWith('/admin') || pathname.startsWith('/verify');
  }, [pathname]);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      clearSessionCookie();
      if (shouldProtect) router.replace('/login');
      return;
    }

    if (ranRef.current) return;
    ranRef.current = true;

    (async () => {
      const userRef = doc(firestore, 'users', user.uid);
      const snap = await getDoc(userRef);

      let data: ApplicantData;
      if (!snap.exists()) {
        data = buildDefaultApplicantData({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
        });
        await setDoc(userRef, data);
      } else {
        data = snap.data() as ApplicantData;
      }

      const status = normalizeStatus((data as any).status);
      const isAdmin = (data as any).isAdmin === true;
      const role = (data as any).role ?? (isAdmin ? 'admin' : '');

      const idToken = await user.getIdToken();
      await createSessionCookie(idToken);

      const redirect = getRedirectForStatus(pathname, status);
      if (redirect) {
        router.replace(redirect);
        return;
      }

      if (pathname.startsWith('/admin') && role !== 'admin') {
        router.replace('/dashboard');
        return;
      }

      if (status === 'verified' && pathname.startsWith('/verify')) {
        router.replace('/dashboard');
        return;
      }
    })().finally(() => {
      ranRef.current = false;
    });
  }, [authLoading, firestore, pathname, router, shouldProtect, user]);

  return null;
}
