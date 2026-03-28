'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useUser, useDoc, useFirestore } from '@/firebase';
import { cn } from '@/lib/utils';
import {
  Bell,
  Calendar,
  ChevronDown,
  LogOut,
  Menu,
  Settings,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getAuth, signOut } from 'firebase/auth';
import { doc } from 'firebase/firestore';
import type { ApplicantData } from '@/lib/types';
import { canAccessDevTools } from '@/lib/devtools-access';
import { FedExBrandMark } from '@/components/brand/fedex-brand-mark';

function displayInitials(user: { displayName?: string | null; email?: string | null } | null): string {
  if (!user) return 'U';
  const name = user.displayName?.trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  const email = user.email ?? '';
  return (email.slice(0, 2) || 'U').toUpperCase();
}

type NavLinkFields = {
  label: string;
  href: string;
  dot?: string;
  Icon?: LucideIcon;
  devToolsDanger?: boolean;
  requiresVerified?: boolean;
};

type AdminDesktopEntry =
  | ({ kind: 'link' } & NavLinkFields)
  | {
      kind: 'dropdown';
      label: string;
      Icon?: LucideIcon;
      devToolsDanger?: boolean;
      items: { label: string; href: string }[];
    };

type DesktopPiece =
  | { type: 'divider' }
  | { type: 'link' } & NavLinkFields
  | {
      type: 'dropdown';
      label: string;
      Icon?: LucideIcon;
      devToolsDanger?: boolean;
      items: { label: string; href: string }[];
    };

