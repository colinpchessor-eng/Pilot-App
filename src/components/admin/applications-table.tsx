
'use client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import type { ApplicantData } from '@/lib/types';
import { format } from 'date-fns';
import { unparse } from 'papaparse';
import { Download } from 'lucide-react';

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
      'ATP Number': app.atpNumber || '',
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
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={handleExport} disabled={applications.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export to CSV
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Applicant Name</TableHead>
              <TableHead className="hidden sm:table-cell">Email</TableHead>
              <TableHead className="hidden md:table-cell">
                Submitted On
              </TableHead>
              <TableHead className="text-right">Total Hours</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {applications.length > 0 ? (
              applications.map((app) => (
                <TableRow key={app.uid}>
                  <TableCell className="font-medium">
                    {app.firstName} {app.lastName}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {app.email}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {app.submittedAt
                      ? format(app.submittedAt.toDate(), 'PPP p')
                      : 'N/A'}
                  </TableCell>
                  <TableCell className="text-right">
                    {app.flightTime?.total ?? 0}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  No submitted applications found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
