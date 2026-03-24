
'use client';
import { Icons } from '@/components/icons';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useUser } from '@/firebase';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getAuth, signOut } from 'firebase/auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { clearSessionCookie } from '@/app/auth/actions';

export function AdminHeader({ className }: { className?: string }) {
  const { user } = useUser();
  const router = useRouter();

  const handleSignOut = async () => {
    const auth = getAuth();
    await signOut(auth);
    await clearSessionCookie();
    router.push('/login');
  };

  return (
    <header className={cn("sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#3d3850] px-4 sm:px-6", className)} style={{ background: '#1E1A2B', color: '#ffffff' }}>
      <Link
        href="/admin"
        className="flex items-center gap-2"
        aria-label="Back to admin home"
      >
        <Icons.logo height={32} />
        <span className="hidden font-semibold sm:inline-block text-white">
          Admin Portal
        </span>
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="relative h-10 w-10 rounded-full"
          >
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary font-semibold text-primary-foreground">
                AD
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">
                {user?.email}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                Administrator
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
