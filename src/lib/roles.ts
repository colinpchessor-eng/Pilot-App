import type { ApplicantData } from '@/lib/types';

/** Developer: full access including Dev Tools and authorizedAdmins writes. */
export function isDev(userData: ApplicantData | Record<string, unknown> | undefined | null): boolean {
  if (!userData) return false;
  return (userData as ApplicantData).role === 'dev';
}

/** HR admin or developer — can use /admin (candidates, import, audit, etc.). */
export function isAdmin(userData: ApplicantData | Record<string, unknown> | undefined | null): boolean {
  if (!userData) return false;
  const d = userData as ApplicantData;
  const r = d.role;
  if (r === 'admin' || r === 'dev') return true;
  // Legacy documents: isAdmin without role
  if (d.isAdmin === true) return true;
  return false;
}

/** Dev Tools routes and dangerous APIs — developers only. */
export function canAccessDevTools(
  userData: ApplicantData | Record<string, unknown> | undefined | null
): boolean {
  return isDev(userData);
}
