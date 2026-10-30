// ══ PROCUREMENT PDF — REMOVABLE FILE (whole module) ══════════════════════════
// Printable "Lab Procurement — Requirement List" for the Lab Procurement tab,
// opened the same way as the stock and consumption reports: an HTML string →
// window.open → document.write → the browser's own print dialog. No PDF
// dependency.
//
// REUSE vs DUPLICATION — same arrangement as stockReport.js:
//   REUSED  — `esc` and `fmtDateTime` are imported from consumptionReport.js
//             (import only; that file is not edited).
//   COPIED  — REPORT_STYLES, letterhead and signatureBlock below are copied
//             VERBATIM from stockReport.js (lines 20–79) so all three reports
//             look identical. The ONE intended difference is the letterhead
//             badge label ("Lab Procurement" instead of "Stock Report"). Do not
//             edit them otherwise; procurement-only CSS lives in PROC_STYLES.
//             A fixture test compares the copies, ignoring only that label.
// ═══════════════════════════════════════════════════════════════════════════
import { esc, fmtDateTime } from './consumptionReport';

// ── Document chrome — copied VERBATIM from stockReport.js lines 21–79 ─────────
// (except the letterhead badge label — see header note)
const REPORT_STYLES = `
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:"Segoe UI",Arial,sans-serif;font-size:12px;color:#1a1a2e;background:#fff}
    .page{max-width:1000px;margin:0 auto;padding:40px 50px}
    .print-btn{position:fixed;top:20px;right:20px;padding:10px 22px;background:#6c47ff;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 4px 12px rgba(108,71,255,0.25)}
    h2{font-size:13px;font-weight:800;color:#6c47ff;text-transform:uppercase;letter-spacing:1.5px;border-bottom:2.5px solid #6c47ff;padding-bottom:6px;margin:26px 0 12px}
    table{width:100%;border-collapse:collapse;border:1px solid #e5e4eb;font-size:11px}
    th{background:#f8f7ff;text-align:left;padding:7px 9px;font-size:9.5px;font-weight:800;color:#4b5563;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1.5px solid #e5e4eb}
    td{padding:7px 9px;border-top:1px solid #eceaf5;vertical-align:top}
    tr:nth-child(even) td{background:#fbfaff}
    .num{text-align:right;white-space:nowrap}
    .nowrap{white-space:nowrap}
    .mono{font-family:monospace;font-size:10.5px;color:#6b7280}
    .empty{text-align:center;color:#9ca3af;padding:22px;font-style:italic}
    .totals{margin-top:22px;display:flex;gap:10px;flex-wrap:wrap;page-break-inside:avoid}
    .tot{flex:1;min-width:130px;background:#f8f7ff;border:1px solid #e5e4eb;border-radius:8px;padding:10px 14px}
    .tot-l{font-size:9px;font-weight:800;color:#6c47ff;text-transform:uppercase;letter-spacing:1px}
    .tot-v{font-size:17px;font-weight:900;margin-top:2px}
    /* STOCK REPORT only: a zero-quantity row is legitimate data, not an error —
       it is tinted rather than hidden, so a stock-out is visible at a glance. */
    .zero td{background:#fff7ed}
    .zero .num{color:#b45309;font-weight:800}
    /* STOCK REPORT only: the empty-result panel, used instead of a headed table
       with no rows so the printed page states the outcome outright. */
    .none{margin-top:26px;border:1.5px dashed #e5e4eb;border-radius:10px;padding:38px 24px;text-align:center}
    .none-t{font-size:14px;font-weight:900;color:#4b5563}
    .none-s{font-size:11.5px;color:#9ca3af;margin-top:6px}
    /* Repeat table headers across printed pages and avoid splitting rows. */
    @media print{
      .print-btn{display:none}
      .page{padding:18px 22px;max-width:none}
      thead{display:table-header-group}
      tr{page-break-inside:avoid}
      h2{page-break-after:avoid}
    }`;

