'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

/** FDX Onboard wordmark; `public/assets/FDX_Onboard_logo_dark_transparent.png`. */
const LOGO_SOURCES = ['/assets/FDX_Onboard_logo_dark_transparent.png'] as const;

type FedExBrandMarkProps = {
  className?: string;
  /** CSS pixel height; width scales from asset aspect ratio */
  height?: number;
};

/**
 * Brand mark image with text fallback matching app colors.
 * Asset: `public/assets/FDX_Onboard_logo_dark_transparent.png`
 */
export function FedExBrandMark({ className, height = 28 }: FedExBrandMarkProps) {
  const [sourceIndex, setSourceIndex] = useState(0);

  if (sourceIndex >= LOGO_SOURCES.length) {
    return (
      <span
        className={cn('inline-flex items-center font-bold leading-none', className)}
        style={{ fontSize: Math.max(14, height * 0.72) }}
      >
        <span className="text-[#4D148C]">FDX</span>
        <span className="ml-1 text-[#FF6200]">ONBOARD</span>
      </span>
    );
  }

  const src = LOGO_SOURCES[sourceIndex];

  return (
    <img
      src={src}
      alt="FDX Onboard"
      height={height}
      className={cn('w-auto max-w-[min(320px,85vw)] object-contain object-left', className)}
      style={{ height }}
      onError={() => setSourceIndex((i) => i + 1)}
    />
  );
}
