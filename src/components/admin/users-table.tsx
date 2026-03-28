'use client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import type { ApplicantData } from '@/lib/types';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useIdToken } from '@/firebase/auth/use-id-token';
import { useToast } from '@/hooks/use-toast';
import { adminSetUserAdmin } from '@/app/admin/actions';
import { isDev } from '@/lib/roles';

export function UsersTable({ users }: { users: ApplicantData[] }) {
  const { user: adminUser } = useUser();
  const firestore = useFirestore();
  const selfRef = adminUser ? doc(firestore, 'users', adminUser.uid) : undefined;
  const { data: selfData } = useDoc<ApplicantData>(selfRef);
  const canToggleAdmin = isDev(selfData);
  const { getIdToken } = useIdToken();
  const { toast } = useToast();

  const handleAdminChange = async (
    targetUser: ApplicantData,
    isAdmin: boolean
  ) => {
    if (!adminUser) return;

    if (adminUser.uid === targetUser.uid) {
      toast({
        variant: 'destructive',
        title: 'Action Forbidden',
        description: 'You cannot remove your own admin status.',
      });
      return;
    }

    try {
      const idToken = await getIdToken();
      const result = await adminSetUserAdmin({
        idToken,
        targetUid: targetUser.uid,
        isAdmin,
      });

      if (result.success) {
        toast({
          title: 'Success',
          description: `${targetUser.email} is ${
            isAdmin ? 'now an admin' : 'no longer an admin'
          }.`,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.message,
        });
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update admin status.',
      });
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="text-center">Admin access</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length > 0 ? (
            users.map((user) => (
              <TableRow key={user.uid}>
                <TableCell className="font-medium">{user.email}</TableCell>
                <TableCell>
                  {user.firstName || user.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : 'N/A'}
                </TableCell>
                <TableCell>
                  {user.role === 'dev' ? (
                    <span
                      className="inline-block rounded px-2 py-0.5 text-xs font-bold"
                      style={{ background: 'rgba(77,20,140,0.1)', color: '#4D148C' }}
                    >
                      Developer
                    </span>
                  ) : user.isAdmin || user.role === 'admin' ? (
                    <span
                      className="inline-block rounded px-2 py-0.5 text-xs font-bold"
                      style={{ background: 'rgba(0,122,183,0.1)', color: '#007AB7' }}
                    >
                      HR Admin
                    </span>
                  ) : (
                    <span className="text-sm text-[#8E8E8E]">Candidate</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {user.role === 'dev' ? (
                    <span className="text-xs text-[#565656]">Managed in Firestore</span>
                  ) : (
                    <span
                      className="admin-tooltip inline-block"
                      title={
                        canToggleAdmin
                          ? 'Grant or remove HR admin access'
                          : 'Only developers can change admin access'
                      }
                    >
                      <span className="admin-tooltip-text">
                        {canToggleAdmin
                          ? 'Grant or remove HR admin access'
                          : 'Only developers can change admin access'}
                      </span>
                      <Switch
                        checked={!!user.isAdmin}
                        disabled={!canToggleAdmin}
                        onCheckedChange={(checked) => handleAdminChange(user, checked)}
                        aria-label="HR admin access"
                      />
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center">
                No users found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
