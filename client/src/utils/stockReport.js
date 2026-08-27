// ═══ STOCK REPORT — REMOVABLE FILE (whole module) ═══════════════════════════
// Printable "Current Stock Report" for the Stock tab, opened the same way the
// consumption report is: an HTML string → window.open → document.write → the
// browser's own print dialog. No PDF dependency, mirroring consumptionReport.js.
//
// REUSE vs DUPLICATION — deliberate, and worth stating plainly:
//   REUSED  — `esc` and `fmtDateTime` are imported from consumptionReport.js
//             (both were made `export` there; nothing else in that file moved).
//   COPIED  — the <style> block, the letterhead and the signature block are
//             copied rather than shared. They live INSIDE the body of
//             buildConsumptionReportHtml as inline template literals, so hoisting
//             them into a shared module would mean restructuring that function —
//             and the consumption report was explicitly not to be touched. The
//             copies are kept faithful to their originals so the two documents
//             stay visually indistinguishable; if the pair is ever refactored,
//             extract these three pieces first and delete this note.
// ═══════════════════════════════════════════════════════════════════════════
import { esc, fmtDateTime } from './consumptionReport';

// ── Document chrome — copied from buildConsumptionReportHtml (see note above) ─
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
        <div style="background:#6c47ff;color:#fff;padding:6px 14px;border-radius:20px;font-size:10px;font-weight:800;display:inline-block;text-transform:uppercase;">Stock Report</div>
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

// ── Document ─────────────────────────────────────────────────────────────────
// `items` are raw stock rows as returned by GET /inventory/stock — the FULL
// filtered set, never the RENDER_CAP-sliced view the page shows.
export function buildStockReportHtml({ items, category, search, generated_at } = {}) {
  const rows = Array.isArray(items) ? items : [];
  const catLabel = String(category ?? '').trim() || 'All Categories';
  const searchTerm = String(search ?? '').trim();
  const generatedAt = generated_at || new Date();

  // Category, then item name. The endpoint already returns this order; sorting
  // again makes the document independent of that and keeps the two agreeing.
  const sorted = [...rows].sort(
    (a, b) => String(a.category ?? '').localeCompare(String(b.category ?? ''))
           || String(a.item_name ?? '').localeCompare(String(b.item_name ?? ''))
  );

  // Zero-stock items are INCLUDED — an out-of-stock item is the single most
  // useful line in a stock report, so it is tinted, not filtered out.
  const isZero = (it) => !(Number(it.current_quantity) > 0);
  const zeroCount = sorted.filter(isZero).length;

  const bodyRows = sorted.map((it, i) => `<tr${isZero(it) ? ' class="zero"' : ''}>
        <td class="num">${i + 1}</td>
        <td><strong>${esc(it.item_name)}</strong></td>
        <td>${esc(it.category || '—')}</td>
        <td>${esc(it.subcategory || '—')}</td>
        <td class="num">${esc(it.current_quantity ?? 0)}</td>
        <td>${esc(it.unit || '—')}</td>
        <td class="mono">${esc(it.rack_location || '—')}</td>
      </tr>`).join('');

  // An empty result gets a stated outcome, not a table with no rows under it.
  const filterWords = [
    catLabel === 'All Categories' ? null : `category "${esc(catLabel)}"`,
    searchTerm ? `search "${esc(searchTerm)}"` : null,
  ].filter(Boolean).join(' and ');

  const bodySection = sorted.length
    ? `<h2>Stock Listing</h2>
    <table>
      <thead><tr>
        <th style="width:28px">#</th><th>Item Name</th><th style="width:150px">Category</th>
        <th style="width:130px">Subcategory</th><th style="width:70px">Quantity</th>
        <th style="width:60px">Unit</th><th style="width:110px">Rack Location</th>
      </tr></thead>
      <tbody>${bodyRows}</tbody>
    </table>

    <div class="totals">
      <div class="tot"><div class="tot-l">Items Listed</div><div class="tot-v">${esc(sorted.length)}</div></div>
      <div class="tot"><div class="tot-l">Zero Stock</div><div class="tot-v">${esc(zeroCount)}</div></div>
    </div>`
    : `<div class="none">
      <div class="none-t">No stock items match this selection.</div>
      <div class="none-s">${filterWords
        ? `Nothing was found for ${filterWords}.`
        : 'The inventory catalog returned no items.'}</div>
    </div>`;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
  <title>Current Stock Report — ${esc(catLabel)}</title>
  <style>${REPORT_STYLES}
  </style></head><body>
  <button class="print-btn" onclick="window.print()">Print / Save PDF</button>
  <div class="page">
    ${letterhead(generatedAt)}

    <div style="margin-bottom:4px;">
      <div style="font-size:17px;font-weight:900;margin-top:14px;">Current Stock Report</div>
      <div style="font-size:12px;color:#6b7280;font-weight:600;margin-top:2px;">
        Category: <strong style="color:#1a1a2e;">${esc(catLabel)}</strong>${
          searchTerm ? ` &middot; Search: <strong style="color:#1a1a2e;">"${esc(searchTerm)}"</strong>` : ''
        } &middot; Zero-stock items included
      </div>
    </div>

    ${bodySection}

    ${signatureBlock()}
  </div></body></html>`;
}

// Opens the report in a new window. Returns false if the popup was blocked.
// Same mechanism as openConsumptionReport; kept here so this module can be
// deleted whole without leaving a caller behind in consumptionReport.js.
export function openStockReport(payload) {
  const html = buildStockReportHtml(payload);
  const win = window.open('', '_blank', 'width=1040,height=760');
  if (!win) {
    alert('Please allow popups for this site to generate the report.');
    return false;
  }
  win.document.write(html);
  win.document.close();
  return true;
}
// ═══ STOCK REPORT — REMOVABLE FILE (end) ═══
