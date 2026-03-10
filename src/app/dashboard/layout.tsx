'use client';
import { Icons } from '@/components/icons';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useUser } from '@/firebase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { getAuth, signOut } from 'firebase/auth';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);
  
  const handleSignOut = async () => {
    const auth = getAuth();
    await signOut(auth);
    router.push('/');
  };

  const userInitials =
    user?.email?.substring(0, 2).toUpperCase() || '..';

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <header className="sticky top-0 z-50 w-full border-b bg-primary text-primary-foreground shadow-sm">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" aria-label="Back to home">
            <Icons.logo
              className="h-10 w-auto"
              fedColor="white"
              exColor="white"
            />
          </Link>
          <div className="flex items-center gap-4">
             <Button variant="ghost" size="sm" onClick={handleSignOut}>Sign Out</Button>
            <Avatar className="h-9 w-9 border-2 border-primary-foreground/50">
              <AvatarFallback className="bg-primary-foreground font-semibold text-primary">
                {userInitials}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="bg-primary text-primary-foreground/80">
        <div className="container py-4 text-center text-sm md:text-left">
          &copy; {new Date().getFullYear()} FedEx. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
