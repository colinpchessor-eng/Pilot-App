'use client';

import { useEffect, useMemo, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import type { ApplicantData, VerificationStatus } from '@/lib/types';
import { buildDefaultApplicantData } from '@/lib/default-applicant';
import { deleteClientCookie, setClientCookie } from '@/lib/cookies';

const AUTH_COOKIE = 'ff_authed';
const STATUS_COOKIE = 'ff_status';
const ROLE_COOKIE = 'ff_role';

function normalizeStatus(value: unknown): VerificationStatus {
  if (value === 'token_sent' || value === 'verified') return value;
  return 'pending';
}

function getRedirectForStatus(pathname: string, status: VerificationStatus) {
  // Allow these routes regardless of status:
  if (pathname.startsWith('/admin')) return null;
  if (pathname.startsWith('/verify/request')) return null;
  if (pathname.startsWith('/verify/token')) return null;
  if (pathname === '/login' || pathname === '/signup' || pathname === '/') return null;

  if (status === 'pending') return '/verify/request';
  if (status === 'token_sent') return '/verify/token';
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
      // clear cookies on sign out / unauth
      deleteClientCookie(AUTH_COOKIE);
      deleteClientCookie(STATUS_COOKIE);
      deleteClientCookie(ROLE_COOKIE);

      if (shouldProtect) router.replace('/login');
      return;
    }

    // Ensure this effect only triggers once per navigation burst.
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
      const role = (data as any).role ?? ((data as any).isAdmin ? 'admin' : '');

      setClientCookie(AUTH_COOKIE, '1');
      setClientCookie(STATUS_COOKIE, status);
      if (role) setClientCookie(ROLE_COOKIE, String(role));
      else deleteClientCookie(ROLE_COOKIE);

      // Client-side guard: redirect based on status (non-admin routes)
      const redirect = getRedirectForStatus(pathname, status);
      if (redirect) {
        router.replace(redirect);
        return;
      }

      // Admin guard: require admin role/isAdmin
      if (pathname.startsWith('/admin') && role !== 'admin') {
        router.replace('/dashboard');
        return;
      }

      // If they're verified and they land on verify pages, bounce them out.
      if (status === 'verified' && pathname.startsWith('/verify')) {
        router.replace('/dashboard');
        return;
      }
    })().finally(() => {
      // allow future navigations to run
      ranRef.current = false;
    });
  }, [authLoading, firestore, pathname, router, shouldProtect, user]);

  return null;
}

