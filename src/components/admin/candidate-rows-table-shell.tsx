import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Apple-style white card for admin tables listing candidates (FedEx theme colors). */
export const candidateRowsCardClass =
  'rounded-2xl border border-[#E3E3E3] bg-white shadow-[0_4px_24px_rgba(0,0,0,0.03)] overflow-hidden';

export const candidateRowsTableHeadRowClass = 'bg-[#F9F9FB] border-b border-[#E3E3E3]';
export const candidateRowsTableThClass =
  'px-6 py-5 text-left text-[11px] font-bold uppercase tracking-wider text-[#8E8E8E]';
export const candidateRowsTableBodyClass = 'divide-y divide-[#E3E3E3]/40';
export const candidateRowsTableTrClass =
  'h-14 transition-colors hover:bg-[#FAFAFA] group';
export const candidateRowsTableTdClass = 'px-6 py-4';
export const candidateRowsCardFooterClass =
  'flex items-center justify-between border-t border-[#E3E3E3]/60 bg-[#FAFAFA]/80 px-6 py-5 text-[13px] font-medium text-[#8E8E8E]';

type CandidateRowsTableShellProps = {
  tabs?: ReactNode;
  toolbar?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function CandidateRowsTableShell({
  tabs,
  toolbar,
  footer,
  children,
  className,
}: CandidateRowsTableShellProps) {
  return (
    <div className={cn(candidateRowsCardClass, className)}>
      {tabs != null && (
        <div className="border-b border-[#E3E3E3]/80 px-6 pt-6 sm:px-8">{tabs}</div>
      )}
      {toolbar != null && (
        <div className="border-b border-[#F2F2F2] px-6 py-3 sm:px-8">{toolbar}</div>
      )}
      <div className="overflow-x-auto">{children}</div>
      {footer}
    </div>
  );
}
