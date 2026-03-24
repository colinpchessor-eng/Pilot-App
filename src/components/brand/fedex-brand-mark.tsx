'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

/** PNG first (official raster with transparency), then SVG. Files in `public/assets/`. */
const LOGO_SOURCES = ['/assets/fedex-official-logo.png', '/assets/fedex-official-logo.svg'] as const;

type FedExBrandMarkProps = {
  className?: string;
  /** CSS pixel height; width scales from asset aspect ratio */
  height?: number;
};

/**
 * Official FedEx wordmark image with text fallback.
 *
 * Add your approved asset (e.g. the transparent PNG you were given) as:
 * - **`public/assets/fedex-official-logo.png`** (recommended)
 * - optionally `public/assets/fedex-official-logo.svg`
 *
 * Served as `/assets/fedex-official-logo.png` (or `.svg`). If both are missing or fail to load,
 * falls back to styled “FedEx®” text matching app colors.
 */
export function FedExBrandMark({ className, height = 28 }: FedExBrandMarkProps) {
  const [sourceIndex, setSourceIndex] = useState(0);

  if (sourceIndex >= LOGO_SOURCES.length) {
    return (
      <span
        className={cn('inline-flex items-center font-bold italic leading-none', className)}
        style={{ fontSize: Math.max(14, height * 0.72) }}
      >
        <span className="text-[#4D148C]">Fed</span>
        <span className="text-[#FF6200]">Ex</span>
        <span className="ml-0.5 align-top text-[0.55em] text-[#FF6200]">®</span>
      </span>
    );
  }

  const src = LOGO_SOURCES[sourceIndex];

  return (
    <img
      src={src}
      alt="FedEx"
      height={height}
      className={cn('w-auto max-w-[200px] object-contain object-left', className)}
      style={{ height }}
      onError={() => setSourceIndex((i) => i + 1)}
    />
  );
}
