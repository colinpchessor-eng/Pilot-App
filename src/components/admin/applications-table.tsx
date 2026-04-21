'use client';
import { Button } from '@/components/ui/button';
import type { ApplicantData } from '@/lib/types';
import { format } from 'date-fns';
import { useState } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import {
  adminDecryptAtpBatchForExport,
  adminDecryptMedicalDateBatchForExport,
} from '@/app/applicant/sensitive-field-actions';
import { unparse } from 'papaparse';
import { Download, ExternalLink, FileSpreadsheet } from 'lucide-react';
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
import {
  buildParadoxCsv,
  downloadParadoxCsv,
  paradoxExportFilename,
} from '@/lib/paradox-export';
import { useToast } from '@/hooks/use-toast';

export function ApplicationsTable({
  applications,
}: {
  applications: ApplicantData[];
}) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [paradoxBusy, setParadoxBusy] = useState(false);

  const handleExport = async () => {
    if (applications.length === 0 || !user) return;
    let atpColumn: string[];
    try {
      const token = await user.getIdToken();
      atpColumn = await adminDecryptAtpBatchForExport(
        token,
        applications.map((app) => app.atpNumber)
      );
    } catch (e) {
      console.error('Export decrypt ATP:', e);
      atpColumn = applications.map((app) => String(app.atpNumber ?? ''));
    }

    const dataForCsv = applications.map((app, i) => ({
      'Submission Date': app.submittedAt
        ? format(app.submittedAt.toDate(), 'yyyy-MM-dd HH:mm')
        : '',
      'First Name': app.firstName || '',
      'Last Name': app.lastName || '',
      Email: app.email || '',
      'ATP Number': atpColumn[i] ?? '',
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

  const handleParadoxExport = async () => {
    if (applications.length === 0 || !user || !firestore || paradoxBusy) return;
    setParadoxBusy(true);
    try {
      const token = await user.getIdToken();
      const [atpCol, medCol] = await Promise.all([
        adminDecryptAtpBatchForExport(
          token,
          applications.map((app) => app.atpNumber)
        ),
        adminDecryptMedicalDateBatchForExport(
          token,
          applications.map((app) => app.firstClassMedicalDate)
        ),
      ]);
      const csv = buildParadoxCsv(applications, atpCol, medCol);
      downloadParadoxCsv(paradoxExportFilename(), csv);

      // Audit log (fire-and-forget; do not block the download)
      void addDoc(collection(firestore, 'auditLog'), {
        action: 'paradox_export',
        adminUid: user.uid,
        adminEmail: user.email ?? '',
        candidateCount: applications.length,
        timestamp: serverTimestamp(),
      }).catch((err) => {
        console.error('Paradox export audit log write failed:', err);
      });

      toast({
        title: 'Paradox export ready',
        description: `Exported ${applications.length} candidate${applications.length === 1 ? '' : 's'} to CSV.`,
      });
    } catch (e) {
      console.error('Paradox export failed:', e);
      toast({
        variant: 'destructive',
        title: 'Paradox export failed',
        description: e instanceof Error ? e.message : 'Unknown error.',
      });
    } finally {
      setParadoxBusy(false);
    }
  };

  return (
    <CandidateRowsTableShell
      toolbar={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="admin-tooltip">
            <span className="admin-tooltip-text">
              Download all submitted applications as a spreadsheet
            </span>
            <Button
              variant="outline"
              onClick={() => void handleExport()}
              disabled={applications.length === 0 || !user}
            >
              <Download className="mr-2 h-4 w-4" />
              Export to CSV
            </Button>
          </span>
          <span className="admin-tooltip">
            <span className="admin-tooltip-text">
              Export the full background-check schema (one row per candidate, ~242 columns) for handoff to Paradox
            </span>
            <Button
              onClick={() => void handleParadoxExport()}
              disabled={applications.length === 0 || !user || paradoxBusy}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              {paradoxBusy ? 'Preparing…' : 'Export for Paradox (Background Check)'}
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
