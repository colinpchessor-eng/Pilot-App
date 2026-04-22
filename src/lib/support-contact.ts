/** Public contact points for the applicant help page; override via env in production. */
export const SUPPORT_EMAIL =
  typeof process.env.NEXT_PUBLIC_SUPPORT_EMAIL === 'string'
    ? process.env.NEXT_PUBLIC_SUPPORT_EMAIL
    : 'support@flyFDX.com';
