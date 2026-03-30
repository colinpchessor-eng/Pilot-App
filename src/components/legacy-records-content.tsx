'use client';

import type { LegacyData } from '@/lib/types';
import {
  AlertTriangle,
  Briefcase,
  History,
  Home,
  Printer,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type LegacyRecordsContentProps = {
  legacyData: LegacyData | null | undefined;
  candidateId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  showNoteBanner?: boolean;
  showPrintHeader?: boolean;
  /** When set, shows header close + footer “Close Reference”. */
  onClose?: () => void;
  className?: string;
};

function formatHours(n: number | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
}

function turbinePic(ft: NonNullable<LegacyData['flightTime']>): number | undefined {
  return ft.turbinePIC ?? ft.turbinePic;
}

function FlightStatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#E3E3E3]/80 bg-[#f4f3f8] p-4">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#565656]">
        {label}
      </p>
      <p className="text-xl font-bold tabular-nums text-[#4D148C]">{value}</p>
    </div>
  );
}

export function LegacyRecordsContent({
  legacyData,
  candidateId,
  firstName,
  lastName,
  showNoteBanner = false,
  showPrintHeader = false,
  onClose,
  className = '',
}: LegacyRecordsContentProps) {
  const hasData = !!legacyData;
  const ft = legacyData?.flightTime ?? {};
  const emp = legacyData?.lastEmployer ?? {};
  const res = legacyData?.lastResidence ?? {};

  const showEmployer = !!(emp.company || emp.title || emp.city || emp.state);
  const showResidence = !!(res.street || res.city || res.state || res.zip);
  const showLastFlown = !!(ft.dateLastFlown || ft.lastAircraftFlown);
  const rightColumnHasContent = showEmployer || showLastFlown || showResidence;

  const extraFlightRows: { label: string; value: number | undefined }[] = [
    { label: 'Military', value: ft.military },
    { label: 'Civilian', value: ft.civilian },
    { label: 'Multi-engine', value: ft.multiEngine },
    { label: 'Evaluator', value: ft.evaluator },
    { label: 'Other', value: ft.other },
    { label: 'Night', value: ft.nightHours },
  ].filter((r) => {
    if (r.value == null || Number.isNaN(Number(r.value))) return false;
    return Number(r.value) !== 0;
  });

  return (
    <div
      className={cn(
        'legacy-print-area relative w-full overflow-hidden rounded-[2rem] border border-white/50 bg-white/90 shadow-[0_24px_48px_-12px_rgba(77,20,140,0.22)] backdrop-blur-md backdrop-saturate-150',
        className
      )}
    >
      {showPrintHeader && (
        <div className="mb-0 hidden print:block print:p-10">
          <h1 className="mb-2 text-xl font-bold text-[#333333]">
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
        <div className="flex items-center gap-3 border-b border-[#FF6200]/20 bg-[#ffdbcd]/50 px-4 py-4">
          <AlertTriangle
            className="h-4 w-4 shrink-0 text-[#a53d00]"
            aria-hidden
          />
          <p className="text-xs font-semibold tracking-tight text-[#360f00]">
            Read-only records from your previous application.
          </p>
        </div>
      )}

      <div className="p-8 md:p-10">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-3xl font-bold tracking-tight text-[#4D148C]">
              Legacy Records
            </h2>
            <p className="text-sm font-medium text-[#565656]">Reference data on file</p>
            {(candidateId || firstName || lastName) && (
              <p className="pt-1 text-xs text-[#8E8E8E] print:hidden">
                {candidateId && <>ID {candidateId}</>}
                {candidateId && (firstName || lastName) && ' · '}
                {[firstName, lastName].filter(Boolean).join(' ')}
              </p>
            )}
          </div>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="print-hide rounded-full p-2 text-[#565656] transition-colors hover:bg-[#efedf3]"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          ) : null}
        </div>

        {!hasData ? (
          <p className="text-[13px] text-[#8E8E8E]">No legacy records found.</p>
        ) : (
          <>
            <div
              className={cn(
                'grid grid-cols-1 gap-8',
                rightColumnHasContent && 'md:grid-cols-2'
              )}
            >
              <section className="space-y-4">
                <div className="mb-2 flex items-center gap-2">
                  <History className="h-5 w-5 shrink-0 text-[#4D148C]" aria-hidden />
                  <h3 className="text-xs font-black uppercase tracking-[0.15em] text-[#565656]">
                    Flight Summary
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FlightStatCard label="Total" value={formatHours(ft.total)} />
                  <FlightStatCard
                    label="Turbine PIC"
                    value={formatHours(turbinePic(ft))}
                  />
                  <FlightStatCard
                    label="Instructor"
                    value={formatHours(ft.instructor)}
                  />
                  <FlightStatCard label="SIC" value={formatHours(ft.sic)} />
                </div>
                {extraFlightRows.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 pt-2 sm:grid-cols-3">
                    {extraFlightRows.map(({ label, value }) => (
                      <div
                        key={label}
                        className="rounded-xl border border-[#E3E3E3]/60 bg-[#faf8fe]/80 px-3 py-2"
                      >
                        <p className="text-[9px] font-bold uppercase tracking-wide text-[#8E8E8E]">
                          {label}
                        </p>
                        <p className="text-sm font-semibold tabular-nums text-[#333333]">
                          {formatHours(value)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {rightColumnHasContent ? (
              <div className="space-y-6">
                {showEmployer && (
                  <section className="space-y-4">
                    <div className="mb-2 flex items-center gap-2">
                      <Briefcase
                        className="h-5 w-5 shrink-0 text-[#4D148C]"
                        aria-hidden
                      />
                      <h3 className="text-xs font-black uppercase tracking-[0.15em] text-[#565656]">
                        Last Employment
                      </h3>
                    </div>
                    <div className="space-y-3">
                      {emp.company && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-[#565656]">
                            Organization
                          </p>
                          <p className="text-sm font-bold text-[#4D148C]">
                            {emp.company}
                          </p>
                        </div>
                      )}
                      {emp.title && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-[#565656]">
                            Role
                          </p>
                          <p className="text-sm font-medium text-[#333333]">
                            {emp.title}
                          </p>
                        </div>
                      )}
                      {(emp.city || emp.state) && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-[#565656]">
                            Location
                          </p>
                          <p className="text-sm text-[#565656]">
                            {[emp.city, emp.state].filter(Boolean).join(', ')}
                          </p>
                        </div>
                      )}
                      {(emp.from || emp.to) && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-[#565656]">
                            Tenure
                          </p>
                          <p className="text-sm text-[#8E8E8E]">
                            {emp.from ?? '—'} → {emp.to ?? '—'}
                          </p>
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {showLastFlown && (
                  <section className="grid grid-cols-2 gap-4 border-t border-[#E3E3E3]/50 pt-6">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-[#565656]">
                        Last Flown
                      </p>
                      <p className="text-sm font-bold text-[#FF6200]">
                        {ft.dateLastFlown && String(ft.dateLastFlown).trim() !== ''
                          ? ft.dateLastFlown
                          : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-[#565656]">
                        Aircraft
                      </p>
                      <p className="text-sm font-bold text-[#333333]">
                        {ft.lastAircraftFlown?.trim() || '—'}
                      </p>
                    </div>
                  </section>
                )}

                {showResidence && (
                  <section className="space-y-3 border-t border-[#E3E3E3]/50 pt-6">
                    <div className="mb-2 flex items-center gap-2">
                      <Home className="h-5 w-5 shrink-0 text-[#4D148C]" aria-hidden />
                      <h3 className="text-xs font-black uppercase tracking-[0.15em] text-[#565656]">
                        Last Residence
                      </h3>
                    </div>
                    {res.street && (
                      <p className="text-sm font-bold text-[#333333]">{res.street}</p>
                    )}
                    {(res.city || res.state || res.zip) && (
                      <p className="text-sm text-[#565656]">
                        {[res.city, res.state, res.zip].filter(Boolean).join(' ')}
                      </p>
                    )}
                    {(res.from || res.to) && (
                      <p className="text-xs text-[#8E8E8E]">
                        {res.from ?? '—'} → {res.to ?? '—'}
                      </p>
                    )}
                  </section>
                )}
              </div>
              ) : null}
            </div>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <button
                type="button"
                onClick={() => window.print()}
                className="print-hide fedex-btn-primary flex flex-1 py-4"
              >
                <Printer className="h-5 w-5" />
                Print Legacy Records
              </button>
              {onClose ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="print-hide fedex-btn-muted flex-1 py-4"
                >
                  Close Reference
                </button>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
