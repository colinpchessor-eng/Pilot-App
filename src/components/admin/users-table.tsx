
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
import { useFirestore, useUser } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Badge } from '../ui/badge';

export function UsersTable({ users }: { users: ApplicantData[] }) {
  const firestore = useFirestore();
  const { user: adminUser } = useUser();
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

    const userDocRef = doc(firestore, 'users', targetUser.uid);
    updateDoc(userDocRef, { isAdmin })
      .then(() => {
        toast({
          title: 'Success',
          description: `${targetUser.email} is ${
            isAdmin ? 'now an admin' : 'no longer an admin'
          }.`,
        });
      })
      .catch(() => {
        const permissionError = new FirestorePermissionError({
          path: userDocRef.path,
          operation: 'update',
          requestResourceData: { isAdmin },
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="text-center">Admin Status</TableHead>
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
                <TableCell className="text-center">
                  {user.email?.toLowerCase() === 'fedexadmin@fedex.com' ? (
                    <Badge>Super Admin</Badge>
                  ) : (
                    <span className="admin-tooltip inline-block">
                      <span className="admin-tooltip-text">Grant or remove admin access for this user</span>
                      <Switch
                        checked={!!user.isAdmin}
                        onCheckedChange={(checked) =>
                          handleAdminChange(user, checked)
                        }
                        aria-label="Admin status"
                      />
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={3} className="h-24 text-center">
                No users found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
