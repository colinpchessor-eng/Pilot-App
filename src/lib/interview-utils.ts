import { format } from 'date-fns';

/** Start times every 30 minutes from 8:00 through 16:30 (local). */
export const INTERVIEW_START_OPTIONS: string[] = (() => {
  const out: string[] = [];
  for (let h = 8; h <= 16; h++) {
    for (const m of [0, 30]) {
      if (h === 16 && m === 30) break;
      out.push(`${h.toString().padStart(2, '0')}:${m === 0 ? '00' : '30'}`);
    }
  }
  return out;
})();

export const INTERVIEW_DURATION_OPTIONS = [30, 45, 60, 90] as const;

/** Parse "HH:mm" to minutes from midnight. */
export function parseTimeToMinutes(t: string): number {
  const [h, m] = t.split(':').map((x) => parseInt(x, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

/** Add duration minutes to "HH:mm" start, return "HH:mm" end (24h). */
export function computeEndTime(startTime: string, durationMinutes: number): string {
  const start = parseTimeToMinutes(startTime);
  const end = start + durationMinutes;
  const h = Math.floor(end / 60);
  const m = end % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/** Combine calendar date (local midnight boundary) + "HH:mm" into a Date in local TZ. */
export function combineLocalDateAndTime(day: Date, timeHHmm: string): Date {
  const d = new Date(day);
  d.setHours(0, 0, 0, 0);
  const [hh, mm] = timeHHmm.split(':').map((x) => parseInt(x, 10));
  d.setHours(hh || 0, mm || 0, 0, 0);
  return d;
}

export function formatTimeAmPm(hhmm: string): string {
  try {
    const [h, m] = hhmm.split(':').map((x) => parseInt(x, 10));
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return format(d, 'h:mm a');
  } catch {
    return hhmm;
  }
}

export function formatSlotTimeRange(startTime: string, endTime: string): string {
  return `${formatTimeAmPm(startTime)} — ${formatTimeAmPm(endTime)}`;
}

export function formatSlotCardRange(startTime: string, endTime: string): string {
  return `${formatTimeAmPm(startTime)} - ${formatTimeAmPm(endTime)}`;
}

export function buildInterviewIcs(params: {
  title: string;
  description: string;
  location: string;
  start: Date;
  end: Date;
  organizerEmail?: string;
}): string {
  const fmt = (d: Date) =>
    format(d, "yyyyMMdd'T'HHmmss");
  const uid = `${Date.now()}@fedex-pilot-app`;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FedEx Pilot App//Interview//EN',
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
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
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
