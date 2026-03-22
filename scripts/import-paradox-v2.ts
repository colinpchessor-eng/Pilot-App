/**
 * import-paradox.ts
 *
 * WHAT THIS DOES:
 * Reads all HTML files from scripts/paradox-files/,
 * extracts only the fields we need, uploads to Firestore
 * under /legacyData/{candidateId}
 *
 * HOW TO RUN:
 * 1. Drop all HTML files into scripts/paradox-files/
 * 2. npx ts-node scripts/import-paradox.ts
 *
 * FILENAME FORMAT:
 * The Candidate ID must appear in parentheses anywhere in the filename.
 * Example: "Dave MAcnair Test (12345678) File Test File.html"
 *           → candidateId = "12345678"
 */

import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'node-html-parser';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// ═══════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════

const HTML_FOLDER = path.join(process.cwd(), 'scripts', 'paradox-files');
const SERVICE_ACCOUNT_PATH = path.join(process.cwd(), 'scripts', 'service-account.json');

// ═══════════════════════════════════════
// FIREBASE SETUP
// ═══════════════════════════════════════

const serviceAccount = JSON.parse(
  fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8')
);

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// ═══════════════════════════════════════
// HELPER: Extract candidate ID from filename
// "Dave MAcnair Test (12345678) File.html" → "12345678"
// "12345678.html" → "12345678"
// ═══════════════════════════════════════

function extractCandidateId(filename: string): string | null {
  const withoutExt = path.basename(filename, '.html');
  // Try parentheses: (12345678) or (ABC123)
  const parenMatch = withoutExt.match(/\(([A-Za-z0-9]+)\)/);
  if (parenMatch) return parenMatch[1];
  // Fallback: entire filename is just a number
  const plainMatch = withoutExt.match(/^(\d+)$/);
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

// ═══════════════════════════════════════
// HELPER: Get first data row of a named section
// ═══════════════════════════════════════

function getFirstDataRow(html: any, sectionTitle: string): string[] {
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

  // ─── FLIGHT TIME ─────────────────────
  const totalHours      = getFieldValue(html, 'Total Flight Hours');
  const turbinePIC      = getFieldValue(html, 'Turbine PIC Hours');
  const military        = getFieldValue(html, 'Military Hours');
  const civilian        = getFieldValue(html, 'Civilian Hours');
  const multiEngine     = getFieldValue(html, 'Multi-Engine Hours');
  const instructor      = getFieldValue(html, 'Instructor Hours');
  const evaluator       = getFieldValue(html, 'Evaluator Hours');
  const sic             = getFieldValue(html, 'SIC Hours');
  const other           = getFieldValue(html, 'Other Hours');
  const dateLastFlown   = getFieldValue(html, 'Date Last Flown');
  const lastAircraft    = getFieldValue(html, 'Last Aircraft Flown');

  // ─── LAST EMPLOYER ───────────────────
  // Columns: From, To, Employer, Position, City, State, Reason, Supervisor, Contact
  const empRow = getFirstDataRow(html, 'Employment History');
  const lastEmployer = {
    from:    empRow[0] || '',
    to:      empRow[1] || '',
    company: empRow[2] || '',
    title:   empRow[3] || '',
    city:    empRow[4] || '',
    state:   empRow[5] || '',
  };

  // ─── LAST RESIDENCE ──────────────────
  // Columns: From, To, Street, City, State, Zip, Country
  const resRow = getFirstDataRow(html, 'Residence History');
  const lastResidence = {
    from:    resRow[0] || '',
    to:      resRow[1] || '',
    street:  resRow[2] || '',
    city:    resRow[3] || '',
    state:   resRow[4] || '',
    zip:     resRow[5] || '',
    country: resRow[6] || '',
  };

  // ─── AERONAUTICAL ────────────────────
  const atpNumber         = getFieldValue(html, 'ATP Certificate Number');
  const firstClassMedical = getFieldValue(html, 'First Class Medical Date');
  const typeRatings       = getFieldValue(html, 'Type Ratings');

  // ─── APPLICATION ID ──────────────────
  const legacyApplicationId = getFieldValue(html, 'Application ID');

  const toNumber = (val: string) =>
    parseFloat(val.replace(/,/g, '')) || 0;

  return {
    candidateId,
    legacyApplicationId,
    importedAt: new Date().toISOString(),
    source: 'paradox',
    flightTime: {
      total:            toNumber(totalHours),
      turbinePIC:       toNumber(turbinePIC),
      military:         toNumber(military),
      civilian:         toNumber(civilian),
      multiEngine:      toNumber(multiEngine),
      instructor:       toNumber(instructor),
      evaluator:        toNumber(evaluator),
      sic:              toNumber(sic),
      other:            toNumber(other),
      dateLastFlown,
      lastAircraftFlown: lastAircraft,
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
// MAIN — LOOP THROUGH ALL FILES
// ═══════════════════════════════════════

async function main() {
  if (!fs.existsSync(HTML_FOLDER)) {
    fs.mkdirSync(HTML_FOLDER, { recursive: true });
    console.log(`Created folder: scripts/paradox-files/`);
    console.log('Drop your HTML files in there and run again.');
    return;
  }

  const files = fs.readdirSync(HTML_FOLDER)
    .filter(f => f.endsWith('.html'));

  if (files.length === 0) {
    console.log('No HTML files found in scripts/paradox-files/');
    return;
  }

  console.log(`Found ${files.length} HTML files to process...\n`);

  let success = 0;
  let failed  = 0;
  const errors: string[] = [];

  for (const file of files) {
    const candidateId = extractCandidateId(file);

    if (!candidateId) {
      console.log(`⚠️  SKIPPED: ${file}`);
      console.log(`   Reason: No Candidate ID found in filename`);
      console.log(`   Fix:    Rename to include ID in parens`);
      console.log(`   Example: "Dave McNair (12345678) Application.html"\n`);
      failed++;
      errors.push(`${file}: No Candidate ID in filename`);
      continue;
    }

    const filePath = path.join(HTML_FOLDER, file);

    try {
      process.stdout.write(
        `[${success + failed + 1}/${files.length}] ${file} → ID: ${candidateId}...`
      );

      const data = parseHtmlFile(filePath, candidateId);

      await db
        .collection('legacyData')
        .doc(candidateId)
        .set(data, { merge: true });

      console.log(` ✅`);
      success++;

    } catch (err: any) {
      console.log(` ❌ ${err.message}`);
      errors.push(`${file}: ${err.message}`);
      failed++;
    }
  }

  console.log('\n═══════════════════════════════════════');
  console.log(`✅ Success: ${success}`);
  console.log(`❌ Failed:  ${failed}`);
  if (errors.length > 0) {
    console.log('\nFailed files:');
    errors.forEach(e => console.log(`  - ${e}`));
  }
  console.log('═══════════════════════════════════════');
  console.log('\nCheck Firestore → legacyData collection to verify.');
}

main().catch(console.error);