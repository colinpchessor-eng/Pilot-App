'use client';

import { useAuth } from '@/firebase/provider';

export function useIdToken() {
  const auth = useAuth();

  async function getIdToken(): Promise<string> {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    return user.getIdToken();
  }

  return { getIdToken };
}