const letterhead = (generatedAt) => `
    <div style="border-bottom:3px solid #6c47ff;padding-bottom:20px;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;">
      <div style="display:flex;align-items:center;gap:16px;">
        <img src="${window.location.origin}${import.meta.env.BASE_URL}bit-logo.png" alt="BIT Logo" style="height:60px;object-fit:contain;" onerror="this.style.display='none'"/>
        <div>
          <div style="font-size:20px;font-weight:900;color:#1a1a2e;">Bannari Amman Institute of Technology</div>
          <div style="font-size:11px;color:#6b7280;font-weight:600;margin-top:3px;text-transform:uppercase;">An Autonomous Institution Affiliated to Anna University</div>
          <div style="font-size:11px;color:#6b7280;">Sathyamangalam, Erode, Tamil Nadu - 638401</div>
        </div>
      </div>
      <div style="text-align:right;">
        <div style="background:#6c47ff;color:#fff;padding:6px 14px;border-radius:20px;font-size:10px;font-weight:800;display:inline-block;text-transform:uppercase;">Lab Procurement</div>
        <div style="font-size:10px;color:#9ca3af;margin-top:6px;">Generated: ${esc(fmtDateTime(generatedAt))}</div>
      </div>
    </div>`;

const signatureBlock = () => `
    <div style="margin-top:36px;padding-top:24px;border-top:1.5px dashed #e5e4eb;display:grid;grid-template-columns:repeat(3,1fr);gap:12px;page-break-inside:avoid;">
      ${['Prepared By', 'Lab In-charge', 'HOD / Principal'].map((label) =>
        `<div style="text-align:center;"><div style="height:28px;"></div>
        <div style="border-top:1px solid #e5e4eb;width:85%;margin:0 auto;padding-top:4px;font-size:9px;font-weight:700;color:#4b5563;text-transform:uppercase;">${label}</div></div>`
      ).join('')}
    </div>`;

// ── Procurement-only additions (not part of the copied chrome) ───────────────
// Each lab's heading + table is one block that does not split across pages.
const PROC_STYLES = `
    .lab-block{page-break-inside:avoid;break-inside:avoid}
    .lab-count{font-size:11px;font-weight:700;color:#6b7280;text-transform:none;letter-spacing:0}`;

const NO_LAB = 'No lab assigned';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "Entered On" — always IST, dd-MMM-yyyy HH:mm (24h), whatever the viewer's
// own time zone. Month names come from MONTHS so "Sep" never becomes "Sept".
export const fmtIST = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata', day: '2-digit', month: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(dt).map((p) => [p.type, p.value]));
  return `${parts.day}-${MONTHS[Number(parts.month) - 1]}-${parts.year} ${parts.hour}:${parts.minute}`;
};

const fmtQty = (q) => {
  const n = Number(q);
  return Number.isFinite(n) ? n.toLocaleString('en-IN') : String(q ?? '—');
};

// The server already resolves entered_by_name as name → login email. The extra
// `entered_by_email` fallback only matters if a caller passes both fields.
const personOf = (p) => String(p.entered_by_name ?? '').trim()
  || String(p.entered_by_email ?? '').trim() || '—';

const newestFirst = (a, b) =>
  (new Date(b.created_at).getTime() || 0) - (new Date(a.created_at).getTime() || 0)
  || (Number(b.procurement_id) || 0) - (Number(a.procurement_id) || 0);

// Labs alphabetically, "No lab assigned" last; newest entry first inside each.
export function groupProcurementByLab(items) {
  const groups = new Map();
  for (const p of items) {
    const lab = String(p.lab_name ?? '').trim();
    const key = lab || NO_LAB;
    if (!groups.has(key)) groups.set(key, { lab: key, isNoLab: !lab, rows: [] });
    groups.get(key).rows.push(p);
  }
  const list = [...groups.values()];
  list.forEach((g) => g.rows.sort(newestFirst));
  return list.sort((a, b) => (a.isNoLab - b.isNoLab)
    || a.lab.localeCompare(b.lab, undefined, { sensitivity: 'base' }));
}

