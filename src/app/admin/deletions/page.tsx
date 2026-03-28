'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminDeletionsRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin#deletion-requests');
  }, [router]);
  return <div className="text-[#8E8E8E] text-sm py-12 text-center">Redirecting…</div>;
}
