'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminAuditLogPanel } from '@/components/admin/admin-audit-log-panel';
import { AdminEmailLogPanel } from '@/components/admin/admin-email-log-panel';

export type AdminActivityTab = 'audit' | 'email';

export function AdminActivityPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab: AdminActivityTab = searchParams.get('tab') === 'email' ? 'email' : 'audit';

  const onTabChange = (value: string) => {
    const next: AdminActivityTab = value === 'email' ? 'email' : 'audit';
    router.replace(`/admin/activity?tab=${next}`, { scroll: false });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-bold text-[#333333]">Activity</h1>
        <p className="text-[14px] text-[#8E8E8E] mt-1">Audit log and outbound email</p>
      </div>
      <Tabs value={tab} onValueChange={onTabChange}>
        <TabsList className="bg-[#F2F2F2]">
          <TabsTrigger value="audit" className="data-[state=active]:bg-white">
            Audit log
          </TabsTrigger>
          <TabsTrigger value="email" className="data-[state=active]:bg-white">
            Email log
          </TabsTrigger>
        </TabsList>
        <TabsContent value="audit" className="mt-6">
          <AdminAuditLogPanel embedded />
        </TabsContent>
        <TabsContent value="email" className="mt-6">
          <AdminEmailLogPanel embedded />
        </TabsContent>
      </Tabs>
    </div>
  );
}
