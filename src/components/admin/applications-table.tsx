'use client';
import { Button } from '@/components/ui/button';
import type { ApplicantData } from '@/lib/types';
import { format } from 'date-fns';
import { decryptField, isEncrypted } from '@/lib/encryption';
import { unparse } from 'papaparse';
import { Download, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import {
  CandidateRowsTableShell,
  candidateRowsTableBodyClass,
  candidateRowsTableHeadRowClass,
  candidateRowsTableTdClass,
  candidateRowsTableThClass,
  candidateRowsTableTrClass,
} from '@/components/admin/candidate-rows-table-shell';
import { cn } from '@/lib/utils';

export function ApplicationsTable({
  applications,
}: {
  applications: ApplicantData[];
}) {
  const handleExport = () => {
    if (applications.length === 0) return;

    const dataForCsv = applications.map((app) => ({
      'Submission Date': app.submittedAt
        ? format(app.submittedAt.toDate(), 'yyyy-MM-dd HH:mm')
        : '',
      'First Name': app.firstName || '',
      'Last Name': app.lastName || '',
      Email: app.email || '',
      'ATP Number': isEncrypted(String(app.atpNumber || ''))
        ? decryptField(String(app.atpNumber))
        : (app.atpNumber || ''),
      'Total Flight Hours': app.flightTime?.total ?? 0,
      'Turbine PIC Hours': app.flightTime?.turbinePic ?? 0,
      'Multi-Engine Hours': app.flightTime?.multiEngine ?? 0,
      'Type Ratings': app.typeRatings || '',
    }));

    const csv = unparse(dataForCsv);

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'fedexflow-applications.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <CandidateRowsTableShell
      toolbar={
        <div className="flex justify-end">
          <span className="admin-tooltip">
            <span className="admin-tooltip-text">
              Download all submitted applications as a spreadsheet
            </span>
            <Button onClick={handleExport} disabled={applications.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Export to CSV
            </Button>
          </span>
        </div>
      }
    >
      <table className="w-full min-w-[640px] border-collapse text-left">
        <thead>
          <tr className={candidateRowsTableHeadRowClass}>
            <th className={candidateRowsTableThClass}>Applicant Name</th>
            <th className={cn(candidateRowsTableThClass, 'hidden sm:table-cell')}>
              Email
            </th>
            <th className={cn(candidateRowsTableThClass, 'hidden md:table-cell')}>
              Submitted On
            </th>
            <th className={cn(candidateRowsTableThClass, 'text-right')}>Total Hours</th>
            <th className={cn(candidateRowsTableThClass, 'text-right')}>Actions</th>
          </tr>
        </thead>
        <tbody className={candidateRowsTableBodyClass}>
          {applications.length > 0 ? (
            applications.map((app) => (
              <tr key={app.uid} className={candidateRowsTableTrClass}>
                <td className={cn(candidateRowsTableTdClass, 'font-medium text-[#333333]')}>
                  {app.firstName} {app.lastName}
                </td>
                <td className={cn(candidateRowsTableTdClass, 'hidden text-[13px] text-[#333333] sm:table-cell')}>
                  {app.email}
                </td>
                <td className={cn(candidateRowsTableTdClass, 'hidden text-[13px] text-[#565656] md:table-cell')}>
                  {app.submittedAt ? format(app.submittedAt.toDate(), 'PPP p') : 'N/A'}
                </td>
                <td className={cn(candidateRowsTableTdClass, 'text-right text-[13px] text-[#333333]')}>
                  {app.flightTime?.total ?? 0}
                </td>
                <td className={cn(candidateRowsTableTdClass, 'text-right')}>
                  <span className="admin-tooltip">
                    <span className="admin-tooltip-text">
                      Open merged application review (profile, legacy vs. submitted)
                    </span>
                    <Button asChild variant="outline" size="sm" className="rounded-full border-[#E3E3E3] text-[11px] font-bold">
                      <Link href={`/admin/review/${app.uid}`}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Open
                      </Link>
                    </Button>
                  </span>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={5}
                className="px-6 py-16 text-center text-[13px] text-[#8E8E8E]"
              >
                No submitted applications found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </CandidateRowsTableShell>
  );
}
