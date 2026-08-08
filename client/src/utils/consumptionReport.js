// consumptionReport.js — CONSUMPTION REPORT (removable)
// Builds a printable HTML document from the /inventory/reports/consumption
// payload and opens it in a blank window, where the browser's own print dialog
// turns it into a PDF. Mirrors the existing export pattern in MyVenues.jsx /
// TrainingSlots.jsx (manual escaping → HTML string → window.open → document.write),
// so no PDF dependency is added.

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ── Date helpers ─────────────────────────────────────────────
// Local-time YYYY-MM-DD (toISOString would shift the day for IST users).
export const toDateInput = (d) => {
  const dt = d instanceof Date ? d : new Date(d);
  const p = (n) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
};

// Preset ranges: `to` = today, `from` = today minus N months.
export const monthsAgoRange = (months) => {
  const to = new Date();
  const from = new Date();
  from.setMonth(from.getMonth() - Number(months));
  return { from: toDateInput(from), to: toDateInput(to) };
};

const fmtDay = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const fmtDateTime = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

// ── ROLE-5 SUB-TYPE — REMOVABLE BLOCK (start) ────────────────────────────────
// member_type used to be STUDENT or INTERN only. Role-5 members now report
// their sub-type, so it is one of STUDENT | FACULTY | INTERN | TECHNICIAN.
// Unknown values title-case rather than silently reading as "Student", so a
// future sub-type shows up as itself instead of being mislabelled.
const TYPE_LABELS = {
  STUDENT: 'Student',
  FACULTY: 'Faculty',
  INTERN: 'Intern',
  TECHNICIAN: 'Technician',
};
const typeKey = (t) => String(t ?? '').trim().toUpperCase();
const typeLabel = (t) => {
  const key = typeKey(t);
  if (TYPE_LABELS[key]) return TYPE_LABELS[key];
  return key ? key.charAt(0) + key.slice(1).toLowerCase() : 'Intern';
};
// Badge class per type. Students keep the original purple and interns the
// original amber, so existing reports look unchanged; faculty and technicians
// get their own colours (see the .tag-* rules in the stylesheet below).
const TYPE_CLASSES = {
  STUDENT: 'tag-student',
  FACULTY: 'tag-faculty',
  INTERN: 'tag-intern',
  TECHNICIAN: 'tag-technician',
};
const typeClass = (t) => TYPE_CLASSES[typeKey(t)] || 'tag-intern';
// ── ROLE-5 SUB-TYPE — REMOVABLE BLOCK (end) ──────────────────────────────────

