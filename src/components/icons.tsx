import type { SVGProps } from 'react';

export const Icons = {
  logo: ({
    fedColor = 'hsl(var(--primary))',
    exColor = 'hsl(var(--accent))',
    ...props
  }: SVGProps<SVGSVGElement> & {
    fedColor?: string;
    exColor?: string;
  }) => (
    <svg
      viewBox="0 0 240 48"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="FedExFlow Logo"
      {...props}
    >
      <text
        x="120"
        y="36"
        textAnchor="middle"
        fontFamily="Inter, sans-serif"
        fontSize="36"
        fontWeight="bold"
        letterSpacing="-1"
      >
        <tspan fill={fedColor}>Fed</tspan>
        <tspan fill={exColor}>ExFlow</tspan>
      </text>
    </svg>
  ),
};
