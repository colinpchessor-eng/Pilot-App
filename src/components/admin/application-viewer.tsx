import type { ApplicantData, SafetyQuestion } from '@/lib/types';
import { decryptField, isEncrypted } from '@/lib/encryption';
import { format } from 'date-fns';
import { FedExBrandMark } from '@/components/brand/fedex-brand-mark';

const SAFETY_LABELS: Record<string, string> = {
  terminations: 'Terminations or resignations in lieu of from any FAA covered positions?',
  askedToResign: 'Asked to resign from any FAA covered position?',
  formalDiscipline: 'Have you ever received formal discipline from your employer?',
  accidents: 'Aircraft accidents?',
  incidents: 'Aircraft Incidents?',
  flightViolations: 'Flight violations?',
  certificateAction: 'Certificate suspension/revocation?',
  pendingFaaAction: 'Pending FAA Action/Letters of investigation?',
  failedCheckRide:
    'Have you ever failed a flight check ride, proficiency check, flight eval, or upgrade attempt aircraft or while compensated as a professional pilot (in the last three years)?',
  investigationBoard: 'Have you ever been called before a field board of investigation for any reason?',
  previousInterview:
    'Have you previously interviewed for the following positions at Fedex (not counting the one that you were hired under)?',
  trainingCommitmentConflict:
    'Do you have any commitment that will not allow you to enter and complete uninterrupted a training syllabus of approximately 10 weeks once commenced?',
  otherInfo: 'Is there anything else you feel warrants and that you would like to bring up at this time?',
};

