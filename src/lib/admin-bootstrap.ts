/** Must match `firestore.rules` bootstrap admin email check. */
export const BOOTSTRAP_ADMIN_EMAIL = 'fedexadmin@fedex.com';

export function isBootstrapAdminEmail(email: string | null | undefined): boolean {
  return (email || '').trim().toLowerCase() === BOOTSTRAP_ADMIN_EMAIL;
}
