'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type FramesResponse = { frames: string[] };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function HeroScrollFrames() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [frames, setFrames] = useState<string[]>([]);
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/network-map-frames')
      .then((r) => r.json() as Promise<FramesResponse>)
      .then((data) => {
        if (!cancelled) setFrames(Array.isArray(data.frames) ? data.frames : []);
      })
      .catch(() => {
        if (!cancelled) setFrames([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || frames.length === 0) return;

    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const viewportH = window.innerHeight || 1;
        const total = rect.height - viewportH;
        const progressed = total <= 0 ? 0 : (-rect.top / total);
        const t = clamp(progressed, 0, 1);
        const idx = Math.round(t * (frames.length - 1));
        setFrameIndex(idx);
      });
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [frames.length]);

  const src = frames[frameIndex];

  // Preload a small window around current frame
  const preload = useMemo(() => {
    if (frames.length === 0) return [];
    const out: string[] = [];
    for (let i = frameIndex - 2; i <= frameIndex + 2; i++) {
      const idx = clamp(i, 0, frames.length - 1);
      out.push(frames[idx]);
    }
    return Array.from(new Set(out));
  }, [frameIndex, frames]);

  return (
    <div ref={containerRef} className="relative">
      {preload.map((p) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={p} src={p} alt="" className="hidden" />
      ))}

      <div className="sticky top-20">
        <div className="relative overflow-hidden rounded-md border bg-[var(--color-bg-secondary)]">
          <div className="absolute inset-0 bg-gradient-to-tr from-black/55 via-transparent to-black/45 pointer-events-none" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src || '/assets/network-map.webp'}
            alt="Neon global logistics network animation"
            className="h-[360px] md:h-[420px] w-full object-cover"
          />
        </div>
        <div className="mt-3 text-xs text-muted-foreground">
          Scroll to animate
        </div>
      </div>
    </div>
  );
}

