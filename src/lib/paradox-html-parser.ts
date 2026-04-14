/**
 * Paradox / test HTML parsing for devtools single-file re-import.
 * Mirrors logic from admin import (browser-only: uses DOMParser).
 */

export type ParsedParadoxCandidate = {
  name: string;
  email: string;
  flightTime: {
    total: number;
    turbinePIC: number;
    sic: number;
    instructor: number;
    dateLastFlown: string;
    lastAircraftFlown: string;
  };
  lastEmployer: {
    company: string;
    title: string;
    city: string;
    state: string;
    from: string;
    to: string;
  };
  lastResidence: { street: string; city: string; state: string; zip: string; from: string; to: string };
  aeronautical: { typeRatings: string; firstClassMedicalDate: string };
};

export function extractCandidateIdFromFilename(filename: string): string | null {
  const parenMatch = filename.match(/\((\d+)\)/);
  if (parenMatch) return parenMatch[1];
  const underscoreMatch = filename.match(/__(\d{6,10})_/);
  if (underscoreMatch) return underscoreMatch[1];
  const plainMatch = filename.replace('.html', '').match(/^(\d+)$/);
  if (plainMatch) return plainMatch[1];
  return null;
}

function detectFormat(htmlDoc: Document): 'paradox' | 'test' {
  const sectionTitles = htmlDoc.querySelectorAll('.section-title');
  return sectionTitles.length > 0 ? 'test' : 'paradox';
}

function getParadoxAnswer(
  htmlDoc: Document,
  sectionHeading: string,
  questionText: string,
  order?: string,
  exactMatch?: boolean
): string {
  const headings = htmlDoc.querySelectorAll('h3');
  let targetTable: Element | null = null;

  headings.forEach((h) => {
    if (h.textContent?.toLowerCase().trim() === sectionHeading.toLowerCase()) {
      let next = h.nextElementSibling;
      while (next && next.tagName !== 'TABLE') {
        next = next.nextElementSibling;
      }
      if (next) targetTable = next;
    }
  });

  if (!targetTable) return '';

  const rows = (targetTable as Element).querySelectorAll('tr');
  for (const row of rows) {
    const cells = row.querySelectorAll('td');
    if (cells.length >= 3) {
      const q = cells[0].textContent?.trim() || '';
      const o = cells[1].textContent?.trim() || '';
      const a = cells[2].textContent?.trim() || '';

      const questionMatch = exactMatch
        ? q.toLowerCase() === questionText.toLowerCase()
        : q.toLowerCase().includes(questionText.toLowerCase());

      const orderMatch = !order || o === order;

      if (questionMatch && orderMatch) {
        return a;
      }
    }
  }
  return '';
}

function formatMonthYear(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: '2-digit', year: 'numeric' });
}

function formatMonthDayYear(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
}