const SAFETY_ORDER = [
  'terminations',
  'askedToResign',
  'formalDiscipline',
  'accidents',
  'incidents',
  'flightViolations',
  'certificateAction',
  'pendingFaaAction',
  'failedCheckRide',
  'investigationBoard',
  'previousInterview',
  'trainingCommitmentConflict',
  'otherInfo',
] as const;

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function formatHoursDisplay(n: number): string {
  return round1(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
}

function decryptAtp(raw: string | null): string {
  if (raw == null || raw === '') return '—';
  const s = String(raw);
  return isEncrypted(s) ? decryptField(s) : s;
}

function decryptMedicalDisplay(raw: ApplicantData['firstClassMedicalDate']): string {
  if (!raw) return '—';
  if (typeof raw === 'string' && isEncrypted(raw)) {
    const d = decryptField(raw);
    try {
      return format(new Date(d), 'PP');
    } catch {
      return d;
    }
  }
  if (typeof raw === 'object' && raw !== null && 'toDate' in raw) {
    try {
      return format((raw as { toDate: () => Date }).toDate(), 'PP');
    } catch {
      return '—';
    }
  }
  return '—';
}

const FLIGHT_PROFILE_ROWS: { key: keyof ApplicantData['flightTime']; label: string }[] = [
  { key: 'total', label: 'Total Hours' },
  { key: 'turbinePic', label: 'Turbine PIC' },
  { key: 'sic', label: 'SIC' },
  { key: 'instructor', label: 'Instructor' },
  { key: 'evaluator', label: 'Evaluator' },
  { key: 'multiEngine', label: 'Multi-Engine' },
  { key: 'military', label: 'Military' },
  { key: 'civilian', label: 'Civilian' },
  { key: 'other', label: 'Other' },
  { key: 'nightHours', label: 'Night Hours' },
];

export function ApplicationViewer({ applicantData }: { applicantData: ApplicantData }) {
  const fullName = [applicantData.firstName, applicantData.lastName].filter(Boolean).join(' ') || '—';
  const candidateId = applicantData.candidateId?.trim() || '—';
  const ft = applicantData.flightTime;

  const bannerTotal = formatHoursDisplay(Number(ft?.total) || 0);
  const turbinePic = formatHoursDisplay(Number(ft?.turbinePic) || 0);
  const bannerSic = formatHoursDisplay(Number(ft?.sic) || 0);

  const submittedDate = applicantData.submittedAt?.toDate
    ? format(applicantData.submittedAt.toDate(), 'PPpp')
    : null;

  const initials = [applicantData.firstName?.[0], applicantData.lastName?.[0]]
    .filter(Boolean)
    .join('')
    .toUpperCase() || (applicantData.email?.[0]?.toUpperCase() ?? '?');

  const employmentSorted = [...(applicantData.employmentHistory || [])].sort((a, b) => {
    const aCurrent = a.endDate === null ? 1 : 0;
    const bCurrent = b.endDate === null ? 1 : 0;
    if (aCurrent !== bCurrent) return bCurrent - aCurrent;
    const aEnd = a.endDate?.toDate?.()?.getTime() ?? 0;
    const bEnd = b.endDate?.toDate?.()?.getTime() ?? 0;
    return bEnd - aEnd;
  });

  return (
    <div className="space-y-8 pb-2">
      <div className="hidden print:block review-print-header text-center border-b border-[#333] pb-4 mb-6">
        <div className="flex justify-center">
          <FedExBrandMark height={36} />
        </div>
        <h1 className="text-lg font-bold mt-3 text-[#333333]">Pilot application — Candidate profile</h1>
        <p className="text-sm mt-1 text-[#333333]">
          {fullName} · Candidate ID {candidateId}
        </p>
        <p className="text-xs text-[#565656] mt-1">Printed {format(new Date(), 'PPpp')}</p>
      </div>

      <div>
        <h1 className="text-[28px] font-bold text-[#333333]">{fullName}</h1>
        <p className="text-[14px] text-[#8E8E8E] mt-1">
          {applicantData.email || '—'} · Candidate ID {candidateId}
        </p>
      </div>

      {/* Header card — matches review Section 1 */}
      <section className="review-section print:break-inside-avoid bg-white rounded-xl border border-[#E3E3E3] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)] print:shadow-none print:border print:rounded-none">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-4 items-start">
            <div className="fedex-gradient flex h-20 w-20 shrink-0 items-center justify-center rounded-full text-[22px] font-bold text-white">
              {initials}
            </div>
            <div>
              <p className="text-[24px] font-bold text-[#333333]">{fullName}</p>
              <p className="text-[14px] text-[#565656] mt-1">{applicantData.email || '—'}</p>
              <p className="text-[14px] font-mono text-[#565656] mt-0.5">{candidateId}</p>
              <p className="text-[13px] text-[#8E8E8E] mt-2">
                {submittedDate ? (
                  <>
                    Application submitted:{' '}
                    <span className="text-[#333333] font-medium">{submittedDate}</span>
                  </>
                ) : (
                  <span className="text-[#F7B118] font-medium">Application not submitted yet</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Flight hours — review-style banner + table (application data only) */}
      <section className="review-section print:break-inside-avoid w-full max-w-full print:border-0">
        <div
          className="flight-hours-summary-banner mb-4 print:break-inside-avoid"
          style={{
            background: 'linear-gradient(135deg, rgba(0,138,0,0.06) 0%, rgba(0,138,0,0.02) 100%)',
            border: '1px solid rgba(0,138,0,0.2)',
            borderRadius: 12,
            padding: '16px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#333333', margin: 0 }}>Flight hours (portal)</p>
            <p style={{ fontSize: 12, color: '#8E8E8E', margin: '4px 0 0' }}>Data as entered in the application</p>
          </div>
          <div className="flex items-stretch gap-0">
            <div className="flex flex-col items-center px-4 min-w-[100px]">
              <span className="tabular-nums" style={{ fontSize: 28, fontWeight: 800, color: '#333333', lineHeight: 1.1 }}>
                {bannerTotal}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: '#8E8E8E',
                  textTransform: 'uppercase',
                  marginTop: 4,
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                }}
              >
                Total Hours
              </span>
            </div>
            <div className="w-px self-stretch bg-[#E3E3E3] my-1" aria-hidden />
            <div className="flex flex-col items-center px-4 min-w-[100px]">
              <span className="tabular-nums" style={{ fontSize: 28, fontWeight: 800, color: '#333333', lineHeight: 1.1 }}>
                {turbinePic}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: '#8E8E8E',
                  textTransform: 'uppercase',
                  marginTop: 4,
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                }}
              >
                Turbine PIC
              </span>
            </div>
            <div className="w-px self-stretch bg-[#E3E3E3] my-1" aria-hidden />
            <div className="flex flex-col items-center px-4 min-w-[100px]">
              <span className="tabular-nums" style={{ fontSize: 28, fontWeight: 800, color: '#333333', lineHeight: 1.1 }}>
                {bannerSic}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: '#8E8E8E',
                  textTransform: 'uppercase',
                  marginTop: 4,
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                }}
              >
                SIC
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[#E3E3E3] overflow-hidden bg-white">
          <div
            className="px-4 py-3 border-b border-[#E3E3E3]"
            style={{ background: 'rgba(255,98,0,0.06)' }}
          >
            <p className="text-[15px] font-bold text-[#333333]">Application — Flight time breakdown</p>
            <p className="text-[12px] text-[#565656]">All values from candidate submission</p>
          </div>
          <div className="divide-y divide-[#F2F2F2]">
            {FLIGHT_PROFILE_ROWS.map((row, index) => {
              const raw = ft?.[row.key];
              const num = typeof raw === 'number' && !Number.isNaN(raw) ? raw : 0;
              const display =
                (raw === undefined || raw === null) && row.key === 'nightHours'
                  ? '—'
                  : formatHoursDisplay(num);
              const zebra = index % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]';
              return (
                <div key={row.key} className={`flex justify-between items-center px-4 py-3 ${zebra}`}>
                  <span className="text-[13px] font-medium text-[#565656]">{row.label}</span>
                  <span className="text-[15px] font-bold tabular-nums text-[#FF6200]">{display}</span>
                </div>
              );
            })}
            {(ft?.dateLastFlown || ft?.lastAircraftFlown) && (
              <>
                <div className={`flex justify-between items-center px-4 py-3 ${FLIGHT_PROFILE_ROWS.length % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'}`}>
                  <span className="text-[13px] font-medium text-[#565656]">Date last flown</span>
                  <span className="text-[14px] font-semibold text-[#FF6200]">{ft?.dateLastFlown || '—'}</span>
                </div>
                <div className="flex justify-between items-center px-4 py-3 bg-[#FAFAFA]">
                  <span className="text-[13px] font-medium text-[#565656]">Last aircraft</span>
                  <span className="text-[14px] font-semibold text-[#FF6200]">{ft?.lastAircraftFlown || '—'}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Employment — updated column style only */}
      <section className="review-section print:break-inside-avoid rounded-xl border border-[#E3E3E3] overflow-hidden bg-white print:border">
        <div
          className="px-4 py-3 border-b border-[#E3E3E3]"
          style={{ background: 'rgba(255,98,0,0.06)' }}
        >
          <p className="text-[15px] font-bold text-[#333333]">Application — Employment history</p>
          <p className="text-[12px] text-[#565656]">Most recent first</p>
        </div>
        <div className="p-4 space-y-6">
          {employmentSorted.length > 0 ? (
            employmentSorted.map((job, index) => (
              <div key={index} className="space-y-3 border-b border-[#F2F2F2] pb-6 last:border-0 last:pb-0">
                <div>
                  <p className="text-[16px] font-bold text-[#FF6200]">{job.employerName}</p>
                  <p className="text-[14px] text-[#565656]">{job.jobTitle}</p>
                  <p className="text-[13px] text-[#8E8E8E] mt-1">
                    {format(job.startDate.toDate(), 'MMM yyyy')} —{' '}
                    {job.endDate ? format(job.endDate.toDate(), 'MMM yyyy') : 'Present'}
                  </p>
                </div>
                <div className="grid gap-2 text-[14px]">
                  <p>
                    <span className="text-[11px] font-bold text-[#8E8E8E] uppercase">Aircraft</span>
                    <br />
                    <span className="text-[#333333]">{job.aircraftTypes || '—'}</span>
                  </p>
                  <p>
                    <span className="text-[11px] font-bold text-[#8E8E8E] uppercase">Total hours</span>
                    <br />
                    <span className="text-[#333333]">{job.totalHours ?? '—'}</span>
                  </p>
                  <p>
                    <span className="text-[11px] font-bold text-[#8E8E8E] uppercase">Duties</span>
                    <br />
                    <span className="text-[#333333] whitespace-pre-wrap">{job.duties || '—'}</span>
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-[14px] text-[#8E8E8E]">No employment history provided.</p>
          )}
        </div>
      </section>

      {/* Aeronautical */}
      <section className="review-section print:break-inside-avoid rounded-xl border border-[#E3E3E3] overflow-hidden bg-white print:border">
        <div
          className="px-4 py-3 border-b border-[#E3E3E3]"
          style={{ background: 'rgba(255,98,0,0.06)' }}
        >
          <p className="text-[15px] font-bold text-[#333333]">Application — Aeronautical</p>
        </div>
        <div className="p-4 space-y-3 text-[14px]">
          <div>
            <p className="text-[11px] font-bold text-[#8E8E8E] uppercase">ATP Number</p>
            <p className="text-[#FF6200] mt-1 font-medium">{decryptAtp(applicantData.atpNumber)}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold text-[#8E8E8E] uppercase">Type ratings</p>
            <p className="text-[#FF6200] mt-1 font-medium whitespace-pre-wrap">{applicantData.typeRatings || '—'}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold text-[#8E8E8E] uppercase">First class medical</p>
            <p className="text-[#FF6200] mt-1 font-medium">{decryptMedicalDisplay(applicantData.firstClassMedicalDate)}</p>
          </div>
        </div>
      </section>

      {/* Safety — matches review */}
      <section className="review-section print:break-inside-avoid rounded-xl border border-[#E3E3E3] p-6 bg-white print:border space-y-4">
        <h2 className="text-[18px] font-bold text-[#333333]">Safety questions</h2>
        <div className="space-y-4">
          {SAFETY_ORDER.map((key) => {
            const label = SAFETY_LABELS[key];
            const q = applicantData.safetyQuestions?.[key] as SafetyQuestion | undefined;
            if (!label || !q) return null;
            const yes = q.answer === 'yes';
            return (
              <div
                key={key}
                className={`rounded-lg border border-[#E3E3E3] p-4 ${yes ? 'border-l-4 border-l-[#DE002E] bg-[#FFF5F5]' : ''}`}
              >
                <p className="text-[14px] text-[#333333] font-medium pr-2">{label}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className="inline-block rounded-full px-3 py-0.5 text-[11px] font-bold text-white"
                    style={{ background: yes ? '#DE002E' : '#008A00' }}
                  >
                    {q.answer === 'no' ? 'No' : q.answer === 'yes' ? 'Yes' : '—'}
                  </span>
                </div>
                {yes && (q.explanation || '').trim() ? (
                  <div className="mt-3 rounded-md bg-[#FAFAFA] border border-[#E3E3E3] px-3 py-2 text-[13px] text-[#333333]">
                    {q.explanation}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      {/* Certification */}
      <section className="review-section print:break-inside-avoid rounded-xl border border-[#E3E3E3] p-6 bg-white print:border">
        <h2 className="text-[18px] font-bold text-[#333333] mb-4">Certification</h2>
        <p className="text-[14px] text-[#333333]">
          Application certified:{' '}
          <span className="font-semibold">{applicantData.isCertified ? 'Yes' : 'No'}</span>
        </p>
        <p className="text-[14px] text-[#565656] mt-2">
          Printed / digital name:{' '}
          <span className="font-medium text-[#333333]">{applicantData.printedName?.trim() || '—'}</span>
        </p>
      </section>
    </div>
  );
}
