/**
 * Paradox background-check CSV export.
 *
 * One row per candidate, wide-format. Every submitted field is flattened
 * into numbered columns so Paradox (or any BG-check vendor) can ingest
 * the file directly. The column list is stable and fully populated even
 * when a slot is empty — missing entries become empty strings, never
 * absent columns.
 *
 * Formatting conventions:
 *   - Dates:               yyyy-MM-dd (ISO)
 *   - Submission timestamp: yyyy-MM-dd HH:mm (UTC)
 *   - Booleans:            TRUE / FALSE / "" (unknown)
 *   - Safety answers:      yes / no / "" (unanswered)
 *
 * Bumping the caps: if a real candidate exceeds MAX_EMPLOYMENT_ENTRIES or
 * MAX_RESIDENTIAL_ENTRIES, raise the constant below and the entire pipeline
 * (column order + row builder) will adjust automatically.
 *
 * Related audit-log action: 'paradox_export'.
 */

import { format } from 'date-fns';
import { unparse } from 'papaparse';
import { Timestamp } from 'firebase/firestore';
import type { ApplicantData, EmploymentHistory, ResidentialHistoryEntry } from './types';

export const MAX_EMPLOYMENT_ENTRIES = 10;
export const MAX_RESIDENTIAL_ENTRIES = 10;

const EMPLOYMENT_SUBFIELDS = [
  'Name',
  'Title',
  'Street',
  'City',
  'State',
  'Zip',
  'StartDate',
  'EndDate',
  'IsCurrent',
  'AircraftTypes',
  'TotalHours',
  'Duties',
] as const;

const RESIDENTIAL_SUBFIELDS = [
  'Street',
  'City',
  'State',
  'Zip',
  'StartDate',
  'EndDate',
  'IsCurrent',
] as const;

const FLIGHT_HOURS_COLUMNS = [
  'FlightHours_Total',
  'FlightHours_TurbinePIC',
  'FlightHours_Military',
  'FlightHours_Civilian',
  'FlightHours_MultiEngine',
  'FlightHours_Instructor',
  'FlightHours_Evaluator',
  'FlightHours_SIC',
  'FlightHours_Other',
  'FlightHours_Night',
  'FlightHours_LastAircraftFlown',
  'FlightHours_DateLastFlown',
] as const;

/**
 * Canonical ordering mirrors the review-page safety-question list so the
 * CSV columns match how an admin reads the application in the UI.
 */
