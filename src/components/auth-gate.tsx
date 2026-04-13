'use client';

import { useEffect, useMemo, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import type { ApplicantData, VerificationStatus } from '@/lib/types';
import { buildDefaultApplicantData } from '@/lib/default-applicant';
import { checkAuthorizedAdminRole } from '@/lib/authorized-admins';
import { canAccessDevTools, isAdmin as userIsStaff } from '@/lib/roles';
import { writeCandidateAuditLog } from '@/lib/candidate-audit';
import { createSessionCookie, clearSessionCookie } from '@/app/auth/actions';

function normalizeStatus(value: unknown): VerificationStatus {
  if (value === 'token_sent' || value === 'verified') return value;
  return 'pending';
}

function getRedirectForStatus(pathname: string, status: VerificationStatus) {
  if (pathname.startsWith('/admin')) return null;
  if (pathname.startsWith('/verify/request')) return null;
  if (pathname.startsWith('/verify/token')) return null;
  if (
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/' ||
    pathname === '/dashboard' ||
    pathname.startsWith('/schedule')
  ) {
    return null;
  }
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
    return (
      pathname.startsWith('/dashboard') ||
      pathname.startsWith('/admin') ||
      pathname.startsWith('/verify') ||
      pathname.startsWith('/schedule')
    );
  }, [pathname]);

  useEffect(() => {
    if (authLoading) return;

    // Only clear the session cookie when bouncing off a protected route. Clearing on
    // every `!user` (e.g. /login) raced with post-sign-in: cookie was set, then a
    // brief `!user` frame wiped it before the first navigation to /admin.
    if (!user) {
      if (shouldProtect) {
        void clearSessionCookie();
        router.replace('/login');
      }
      return;
    }

    if (ranRef.current) return;
    ranRef.current = true;

    (async () => {
      const userRef = doc(firestore, 'users', user.uid);
      const snap = await getDoc(userRef);

      let data: ApplicantData;
      if (!snap.exists()) {
        const base = buildDefaultApplicantData({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
        });
        const staffRole =
          user.email != null ? await checkAuthorizedAdminRole(firestore, user.email) : null;
        data = staffRole
          ? {
              ...base,
              role: staffRole,
              isAdmin: true,
              status: 'verified',
              verifiedAt: serverTimestamp() as any,
              candidateId: '',
              skipCandidateVerification: true,
            }
          : base;
        await setDoc(userRef, data);
        try {
          await writeCandidateAuditLog(firestore, {
            uid: user.uid,
            action: 'candidate_registered',
            candidateName: (user.displayName || '').trim(),
            candidateEmail: user.email,
            candidateId: '',
          });
        } catch (e) {
          console.error('candidate_registered audit:', e);
        }
      } else {
        data = snap.data() as ApplicantData;
      }

      const status = normalizeStatus((data as any).status);

      const idToken = await user.getIdToken();
      await createSessionCookie(idToken);

      const redirect = getRedirectForStatus(pathname, status);
      if (redirect) {
        router.replace(redirect);
        return;
      }

      if (pathname.startsWith('/admin/devtools') && !canAccessDevTools(data)) {
        router.replace('/admin');
        return;
      }

      if (pathname.startsWith('/admin') && !userIsStaff(data)) {
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
