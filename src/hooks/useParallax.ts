'use client';

import { useEffect } from 'react';

export function useParallax() {
  useEffect(() => {
    let ticking = false;
    let scrollY = 0;

    const update = () => {
      const denom = document.body.scrollHeight - window.innerHeight;
      const progress = denom <= 0 ? 0 : scrollY / denom;
      document.documentElement.style.setProperty('--scroll-y', `${scrollY}px`);
      document.documentElement.style.setProperty('--scroll-progress', `${progress}`);
      ticking = false;
    };

    const onScroll = () => {
      scrollY = window.scrollY;
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
}

