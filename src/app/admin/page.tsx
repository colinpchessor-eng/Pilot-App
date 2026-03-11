
'use client';
import { AdminStats } from '@/components/admin/admin-stats';
import { ApplicationsTable } from '@/components/admin/applications-table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useFirestore } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import type { ApplicantData } from '@/lib/types';
import { collection, query } from 'firebase/firestore';
import { useMemo } from 'react';

export default function AdminDashboardPage() {
  const firestore = useFirestore();

  const usersQuery = useMemo(
    () => query(collection(firestore, 'users')),
    [firestore]
  );
  const {
    data: allUsers,
    loading: usersLoading,
    error: usersError,
  } = useCollection<ApplicantData>(usersQuery);

  const submittedApplications = useMemo(() => {
    return allUsers?.filter((user) => user.submittedAt) ?? [];
  }, [allUsers]);

  if (usersLoading) {
    return <div>Loading data...</div>;
  }

  if (usersError) {
    return (
      <div className="text-destructive">
        Error loading users: {usersError.message}
      </div>
    );
  }

  const totalUsers = allUsers?.length ?? 0;
  const totalSubmissions = submittedApplications.length;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      <AdminStats
        totalUsers={totalUsers}
        totalSubmissions={totalSubmissions}
      />
      <Card>
        <CardHeader>
          <CardTitle>Submitted Applications</CardTitle>
          <CardDescription>
            View and export all completed applications.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ApplicationsTable applications={submittedApplications} />
        </CardContent>
      </Card>
    </div>
  );
}