// ── HTML document ────────────────────────────────────────────
export function buildConsumptionReportHtml(report) {
  const summary = report?.summary || [];
  const details = report?.details || [];
  const totals = report?.totals || {};
  const rangeStr = `${fmtDay(report?.from)} — ${fmtDay(report?.to)}`;

  // Correct public path under the app's base ('/BIT.png' 404s here).
  const logoUrl = `${window.location.origin}${import.meta.env.BASE_URL}bit-logo.png`;

  const summaryRows = summary.length
    ? summary.map((m, i) => `<tr>
        <td class="num">${i + 1}</td>
        <td><strong>${esc(m.member_name)}</strong></td>
        <td><span class="tag ${typeClass(m.member_type)}">${esc(typeLabel(m.member_type))}</span></td>
        <td class="mono">${esc(m.reg || '—')}</td>
        <td class="num">${esc(m.total_purchases ?? 0)}</td>
        <td class="num">${esc(m.total_line_items ?? 0)}</td>
        <td class="items">${esc((m.items || []).join(', ') || '—')}</td>
      </tr>`).join('')
    : `<tr><td colspan="7" class="empty">No records in this range</td></tr>`;

  const detailRows = details.length
    ? details.map((r, i) => `<tr>
        <td class="num">${i + 1}</td>
        <td class="nowrap">${esc(fmtDateTime(r.date))}</td>
        <td>${esc(r.member_name)}</td>
        <td><span class="tag ${typeClass(r.member_type)}">${esc(typeLabel(r.member_type))}</span></td>
        <td>${esc(r.lab_name || '—')}</td>
        <td>${esc(r.project_guide_name || '—')}</td>
        <td>${esc(r.item_name)}</td>
        <td class="num">${esc(r.quantity)}</td>
        <td>${esc(r.unit || '—')}</td>
      </tr>`).join('')
    : `<tr><td colspan="9" class="empty">No records in this range</td></tr>`;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
  <title>Consumables Consumption Report — ${esc(report?.from)} to ${esc(report?.to)}</title>
  <style>
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
    .items{color:#4b5563;font-size:10.5px;line-height:1.5}
    .empty{text-align:center;color:#9ca3af;padding:22px;font-style:italic}
    .tag{display:inline-block;padding:1px 8px;border-radius:20px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:0.3px}
    .tag-student{background:rgba(108,71,255,0.1);color:#5a3de8;border:1px solid rgba(108,71,255,0.3)}
    .tag-intern{background:rgba(245,158,11,0.14);color:#b45309;border:1px solid rgba(245,158,11,0.4)}
    /* ROLE-5 SUB-TYPE (removable): teal for faculty, rose for technicians —
       print-safe contrast, distinct from the purple student / amber intern. */
    .tag-faculty{background:rgba(13,148,136,0.12);color:#0f766e;border:1px solid rgba(13,148,136,0.38)}
    .tag-technician{background:rgba(219,39,119,0.10);color:#be185d;border:1px solid rgba(219,39,119,0.34)}
    .totals{margin-top:22px;display:flex;gap:10px;flex-wrap:wrap;page-break-inside:avoid}
    .tot{flex:1;min-width:130px;background:#f8f7ff;border:1px solid #e5e4eb;border-radius:8px;padding:10px 14px}
    .tot-l{font-size:9px;font-weight:800;color:#6c47ff;text-transform:uppercase;letter-spacing:1px}
    .tot-v{font-size:17px;font-weight:900;margin-top:2px}
    /* Repeat table headers across printed pages and avoid splitting rows. */
    @media print{
      .print-btn{display:none}
      .page{padding:18px 22px;max-width:none}
      thead{display:table-header-group}
      tr{page-break-inside:avoid}
      h2{page-break-after:avoid}
    }
  </style></head><body>
  <button class="print-btn" onclick="window.print()">Print / Save PDF</button>
  <div class="page">
    <div style="border-bottom:3px solid #6c47ff;padding-bottom:20px;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;">
      <div style="display:flex;align-items:center;gap:16px;">
        <img src="${logoUrl}" alt="BIT Logo" style="height:60px;object-fit:contain;" onerror="this.style.display='none'"/>
        <div>
          <div style="font-size:20px;font-weight:900;color:#1a1a2e;">Bannari Amman Institute of Technology</div>
          <div style="font-size:11px;color:#6b7280;font-weight:600;margin-top:3px;text-transform:uppercase;">An Autonomous Institution Affiliated to Anna University</div>
          <div style="font-size:11px;color:#6b7280;">Sathyamangalam, Erode, Tamil Nadu - 638401</div>
        </div>
      </div>
      <div style="text-align:right;">
        <div style="background:#6c47ff;color:#fff;padding:6px 14px;border-radius:20px;font-size:10px;font-weight:800;display:inline-block;text-transform:uppercase;">Consumption Report</div>
        <div style="font-size:10px;color:#9ca3af;margin-top:6px;">Generated: ${esc(fmtDateTime(report?.generated_at || new Date()))}</div>
      </div>
    </div>

    <div style="margin-bottom:4px;">
      <div style="font-size:17px;font-weight:900;margin-top:14px;">Consumables Consumption Report</div>
      <div style="font-size:12px;color:#6b7280;font-weight:600;margin-top:2px;">
        Period: <strong style="color:#1a1a2e;">${esc(rangeStr)}</strong> · Approved student requests &amp; intern lab purchases
      </div>
    </div>

    <h2>Summary by Member</h2>
    <table>
      <thead><tr>
        <th style="width:28px">#</th><th>Member</th><th style="width:70px">Type</th><th style="width:110px">Reg / ID</th>
        <th style="width:70px">Purchases</th><th style="width:70px">Line Items</th><th>Items</th>
      </tr></thead>
      <tbody>${summaryRows}</tbody>
    </table>

    <h2>Detailed Transactions</h2>
    <table>
      <thead><tr>
        <th style="width:28px">#</th><th style="width:120px">Date</th><th>Member</th><th style="width:70px">Type</th>
        <th>Lab</th><th>Project Guide</th><th>Item</th><th style="width:60px">Qty</th><th style="width:50px">Unit</th>
      </tr></thead>
      <tbody>${detailRows}</tbody>
    </table>

    <div class="totals">
      <div class="tot"><div class="tot-l">Members</div><div class="tot-v">${esc(totals.members ?? 0)}</div></div>
      <div class="tot"><div class="tot-l">Students</div><div class="tot-v">${esc(totals.student_members ?? 0)}</div></div>
      <div class="tot"><div class="tot-l">Interns</div><div class="tot-v">${esc(totals.intern_members ?? 0)}</div></div>
      <div class="tot"><div class="tot-l">Total Line Items</div><div class="tot-v">${esc(totals.total_line_items ?? 0)}</div></div>
    </div>

    <div style="margin-top:36px;padding-top:24px;border-top:1.5px dashed #e5e4eb;display:grid;grid-template-columns:repeat(3,1fr);gap:12px;page-break-inside:avoid;">
      ${['Prepared By', 'Lab In-charge', 'HOD / Principal'].map((label) =>
        `<div style="text-align:center;"><div style="height:28px;"></div>
        <div style="border-top:1px solid #e5e4eb;width:85%;margin:0 auto;padding-top:4px;font-size:9px;font-weight:700;color:#4b5563;text-transform:uppercase;">${label}</div></div>`
      ).join('')}
    </div>
  </div></body></html>`;
}

// Opens the report in a new window. Returns false if the popup was blocked.
export function openConsumptionReport(report) {
  const html = buildConsumptionReportHtml(report);
  const win = window.open('', '_blank', 'width=1040,height=760');
  if (!win) {
    alert('Please allow popups for this site to generate the report.');
    return false;
  }
  win.document.write(html);
  win.document.close();
  return true;
}
