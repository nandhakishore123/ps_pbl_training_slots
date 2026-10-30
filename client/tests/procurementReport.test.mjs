// ══ PROCUREMENT PDF — REMOVABLE FILE (whole module) ══════════════════════════
// Fixture tests for client/src/utils/procurementReport.js — pure HTML
// generation: no database, no server, no browser.
//
// Run (from the repo root):   node client/tests/procurementReport.test.mjs
//
// The report modules use Vite-only syntax (extensionless imports,
// import.meta.env), so each is bundled with Vite's own library build into an
// OS temp folder, imported from there, and the folder is deleted afterwards.
// Nothing is written inside the repo.
//
// T1 pins consumptionReport.js and stockReport.js. The hashes are taken over
// the text with CRLF → LF, so they hold on any checkout (core.autocrlf on or
// off). If either file is changed ON PURPOSE, update its hash below in the
// same change — that is the point: the change cannot slip in unnoticed.
// ═══════════════════════════════════════════════════════════════════════════
import { build } from 'vite';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const UTILS = fileURLToPath(new URL('../src/utils/', import.meta.url));
const read = (f) => readFileSync(join(UTILS, f), 'utf8').replace(/\r\n/g, '\n');
const hash = (f) => createHash('sha256').update(read(f)).digest('hex');
const PINNED = {
  'consumptionReport.js': '32f06821a04d22d3ebdfa657f6fc596e0a431984b66a7d7a4f82c47be80dd0b2',
  'stockReport.js': '1bf29b64d7af869c8e1b0e2c2fde860720cea00ade2f5f38e4c8a766a3cf86e5',
};

