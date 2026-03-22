'use client';

import { UsersTable } from '@/components/admin/users-table';
import { useFirestore } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import type { ApplicantData } from '@/lib/types';
import { collection, query } from 'firebase/firestore';
import { useMemo } from 'react';
import { Users } from 'lucide-react';

export default function ManageUsersPage() {
  const firestore = useFirestore();
  const usersQuery = useMemo(
    () => query(collection(firestore, 'users')),
    [firestore]
  );
  const { data: allUsers, loading, error } = useCollection<ApplicantData>(usersQuery);

  if (loading) return <div className="text-[#8E8E8E] text-sm py-12 text-center">Loading users...</div>;
  if (error) return <div className="text-[#DE002E] text-sm py-12 text-center">Error loading users: {error.message}</div>;

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-[28px] font-bold text-[#333333]">Manage Users</h1>
        <p className="text-[14px] text-[#8E8E8E] mt-1">View all registered users and manage their admin status</p>
      </div>

      {(!allUsers || allUsers.length === 0) ? (
        <div className="bg-white rounded-xl border border-[#E3E3E3] shadow-[0_2px_12px_rgba(0,0,0,0.06)] flex flex-col items-center justify-center py-16">
          <Users className="h-12 w-12 text-[#E3E3E3] mb-4" />
          <h3 className="text-[15px] font-semibold text-[#333333]">No users found</h3>
          <p className="text-[13px] text-[#8E8E8E] mt-1">No users have registered yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#E3E3E3] shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="p-5">
            <UsersTable users={allUsers} />
          </div>
        </div>
      )}
    </div>
  );
}
