'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const key = useMemo(() => pathname, [pathname]);
  const [phase, setPhase] = useState<'enter' | 'idle'>('enter');

  useEffect(() => {
    setPhase('enter');
    const t = window.setTimeout(() => setPhase('idle'), 300);
    return () => window.clearTimeout(t);
  }, [key]);

  return (
    <div
      key={key}
      className={
        phase === 'enter'
          ? 'opacity-0 translate-y-5 transition-all duration-300 ease-out'
          : 'opacity-100 translate-y-0 transition-all duration-300 ease-out'
      }
    >
      {children}
    </div>
  );
}

