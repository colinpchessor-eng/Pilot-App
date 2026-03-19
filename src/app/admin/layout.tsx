
'use client';
import type { ApplicantData } from '@/lib/types';
import { useUser, useDoc, useFirestore } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { doc } from 'firebase/firestore';
import { AdminHeader } from '@/components/admin/admin-header';
import {
  Sidebar,
  SidebarProvider,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { LayoutDashboard, Users, BadgeCheck } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const pathname = usePathname();

  const userDocRef = user ? doc(firestore, 'users', user.uid) : undefined;
  const { data: applicantData, loading: appDataLoading } =
    useDoc<ApplicantData>(userDocRef);

  const loading = userLoading || (user && appDataLoading);

  useEffect(() => {
    if (!loading) {
      const isAdmin = !!applicantData?.isAdmin || applicantData?.role === 'admin';
      if (!user || !isAdmin) {
        router.push('/login'); // Redirect non-admins to login
      }
    }
  }, [user, applicantData, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading Admin Portal...</p>
      </div>
    );
  }

  if (!applicantData?.isAdmin && applicantData?.role !== 'admin') {
    // This will show briefly before redirect effect runs
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Access Denied. Redirecting...</p>
      </div>
    );
  }

  const isDashboardActive = pathname === '/admin' || pathname.startsWith('/admin/applications');


  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full flex-col bg-muted/40">
        <AdminHeader className="print:hidden"/>
        <div className="flex flex-1">
          <Sidebar collapsible="icon" className="hidden lg:flex print:hidden">
            <SidebarContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isDashboardActive}
                    tooltip="Dashboard"
                  >
                    <Link href="/admin">
                      <LayoutDashboard />
                      <span>Dashboard</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === '/admin/users'}
                    tooltip="Manage Users"
                  >
                    <Link href="/admin/users">
                      <Users />
                      <span>Manage Users</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === '/admin/verifications'}
                    tooltip="Verifications"
                  >
                    <Link href="/admin/verifications">
                      <BadgeCheck />
                      <span>Verifications</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarContent>
          </Sidebar>
          <div className="flex flex-1 flex-col">
            <main className="flex-1 p-4 sm:p-6 print:p-0">{children}</main>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
