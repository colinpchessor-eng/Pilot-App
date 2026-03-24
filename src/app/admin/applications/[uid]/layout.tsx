import type { ReactNode } from 'react';

/** Placeholder path for static export; use Firebase Hosting rewrites so real uids serve this HTML. */
export function generateStaticParams() {
  return [{ uid: '_' }];
}

export default function AdminApplicationUidLayout({ children }: { children: ReactNode }) {
  return children;
}