// ── Document ─────────────────────────────────────────────────────────────────
// `items` are exactly the rows the Lab Procurement search is showing
// (procShown) — the same set the Excel export sends.
export function buildProcurementReportHtml({ items, search, generated_at } = {}) {
  const rows = Array.isArray(items) ? items : [];
  const searchTerm = String(search ?? '').trim();
  const generatedAt = generated_at || new Date();
  const groups = groupProcurementByLab(rows);
  const labCount = groups.filter((g) => !g.isNoLab).length;
  const noLabCount = groups.find((g) => g.isNoLab)?.rows.length || 0;

  const section = (g) => `<div class="lab-block">
    <h2>${esc(g.lab)} <span class="lab-count">(${esc(g.rows.length)} item${g.rows.length !== 1 ? 's' : ''})</span></h2>
    <table>
      <thead><tr>
        <th style="width:28px">#</th><th>Item Name</th><th style="width:70px">Quantity</th>
        <th style="width:60px">Unit</th><th style="width:140px">Lab</th>
        <th style="width:150px">Entered By</th><th style="width:120px">Entered On</th>
      </tr></thead>
      <tbody>${g.rows.map((p, i) => `<tr>
        <td class="num">${i + 1}</td>
        <td><strong>${esc(p.item_name)}</strong></td>
        <td class="num">${esc(fmtQty(p.quantity))}</td>
        <td>${esc(p.unit || '—')}</td>
        <td>${esc(String(p.lab_name ?? '').trim() || '—')}</td>
        <td>${esc(personOf(p))}</td>
        <td class="nowrap">${esc(fmtIST(p.created_at))}</td>
      </tr>`).join('')}</tbody>
    </table>
    </div>`;

  // An empty result gets a stated outcome, not a table with no rows under it.
  const bodySection = rows.length
    ? groups.map(section).join('\n')
    : `<div class="none">
      <div class="none-t">No lab procurement entries match this selection.</div>
      <div class="none-s">${searchTerm
        ? `Nothing was found for search "${esc(searchTerm)}".`
        : 'There are no lab procurement entries.'}</div>
    </div>`;

  const summary = `${esc(rows.length)} entr${rows.length !== 1 ? 'ies' : 'y'} &middot; ${esc(labCount)} lab${labCount !== 1 ? 's' : ''} represented${
    noLabCount ? ` &middot; ${esc(noLabCount)} with no lab assigned` : ''}`;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
  <title>Lab Procurement — Requirement List</title>
  <style>${REPORT_STYLES}${PROC_STYLES}
  </style></head><body>
  <button class="print-btn" onclick="window.print()">Print / Save PDF</button>
  <div class="page">
    ${letterhead(generatedAt)}

    <div style="margin-bottom:4px;">
      <div style="font-size:17px;font-weight:900;margin-top:14px;">Lab Procurement — Requirement List</div>
      <div style="font-size:12px;color:#6b7280;font-weight:600;margin-top:2px;">
        ${summary}${
          searchTerm ? ` &middot; Search: <strong style="color:#1a1a2e;">"${esc(searchTerm)}"</strong>` : ''
        }
      </div>
    </div>

    ${bodySection}

    ${signatureBlock()}
  </div></body></html>`;
}

// Opens the report in a new window. Returns false if the popup was blocked.
export function openProcurementReport(payload) {
  const html = buildProcurementReportHtml(payload);
  const win = window.open('', '_blank', 'width=1040,height=760');
  if (!win) {
    alert('Please allow popups for this site to generate the report.');
    return false;
  }
  win.document.write(html);
  win.document.close();
  return true;
}
// ══ PROCUREMENT PDF — REMOVABLE FILE (end) ══
