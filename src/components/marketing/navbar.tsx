'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-[100] h-[72px]',
        scrolled ? 'bg-[rgba(8,6,20,0.75)] border-b border-[rgba(107,33,232,0.2)] shadow-[0_4px_30px_rgba(0,0,0,0.5),0_0_60px_rgba(107,33,232,0.06)]' : 'bg-[rgba(8,6,20,0.5)] border-b border-[rgba(255,255,255,0.08)] shadow-[0_4px_30px_rgba(0,0,0,0.3)]',
        'backdrop-blur-[24px] saturate-[180%]'
      )}
    >
      <div className="flex h-full w-full items-center justify-between px-6 md:px-12">
        <Link href="/" className="leading-none">
          <span style={{ color: '#6b21e8', fontWeight: 900, fontSize: 20 }}>
            FedEx
          </span>
          <span
            style={{
              color: '#ff6200',
              fontSize: '0.6em',
              display: 'block',
              marginTop: 2,
              letterSpacing: 0.6,
            }}
          >
            Express
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-8 text-[14px] font-normal text-white">
          <Link className="navlink-underline hover:text-[var(--color-accent-orange)]" href="/">
            Home
          </Link>
          <a className="navlink-underline hover:text-[var(--color-accent-orange)]" href="#pathways">
            Purple Runway Program
          </a>
          <a className="navlink-underline hover:text-[var(--color-accent-orange)]" href="#network">
            Fleet &amp; Routes
          </a>
          <Link className="navlink-underline hover:text-[var(--color-accent-orange)]" href="/dashboard">
            My Application
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="btn-3d-ghost px-5 py-2 text-white text-sm font-medium"
            style={{
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 18,
              background: 'transparent',
            }}
          >
            Log In
          </Link>
          <Link
            href="/signup"
            className="px-6 py-2 text-sm font-bold text-white"
            style={{
              background: 'linear-gradient(135deg, #6b21e8 0%, #ff6200 100%)',
              borderRadius: 24,
              boxShadow: '0 4px 20px rgba(107,33,232,0.4)',
            }}
          >
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}

