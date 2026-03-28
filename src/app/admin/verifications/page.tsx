import { redirect } from 'next/navigation';

/** Legacy route: identity verification queue now lives on the admin dashboard. */
export default function AdminVerificationsRedirectPage() {
  redirect('/admin#identity-verifications');
}
