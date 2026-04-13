import { redirect } from 'next/navigation';

/** Legacy route: identity verification queue was removed; admin overview is on /admin. */
export default function AdminVerificationsRedirectPage() {
  redirect('/admin');
}
