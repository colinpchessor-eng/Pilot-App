'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminAuditLogPanel } from '@/components/admin/admin-audit-log-panel';
import { AdminEmailLogPanel } from '@/components/admin/admin-email-log-panel';
import { AdminInboundMailPanel } from '@/components/admin/admin-inbound-mail-panel';

export type AdminActivityTab = 'audit' | 'email' | 'inbound';

export function AdminActivityPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const tab: AdminActivityTab =
    tabParam === 'email' ? 'email' : tabParam === 'inbound' ? 'inbound' : 'audit';

  const onTabChange = (value: string) => {
    const next: AdminActivityTab =
      value === 'email' ? 'email' : value === 'inbound' ? 'inbound' : 'audit';
    router.replace(`/admin/activity?tab=${next}`, { scroll: false });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-bold text-[#333333]">Activity</h1>
        <p className="text-[14px] text-[#8E8E8E] mt-1">Audit log, outbound email, and inbound support mail</p>
      </div>
      <Tabs value={tab} onValueChange={onTabChange}>
        <TabsList className="bg-[#F2F2F2]">
          <TabsTrigger value="audit" className="data-[state=active]:bg-white">
            Audit log
          </TabsTrigger>
          <TabsTrigger value="email" className="data-[state=active]:bg-white">
            Email log
          </TabsTrigger>
          <TabsTrigger value="inbound" className="data-[state=active]:bg-white">
            Inbound
          </TabsTrigger>
        </TabsList>
        <TabsContent value="audit" className="mt-6">
          <AdminAuditLogPanel embedded />
        </TabsContent>
        <TabsContent value="email" className="mt-6">
          <AdminEmailLogPanel embedded />
        </TabsContent>
        <TabsContent value="inbound" className="mt-6">
          <AdminInboundMailPanel embedded />
        </TabsContent>
      </Tabs>
    </div>
  );
}
