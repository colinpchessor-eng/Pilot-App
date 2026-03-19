'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type FramesResponse = { frames: string[] };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function computeProgress() {
  const denom = document.body.scrollHeight - window.innerHeight;
  if (denom <= 0) return 0;
  return clamp(window.scrollY / denom, 0, 1);
}

export function GlobalBackgroundCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [frames, setFrames] = useState<string[]>([]);

  // Cache decoded images (sparse filled as they load)
  const bitmapsRef = useRef<(ImageBitmap | null)[]>([]);
  const loadingRef = useRef<Set<number>>(new Set());
  const lastDrawnRef = useRef<number>(-1);
  const rafRef = useRef<number | null>(null);

  const dpr = useMemo(() => (typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1), []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/network-map-frames')
      .then((r) => r.json() as Promise<FramesResponse>)
      .then((data) => {
        if (cancelled) return;
        if (Array.isArray(data.frames) && data.frames.length > 0) {
          setFrames(data.frames);
          bitmapsRef.current = new Array(data.frames.length).fill(null);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep canvas sized to viewport
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.round(w * (window.devicePixelRatio || 1));
      canvas.height = Math.round(h * (window.devicePixelRatio || 1));
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      // Force redraw after resize
      lastDrawnRef.current = -1;
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [dpr]);

  const requestFrame = async (idx: number) => {
    if (!frames[idx]) return;
    if (bitmapsRef.current[idx]) return;
    if (loadingRef.current.has(idx)) return;
    loadingRef.current.add(idx);

    try {
      const res = await fetch(frames[idx]);
      const blob = await res.blob();
      const bmp = await createImageBitmap(blob);
      bitmapsRef.current[idx] = bmp;
    } catch {
      // ignore
    } finally {
      loadingRef.current.delete(idx);
    }
  };

  const draw = (idx: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bmp = bitmapsRef.current[idx];
    if (!bmp) return;

    const cw = canvas.width;
    const ch = canvas.height;
    ctx.clearRect(0, 0, cw, ch);

    // "Less zoomed" than cover: use a slight zoom-out factor
    const zoomOut = 0.92;

    const iw = bmp.width;
    const ih = bmp.height;

    // Cover sizing then apply zoomOut to show more of image
    const scaleCover = Math.max(cw / iw, ch / ih) * zoomOut;
    const dw = iw * scaleCover;
    const dh = ih * scaleCover;

    const dx = (cw - dw) / 2;
    const dy = (ch - dh) / 2;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bmp, dx, dy, dw, dh);
  };

  // Main RAF loop: scrub frame index by scroll progress
  useEffect(() => {
    if (frames.length === 0) return;

    let cancelled = false;

    // Preload the first frame immediately
    void requestFrame(0);

    const tick = () => {
      if (cancelled) return;
      const progress = computeProgress();
      const idx = clamp(Math.round(progress * (frames.length - 1)), 0, frames.length - 1);

      // Preload a small window around the target frame for smoothness
      for (let i = idx - 2; i <= idx + 2; i++) {
        const j = clamp(i, 0, frames.length - 1);
        void requestFrame(j);
      }

      if (idx !== lastDrawnRef.current && bitmapsRef.current[idx]) {
        draw(idx);
        lastDrawnRef.current = idx;
      } else if (lastDrawnRef.current === -1 && bitmapsRef.current[0]) {
        // Initial paint
        draw(0);
        lastDrawnRef.current = 0;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [frames]);

  return (
    <div className="global-bg" aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}

