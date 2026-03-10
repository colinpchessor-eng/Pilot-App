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
      viewBox="0 0 162 48"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="FedEx Logo"
      {...props}
    >
      <g fillRule="evenodd">
        <path
          d="M0 48V0h13.382C22.25 0 27.5 5.5 27.5 13.5S22.25 27 13.382 27H9.838v21H0zm9.838-30.162h3.162c3.412 0 4.838-2.688 4.838-5.338s-1.426-5.338-4.838-5.338h-3.162v10.676zM58.384 48V0h21.5V9.838h-11.662v7.662h10.338v9.162h-10.338v11.5h11.838V48h-21.676zM88.59 48l-8.677-22.5h-1.323L70 48H58.84l13.84-35.338h11.178L97.698 48H88.59zM34.84 48V0h9.838v38.162h11.662V48H34.84z"
          fill={fedColor}
        />
        <path
          d="M104.985 48V0h21.5v9.838h-11.662v7.662h10.338v9.162h-10.338v11.5h11.838V48h-21.676zM133.722 47.323l8.676-13.838-8-12.823h11.5l2.662 4.838h.338l2.662-4.838h11.5l-8.162 12.823 8.338 13.838h-12.162l-3.5-6.5h-.338l-3.5 6.5h-12.014z"
          fill={exColor}
        />
      </g>
    </svg>
  ),
};
