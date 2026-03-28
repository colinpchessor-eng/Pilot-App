import { Suspense } from 'react';
import { AdminActivityPageClient } from '@/components/admin/admin-activity-page-client';

export default function AdminActivityPage() {
  return (
    <Suspense fallback={<div className="text-[#8E8E8E] text-sm py-12 text-center">Loading…</div>}>
      <AdminActivityPageClient />
    </Suspense>
  );
}
