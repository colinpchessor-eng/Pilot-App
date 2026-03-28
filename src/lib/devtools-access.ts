import type { ApplicantData } from '@/lib/types';

/** Developer Tools visibility: dev builds, or production admin with `devToolsEnabled`. */
export function canAccessDevTools(userData: ApplicantData | undefined | null): boolean {
  if (!userData) return false;
  const isAdmin = !!userData.isAdmin || userData.role === 'admin';
  if (!isAdmin) return false;
  if (process.env.NODE_ENV === 'development') return true;
  return userData.role === 'admin' && userData.devToolsEnabled === true;
}
