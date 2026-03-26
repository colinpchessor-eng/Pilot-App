/**
 * Static audit: server actions vs client Firestore writes.
 * Companion to .cursor/plans/client_vs_server_firestore_writes_*.plan.md
 *
 * Run: node scripts/verify-firestore-enforcement.mjs
 * Or:  npm run verify:enforcement
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const srcRoot = path.join(root, 'src');

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name === '.next') continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, acc);
    else if (/\.(tsx|ts)$/.test(ent.name)) acc.push(p);
  }
  return acc;
}

function rel(p) {
  return path.relative(root, p).replace(/\\/g, '/');
}

const files = walk(srcRoot);
const serverActions = [];
const clientWrites = [];

const useServer = /^\s*['"]use server['"]\s*;/m;
const firestoreImport = /from\s+['"]firebase\/firestore['"]/;
const writeCall =
  /\b(updateDoc|setDoc|writeBatch|runTransaction|addDoc)\s*\(/;

for (const f of files) {
  const c = fs.readFileSync(f, 'utf8');
  const r = rel(f);
  if (useServer.test(c)) {
    const hasAdmin =
      /getAdminFirestore|verifyIdToken|verifyIsAdmin/.test(c);
    serverActions.push({ file: r, hasAdmin });
  }
  if (firestoreImport.test(c) && writeCall.test(c)) {
    clientWrites.push(r);
  }
}

let failed = false;

console.log('=== Server Actions (\'use server\') ===\n');
for (const { file, hasAdmin } of serverActions.sort((a, b) =>
  a.file.localeCompare(b.file)
)) {
  const tag = hasAdmin ? 'OK admin/auth' : 'info (no Admin in file)';
  console.log(`  [${tag}] ${file}`);
  if (
    file.includes('/applicant/verification-actions') ||
    file.includes('/admin/actions')
  ) {
    if (!hasAdmin) {
      console.error(`  FAIL: expected Admin SDK usage in ${file}`);
      failed = true;
    }
  }
}

console.log('\n=== Client Firestore write APIs (firebase/firestore) ===\n');
console.log(
  '  These paths use the Web SDK for writes; enforcement is Firestore rules + your UI.\n'
);
for (const f of [...new Set(clientWrites)].sort()) {
  console.log(`  ${f}`);
}

console.log('\n=== firestore.rules (quick grep) ===\n');
const rulesPath = path.join(root, 'firestore.rules');
if (fs.existsSync(rulesPath)) {
  const rules = fs.readFileSync(rulesPath, 'utf8');
  const checks = [
    ['touchesProtectedUserFields', /function touchesProtectedUserFields/],
    ['userSelfUpdateAffectedKeysAllowlist', /function userSelfUpdateAffectedKeysAllowlist/],
    ['usersCreateKeysValid', /function usersCreateKeysValid/],
    ['candidateIdsFlowKeysOnly', /function candidateIdsFlowKeysOnly/],
    [
      'audit candidateSelfAuditCreateValid',
      /function candidateSelfAuditCreateValid/,
    ],
  ];
  for (const [label, re] of checks) {
    const ok = re.test(rules);
    console.log(`  [${ok ? 'OK' : 'MISS'}] ${label}`);
    if (!ok) failed = true;
  }
} else {
  console.error('  FAIL: firestore.rules not found');
  failed = true;
}

console.log('\n---');
if (failed) {
  console.log('Result: FAILED (see above)');
  process.exit(1);
}
console.log(
  'Result: static checks passed. Still run manual Rules Playground + runtime tests (see docs/verify-firestore-enforcement.md).'
);
process.exit(0);
