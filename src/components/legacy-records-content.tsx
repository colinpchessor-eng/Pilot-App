'use client';

import type { LegacyData } from '@/lib/types';
import { Printer } from 'lucide-react';

type LegacyRecordsContentProps = {
  legacyData: LegacyData | null | undefined;
  candidateId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  showNoteBanner?: boolean;
  showPrintHeader?: boolean;
  className?: string;
};

function formatNum(n: number | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  return n.toLocaleString();
}

export function LegacyRecordsContent({
  legacyData,
  candidateId,
  firstName,
  lastName,
  showNoteBanner = false,
  showPrintHeader = false,
  className = '',
}: LegacyRecordsContentProps) {
  if (!legacyData) {
    return (
      <p className="text-[13px]" style={{ color: '#8E8E8E' }}>No legacy records found.</p>
    );
  }

  const ft = legacyData.flightTime ?? {};
  const emp = legacyData.lastEmployer ?? {};
  const res = legacyData.lastResidence ?? {};

  return (
    <div className={className}>
      {showPrintHeader && (
        <div className="hidden print:block mb-6">
          <h1 className="text-xl font-bold text-[#333333] mb-2">
            FedEx Pilot Application — Legacy Records
          </h1>
          {candidateId && (
            <p className="text-sm text-[#565656]">Candidate ID: {candidateId}</p>
          )}
          {(firstName || lastName) && (
            <p className="text-sm text-[#565656]">
              Name: {[firstName, lastName].filter(Boolean).join(' ')}
            </p>
          )}
          <p className="text-sm text-[#565656]">
            Printed: {new Date().toLocaleDateString()}
          </p>
        </div>
      )}

      {showNoteBanner && (
        <div
          className="mb-4 rounded-lg p-3 text-xs"
          style={{
            background: 'rgba(247,177,24,0.08)',
            border: '1px solid rgba(247,177,24,0.3)',
            color: '#565656',
          }}
        >
          ⚠️ This is your data from your previous application. Update any
          changes in the form.
        </div>
      )}

      {/* Flight Time Summary */}
      <div className="mb-5">
        <h4 className="text-xs font-bold text-[#8E8E8E] uppercase tracking-wider mb-3">
          FLIGHT TIME SUMMARY
        </h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[#565656]">Total Hours:</span>
            <span className="font-semibold text-[#333333]">
              {formatNum(ft.total)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#565656]">Turbine PIC:</span>
            <span className="font-semibold text-[#333333]">
              {formatNum(ft.turbinePIC)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#565656]">Military Hours:</span>
            <span className="font-semibold text-[#333333]">
              {formatNum(ft.military)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#565656]">Multi-Engine:</span>
            <span className="font-semibold text-[#333333]">
              {formatNum(ft.multiEngine)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#565656]">Instructor Hours:</span>
            <span className="font-semibold text-[#333333]">
              {formatNum(ft.instructor)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#565656]">SIC Hours:</span>
            <span className="font-semibold text-[#333333]">
              {formatNum(ft.sic)}
            </span>
          </div>
        </div>
      </div>

      {/* Date Last Flown (highlighted) */}
      {(ft.dateLastFlown || ft.lastAircraftFlown) && (
        <div
          className="mb-5 p-3 rounded"
          style={{
            background: 'rgba(0,122,183,0.06)',
            borderLeft: '3px solid #007AB7',
          }}
        >
          <div className="text-xs font-bold text-[#8E8E8E] uppercase tracking-wider mb-1">
            Date Last Flown
          </div>
          <div className="text-[#333333] font-semibold">
            {ft.dateLastFlown || '—'}
          </div>
          {ft.lastAircraftFlown && (
            <div className="text-xs text-[#8E8E8E] mt-1">
              {ft.lastAircraftFlown}
            </div>
          )}
        </div>
      )}

      {/* Last Employer */}
      {(emp.company || emp.title) && (
        <div className="mb-5">
          <h4 className="text-xs font-bold text-[#8E8E8E] uppercase tracking-wider mb-2">
            LAST EMPLOYER ON FILE
          </h4>
          <div className="space-y-1">
            {emp.company && (
              <div className="font-bold text-[#333333]" style={{ fontSize: 15 }}>
                {emp.company}
              </div>
            )}
            {emp.title && (
              <div className="text-[#565656]" style={{ fontSize: 13 }}>
                {emp.title}
              </div>
            )}
            {(emp.city || emp.state) && (
              <div className="text-[#8E8E8E]" style={{ fontSize: 12 }}>
                {[emp.city, emp.state].filter(Boolean).join(', ')}
              </div>
            )}
            {(emp.from || emp.to) && (
              <div className="text-[#8E8E8E]" style={{ fontSize: 12 }}>
                {emp.from} → {emp.to}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Last Residence */}
      {(res.street || res.city) && (
        <div className="mb-5">
          <h4 className="text-xs font-bold text-[#8E8E8E] uppercase tracking-wider mb-2">
            LAST RESIDENCE ON FILE
          </h4>
          <div className="space-y-1">
            {res.street && (
              <div className="font-bold text-[#333333]">{res.street}</div>
            )}
            {(res.city || res.state || res.zip) && (
              <div className="text-[#565656]">
                {[res.city, res.state, res.zip].filter(Boolean).join(' ')}
              </div>
            )}
            {(res.from || res.to) && (
              <div className="text-[#8E8E8E]" style={{ fontSize: 12 }}>
                {res.from} → {res.to}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Print Button */}
      <button
        type="button"
        onClick={() => window.print()}
        className="print-hide w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold transition-colors hover:!bg-[#007AB7] hover:!text-white"
        style={{
          background: 'white',
          border: '1.5px solid #007AB7',
          color: '#007AB7',
        }}
      >
        <Printer className="h-4 w-4" />
        Print Legacy Records
      </button>
    </div>
  );
}
