'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { cn } from '@/lib/utils';
import { LogOut, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getAuth, signOut } from 'firebase/auth';

export function InteriorNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    router.push('/');
  };

  const navItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'My Application', href: '/dashboard/application' },
    { label: 'Purple Runway Program', href: '#' },
    { label: 'Fleet & Routes', href: '#' },
    { label: 'Help', href: '#' },
  ];

  const userInitials = user?.email?.[0].toUpperCase() || 'U';

  const FedExLogo = ({ className }: { className?: string }) => (
    <div className={cn("flex items-center font-bold italic", className)}>
      <span className="text-[#4D148C]">Fed</span>
      <span className="text-[#FF6200]">Ex</span>
      <span className="text-[#FF6200] ml-0.5 text-[0.6em] align-top">®</span>
    </div>
  );

  return (
    <div className="sticky top-0 z-50 w-full pointer-events-none">
      {/* Layer 1: Top Bar */}
      <div className="h-[36px] w-full bg-white/85 backdrop-blur-md border-b border-[#E3E3E3] flex items-center justify-between px-6 pointer-events-auto">
        <Link href="/">
          <FedExLogo className="text-xl" />
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
        <Link href="/" className="mr-4 shrink-0">
          <FedExLogo className="text-lg" />
        </Link>

        {/* Desktop Nav Items */}
        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium text-[#333333] transition-all duration-200 whitespace-nowrap",
                  "hover:bg-[#4D148C]/[0.08] hover:text-[#4D148C]",
                  isActive && "bg-[#4D148C]/[0.12] text-[#4D148C] font-semibold"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Right Side Action */}
        <div className="ml-auto flex items-center">
          <Link href="/dashboard/application">
            <Button className="hidden sm:flex bg-gradient-to-br from-[#4D148C] via-[#7D22C3] to-[#FF6200] text-white rounded-full px-5 py-2 text-[13px] font-bold shadow-[0_2px_12px_rgba(77,20,140,0.3)] transition-all hover:brightness-110 hover:-translate-y-0.5">
              My Application
            </Button>
          </Link>

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
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "px-4 py-3 rounded-xl text-sm font-medium text-[#333333] transition-all",
                      "hover:bg-[#4D148C]/[0.08] hover:text-[#4D148C]",
                      isActive && "bg-[#4D148C]/[0.12] text-[#4D148C] font-semibold"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
              <Link
                href="/dashboard/application"
                className="mt-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Button className="w-full bg-gradient-to-br from-[#4D148C] via-[#7D22C3] to-[#FF6200] text-white rounded-xl py-6 text-sm font-bold">
                  My Application
                </Button>
              </Link>
            </div>
          </div>
        )}
      </nav>
    </div>
  );
}
