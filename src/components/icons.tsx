'use client';

import { FedExBrandMark } from '@/components/brand/fedex-brand-mark';

export const Icons = {
  logo: ({
    className,
    height = 32,
  }: {
    className?: string;
    /** Pixel height for the FedEx wordmark image */
    height?: number;
  }) => <FedExBrandMark className={className} height={height} />,
};
