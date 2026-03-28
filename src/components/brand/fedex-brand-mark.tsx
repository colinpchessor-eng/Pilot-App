'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

/** Collective Engineering wordmark (FedEx Collective); `public/assets/collective_eng_2c_pos_rgb.svg`. */
const LOGO_SOURCES = ['/assets/collective_eng_2c_pos_rgb.svg'] as const;

type FedExBrandMarkProps = {
  className?: string;
  /** CSS pixel height; width scales from asset aspect ratio */
  height?: number;
};

/**
 * Brand mark image with text fallback matching app colors.
 * Asset: `public/assets/collective_eng_2c_pos_rgb.svg`
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
