'use client';
import { Button } from '@/components/ui/button';
import type { ApplicantData } from '@/lib/types';
import { format } from 'date-fns';
import { useState } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

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

import { useToast } from '@/hooks/use-toast';

export function ApplicationsTable({
  applications,
}: {
  applications: ApplicantData[];
}) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();


  return (
    <CandidateRowsTableShell
      toolbar={
        <div className="flex justify-end w-full px-2">
          <p className="text-[13px] text-[#8E8E8E] italic">
            Note: To export for Paradox, please click "Open" on a candidate's profile.
          </p>
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
                      Open merged pilot history update review (profile, legacy vs. submitted)
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
                No submitted pilot history updates found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </CandidateRowsTableShell>
  );
}
