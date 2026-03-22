'use client';

import { useEffect, useRef, useState } from 'react';

type FramesResponse = { frames: string[] };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function HeroMapScroll() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [frames, setFrames] = useState<string[]>([]);
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/network-map-frames')
      .then((r) => r.json() as Promise<FramesResponse>)
      .then((data) => {
        if (cancelled) return;
        if (Array.isArray(data.frames) && data.frames.length > 0) {
          setFrames(data.frames);
          setSrc(data.frames[0] ?? null);
        }
      })
      .catch(() => {});
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
        // Progress only within hero viewport band
        const total = rect.height + viewportH;
        const offset = viewportH - rect.top; // starts when hero enters from bottom
        const raw = total <= 0 ? 0 : offset / total;
        const t = clamp(raw, 0, 1);
        const idx = Math.round(t * (frames.length - 1));
        setSrc(frames[idx] ?? frames[0] ?? null);
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
  }, [frames]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full rounded-2xl border border-white/15 overflow-hidden"
      style={{
        backgroundColor: 'rgba(0,0,0,0.45)',
        boxShadow:
          '0 18px 50px rgba(0,0,0,0.65), 0 0 40px rgba(88,28,135,0.35)',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src ?? '/assets/network-map-static.webp'}
        alt="FedEx global route network"
        className="w-full h-full object-cover"
        style={{
          transform: 'scale(0.96)',
          transformOrigin: 'center center',
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-black/60 via-transparent to-black/65" />
    </div>
  );
}

