import { Icons } from '@/components/icons';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import Link from 'next/link';

export default function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { recordLocator: string };
}) {
  const userInitials = params.recordLocator.substring(0, 2).toUpperCase();

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
            <div className="flex flex-col text-right text-sm font-medium leading-tight">
              <span className="text-xs text-primary-foreground/80">
                Record Locator
              </span>
              <span>{params.recordLocator.toUpperCase()}</span>
            </div>
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
