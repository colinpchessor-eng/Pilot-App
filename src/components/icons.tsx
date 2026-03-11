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
      viewBox="0 0 220 48"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="FedexFlow Logo"
      {...props}
    >
      <text
        x="0"
        y="36"
        fontFamily="Inter, sans-serif"
        fontSize="36"
        fontWeight="bold"
        letterSpacing="-1"
      >
        <tspan fill={fedColor}>Fedex</tspan>
        <tspan fill={exColor}>Flow</tspan>
      </text>
    </svg>
  ),
};