export const SAFETY_QUESTION_KEYS = [
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

type SafetyKey = (typeof SAFETY_QUESTION_KEYS)[number];

const IDENTITY_COLUMNS = [
  'CandidateID',
  'UID',
  'Email',
  'FirstName',
  'LastName',
  'SubmittedAt',
  'IsCertified',
  'PrintedName',
] as const;

const AERONAUTICAL_COLUMNS = [
  'ATPNumber',
  'FirstClassMedicalDate',
  'TypeRatings',
] as const;

const CONSENT_COLUMNS = [
  'ConsentGiven',
  'ConsentTimestamp',
  'ConsentVersion',
] as const;

function buildEmploymentColumns(): string[] {
  const cols: string[] = [];
  for (let n = 1; n <= MAX_EMPLOYMENT_ENTRIES; n++) {
    for (const sub of EMPLOYMENT_SUBFIELDS) {
      cols.push(`Employer${n}_${sub}`);
    }
  }
  return cols;
}

function buildResidentialColumns(): string[] {
  const cols: string[] = [];
  for (let n = 1; n <= MAX_RESIDENTIAL_ENTRIES; n++) {
    for (const sub of RESIDENTIAL_SUBFIELDS) {
      cols.push(`Residence${n}_${sub}`);
    }
  }
  return cols;
}

function buildSafetyColumns(): string[] {
  const cols: string[] = [];
  for (const key of SAFETY_QUESTION_KEYS) {
    const titleKey = key.charAt(0).toUpperCase() + key.slice(1);
    cols.push(`Safety_${titleKey}_Answer`);
    cols.push(`Safety_${titleKey}_Explanation`);
  }
  return cols;
}

/**
 * Full column list in a stable order. Must be passed to papaparse.unparse
 * via `fields` so columns are emitted even when every row leaves that
 * slot empty.
 */
export const PARADOX_COLUMN_ORDER: readonly string[] = [
  ...IDENTITY_COLUMNS,
  ...AERONAUTICAL_COLUMNS,
  ...FLIGHT_HOURS_COLUMNS,
  ...buildEmploymentColumns(),
  ...buildResidentialColumns(),
  ...buildSafetyColumns(),
  ...CONSENT_COLUMNS,
];

function formatTimestampDate(ts: Timestamp | null | undefined): string {
  if (!ts) return '';
  try {
    return format(ts.toDate(), 'yyyy-MM-dd');
  } catch {
    return '';
  }
}

function formatTimestampDateTime(ts: Timestamp | null | undefined): string {
  if (!ts) return '';
  try {
    return format(ts.toDate(), 'yyyy-MM-dd HH:mm');
  } catch {
    return '';
  }
}

function formatBoolean(value: boolean | null | undefined): string {
  if (value === true) return 'TRUE';
  if (value === false) return 'FALSE';
  return '';
}

function sortEmploymentRecentFirst(entries: EmploymentHistory[]): EmploymentHistory[] {
  return [...entries].sort((a, b) => {
    const aCurrent = a.endDate === null ? 1 : 0;
    const bCurrent = b.endDate === null ? 1 : 0;
    if (aCurrent !== bCurrent) return bCurrent - aCurrent;
    const aEnd = a.endDate?.toDate?.()?.getTime() ?? 0;
    const bEnd = b.endDate?.toDate?.()?.getTime() ?? 0;
    return bEnd - aEnd;
  });
}

function sortResidentialRecentFirst(entries: ResidentialHistoryEntry[]): ResidentialHistoryEntry[] {
  return [...entries].sort((a, b) => {
    const aCurrent = a.endDate === null ? 1 : 0;
    const bCurrent = b.endDate === null ? 1 : 0;
    if (aCurrent !== bCurrent) return bCurrent - aCurrent;
    const aEnd = a.endDate?.toDate?.()?.getTime() ?? 0;
    const bEnd = b.endDate?.toDate?.()?.getTime() ?? 0;
    return bEnd - aEnd;
  });
}

/**
 * Build a single wide-format row for a submitted application. ATP and
 * medical date must already be decrypted by the caller (admin-gated
 * server actions); this helper never touches encrypted values.
 */
export function buildParadoxRow(
  app: ApplicantData,
  atpPlain: string,
  medPlain: string
): Record<string, string | number> {
  const row: Record<string, string | number> = {};
  for (const col of PARADOX_COLUMN_ORDER) row[col] = '';

  // Identity / submission
  row.CandidateID = app.candidateId || '';
  row.UID = app.uid || '';
  row.Email = app.email || '';
  row.FirstName = app.firstName || '';
  row.LastName = app.lastName || '';
  row.SubmittedAt = formatTimestampDateTime(app.submittedAt);
  row.IsCertified = formatBoolean(app.isCertified);
  row.PrintedName = app.printedName || '';

  // Aeronautical
  row.ATPNumber = atpPlain || '';
  row.FirstClassMedicalDate = medPlain || '';
  row.TypeRatings = app.typeRatings || '';

  // Flight hours
  const ft = app.flightTime || ({} as ApplicantData['flightTime']);
  row.FlightHours_Total = ft.total ?? '';
  row.FlightHours_TurbinePIC = ft.turbinePic ?? '';
  row.FlightHours_Military = ft.military ?? '';
  row.FlightHours_Civilian = ft.civilian ?? '';
  row.FlightHours_MultiEngine = ft.multiEngine ?? '';
  row.FlightHours_Instructor = ft.instructor ?? '';
  row.FlightHours_Evaluator = ft.evaluator ?? '';
  row.FlightHours_SIC = ft.sic ?? '';
  row.FlightHours_Other = ft.other ?? '';
  row.FlightHours_Night = ft.nightHours ?? '';
  row.FlightHours_LastAircraftFlown = ft.lastAircraftFlown || '';
  row.FlightHours_DateLastFlown = ft.dateLastFlown || '';

  // Employment (most recent first; truncate silently past the cap)
  const employment = sortEmploymentRecentFirst(app.employmentHistory || []);
  const employmentCapped = employment.slice(0, MAX_EMPLOYMENT_ENTRIES);
  for (let i = 0; i < employmentCapped.length; i++) {
    const n = i + 1;
    const job = employmentCapped[i] as EmploymentHistory & {
      street?: string;
      city?: string;
      state?: string;
      zip?: string;
    };
    row[`Employer${n}_Name`] = job.employerName || '';
    row[`Employer${n}_Title`] = job.jobTitle || '';
    row[`Employer${n}_Street`] = job.street || '';
    row[`Employer${n}_City`] = job.city || '';
    row[`Employer${n}_State`] = job.state || '';
    row[`Employer${n}_Zip`] = job.zip || '';
    row[`Employer${n}_StartDate`] = formatTimestampDate(job.startDate);
    row[`Employer${n}_EndDate`] = job.endDate === null ? '' : formatTimestampDate(job.endDate);
    row[`Employer${n}_IsCurrent`] = formatBoolean(job.endDate === null);
    row[`Employer${n}_AircraftTypes`] = job.aircraftTypes || '';
    row[`Employer${n}_TotalHours`] = typeof job.totalHours === 'number' ? job.totalHours : '';
    row[`Employer${n}_Duties`] = job.duties || '';
  }

  // Residential: prefer updated entries; fall back to legacy.lastResidence
  // when the applicant affirmed "unchanged for 3 years" and supplied no
  // new entries (matches the existing review-page export behavior).
  const updatedResidences = app.residentialHistory || [];
  const unchanged = app.residentialHistoryUnchangedLast3Years !== false;
  const residentialSource: Array<{
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    startDate?: Timestamp | null;
    endDate?: Timestamp | null;
    startDateStr?: string;
    endDateStr?: string;
    isCurrent?: boolean;
  }> = [];

  if (updatedResidences.length > 0) {
    const sorted = sortResidentialRecentFirst(updatedResidences);
    for (const r of sorted) {
      residentialSource.push({
        street: r.street,
        city: r.city,
        state: r.state,
        zip: r.zip,
        startDate: r.startDate,
        endDate: r.endDate,
        isCurrent: r.endDate === null,
      });
    }
  } else if (unchanged && app.legacyData?.lastResidence) {
    const legacy = app.legacyData.lastResidence;
    residentialSource.push({
      street: legacy.street,
      city: legacy.city,
      state: legacy.state,
      zip: legacy.zip,
      startDateStr: legacy.from,
      endDateStr: legacy.to,
      isCurrent: false,
    });
  }

  const residentialCapped = residentialSource.slice(0, MAX_RESIDENTIAL_ENTRIES);
  for (let i = 0; i < residentialCapped.length; i++) {
    const n = i + 1;
    const r = residentialCapped[i];
    row[`Residence${n}_Street`] = r.street || '';
    row[`Residence${n}_City`] = r.city || '';
    row[`Residence${n}_State`] = r.state || '';
    row[`Residence${n}_Zip`] = r.zip || '';
    row[`Residence${n}_StartDate`] = r.startDateStr ?? formatTimestampDate(r.startDate ?? null);
    row[`Residence${n}_EndDate`] =
      r.endDate === null && !r.endDateStr
        ? ''
        : (r.endDateStr ?? formatTimestampDate(r.endDate ?? null));
    row[`Residence${n}_IsCurrent`] = formatBoolean(!!r.isCurrent);
  }

  // Safety questions
  const safety = app.safetyQuestions || ({} as ApplicantData['safetyQuestions']);
  for (const key of SAFETY_QUESTION_KEYS) {
    const entry = safety[key as SafetyKey];
    const titleKey = key.charAt(0).toUpperCase() + key.slice(1);
    row[`Safety_${titleKey}_Answer`] = entry?.answer ?? '';
    row[`Safety_${titleKey}_Explanation`] = entry?.explanation ?? '';
  }

  // Consent
  row.ConsentGiven = formatBoolean(app.consentGiven);
  row.ConsentTimestamp = formatTimestampDateTime(app.consentTimestamp);
  row.ConsentVersion = app.consentVersion || '';

  return row;
}

/**
 * Build a Paradox-ready CSV string. `atpCol` and `medCol` must be the
 * plaintext results of the admin-gated batch decryption actions and
 * must be index-aligned with `apps`.
 */
export function buildParadoxCsv(
  apps: ApplicantData[],
  atpCol: string[],
  medCol: string[]
): string {
  if (atpCol.length !== apps.length || medCol.length !== apps.length) {
    throw new Error(
      `Paradox export: decrypted column length mismatch (apps=${apps.length}, atp=${atpCol.length}, med=${medCol.length})`
    );
  }
  const data = apps.map((app, i) => buildParadoxRow(app, atpCol[i] ?? '', medCol[i] ?? ''));
  return unparse(
    { fields: PARADOX_COLUMN_ORDER as string[], data: data as Record<string, unknown>[] },
    { quotes: true }
  );
}

/** Trigger a browser download for a previously-built CSV string. */
export function downloadParadoxCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Convenience: `paradox-export-2026-04-20-1547.csv` */
export function paradoxExportFilename(now: Date = new Date()): string {
  return `paradox-export-${format(now, 'yyyy-MM-dd-HHmm')}.csv`;
}
