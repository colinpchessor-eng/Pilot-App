'use client';

import { useEffect, useRef, useState } from 'react';

type FramesResponse = { frames: string[] };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function GlobalBackgroundController() {
  const [frames, setFrames] = useState<string[]>([]);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/network-map-frames')
      .then((r) => r.json() as Promise<FramesResponse>)
      .then((data) => {
        if (cancelled) return;
        if (Array.isArray(data.frames) && data.frames.length > 0) {
          setFrames(data.frames);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (frames.length === 0) return;

    let ticking = false;
    let scrollY = 0;
    let lastIndex = -1;

    const update = () => {
      const denom = document.body.scrollHeight - window.innerHeight;
      const progress = denom <= 0 ? 0 : scrollY / denom;
      const idx = clamp(Math.round(progress * (frames.length - 1)), 0, frames.length - 1);

      if (idx !== lastIndex) {
        lastIndex = idx;
        document.documentElement.style.setProperty(
          '--global-bg-image',
          `url("${frames[idx]}")`
        );
      }

      ticking = false;
    };

    const onScroll = () => {
      scrollY = window.scrollY;
      if (!ticking) {
        ticking = true;
        rafRef.current = requestAnimationFrame(update);
      }
    };

    // initialize
    document.documentElement.style.setProperty('--global-bg-image', `url("${frames[0]}")`);
    onScroll();

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [frames]);

  return null;
}