function parseRealFormat(htmlDoc: Document): ParsedParadoxCandidate {
  const firstName = getParadoxAnswer(htmlDoc, 'My Information', 'First Name');
  const lastName = getParadoxAnswer(htmlDoc, 'My Information', 'Last Name');
  const email = getParadoxAnswer(htmlDoc, 'My Information', 'Primary Email');
  const street = getParadoxAnswer(htmlDoc, 'Residency History', 'Street Address Line 1', '1');
  const city = getParadoxAnswer(htmlDoc, 'Residency History', 'City', '1');
  const state = getParadoxAnswer(htmlDoc, 'Residency History', 'State / Region', '1');
  const zip = getParadoxAnswer(htmlDoc, 'Residency History', 'ZIP/Postal Code', '1');
  const livedFrom = getParadoxAnswer(htmlDoc, 'Residency History', 'Lived From Date', '1', false);
  const livedTo = getParadoxAnswer(htmlDoc, 'Residency History', 'Lived To Date', '1', false);
  const company = getParadoxAnswer(htmlDoc, 'Work Experience', 'Employer', '1', true);
  const title = getParadoxAnswer(htmlDoc, 'Work Experience', 'Job Title', '1', true);
  const employerCity = getParadoxAnswer(htmlDoc, 'Work Experience', 'City', '1', true);
  const employerState = getParadoxAnswer(htmlDoc, 'Work Experience', 'State', '1', true);
  const employerFrom = getParadoxAnswer(htmlDoc, 'Work Experience', 'Start Date', '1', false);
  const employerTo = getParadoxAnswer(htmlDoc, 'Work Experience', 'End Date', '1', false);

  let totalPIC = 0;
  let totalSIC = 0;
  let totalInstructor = 0;
  let dateLastFlown = '';
  let lastAircraftFlown = '';
  let currentAircraft = '';
  const typeRatings: string[] = [];

  const allRows = htmlDoc.querySelectorAll('tr');
  allRows.forEach((row) => {
    const cells = row.querySelectorAll('td');
    if (cells.length >= 3) {
      const q = cells[0].textContent?.trim();
      const a = cells[2].textContent?.trim() || '0';
      if (q === 'Aircraft Type') {
        currentAircraft = a;
        if (a && !typeRatings.includes(a)) typeRatings.push(a);
      }
      if (q === 'PIC Hrs') totalPIC += parseFloat(a) || 0;
      if (q === 'SIC Hrs') totalSIC += parseFloat(a) || 0;
      if (q === 'Instructor Hrs') totalInstructor += parseFloat(a) || 0;
      if (q === 'Last Flown Date' && !dateLastFlown && a) {
        const d = new Date(a);
        if (!isNaN(d.getTime())) {
          dateLastFlown = d.toLocaleDateString('en-US');
          lastAircraftFlown = currentAircraft;
        }
      }
    }
  });

  const medicalRaw = getParadoxAnswer(htmlDoc, 'Certifications', 'Issued:');
  const medicalDate = medicalRaw ? new Date(medicalRaw).toLocaleDateString('en-US') : '';

  return {
    name: `${firstName} ${lastName}`.trim(),
    email,
    flightTime: {
      total: Math.round((totalPIC + totalSIC + totalInstructor) * 10) / 10,
      turbinePIC: totalPIC,
      sic: totalSIC,
      instructor: totalInstructor,
      dateLastFlown,
      lastAircraftFlown,
    },
    lastEmployer: {
      company,
      title,
      city: employerCity,
      state: employerState,
      from: formatMonthYear(employerFrom),
      to: formatMonthYear(employerTo),
    },
    lastResidence: {
      street,
      city,
      state,
      zip,
      from: formatMonthDayYear(livedFrom),
      to: formatMonthDayYear(livedTo),
    },
    aeronautical: {
      typeRatings: typeRatings.slice(0, 5).join(', '),
      firstClassMedicalDate: medicalDate,
    },
  };
}

function parseTestFormat(htmlDoc: Document): ParsedParadoxCandidate {
  function getFieldValue(label: string): string {
    const rows = htmlDoc.querySelectorAll('tr');
    for (const row of rows) {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 2) {
        if (cells[0].textContent?.trim().toLowerCase().includes(label.toLowerCase())) {
          return cells[1].textContent?.trim() || '';
        }
      }
    }
    return '';
  }

  return {
    name: `${getFieldValue('First Name')} ${getFieldValue('Last Name')}`.trim(),
    email: getFieldValue('Email Address'),
    flightTime: {
      total: parseFloat(getFieldValue('Total Flight Hours').replace(/,/g, '')) || 0,
      turbinePIC: parseFloat(getFieldValue('Turbine PIC Hours').replace(/,/g, '')) || 0,
      sic: parseFloat(getFieldValue('SIC Hours').replace(/,/g, '')) || 0,
      instructor: parseFloat(getFieldValue('Instructor Hours').replace(/,/g, '')) || 0,
      dateLastFlown: getFieldValue('Date Last Flown'),
      lastAircraftFlown: getFieldValue('Last Aircraft Flown'),
    },
    lastEmployer: { company: '', title: '', city: '', state: '', from: '', to: '' },
    lastResidence: { street: '', city: '', state: '', zip: '', from: '', to: '' },
    aeronautical: {
      typeRatings: getFieldValue('Type Ratings'),
      firstClassMedicalDate: getFieldValue('First Class Medical Date'),
    },
  };
}

export function parseParadoxHTMLString(htmlString: string): ParsedParadoxCandidate {
  const parser = new DOMParser();
  const htmlDoc = parser.parseFromString(htmlString, 'text/html');
  const format = detectFormat(htmlDoc);
  return format === 'paradox' ? parseRealFormat(htmlDoc) : parseTestFormat(htmlDoc);
}
