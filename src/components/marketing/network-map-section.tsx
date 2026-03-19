'use client';

import { useScrollReveal } from '@/hooks/useScrollReveal';

export function NetworkMapSection() {
  const ref = useScrollReveal<HTMLDivElement>({ threshold: 0.2 });

  return (
    <section className="w-full py-16 md:py-24">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="mb-6 flex items-end justify-between gap-4">
          <h2 className="text-2xl md:text-3xl font-bold uppercase tracking-wider">
            Aviation Network Map
          </h2>
          <p className="text-sm text-muted-foreground max-w-lg">
            A global operation demands precision. Your career can, too.
          </p>
        </div>

        <div ref={ref} className="relative overflow-hidden rounded-md border border-white/10 glass-card reveal-map">
          <div className="absolute inset-0 bg-gradient-to-tr from-black/45 via-transparent to-black/35 pointer-events-none" />
          <div className="h-[340px] w-full" />
        </div>
      </div>
    </section>
  );
}

