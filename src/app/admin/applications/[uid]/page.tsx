'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

/** Legacy URL — all admin application views use `/admin/review/[uid]`. */
export default function AdminApplicationRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const uid = typeof params.uid === 'string' ? params.uid : '';

  useEffect(() => {
    if (uid && uid !== '_') {
      router.replace(`/admin/review/${uid}`);
    } else {
      router.replace('/admin');
    }
  }, [uid, router]);

  return (
    <div className="flex items-center justify-center py-24 text-[#8E8E8E] text-sm">
      Opening application review…
    </div>
  );
}
