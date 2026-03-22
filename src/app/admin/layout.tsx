'use client';

import type { ApplicantData } from '@/lib/types';
import { useUser, useDoc, useFirestore } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { doc } from 'firebase/firestore';
import { InteriorNavbar } from '@/components/layout/InteriorNavbar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const userDocRef = user ? doc(firestore, 'users', user.uid) : undefined;
  const { data: applicantData, loading: appDataLoading } =
    useDoc<ApplicantData>(userDocRef);

  const loading = userLoading || (user && appDataLoading);

  useEffect(() => {
    if (!loading) {
      const isAdmin = !!applicantData?.isAdmin || applicantData?.role === 'admin';
      if (!user || !isAdmin) {
        router.push('/login');
      }
    }
  }, [user, applicantData, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'linear-gradient(160deg, #f5f0ff 0%, #fafafa 40%, #fff8f4 100%)' }}>
        <p className="text-[#8E8E8E] text-sm">Loading Admin Portal...</p>
      </div>
    );
  }

  if (!applicantData?.isAdmin && applicantData?.role !== 'admin') {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'linear-gradient(160deg, #f5f0ff 0%, #fafafa 40%, #fff8f4 100%)' }}>
        <p className="text-[#8E8E8E] text-sm">Access Denied. Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="light-theme min-h-screen" style={{ background: 'linear-gradient(160deg, #f5f0ff 0%, #fafafa 40%, #fff8f4 100%)' }}>
      <InteriorNavbar />
      <main className="mx-auto max-w-[1200px] px-4 sm:px-6 py-8 print:p-0 text-[#333333]">
        {children}
      </main>
    </div>
  );
}