type MobileAdminRow =
  | { kind: 'link' } & NavLinkFields
  | { kind: 'subheader'; label: string; devToolsDanger?: boolean };

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
    router.push('/login');
  };

  const navItems: NavLinkFields[] = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'My Application', href: '/dashboard/application', requiresVerified: true },
    { label: 'Purple Runway Program', href: '#' },
    { label: 'Fleet & Routes', href: '#' },
    { label: 'Help', href: '#' },
  ];

  const adminDesktopEntries = useMemo((): AdminDesktopEntry[] => {
    const showDev = canAccessDevTools(userData ?? undefined);
    const entries: AdminDesktopEntry[] = [
      { kind: 'link', label: 'Dashboard', href: '/admin' },
      { kind: 'link', label: 'Candidates', href: '/admin/candidates' },
      { kind: 'link', label: 'Import', href: '/admin/import' },
      { kind: 'link', label: 'Interviews', href: '/admin/interviews', Icon: Calendar },
      { kind: 'link', label: 'Activity', href: '/admin/activity' },
    ];
    if (showDev) {
      entries.push({
        kind: 'dropdown',
        label: 'Dev Tools',
        Icon: Wrench,
        devToolsDanger: true,
        items: [
          { label: 'Dev Tools', href: '/admin/devtools' },
          { label: 'Role Management', href: '/admin/users' },
        ],
      });
    } else {
      entries.push({ kind: 'link', label: 'Role Management', href: '/admin/users' });
    }
    return entries;
  }, [userData]);

  const adminMobileRows = useMemo((): MobileAdminRow[] => {
    const showDev = canAccessDevTools(userData ?? undefined);
    const rows: MobileAdminRow[] = [
      { kind: 'link', label: 'Dashboard', href: '/admin' },
      { kind: 'link', label: 'Candidates', href: '/admin/candidates' },
      { kind: 'link', label: 'Import', href: '/admin/import' },
      { kind: 'link', label: 'Interviews', href: '/admin/interviews', Icon: Calendar },
      { kind: 'link', label: 'Activity', href: '/admin/activity' },
    ];
    if (showDev) {
      rows.push({ kind: 'subheader', label: 'Dev Tools', devToolsDanger: true });
      rows.push({ kind: 'link', label: 'Dev Tools', href: '/admin/devtools', Icon: Wrench, devToolsDanger: true });
      rows.push({ kind: 'link', label: 'Role Management', href: '/admin/users', devToolsDanger: true });
    } else {
      rows.push({ kind: 'link', label: 'Role Management', href: '/admin/users' });
    }
    return rows;
  }, [userData]);

  const desktopPieces = useMemo((): DesktopPiece[] => {
    if (pathname.startsWith('/admin')) {
      return [
        { type: 'link', ...navItems[0]! },
        { type: 'divider' },
        ...adminDesktopEntries.map((e): DesktopPiece => {
          if (e.kind === 'link') {
            return {
              type: 'link',
              label: e.label,
              href: e.href,
              dot: e.dot,
              Icon: e.Icon,
              devToolsDanger: e.devToolsDanger,
              requiresVerified: e.requiresVerified,
            };
          }
          return {
            type: 'dropdown',
            label: e.label,
            Icon: e.Icon,
            devToolsDanger: e.devToolsDanger,
            items: e.items,
          };
        }),
      ];
    }
    if (isAdmin) {
      return [
        ...navItems.map((n) => ({ type: 'link' as const, ...n })),
        { type: 'divider' },
        { type: 'link', label: 'Admin', href: '/admin' },
      ];
    }
    return navItems.map((n) => ({ type: 'link' as const, ...n }));
  }, [pathname, isAdmin, adminDesktopEntries]);

  const mobilePieces = useMemo((): (MobileAdminRow | NavLinkFields)[] => {
    if (pathname.startsWith('/admin')) {
      return [navItems[0]!, ...adminMobileRows];
    }
    if (isAdmin) {
      return [...navItems, { label: 'Admin', href: '/admin' }];
    }
    return navItems;
  }, [pathname, isAdmin, adminMobileRows]);

  const isVerified = userData?.status === 'verified';
  const isOnAdminPage = pathname.startsWith('/admin');

  const brandHref = user
    ? isOnAdminPage || isAdmin
      ? '/admin'
      : '/dashboard'
    : '/login';

  const userInitials = displayInitials(user);
  const roleLabel = useMemo(() => {
    if (isAdmin) return 'Administrator';
    if (isVerified) return 'Verified pilot';
    return 'Applicant';
  }, [isAdmin, isVerified]);

  function linkIsActive(href: string): boolean {
    if (href === '/admin') {
      return pathname === '/admin' || pathname.startsWith('/admin/applications');
    }
    return pathname === href;
  }

  return (
    <div className="interior-navbar sticky top-0 z-50 w-full pointer-events-none pt-4 sm:pt-6">
      {/* Background radial gradient behind pill */}
      <div className="pointer-events-none absolute left-0 right-0 top-0 -z-10 h-[200px] bg-[radial-gradient(ellipse_80%_200px_at_50%_0%,rgba(77,20,140,0.06)_0%,transparent_100%)]" />

      {/* Floating pill: brand + nav + pilot toolbar (notifications, settings, avatar) */}
      <nav
        className={cn(
          'relative mx-auto mt-0 flex h-[60px] w-[calc(100%-32px)] max-w-[1200px] items-center gap-1 rounded-full border border-white/90 px-3 shadow-[0_4px_24px_rgba(77,20,140,0.10),0_1px_4px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-[20px] transition-all duration-300 sm:w-[calc(100%-48px)] sm:px-5',
          'bg-white/72 saturate-[180%] pointer-events-auto',
          scrolled &&
            'bg-white/88 shadow-[0_8px_32px_rgba(77,20,140,0.15),0_2px_8px_rgba(0,0,0,0.10)]'
        )}
      >
        {/* Pill Logo */}
        <Link href={brandHref} className="mr-4 flex shrink-0 items-center">
          <FedExBrandMark height={28} />
        </Link>

        {/* Desktop Nav Items */}
        <div className="hidden md:flex items-center gap-0.5 overflow-x-auto scrollbar-none">
          {desktopPieces.map((piece, i) => {
            if (piece.type === 'divider') {
              return (
                <div
                  key={`div-${i}`}
                  className="mx-2 shrink-0"
                  style={{ width: 1, height: 23, background: 'rgba(0,0,0,0.15)' }}
                />
              );
            }
            if (piece.type === 'dropdown') {
              const dropdownActive = piece.items.some((it) => pathname === it.href);
              const NavIcon = piece.Icon;
              return (
                <DropdownMenu key={`dd-${piece.label}`}>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      aria-label={`${piece.label} menu`}
                      className={cn(
                        'inline-flex items-center px-3.5 py-2.5 rounded-full text-[15px] font-semibold transition-all duration-200 whitespace-nowrap shrink-0 relative text-[#DE002E] hover:bg-red-50 hover:text-[#DE002E] outline-none focus-visible:ring-2 focus-visible:ring-[#DE002E] focus-visible:ring-offset-2',
                        dropdownActive && 'bg-red-50 text-[#DE002E]'
                      )}
                    >
                      {NavIcon && <NavIcon className="h-4 w-4 mr-1.5 shrink-0" />}
                      {piece.label}
                      <ChevronDown className="ml-0.5 h-4 w-4 shrink-0 opacity-80" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="border-[#E3E3E3]">
                    {piece.items.map((it) => (
                      <DropdownMenuItem key={it.href} asChild className="cursor-pointer focus:bg-[#4D148C]/10 focus:text-[#4D148C]">
                        <Link href={it.href}>{it.label}</Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            }
            const item = piece;
            const isActive = linkIsActive(item.href);
            const dot = item.dot;
            const NavIcon = item.Icon;
            const devToolsDanger = item.devToolsDanger;
            const locked = item.requiresVerified && !isVerified;
            if (locked) {
              return (
                <span
                  key={item.label + item.href}
                  title="Verify your Candidate ID to access your application"
                  className="px-3.5 py-2.5 rounded-full text-[15px] font-medium text-[#8E8E8E] cursor-not-allowed whitespace-nowrap shrink-0 relative select-none opacity-50"
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
                  'inline-flex items-center px-3.5 py-2.5 rounded-full text-[15px] font-medium transition-all duration-200 whitespace-nowrap shrink-0 relative',
                  devToolsDanger
                    ? 'text-[#DE002E] hover:bg-red-50 hover:text-[#DE002E] font-semibold'
                    : 'text-[#333333] hover:bg-[#4D148C]/[0.08] hover:text-[#4D148C]',
                  !devToolsDanger && isActive && 'bg-[#4D148C]/[0.12] text-[#4D148C] font-semibold',
                  devToolsDanger && isActive && 'bg-red-50 text-[#DE002E]'
                )}
              >
                {NavIcon && (
                  <NavIcon className={cn('h-4 w-4 mr-1.5 shrink-0', devToolsDanger ? 'opacity-100' : 'opacity-90')} />
                )}
                {item.label}
                {dot && (
                  <span
                    className="ml-1.5 inline-block align-middle rounded-full"
                    style={{ width: 7, height: 7, background: dot }}
                  />
                )}
              </Link>
            );
          })}
        </div>

        {/* Right: My Application + notifications + settings + avatar + mobile menu */}
        <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
          {!isOnAdminPage &&
            (isVerified ? (
              <Link href="/dashboard/application" className="hidden sm:block">
                <Button className="mr-1 rounded-full bg-gradient-to-br from-[#4D148C] via-[#7D22C3] to-[#FF6200] px-5 py-2.5 text-[15px] font-bold text-white shadow-[0_2px_12px_rgba(77,20,140,0.3)] transition-all hover:-translate-y-0.5 hover:brightness-110 lg:mr-2 lg:px-6">
                  My Application
                </Button>
              </Link>
            ) : (
              <Button
                disabled
                title="Verify your Candidate ID to access your application"
                className="mr-1 hidden cursor-not-allowed rounded-full bg-[#E3E3E3] px-5 py-2.5 text-[15px] font-bold text-[#8E8E8E] shadow-none sm:flex lg:mr-2 lg:px-6"
              >
                My Application
              </Button>
            ))}

          <button
            type="button"
            className="rounded-full p-2 text-[#4D148C] transition-colors hover:bg-[#4D148C]/10"
            aria-label="Notifications"
            title="Notifications"
          >
            <Bell className="h-5 w-5 sm:h-[23px] sm:w-[23px]" />
          </button>
          <Link
            href="/dashboard"
            className="rounded-full p-2 text-[#4D148C] transition-colors hover:bg-[#4D148C]/10"
            aria-label="Dashboard"
            title="Dashboard"
          >
            <Settings className="h-5 w-5 sm:h-[23px] sm:w-[23px]" />
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="ml-0.5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4D148C] focus-visible:ring-offset-2"
                aria-label="Account menu"
              >
                <Avatar className="h-9 w-9 ring-2 ring-white/90 shadow-md sm:h-10 sm:w-10">
                  {user?.photoURL ? (
                    <AvatarImage src={user.photoURL} alt="" referrerPolicy="no-referrer" />
                  ) : null}
                  <AvatarFallback className="bg-gradient-to-br from-[#4D148C] to-[#FF6200] text-[10px] font-bold text-white sm:text-xs">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 border-[#E3E3E3]" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="truncate text-sm font-medium leading-none text-[#333333]">
                    {user?.email ?? 'Account'}
                  </p>
                  <p className="text-xs leading-none text-[#8E8E8E]">{roleLabel}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-[#E3E3E3]" />
              <DropdownMenuItem asChild className="cursor-pointer focus:bg-[#4D148C]/10 focus:text-[#4D148C]">
                <Link href="/dashboard">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-[#E3E3E3]" />
              <DropdownMenuItem
                className="cursor-pointer text-[#DE002E] focus:bg-red-50 focus:text-[#DE002E]"
                onClick={() => void handleSignOut()}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            type="button"
            className="p-2 text-[#4D148C] transition-colors md:hidden"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="absolute top-full left-0 right-0 mt-3 p-2 bg-white/95 backdrop-blur-[20px] rounded-2xl border border-[#E3E3E3] shadow-xl animate-in fade-in zoom-in-95 duration-200 md:hidden">
            <div className="flex flex-col gap-1">
              {mobilePieces.map((row) => {
                if ('kind' in row && row.kind === 'subheader') {
                  return (
                    <div
                      key={`sub-${row.label}`}
                      className={cn(
                        'px-4 pt-2 pb-0 text-[11px] font-bold uppercase tracking-wide',
                        row.devToolsDanger ? 'text-[#DE002E]' : 'text-[#8E8E8E]'
                      )}
                    >
                      {row.label}
                    </div>
                  );
                }
                const item = row as NavLinkFields;
                const isActive = linkIsActive(item.href);
                const dot = item.dot;
                const MobileNavIcon = item.Icon;
                const mobileDevDanger = item.devToolsDanger;
                const mobileLocked = item.requiresVerified && !isVerified;
                if (mobileLocked) {
                  return (
                    <span
                      key={item.label + item.href}
                      className="px-4 py-3 rounded-xl text-[15px] font-medium text-[#8E8E8E] cursor-not-allowed opacity-50 select-none"
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
                      'flex items-center px-4 py-3 rounded-xl text-[15px] font-medium transition-all',
                      mobileDevDanger
                        ? 'font-semibold text-[#DE002E] hover:bg-red-50 hover:text-[#DE002E]'
                        : 'text-[#333333] hover:bg-[#4D148C]/[0.08] hover:text-[#4D148C]',
                      !mobileDevDanger && isActive && 'bg-[#4D148C]/[0.12] text-[#4D148C] font-semibold',
                      mobileDevDanger && isActive && 'bg-red-50 text-[#DE002E]'
                    )}
                  >
                    {MobileNavIcon && (
                      <MobileNavIcon
                        className={cn('mr-2 h-[18px] w-[18px] shrink-0', mobileDevDanger ? 'opacity-100' : 'opacity-90')}
                      />
                    )}
                    {item.label}
                    {dot && (
                      <span
                        className="ml-1.5 inline-block align-middle rounded-full"
                        style={{ width: 7, height: 7, background: dot }}
                      />
                    )}
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
