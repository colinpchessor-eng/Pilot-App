'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useUser, useDoc, useFirestore } from '@/firebase';
import { cn } from '@/lib/utils';
import { Calendar, LogOut, Menu, X, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getAuth, signOut } from 'firebase/auth';
import { doc, collection, query, where } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import type { ApplicantData } from '@/lib/types';
import { FedExBrandMark } from '@/components/brand/fedex-brand-mark';

export function InteriorNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const userDocRef = user ? doc(firestore, 'users', user.uid) : undefined;
  const { data: userData } = useDoc<ApplicantData>(userDocRef);
  const isAdmin = !!userData?.isAdmin || userData?.role === 'admin';

  const pendingVerifQuery = useMemo(
    () => query(collection(firestore, 'pendingVerifications'), where('status', '==', 'pending')),
    [firestore]
  );
  const pendingDeletionsQuery = useMemo(
    () => query(collection(firestore, 'deletionRequests'), where('status', '==', 'pending')),
    [firestore]
  );
  const { data: pendingVerifs } = useCollection<any>(pendingVerifQuery);
  const { data: pendingDeletions } = useCollection<any>(pendingDeletionsQuery);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSignOut = async () => {
    const auth = getAuth();
    await signOut(auth);
    const { clearSessionCookie } = await import('@/app/auth/actions');
    await clearSessionCookie();
    router.push('/');
  };

  const navItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'My Application', href: '/dashboard/application', requiresVerified: true },
    { label: 'Purple Runway Program', href: '#' },
    { label: 'Fleet & Routes', href: '#' },
    { label: 'Help', href: '#' },
  ];

  const adminNavItems: {
    label: string;
    href: string;
    dot?: string;
    Icon?: LucideIcon;
  }[] = [
    { label: 'Dashboard', href: '/admin' },
    { label: 'Candidates', href: '/admin/candidates' },
    { label: 'Import', href: '/admin/import' },
    { label: 'Interviews', href: '/admin/interviews', Icon: Calendar },
    { label: 'Verifications', href: '/admin/verifications', dot: (pendingVerifs?.length ?? 0) > 0 ? '#FF6200' : undefined },
    { label: 'Users', href: '/admin/users' },
    { label: 'Deletions', href: '/admin/deletions', dot: (pendingDeletions?.length ?? 0) > 0 ? '#DE002E' : undefined },
    { label: 'Audit Log', href: '/admin/audit' },
  ];

  const isVerified = userData?.status === 'verified';
  const isOnAdminPage = pathname.startsWith('/admin');

  const userInitials = user?.email?.[0].toUpperCase() || 'U';

  const allDesktopItems = isOnAdminPage
    ? [
        ...navItems.slice(0, 1),
        { label: '__divider__', href: '' },
        ...adminNavItems,
      ]
    : isAdmin
    ? [
        ...navItems,
        { label: '__divider__', href: '' },
        { label: 'Admin', href: '/admin' },
      ]
    : navItems;

  const allMobileItems = isOnAdminPage
    ? [...navItems.slice(0, 1), ...adminNavItems]
    : isAdmin
    ? [...navItems, { label: 'Admin', href: '/admin' }]
    : navItems;

  return (
    <div className="interior-navbar sticky top-0 z-50 w-full pointer-events-none">
      {/* Layer 1: Top Bar */}
      <div className="h-[36px] w-full bg-white/85 backdrop-blur-md border-b border-[#E3E3E3] flex items-center justify-between px-6 pointer-events-auto">
        <Link href="/" className="flex items-center">
          <FedExBrandMark height={26} />
        </Link>
        <div className="flex items-center gap-4">
          <button 
            onClick={handleSignOut}
            className="flex items-center gap-2 text-xs font-bold text-[#565656] hover:text-[#4D148C] transition-colors"
          >
            <LogOut className="h-3 w-3" />
            Logout
          </button>
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#4D148C] to-[#FF6200] flex items-center justify-center text-white text-xs font-bold shadow-sm">
            {userInitials}
          </div>
        </div>
      </div>

      {/* Background radial gradient behind pill area */}
      <div className="absolute top-[36px] left-0 right-0 h-[200px] bg-[radial-gradient(ellipse_80%_200px_at_50%_0%,rgba(77,20,140,0.06)_0%,transparent_100%)] -z-10" />

      {/* Layer 2: Floating Pill Navbar */}
      <nav className={cn(
        "relative mt-2.5 mx-auto w-[calc(100%-48px)] max-w-[1200px] h-[52px] pointer-events-auto transition-all duration-300",
        "bg-white/72 backdrop-blur-[20px] saturate-[180%] border border-white/90 rounded-full",
        "flex items-center px-5 gap-1 shadow-[0_4px_24px_rgba(77,20,140,0.10),0_1px_4px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.95)]",
        scrolled && "bg-white/88 shadow-[0_8px_32px_rgba(77,20,140,0.15),0_2px_8px_rgba(0,0,0,0.10)]"
      )}>
        {/* Pill Logo */}
        <Link href="/" className="mr-4 flex shrink-0 items-center">
          <FedExBrandMark height={24} />
        </Link>

        {/* Desktop Nav Items */}
        <div className="hidden md:flex items-center gap-0.5 overflow-x-auto scrollbar-none">
          {allDesktopItems.map((item, i) => {
            if (item.label === '__divider__') {
              return <div key={`div-${i}`} className="mx-2 shrink-0" style={{ width: 1, height: 20, background: 'rgba(0,0,0,0.15)' }} />;
            }
            const isActive = item.href === '/admin'
              ? pathname === '/admin' || (pathname.startsWith('/admin/applications') && item.href === '/admin')
              : pathname === item.href;
            const dot = item.dot;
            const NavIcon = item.Icon;
            const locked = (item as { requiresVerified?: boolean }).requiresVerified && !isVerified;
            if (locked) {
              return (
                <span
                  key={item.label + item.href}
                  title="Verify your Candidate ID to access your application"
                  className="px-3 py-2 rounded-full text-[13px] font-medium text-[#8E8E8E] cursor-not-allowed whitespace-nowrap shrink-0 relative select-none opacity-50"
                >
                  {item.label}
                </span>
              );
            }
            return (
              <Link
                key={item.label + item.href}
                href={item.href}
                className={cn(
                  "inline-flex items-center px-3 py-2 rounded-full text-[13px] font-medium text-[#333333] transition-all duration-200 whitespace-nowrap shrink-0 relative",
                  "hover:bg-[#4D148C]/[0.08] hover:text-[#4D148C]",
                  isActive && "bg-[#4D148C]/[0.12] text-[#4D148C] font-semibold"
                )}
              >
                {NavIcon && <NavIcon className="h-3.5 w-3.5 mr-1.5 shrink-0 opacity-90" />}
                {item.label}
                {dot && <span className="inline-block ml-1.5 align-middle rounded-full" style={{ width: 7, height: 7, background: dot }} />}
              </Link>
            );
          })}
        </div>

        {/* Right Side Action */}
        <div className="ml-auto flex items-center shrink-0">
          {!isOnAdminPage &&
            (isVerified ? (
              <Link href="/dashboard/application">
                <Button className="hidden sm:flex bg-gradient-to-br from-[#4D148C] via-[#7D22C3] to-[#FF6200] text-white rounded-full px-5 py-2 text-[13px] font-bold shadow-[0_2px_12px_rgba(77,20,140,0.3)] transition-all hover:brightness-110 hover:-translate-y-0.5">
                  My Application
                </Button>
              </Link>
            ) : (
              <Button
                disabled
                title="Verify your Candidate ID to access your application"
                className="hidden sm:flex bg-[#E3E3E3] text-[#8E8E8E] rounded-full px-5 py-2 text-[13px] font-bold cursor-not-allowed shadow-none"
              >
                My Application
              </Button>
            ))}

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden ml-4 p-2 text-[#4D148C] transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="absolute top-full left-0 right-0 mt-3 p-2 bg-white/95 backdrop-blur-[20px] rounded-2xl border border-[#E3E3E3] shadow-xl animate-in fade-in zoom-in-95 duration-200 md:hidden">
            <div className="flex flex-col gap-1">
              {allMobileItems.map((item) => {
                const isActive = pathname === item.href;
                const dot = (item as { dot?: string }).dot;
                const MobileNavIcon = (item as { Icon?: LucideIcon }).Icon;
                const mobileLocked = (item as { requiresVerified?: boolean }).requiresVerified && !isVerified;
                if (mobileLocked) {
                  return (
                    <span
                      key={item.label + item.href}
                      className="px-4 py-3 rounded-xl text-sm font-medium text-[#8E8E8E] cursor-not-allowed opacity-50 select-none"
                    >
                      {item.label}
                    </span>
                  );
                }
                return (
                  <Link
                    key={item.label + item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center px-4 py-3 rounded-xl text-sm font-medium text-[#333333] transition-all",
                      "hover:bg-[#4D148C]/[0.08] hover:text-[#4D148C]",
                      isActive && "bg-[#4D148C]/[0.12] text-[#4D148C] font-semibold"
                    )}
                  >
                    {MobileNavIcon && <MobileNavIcon className="h-4 w-4 mr-2 shrink-0 opacity-90" />}
                    {item.label}
                    {dot && <span className="inline-block ml-1.5 align-middle rounded-full" style={{ width: 7, height: 7, background: dot }} />}
                  </Link>
                );
              })}
              {!isOnAdminPage &&
                (isVerified ? (
                  <Link
                    href="/dashboard/application"
                    className="mt-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Button className="w-full bg-gradient-to-br from-[#4D148C] via-[#7D22C3] to-[#FF6200] text-white rounded-xl py-6 text-sm font-bold">
                      My Application
                    </Button>
                  </Link>
                ) : (
                  <Button
                    disabled
                    className="mt-2 w-full bg-[#E3E3E3] text-[#8E8E8E] rounded-xl py-6 text-sm font-bold cursor-not-allowed shadow-none"
                  >
                    My Application
                  </Button>
                ))}
            </div>
          </div>
        )}
      </nav>
    </div>
  );
}
