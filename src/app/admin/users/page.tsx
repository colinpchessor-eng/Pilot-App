
'use client';
import { UsersTable } from '@/components/admin/users-table';
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

export default function ManageUsersPage() {
  const firestore = useFirestore();
  const usersQuery = useMemo(
    () => query(collection(firestore, 'users')),
    [firestore]
  );
  const {
    data: allUsers,
    loading,
    error,
  } = useCollection<ApplicantData>(usersQuery);

  if (loading) {
    return <div>Loading users...</div>;
  }

  if (error) {
    return (
      <div className="text-destructive">
        Error loading users: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Manage Users</h1>
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            View all registered users and manage their admin status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UsersTable users={allUsers ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
