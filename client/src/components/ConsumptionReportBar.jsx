// ConsumptionReportBar.jsx — CONSUMPTION REPORT (removable)
// Shared date-range picker + Generate button for the Buying Requests tab on the
// Incharge dashboard and the Admin inventory page. Both pages have the same
// class vocabulary with different prefixes ('ic' / 'ad'), so `prefix` selects
// the host page's existing styles — no new CSS is introduced.
import { useEffect, useState } from 'react';   // LAB FILTER (removable): useEffect loads the lab list
import { inventoryService } from '../services/features/inventoryService';
import { openConsumptionReport, monthsAgoRange, toDateInput } from '../utils/consumptionReport';

const PRESETS = [
  { months: 1, label: 'Last 1 Month' },
  { months: 2, label: 'Last 2 Months' },
  { months: 3, label: 'Last 3 Months' },
];

export default function ConsumptionReportBar({ prefix = 'ic', onNotify }) {
  const p = prefix;                       // 'ic' | 'ad'
  const initial = monthsAgoRange(1);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  // ── LAB FILTER — REMOVABLE BLOCK (start) ───────────────────────────────────
  // '' = All Labs (the default, and the value that omits the query param, so an
  // untouched bar behaves exactly as it did before this filter existed).
  // NO_LAB = the rows that predate inventory_requests.lab_id / lab_purchases.lab_id.
  const NO_LAB = 'none';
  const [labId, setLabId] = useState('');
  const [labs, setLabs] = useState([]);
  // Loaded once per mount. GET /inventory/labs allows roles 1,3,4,5, so the one
  // shared component works unchanged on BOTH host pages (admin = role 3,
  // inventory incharge = role 4). ALL labs are listed, inactive included — a
  // deactivated lab still owns its historical consumption.
  useEffect(() => {
    let alive = true;
    inventoryService.getLabs()
      .then((res) => { if (alive) setLabs(res?.data?.items || []); })
      // A failed lab list must not break the report: the dropdown simply falls
      // back to All Labs / No lab assigned, and Generate keeps working.
      .catch(() => { if (alive) setLabs([]); });
    return () => { alive = false; };
  }, []);
  // ── LAB FILTER — REMOVABLE BLOCK (end) ─────────────────────────────────────

  const applyPreset = (months) => {
    const r = monthsAgoRange(months);
    setFrom(r.from);
    setTo(r.to);
    setErr('');
  };

  const generate = async () => {
    setErr('');
    if (!from || !to) { setErr('Pick both a From and a To date.'); return; }
    if (to < from) { setErr('“To” date cannot be earlier than “From” date.'); return; }
    setBusy(true);
    try {
      // LAB FILTER (removable): `labId` is '' for All Labs, and the service omits
      // the query param entirely in that case.
      const res = await inventoryService.getConsumptionReport(from, to, labId);
      // An empty range still opens — the document says "No records in this range".
      openConsumptionReport(res?.data || {
        from, to, summary: [], details: [], totals: {},
        lab_name: selectedLabName,   // LAB FILTER (removable): null for All Labs
      });
      onNotify?.('Report generated.', false);
    } catch (e) {
      const msg = e?.response?.data?.message || 'Failed to generate the report.';
      setErr(msg);
      onNotify?.(msg, true);
    } finally {
      setBusy(false);
    }
  };

  const today = toDateInput(new Date());
  // ── LAB FILTER — REMOVABLE BLOCK (start) ──
  // Only used for the no-payload fallback above; a real response carries the
  // server's own lab_name. Null for All Labs, which leaves the heading untouched.
  const selectedLabName = labId === NO_LAB
    ? 'No lab assigned'
    : (labs.find((l) => String(l.lab_id) === String(labId))?.lab_name ?? null);
  // ── LAB FILTER — REMOVABLE BLOCK (end) ──
  // The two host pages name their error text class differently.
  const errClass = p === 'ad' ? 'ad-err' : 'ic-hint';

  return (
    <div className={`${p}-card`} style={{ padding: '14px 16px', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ marginRight: 'auto', minWidth: 180 }}>
          <div style={{ fontSize: 13.5, fontWeight: 900 }}>Consumption Report</div>
          <div style={{ fontSize: 11.5, color: 'var(--' + p + '-text3)', fontWeight: 600, marginTop: 1 }}>
            Approved student requests + intern lab purchases
          </div>
        </div>

        {PRESETS.map((preset) => (
          <button
            key={preset.months}
            className={`${p}-btn ${p}-btn-outline ${p}-btn-sm`}
            disabled={busy}
            onClick={() => applyPreset(preset.months)}
          >{preset.label}</button>
        ))}

        {/* ── LAB FILTER — REMOVABLE BLOCK (start) ──
            Reuses the host page's existing .ad-select / .ic-select, with the
            same inline width/margin resets the date inputs beside it use, so no
            new CSS is introduced. Order is fixed: All Labs, then every lab by
            name, then No lab assigned. */}
        <label className={`${p}-label`} style={{ margin: 0 }} htmlFor={`${p}-rep-lab`}>Lab</label>
        <select
          id={`${p}-rep-lab`}
          className={`${p}-select`}
          style={{ width: 'auto', marginBottom: 0 }}
          disabled={busy}
          value={labId}
          onChange={(e) => { setLabId(e.target.value); setErr(''); }}
        >
          <option value="">All Labs</option>
          {labs.map((l) => (
            <option key={l.lab_id} value={String(l.lab_id)}>{l.lab_name}</option>
          ))}
          <option value={NO_LAB}>No lab assigned</option>
        </select>
        {/* ── LAB FILTER — REMOVABLE BLOCK (end) ── */}

        <label className={`${p}-label`} style={{ margin: 0 }} htmlFor={`${p}-rep-from`}>From</label>
        <input
          id={`${p}-rep-from`}
          className={`${p}-input`}
          style={{ width: 'auto', marginBottom: 0 }}
          type="date"
          max={today}
          value={from}
          onChange={(e) => { setFrom(e.target.value); setErr(''); }}
        />
        <label className={`${p}-label`} style={{ margin: 0 }} htmlFor={`${p}-rep-to`}>To</label>
        <input
          id={`${p}-rep-to`}
          className={`${p}-input`}
          style={{ width: 'auto', marginBottom: 0 }}
          type="date"
          value={to}
          onChange={(e) => { setTo(e.target.value); setErr(''); }}
        />

        <button className={`${p}-btn ${p}-btn-primary ${p}-btn-sm`} disabled={busy} onClick={generate}>
          {busy ? 'Generating…' : 'Generate Report'}
        </button>
      </div>
      {err && <div className={errClass} style={{ marginTop: 8 }}>{err}</div>}
    </div>
  );
}
