/**
 * import-paradox.ts
 *
 * WHAT THIS DOES:
 * Reads all HTML files from the paradox-files folder,
 * extracts the fields we need, uploads them to Firestore
 * under /legacyData/{candidateId}, creates a candidateIds
 * record for each, deletes the source HTML on success,
 * and generates an HR report CSV.
 *
 * HOW TO RUN:
 * 1. Drop all HTML files into scripts/paradox-files/
 * 2. Run: npx ts-node scripts/import-paradox.ts
 *
 * SAFE TO RE-RUN:
 * - legacyData uses merge:true (updates, never overwrites)
 * - candidateIds skips if doc already exists
 * - Already-deleted files are skipped gracefully
 *
 * FILENAME FORMAT:
 * Candidate ID must appear in parentheses or be the full filename.
 * Examples:
 *   "Dave McNair (12345678) Application.html" → 12345678
 *   "Colin Chessor (ABC123) Master Key.html"  → ABC123
 *   "12345678.html"                           → 12345678
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'node-html-parser';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ═══════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════

const HTML_FOLDER = path.join(process.cwd(), 'scripts', 'paradox-files');
const REPORT_PATH = path.join(process.cwd(), 'scripts', 'import-report.csv');

function resolveServiceAccountPath(): string {
  const candidates = [
    path.join(process.cwd(), 'scripts', 'service-account.json'),
    path.join(process.cwd(), 'scripts', 'service_account.json'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error(
    'Service account not found. Add scripts/service-account.json or scripts/service_account.json'
  );
}

// ═══════════════════════════════════════
// FIREBASE SETUP
// ═══════════════════════════════════════

const serviceAccount = JSON.parse(
  fs.readFileSync(resolveServiceAccountPath(), 'utf8')
);

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

// ═══════════════════════════════════════
// HELPER: Extract candidate ID from filename
// "Dave MAcnair Test (12345678) File.html" → "12345678"
// "Colin Chessor (ABC123) Master Key.html" → "ABC123"
// "12345678.html" → "12345678"
// ═══════════════════════════════════════

function extractCandidateId(filename: string): string | null {
  const withoutExt = path.basename(filename, '.html');
  const parenMatch = withoutExt.match(/\(([A-Za-z0-9]+)\)/);
  if (parenMatch) return parenMatch[1];
  const plainMatch = withoutExt.match(/^([A-Za-z0-9]+)$/);
  if (plainMatch) return plainMatch[1];
  return null;
}

// ═══════════════════════════════════════
// HELPER: Find a table row value by label
// ═══════════════════════════════════════

function getFieldValue(html: any, labelText: string): string {
  const rows = html.querySelectorAll('tr');
  for (const row of rows) {
    const cells = row.querySelectorAll('td');
    if (cells.length >= 2) {
      const label = cells[0].text.trim();
      if (label.toLowerCase().includes(labelText.toLowerCase())) {
        return cells[1].text.trim();
      }
    }
  }
  return '';
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', {
    month: '2-digit',
    year: 'numeric',
  });
}

/** Paradox real format: h3 section + 3-column table (question, order, answer). */
function getParadoxValue(
  html: any,
  sectionHeading: string,
  questionText: string,
  order?: string,
  exactMatch?: boolean
): string {
  const headings = html.querySelectorAll('h3');
  let targetTable: any = null;

  for (const h of headings) {
    if (h.text.trim().toLowerCase() === sectionHeading.toLowerCase()) {
      let next = h.nextElementSibling;
      while (next && String(next.tagName).toLowerCase() !== 'table') {
        next = next.nextElementSibling;
      }
      if (next) targetTable = next;
    }
  }

  if (!targetTable) return '';

  for (const row of targetTable.querySelectorAll('tr')) {
    const cells = row.querySelectorAll('td');
    if (cells.length >= 3) {
      const q = cells[0].text.trim() || '';
      const o = cells[1].text.trim() || '';
      const a = cells[2].text.trim() || '';

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

/**
 * All rows in a Paradox section table where the order column matches (e.g. "1").
 * Use exact question text when reading answers (e.g. pick "Employer", not "Current Employer?").
 */
function getParadoxSectionFirstOrder(
  html: any,
  sectionHeading: string,
  order: string
): Array<{ question: string; answer: string }> {
  const headings = html.querySelectorAll('h3');
  let targetTable: any = null;

  for (const h of headings) {
    if (h.text.trim().toLowerCase() === sectionHeading.toLowerCase()) {
      let next = h.nextElementSibling;
      while (next && String(next.tagName).toLowerCase() !== 'table') {
        next = next.nextElementSibling;
      }
      if (next) targetTable = next;
    }
  }

  if (!targetTable) return [];

  const out: Array<{ question: string; answer: string }> = [];
  for (const row of targetTable.querySelectorAll('tr')) {
    const cells = row.querySelectorAll('td');
    if (cells.length >= 3) {
      const q = cells[0].text.trim() || '';
      const o = cells[1].text.trim() || '';
      const a = cells[2].text.trim() || '';
      if (o === order) {
        out.push({ question: q, answer: a });
      }
    }
  }
  return out;
}

// ═══════════════════════════════════════
// HELPER: Get first row of a section table
// ═══════════════════════════════════════

function getFirstDataRow(
  html: any,
  sectionTitle: string
): string[] {
  const sections = html.querySelectorAll('.section');
  for (const section of sections) {
    const title = section.querySelector('.section-title');
    if (title && title.text.toLowerCase()
        .includes(sectionTitle.toLowerCase())) {
      const rows = section.querySelectorAll('tr');
      for (const row of rows) {
        const cells = row.querySelectorAll('td');
        if (cells.length > 0) {
          return cells.map((c: any) => c.text.trim());
        }
      }
    }
  }
  return [];
}

// ═══════════════════════════════════════
// MAIN PARSER
// ═══════════════════════════════════════

function parseHtmlFile(filePath: string, candidateId: string) {
  const rawHtml = fs.readFileSync(filePath, 'utf8');
  const html = parse(rawHtml);

  // ─── PERSONAL INFO ─────────────────
  const firstName = getFieldValue(html, 'First Name');
  const lastName  = getFieldValue(html, 'Last Name');
  const email     = getFieldValue(html, 'Email Address');
  const name      = `${firstName} ${lastName}`.trim();

  // ─── FLIGHT TIME ───────────────────
  const totalHours = getFieldValue(html, 'Total Flight Hours');
  const turbinePIC = getFieldValue(html, 'Turbine PIC Hours');
  const military   = getFieldValue(html, 'Military Hours');
  const civilian   = getFieldValue(html, 'Civilian Hours');
  const multiEngine = getFieldValue(html, 'Multi-Engine Hours');
  const instructor = getFieldValue(html, 'Instructor Hours');
  const evaluator  = getFieldValue(html, 'Evaluator Hours');
  const sic        = getFieldValue(html, 'SIC Hours');
  const other      = getFieldValue(html, 'Other Hours');
  const dateLastFlown    = getFieldValue(html, 'Date Last Flown');
  const lastAircraftFlown = getFieldValue(html, 'Last Aircraft Flown');

  // ─── LAST EMPLOYER ───
  // Paradox real HTML: h3 "Work Experience" + 3-col table; exact label match for Employer (not "Current Employer?").
  const wxOrder1 = getParadoxSectionFirstOrder(html, 'Work Experience', '1');
  let lastEmployer: {
    from: string;
    to: string;
    company: string;
    title: string;
    city: string;
    state: string;
  };

  if (wxOrder1.length > 0) {
    lastEmployer = {
      company: getParadoxValue(html, 'Work Experience', 'Employer', '1', true),
      title: getParadoxValue(html, 'Work Experience', 'Job Title', '1', true),
      city: getParadoxValue(html, 'Work Experience', 'City', '1', true),
      state: getParadoxValue(html, 'Work Experience', 'State', '1', true),
      from: formatDate(getParadoxValue(html, 'Work Experience', 'Start Date', '1', false)),
      to: formatDate(getParadoxValue(html, 'Work Experience', 'End Date', '1', false)),
    };
  } else {
    const employmentRow = getFirstDataRow(html, 'Employment History');
    lastEmployer = {
      from: employmentRow[0] || '',
      to: employmentRow[1] || '',
      company: employmentRow[2] || '',
      title: employmentRow[3] || '',
      city: employmentRow[4] || '',
      state: employmentRow[5] || '',
    };
  }

  // ─── LAST RESIDENCE (first row of residence table) ───
  const residenceRow = getFirstDataRow(html, 'Residence History');
  const lastResidence = {
    from:    residenceRow[0] || '',
    to:      residenceRow[1] || '',
    street:  residenceRow[2] || '',
    city:    residenceRow[3] || '',
    state:   residenceRow[4] || '',
    zip:     residenceRow[5] || '',
    country: residenceRow[6] || '',
  };

  // ─── ATP & MEDICAL ───────────────────
  const atpNumber          = getFieldValue(html, 'ATP Certificate Number');
  const firstClassMedical  = getFieldValue(html, 'First Class Medical Date');
  const typeRatings        = getFieldValue(html, 'Type Ratings');

  // ─── APPLICATION ID ──────────────────
  // Try table row first
  let legacyApplicationId = getFieldValue(html, 'Application ID');

  // Fallback: search <p> tags for Application ID
  if (!legacyApplicationId) {
    const paragraphs = html.querySelectorAll('p');
    for (const p of paragraphs) {
      const text = p.text.trim();
      if (text.toLowerCase().includes('application id')) {
        const match = text.match(/:\s*(\S+)/);
        if (match) {
          legacyApplicationId = match[1];
          break;
        }
      }
    }
  }

  // Also try Candidate ID field as fallback
  if (!legacyApplicationId) {
    legacyApplicationId = getFieldValue(html, 'Candidate ID') || '';
  }

  return {
    candidateId,
    name,
    email,
    legacyApplicationId,
    importedAt: new Date().toISOString(),
    source: 'paradox',
    flightTime: {
      total:           parseFloat(totalHours.replace(/,/g, '')) || 0,
      turbinePIC:      parseFloat(turbinePIC.replace(/,/g, '')) || 0,
      military:        parseFloat(military.replace(/,/g, '')) || 0,
      civilian:        parseFloat(civilian.replace(/,/g, '')) || 0,
      multiEngine:     parseFloat(multiEngine.replace(/,/g, '')) || 0,
      instructor:      parseFloat(instructor.replace(/,/g, '')) || 0,
      evaluator:       parseFloat(evaluator.replace(/,/g, '')) || 0,
      sic:             parseFloat(sic.replace(/,/g, '')) || 0,
      other:           parseFloat(other.replace(/,/g, '')) || 0,
      dateLastFlown,
      lastAircraftFlown,
    },
    lastEmployer,
    lastResidence,
    aeronautical: {
      atpNumber,
      firstClassMedicalDate: firstClassMedical,
      typeRatings,
    },
  };
}

// ═══════════════════════════════════════
// CSV HELPERS
// ═══════════════════════════════════════

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

type ReportRow = {
  candidateId: string;
  name: string;
  email: string;
  legacyAppId: string;
  status: string;
  processedAt: string;
  fileDeleted: boolean;
};

// ═══════════════════════════════════════
// MAIN — LOOP THROUGH ALL FILES
// ═══════════════════════════════════════

async function main() {
  if (!fs.existsSync(HTML_FOLDER)) {
    fs.mkdirSync(HTML_FOLDER, { recursive: true });
    console.log(`Created folder: ${HTML_FOLDER}`);
    console.log('Drop your HTML files in there and run again.');
    return;
  }

  const files = fs.readdirSync(HTML_FOLDER)
    .filter(f => f.endsWith('.html'));

  if (files.length === 0) {
    console.log('No HTML files found in scripts/paradox-files/');
    console.log('Drop your HTML files in there and run again.');
    return;
  }

  console.log(`\nFound ${files.length} HTML files to process...\n`);

  let success = 0;
  let failed = 0;
  const reportRows: ReportRow[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const num = `[${i + 1}/${files.length}]`;
    const candidateId = extractCandidateId(file);
    const processedAt = new Date().toISOString();

    if (!candidateId) {
      console.log(`${num} ⚠️  SKIPPED: ${file}`);
      console.log(`  Reason: No Candidate ID in filename`);
      reportRows.push({
        candidateId: 'UNKNOWN',
        name: 'Unknown',
        email: 'Unknown',
        legacyAppId: 'Unknown',
        status: 'FAILED - no Candidate ID in filename',
        processedAt,
        fileDeleted: false,
      });
      failed++;
      continue;
    }

    const filePath = path.join(HTML_FOLDER, file);

    if (!fs.existsSync(filePath)) {
      console.log(`${num} ⏭  ${candidateId} — file not found (already processed?)`);
      reportRows.push({
        candidateId,
        name: 'Unknown',
        email: 'Unknown',
        legacyAppId: 'Unknown',
        status: 'skipped - file already deleted',
        processedAt,
        fileDeleted: true,
      });
      continue;
    }

    try {
      const data = parseHtmlFile(filePath, candidateId);

      console.log(`${num} ${data.name || 'Unknown'} (${candidateId})`);
      console.log(`  Email:  ${data.email || '—'}`);
      console.log(`  Legacy: ${data.legacyApplicationId || '—'}`);

      // Upload to legacyData (merge = safe re-run)
      await db
        .collection('legacyData')
        .doc(candidateId)
        .set(data, { merge: true });

      console.log(`  Upload: ✅ legacyData`);

      // Create candidateIds record if it doesn't exist
      const candidateIdRef = db
        .collection('candidateIds')
        .doc(candidateId);

      const existingDoc = await candidateIdRef.get();

      if (!existingDoc.exists) {
        await candidateIdRef.set({
          candidateId: candidateId,
          name: data.name || '',
          email: data.email || '',
          legacyApplicationId: data.legacyApplicationId || '',
          status: 'unassigned',
          assignedUid: '',
          masterKey: false,
          claimedAt: '',
          createdAt: FieldValue.serverTimestamp(),
          source: 'paradox-import',
        });
        console.log(`  Record: ✅ candidateIds`);
      } else {
        console.log(`  Record: ⏭  candidateIds already exists`);
      }

      // COMPLIANCE: Delete source file after successful upload
      fs.unlinkSync(filePath);
      console.log(`  Delete: ✅ source file removed`);

      reportRows.push({
        candidateId,
        name: data.name || 'Unknown',
        email: data.email || 'Unknown',
        legacyAppId: data.legacyApplicationId || 'Unknown',
        status: 'success',
        processedAt,
        fileDeleted: true,
      });
      success++;

    } catch (err: any) {
      console.log(`  Upload: ❌ ${err.message}`);
      console.log(`  Delete: ⏭  skipped — file kept for retry`);
      reportRows.push({
        candidateId,
        name: 'Unknown',
        email: 'Unknown',
        legacyAppId: 'Unknown',
        status: `FAILED - ${err.message}`,
        processedAt,
        fileDeleted: false,
      });
      failed++;
    }

    console.log('');
  }

  // ─── GENERATE HR REPORT CSV ──────────
  const csvHeader = 'CandidateID,Name,Email,LegacyAppID,Status,ProcessedAt,FileDeleted';
  const csvRows = reportRows.map(r =>
    [
      csvEscape(r.candidateId),
      csvEscape(r.name),
      csvEscape(r.email),
      csvEscape(r.legacyAppId),
      csvEscape(r.status),
      csvEscape(r.processedAt),
      String(r.fileDeleted),
    ].join(',')
  );
  const csvContent = [csvHeader, ...csvRows].join('\n');
  fs.writeFileSync(REPORT_PATH, csvContent, 'utf8');

  // ─── SUMMARY ─────────────────────────
  console.log('═══════════════════════════════════════');
  console.log(`COMPLETE: ${success} succeeded, ${failed} failed`);
  console.log(`HR Report: ${REPORT_PATH}`);
  if (failed > 0) {
    console.log(`\n⚠️  ${failed} file(s) failed — re-run to retry.`);
  }
  console.log('═══════════════════════════════════════');
}

main().catch(console.error);
