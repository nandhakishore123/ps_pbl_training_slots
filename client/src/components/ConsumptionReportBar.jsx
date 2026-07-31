// ConsumptionReportBar.jsx — CONSUMPTION REPORT (removable)
// Shared date-range picker + Generate button for the Buying Requests tab on the
// Incharge dashboard and the Admin inventory page. Both pages have the same
// class vocabulary with different prefixes ('ic' / 'ad'), so `prefix` selects
// the host page's existing styles — no new CSS is introduced.
import { useState } from 'react';
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
      const res = await inventoryService.getConsumptionReport(from, to);
      // An empty range still opens — the document says "No records in this range".
      openConsumptionReport(res?.data || { from, to, summary: [], details: [], totals: {} });
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
