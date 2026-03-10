'use client';

import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

// This is a client component that listens for Firestore permission errors
// and displays a toast notification.
export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handler = (error: FirestorePermissionError) => {
      console.error(error); // Also log the full error to the console for devs
      toast({
        variant: 'destructive',
        title: 'Permission Denied',
        description:
          'You do not have permission to perform this action. Check the console for details.',
        duration: 10000,
      });
    };

    errorEmitter.on('permission-error', handler);

    return () => {
      errorEmitter.removeListener('permission-error', handler);
    };
  }, [toast]);

  return null;
}