const OUT = mkdtempSync(join(tmpdir(), 'procpdf-test-'));
let pass = 0, fail = 0;
const check = (name, ok, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`); };

try {
  globalThis.window = { location: { origin: 'http://localhost:5173' } };
  for (const [entry, name] of [['procurementReport.js', 'proc.mjs'], ['stockReport.js', 'stock.mjs']]) {
    await build({
      configFile: false, logLevel: 'silent', root: UTILS,
      build: { outDir: OUT, emptyOutDir: false, minify: false,
        lib: { entry: join(UTILS, entry), formats: ['es'], fileName: () => name } },
    });
  }
  const R = await import(pathToFileURL(join(OUT, 'proc.mjs')).href);
  const S = await import(pathToFileURL(join(OUT, 'stock.mjs')).href);

  const GEN = new Date('2026-10-30T06:00:00Z');
  const row = (id, item, lab, at, name = 'Asha K', extra = {}) =>
    ({ procurement_id: id, item_name: item, quantity: '2.00', unit: 'pcs', lab_name: lab, entered_by_name: name, created_at: at, ...extra });
  const sections = (html) => [...html.matchAll(/<h2>(.*?) <span class="lab-count">\((\d+) items?\)<\/span><\/h2>/g)].map((m) => [m[1], Number(m[2])]);
  const bodyRows = (html) => [...html.matchAll(/<tbody>([\s\S]*?)<\/tbody>/g)].flatMap((m) => m[1].match(/<tr>[\s\S]*?<\/tr>/g) || []);

  // T1 — protected files untouched
  for (const f of Object.keys(PINNED)) {
    const now = hash(f);
    console.log(`      ${f}\n        pinned ${PINNED[f]}\n        now    ${now}`);
    check(`T1 ${f} hash unchanged`, now === PINNED[f]);
  }

  // T2 — 3 labs + 1 no-lab → 4 sections, order, counts, newest-first inside
  const items = [
    row(1, 'Resistor', 'Robotics Lab', '2026-10-01T05:00:00Z'),
    row(2, 'Beaker', 'chemistry lab', '2026-10-02T05:00:00Z'),
    row(3, 'Servo', 'Robotics Lab', '2026-10-05T05:00:00Z'),
    row(4, 'Wire', 'Electronics Lab', '2026-10-03T05:00:00Z'),
    row(5, 'Tape', null, '2026-10-04T05:00:00Z'),
    row(6, 'Gear', 'Robotics Lab', '2026-10-03T05:00:00Z'),
  ];
  const h2 = R.buildProcurementReportHtml({ items, generated_at: GEN });
  const s2 = sections(h2);
  check('T2 four sections', s2.length === 4, JSON.stringify(s2));
  check('T2 order alphabetical, No lab last', JSON.stringify(s2.map((s) => s[0])) === JSON.stringify(['chemistry lab', 'Electronics Lab', 'Robotics Lab', 'No lab assigned']));
  check('T2 per-lab counts', JSON.stringify(s2.map((s) => s[1])) === JSON.stringify([1, 1, 3, 1]));
  const robo = h2.split('Robotics Lab <span')[1].split('</table>')[0];
  check('T2 newest first inside a lab', robo.indexOf('Servo') < robo.indexOf('Gear') && robo.indexOf('Gear') < robo.indexOf('Resistor'));
  check('T2 summary line', h2.includes('6 entries &middot; 3 labs represented &middot; 1 with no lab assigned'));
  check('T2 title', h2.includes('<title>Lab Procurement — Requirement List</title>') && h2.includes('>Lab Procurement — Requirement List</div>'));
  check('T2 lab blocks avoid page breaks', (h2.match(/<div class="lab-block">/g) || []).length === 4 && h2.includes('.lab-block{page-break-inside:avoid'));

  // T3 — filtered subset: only those rows
  const subset = items.filter((p) => p.item_name === 'Servo' || p.item_name === 'Tape');
  const h3 = R.buildProcurementReportHtml({ items: subset, search: 'x', generated_at: GEN });
  const r3 = bodyRows(h3);
  check('T3 only subset rows', r3.length === 2 && h3.includes('Servo') && h3.includes('Tape')
    && !['Resistor', 'Beaker', 'Wire', 'Gear'].some((n) => h3.includes(n)));

  // T4 — zero rows: dashed panel, no table
  const h4 = R.buildProcurementReportHtml({ items: [], search: 'zzz', generated_at: GEN });
  check('T4 empty panel, no table', h4.includes('<div class="none">') && !h4.includes('<table') && h4.includes('No lab procurement entries match'));

  // T5 — escaping
  const h5 = R.buildProcurementReportHtml({ items: [row(9, 'Nuts & Bolts <M4> Café', 'Lab <A> & B', '2026-10-01T05:00:00Z')], generated_at: GEN });
  check('T5 & < > escaped, accent kept', h5.includes('Nuts &amp; Bolts &lt;M4&gt; Café') && !h5.includes('<M4>') && h5.includes('Lab &lt;A&gt; &amp; B'));

  // T6 — chrome identical to stockReport.js, ignoring ONLY the badge label.
  // The stock text has its exact badge markup swapped for the procurement one
  // (must occur exactly once), then the two must be equal character for character.
  const BADGE_STOCK = '>Stock Report</div>';
  const BADGE_PROC = '>Lab Procurement</div>';
  const normalise = (stockText) => {
    const n = stockText.split(BADGE_STOCK).length - 1;
    return n === 1 ? stockText.replace(BADGE_STOCK, BADGE_PROC) : null;   // null → never equal
  };
  const chromeMatches = (stockText, procText) => {
    const want = normalise(stockText);
    return want !== null && want === procText;
  };
  const stockSrc = read('stockReport.js').split('\n');
  const procSrc = read('procurementReport.js');
  const block = (from, to) => stockSrc.slice(from - 1, to).join('\n');
  const procBlock = (startMarker, endMarker) => {
    const a = procSrc.indexOf(startMarker); const b = procSrc.indexOf(endMarker, a);
    return a < 0 || b < 0 ? '' : procSrc.slice(a, b + endMarker.length);
  };
  const stockLetterhead = block(57, 71);
  const procLetterhead = procBlock('const letterhead = (generatedAt) => `', '    </div>`;');
  check('T6 <style> block (stock L21-55) identical', procSrc.includes(block(21, 55)));
  check('T6 letterhead (stock L57-71) identical except badge label', chromeMatches(stockLetterhead, procLetterhead));
  check('T6 signature (stock L73-79) identical', procSrc.includes(block(73, 79)));
  const hs = S.buildStockReportHtml({ items: [], generated_at: GEN });
  const cut = (h, a, b) => h.slice(h.indexOf(a), h.indexOf(b, h.indexOf(a)) + b.length);
  const lhStock = cut(hs, '<div style="border-bottom:3px', 'Generated:');
  const lhProc = cut(h2, '<div style="border-bottom:3px', 'Generated:');
  check('T6 rendered letterhead identical except badge label', chromeMatches(lhStock, lhProc) && lhProc.length > 500);
  check('T6 rendered badge reads "Lab Procurement"', lhProc.includes(BADGE_PROC) && !lhProc.includes('Stock Report'));
  const sig = (h) => h.slice(h.indexOf('<div style="margin-top:36px'), h.lastIndexOf('</div></body>'));
  check('T6 rendered signature identical', sig(hs) === sig(h2) && sig(hs).length > 100);
  // Negative controls — prove the comparison still catches drift.
  check('T6 guard: changed colour is caught', !chromeMatches(lhStock, lhProc.replace('#6c47ff', '#6c47fe')));
  check('T6 guard: changed institution text is caught', !chromeMatches(lhStock, lhProc.replace('Bannari', 'Banari')));
  check('T6 guard: extra whitespace is caught', !chromeMatches(lhStock, lhProc.replace('gap:16px;', 'gap:16px; ')));
  check('T6 guard: a different badge label is caught', !chromeMatches(lhStock, lhProc.replace(BADGE_PROC, '>Lab Procurement Report</div>')));
  check('T6 guard: badge left as "Stock Report" is caught', !chromeMatches(lhStock, lhStock));

  // T7 — seven cells per row; no-name person falls back to email
  const h7 = R.buildProcurementReportHtml({ items: [
    ...items,
    row(10, 'Fuse', 'Electronics Lab', '2026-10-06T05:00:00Z', null, { entered_by_email: 'noname@bitsathy.ac.in' }),
    row(11, 'Clamp', null, '2026-10-07T05:00:00Z', 'server.resolved@bitsathy.ac.in'),
  ], generated_at: GEN });
  const r7 = bodyRows(h7);
  check('T7 every row has 7 cells', r7.length === 8 && r7.every((r) => (r.match(/<td[ >]/g) || []).length === 7), `${r7.length} rows`);
  check('T7 no name → email (client field)', r7.some((r) => r.includes('Fuse') && r.includes('<td>noname@bitsathy.ac.in</td>')));
  check('T7 no name → email (server COALESCE)', r7.some((r) => r.includes('Clamp') && r.includes('<td>server.resolved@bitsathy.ac.in</td>')));
  check('T7 no-lab row shows — in Lab column', r7.some((r) => r.includes('Tape') && r.includes('<td>—</td>')));
  check('T7 Entered On IST dd-MMM-yyyy HH:mm', h7.includes('06-Oct-2026 10:30') && R.fmtIST('2026-09-01T18:45:00Z') === '02-Sep-2026 00:15');
} catch (err) {
  fail++;
  console.error('FAIL  harness error —', err?.stack || err);
} finally {
  rmSync(OUT, { recursive: true, force: true });
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
// ══ PROCUREMENT PDF — REMOVABLE FILE (end) ══
