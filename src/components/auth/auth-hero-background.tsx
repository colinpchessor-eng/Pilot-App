'use client';

import { useEffect, useState } from 'react';

/** Place your looping hero clip at `public/assets/auth-hero.mp4` (served as `/assets/auth-hero.mp4`). */
const VIDEO_SRC = '/assets/auth-hero.mp4';
/** Optional first frame; if missing, the browser ignores a broken poster URL. */
const POSTER_SRC = '/assets/auth-hero-poster.jpg';
const FALLBACK_IMG = '/assets/network-map-animated.webp';

const mediaClassName =
  'h-full w-full object-cover opacity-40 mix-blend-multiply pointer-events-none';

export function AuthHeroBackground() {
  const [mode, setMode] = useState<'hydrating' | 'video' | 'static'>('hydrating');
  const [videoFailed, setVideoFailed] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setMode(mq.matches ? 'static' : 'video');
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  const showStatic =
    mode === 'hydrating' || mode === 'static' || videoFailed;

  if (showStatic) {
    return (
      <img
        src={FALLBACK_IMG}
        alt=""
        className={mediaClassName}
        decoding="async"
      />
    );
  }

  return (
    <video
      className={mediaClassName}
      autoPlay
      loop
      muted
      playsInline
      preload="auto"
      poster={POSTER_SRC}
      aria-hidden
      onError={() => setVideoFailed(true)}
    >
      <source src={VIDEO_SRC} type="video/mp4" />
    </video>
  );
}
