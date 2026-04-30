import { format } from 'date-fns';

/**
 * Build an iCalendar (.ics) payload for a pilot indoctrination / training class session.
 *
 * The name retains "interview-utils" only for import-site stability; the helper is used
 * for indoctrination class confirmations now that the in-person interview flow is retired.
 */
export function buildClassIcs(params: {
  title: string;
  description: string;
  location: string;
  start: Date;
  end: Date;
  organizerEmail?: string;
}): string {
  const fmt = (d: Date) => format(d, "yyyyMMdd'T'HHmmss");
  const uid = `${Date.now()}@${resolveIcsHost()}`;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//fdxonboard Pilot Portal//Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(params.start)}`,
    `DTEND:${fmt(params.end)}`,
    `SUMMARY:${escapeIcsText(params.title)}`,
    `DESCRIPTION:${escapeIcsText(params.description)}`,
    `LOCATION:${escapeIcsText(params.location)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.join('\r\n');
}

function escapeIcsText(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/** Derive an ICS UID host from NEXT_PUBLIC_APP_URL; falls back to `pilotportal.local`. */
function resolveIcsHost(): string {
  const raw =
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_APP_URL?.trim()) || '';
  if (!raw) return 'pilotportal.local';
  try {
    return new URL(raw).host || 'pilotportal.local';
  } catch {
    return 'pilotportal.local';
  }
}

export function downloadIcs(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
