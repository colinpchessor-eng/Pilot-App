/** Public contact points for the applicant help page; override via env in production. */
export const SUPPORT_PHONE =
  typeof process.env.NEXT_PUBLIC_SUPPORT_PHONE === 'string'
    ? process.env.NEXT_PUBLIC_SUPPORT_PHONE
    : '1-800-000-0000';

export const SUPPORT_EMAIL =
  typeof process.env.NEXT_PUBLIC_SUPPORT_EMAIL === 'string'
    ? process.env.NEXT_PUBLIC_SUPPORT_EMAIL
    : 'pilotportal-support@fedex.com';
