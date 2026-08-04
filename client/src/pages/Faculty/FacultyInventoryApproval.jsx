// FacultyInventoryApproval.jsx — Stage 4: faculty approve/reject BUYING requests,
// split into one TAB per purpose the caller is the assigned approver for. The
// server returns { scopes, project, training } — a faculty assigned to only one
// purpose gets one scope (and no tab strip), a faculty assigned to both (or an
// admin) gets both tabs. The page never decides what it may see.
// Approve reduces stock (transaction); insufficient stock fails cleanly. Reject = no stock change.
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useStore } from '../../store/useStore';
import { authService } from '../../services/features/authService';
import { inventoryService } from '../../services/features/inventoryService';

const CSS = `
  .fa-root {
    --fa-purple:#6c47ff; --fa-purple-dim:rgba(108,71,255,0.1); --fa-glow:rgba(108,71,255,0.28);
    --fa-bg:#f0f2f8; --fa-white:#fff; --fa-border:#e5e4eb;
    --fa-text:#1a1040; --fa-text2:#6b7280; --fa-text3:#9ca3af;
    --fa-green:#10b981; --fa-red:#ef4444; --fa-gold:#f59e0b;
    min-height:100vh; background:var(--fa-bg); color:var(--fa-text);
    font-family:'Segoe UI',system-ui,sans-serif;
  }
  body.dark-mode .fa-root {
    --fa-bg:#0f0f1a; --fa-white:#1a1a2e; --fa-border:#2d2d4e;
    --fa-text:#e8e6f0; --fa-text2:#a89ec9; --fa-text3:#6b6b8a;
  }
  .fa-header { background:var(--fa-white); border-bottom:1px solid var(--fa-border); padding:14px 24px;
    display:flex; align-items:center; justify-content:space-between; gap:12px; position:sticky; top:0; z-index:50;
    box-shadow:0 1px 10px rgba(26,16,64,0.05); }
  .fa-back { display:flex; align-items:center; gap:7px; background:var(--fa-white); border:1.5px solid var(--fa-border);
    color:var(--fa-text2); padding:8px 14px; border-radius:9px; font-size:13px; font-weight:700; cursor:pointer;
    transition:all .18s; font-family:inherit; white-space:nowrap; }
  .fa-back:hover { border-color:var(--fa-purple); color:var(--fa-purple); background:var(--fa-purple-dim); }
  .fa-title { font-size:16px; font-weight:900; letter-spacing:0.2px; }
  .fa-sub { font-size:11.5px; color:var(--fa-text3); font-weight:600; margin-top:1px; }
  .fa-userpill { display:flex; align-items:center; gap:10px; padding:4px 14px 4px 4px; background:var(--fa-white);
    border:1.5px solid var(--fa-border); border-radius:50px; }
  .fa-avatar { width:34px; height:34px; border-radius:50%; background:linear-gradient(135deg,#6c47ff,#4b2fd6);
    display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:900; color:#fff; flex-shrink:0; }
  .fa-uname { font-size:13px; font-weight:800; }
  .fa-iconbtn { width:38px; height:38px; border-radius:10px; background:var(--fa-white); border:1.5px solid var(--fa-border);
    color:var(--fa-text2); cursor:pointer; display:flex; align-items:center; justify-content:center; }
  .fa-iconbtn:hover { border-color:var(--fa-purple); color:var(--fa-purple); background:var(--fa-purple-dim); }

  .fa-wrap { max-width:none; margin:0; padding:22px 24px 48px; }
  .fa-scope { font-size:20px; font-weight:900; margin-bottom:4px; }
  .fa-scope-sub { font-size:12.5px; color:var(--fa-text3); font-weight:600; margin-bottom:20px; }

  /* Purpose tabs (Project | Training) — pill style, matching .ic-tabs on the
     Inventory Incharge console. Only rendered when the caller holds both. */
  .fa-tabs { display:flex; gap:8px; background:var(--fa-white); border:1px solid var(--fa-border);
    border-radius:14px; padding:6px; margin-bottom:20px; max-width:420px; }
  .fa-tab { flex:1; padding:11px 14px; border-radius:9px; border:none; background:transparent; font-size:13.5px;
    font-weight:800; color:var(--fa-text2); cursor:pointer; font-family:inherit; white-space:nowrap;
    transition:all .16s; }
  .fa-tab:hover:not(.active) { color:var(--fa-purple); background:var(--fa-purple-dim); }
  .fa-tab.active { background:linear-gradient(135deg,#6c47ff,#4b2fd6); color:#fff; box-shadow:0 4px 14px var(--fa-glow); }

  .fa-req { background:var(--fa-white); border:1px solid var(--fa-border); border-radius:16px; padding:18px 20px;
    margin-bottom:14px; box-shadow:0 6px 24px rgba(26,16,64,0.06); }
  .fa-req.decided { opacity:0.9; }
  .fa-req-top { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:12px; }
  .fa-req-name { font-size:15px; font-weight:900; }
  .fa-req-reg { font-size:11.5px; color:var(--fa-text3); font-weight:700; letter-spacing:0.4px; }
  .fa-req-meta { font-size:11.5px; color:var(--fa-text3); font-weight:600; margin-top:3px; }
  .fa-items { display:flex; flex-direction:column; gap:7px; margin:12px 0; }
  .fa-item { display:flex; justify-content:space-between; gap:12px; padding:9px 13px; background:var(--fa-bg);
    border:1px solid var(--fa-border); border-radius:10px; font-size:13px; }
  .fa-item-name { font-weight:700; }
  .fa-item-qty { font-weight:800; color:var(--fa-purple); white-space:nowrap; }
  .fa-purpose { font-size:12.5px; color:var(--fa-text2); background:var(--fa-purple-dim); border:1px solid rgba(108,71,255,0.18);
    border-radius:10px; padding:9px 13px; margin-bottom:12px; line-height:1.5; }

  .fa-pill { display:inline-flex; align-items:center; gap:6px; padding:4px 12px; border-radius:20px; font-size:11px;
    font-weight:800; letter-spacing:0.4px; text-transform:uppercase; white-space:nowrap; }
  .fa-pill.pending { background:rgba(245,158,11,0.12); color:#b45309; border:1px solid rgba(245,158,11,0.4); }
  .fa-pill.approved { background:rgba(16,185,129,0.12); color:#047857; border:1px solid rgba(16,185,129,0.4); }
  .fa-pill.rejected { background:rgba(239,68,68,0.12); color:#b91c1c; border:1px solid rgba(239,68,68,0.4); }
  .fa-pill.type { background:var(--fa-purple-dim); color:var(--fa-purple); border:1px solid rgba(108,71,255,0.3); }

  .fa-actions { display:flex; gap:10px; }
  .fa-btn { padding:11px 18px; border:none; border-radius:11px; font-size:13.5px; font-weight:800; cursor:pointer;
    font-family:inherit; transition:all .18s; }
  .fa-btn:disabled { opacity:0.5; cursor:not-allowed; }
  .fa-approve { flex:1; background:linear-gradient(135deg,#10b981,#059669); color:#fff; box-shadow:0 5px 16px rgba(16,185,129,0.3); }
  .fa-approve:hover:not(:disabled) { filter:brightness(1.05); }
  .fa-reject { flex:1; background:rgba(239,68,68,0.09); color:#dc2626; border:1.5px solid rgba(239,68,68,0.4); }
  .fa-reject:hover:not(:disabled) { background:rgba(239,68,68,0.16); }

  .fa-err { font-size:12.5px; color:var(--fa-red); font-weight:800; margin-top:10px; background:rgba(239,68,68,0.08);
    border:1px solid rgba(239,68,68,0.3); border-radius:10px; padding:9px 13px; }
  .fa-decided-note { font-size:12px; color:var(--fa-text3); font-weight:700; margin-top:8px; }

  .fa-empty { text-align:center; padding:44px 20px; color:var(--fa-text3); font-size:13.5px; font-weight:600; }
  .fa-spinner { width:28px; height:28px; border:3px solid var(--fa-border); border-top-color:var(--fa-purple);
    border-radius:50%; animation:faspin .7s linear infinite; margin:30px auto; }
  @keyframes faspin { to { transform:rotate(360deg); } }

  /* reject modal */
  .fa-overlay { position:fixed; inset:0; background:rgba(15,10,40,0.55); backdrop-filter:blur(5px);
    -webkit-backdrop-filter:blur(5px); z-index:1000; display:flex; align-items:center; justify-content:center; padding:20px; }
  .fa-modal { background:var(--fa-white); border:1px solid var(--fa-border); border-radius:16px; width:100%; max-width:440px;
    box-shadow:0 30px 80px rgba(15,10,40,0.4); overflow:hidden; }
  .fa-modal-hd { padding:16px 20px; border-bottom:1px solid var(--fa-border); display:flex; align-items:center; justify-content:space-between; }
  .fa-modal-title { font-size:15px; font-weight:900; }
  .fa-modal-x { width:30px; height:30px; border-radius:8px; border:none; background:var(--fa-bg); color:var(--fa-text2); font-size:17px; cursor:pointer; font-family:inherit; }
  .fa-modal-bd { padding:20px; }
  .fa-textarea { width:100%; min-height:80px; padding:11px 14px; border:1.5px solid var(--fa-border); border-radius:11px;
    background:var(--fa-bg); color:var(--fa-text); font-size:13.5px; outline:none; font-family:inherit; resize:vertical;
    box-sizing:border-box; margin-bottom:16px; line-height:1.5; }
  .fa-textarea:focus { border-color:var(--fa-purple); }

  @media (max-width:640px) {
    .fa-sub, .fa-uname { display:none; }
    .fa-wrap { padding:16px 14px 40px; }
    .fa-actions { flex-direction:column; }
  }
`;

const money = (n) => Number(n ?? 0).toLocaleString();

function fmtDateTime(d) {
  const dt = d ? new Date(d) : new Date();
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function StatusPill({ status }) {
  const s = String(status || 'PENDING').toUpperCase();
  const cls = s === 'APPROVED' ? 'approved' : s === 'REJECTED' ? 'rejected' : 'pending';
  return <span className={`fa-pill ${cls}`}>{s}</span>;
}

const SCOPE_TITLE = {
  PROJECT: 'Project Buying Requests',
  TRAINING: 'Training Buying Requests',
};

// Short label for the tab strip.
const SCOPE_TAB = { PROJECT: 'Project', TRAINING: 'Training' };

export default function FacultyInventoryApproval() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { showToast } = useStore();
  const name = user?.name || user?.email || 'Faculty';
  const initials = String(name).trim().charAt(0).toUpperCase() || 'F';

  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('pt-dark') === '1');
  // The purposes this faculty is the assigned approver for, and the active tab.
  // Both come from the server — the page never decides what it may see.
  const [scopes, setScopes] = useState([]);              // ['PROJECT'] | ['TRAINING'] | both
  const [tab, setTab] = useState('');                     // active purpose
  const [byPurpose, setByPurpose] = useState({ PROJECT: [], TRAINING: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);           // request currently being approved/rejected
  const [rowErr, setRowErr] = useState({});             // per-request error message
  const [rejectFor, setRejectFor] = useState(null);      // request being rejected (modal)
  const [rejectRemarks, setRejectRemarks] = useState('');

  useEffect(() => {
    const el = document.createElement('style');
    el.id = 'fa-styles';
    el.innerHTML = CSS;
    if (!document.getElementById('fa-styles')) document.head.appendChild(el);
    return () => { const s = document.getElementById('fa-styles'); if (s) s.remove(); };
  }, []);

  useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode);
  }, [darkMode]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await inventoryService.getPendingBuying();
      const d = res?.data || {};
      const sc = Array.isArray(d.scopes) ? d.scopes : [];
      setScopes(sc);
      setByPurpose({ PROJECT: d.project || [], TRAINING: d.training || [] });
      // Keep the tab the user is on across a reload (approve/reject re-loads);
      // only fall back to the first scope when the current one is gone.
      setTab((t) => (sc.includes(t) ? t : sc[0] || ''));
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load buying requests.');
      setScopes([]);
      setByPurpose({ PROJECT: [], TRAINING: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Read-only view of returns (faculty cannot approve returns — that's the Inventory Incharge).
  const [viewReturns, setViewReturns] = useState([]);
  useEffect(() => {
    (async () => {
      try {
        const res = await inventoryService.getReturnsReadOnly();
        setViewReturns(res?.data?.items || []);
      } catch { setViewReturns([]); }
    })();
  }, []);

  const approve = async (id) => {
    setBusyId(id);
    setRowErr((m) => ({ ...m, [id]: '' }));
    try {
      await inventoryService.approveBuying(id);
      showToast('Request approved — stock reduced', false);
      await load();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to approve request.';
      setRowErr((m) => ({ ...m, [id]: msg }));
      showToast(msg, true);
    } finally {
      setBusyId(null);
    }
  };

  const doReject = async () => {
    const id = rejectFor;
    setBusyId(id);
    setRowErr((m) => ({ ...m, [id]: '' }));
    try {
      await inventoryService.rejectBuying(id, rejectRemarks.trim() || undefined);
      showToast('Request rejected', false);
      setRejectFor(null);
      setRejectRemarks('');
      await load();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to reject request.';
      setRowErr((m) => ({ ...m, [id]: msg }));
      showToast(msg, true);
    } finally {
      setBusyId(null);
    }
  };

  const handleLogout = async () => {
    try { await authService.logout(); } finally { navigate('/auth/login', { replace: true }); }
  };

  // Only the active tab's requests are rendered; the pending/decided split is
  // unchanged, just scoped to that purpose.
  const active = byPurpose[tab] || [];
  const pending = active.filter((r) => String(r.status).toUpperCase() === 'PENDING');
  const decided = active.filter((r) => String(r.status).toUpperCase() !== 'PENDING');

  const renderReq = (r, isPending) => (
    <div className={`fa-req${isPending ? '' : ' decided'}`} key={r.request_id}>
      <div className="fa-req-top">
        <div style={{ minWidth: 0 }}>
          <div className="fa-req-name">{r.student_name || 'Student'} <span className="fa-req-reg">{r.student_reg || ''}</span></div>
          <div className="fa-req-meta">
            Request #{r.request_id} · {fmtDateTime(r.created_at)}
            {r.purpose_type ? <>  ·  <span className="fa-pill type" style={{ padding: '1px 8px' }}>{r.purpose_type}</span></> : null}
          </div>
        </div>
        <StatusPill status={r.status} />
      </div>

      <div className="fa-items">
        {(r.items || []).map((it) => (
          <div className="fa-item" key={it.line_id || it.item_id}>
            <span className="fa-item-name">{it.item_name}</span>
            <span className="fa-item-qty">{money(it.quantity)} {it.unit || ''}</span>
          </div>
        ))}
      </div>

      {r.purpose && <div className="fa-purpose"><strong>Purpose:</strong> {r.purpose}</div>}

      {isPending ? (
        <div className="fa-actions">
          <button className="fa-btn fa-approve" disabled={busyId === r.request_id} onClick={() => approve(r.request_id)}>
            {busyId === r.request_id ? 'Working…' : '✓ Approve'}
          </button>
          <button className="fa-btn fa-reject" disabled={busyId === r.request_id} onClick={() => { setRejectFor(r.request_id); setRejectRemarks(''); }}>
            ✕ Reject
          </button>
        </div>
      ) : (
        <div className="fa-decided-note">
          {String(r.status).toUpperCase() === 'APPROVED' ? 'Approved' : 'Rejected'}
          {r.decided_at ? ` · ${fmtDateTime(r.decided_at)}` : ''}
          {r.remarks ? ` · ${r.remarks}` : ''}
        </div>
      )}

      {rowErr[r.request_id] && <div className="fa-err">{rowErr[r.request_id]}</div>}
    </div>
  );

  return (
    <div className="fa-root">
      <div className="fa-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
          <button className="fa-back" onClick={() => navigate('/faculty-dashboard')}>← Dashboard</button>
          <div style={{ minWidth: 0 }}>
            <div className="fa-title">Inventory Approval</div>
            <div className="fa-sub">Review student buying requests</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="fa-userpill">
            <div className="fa-avatar">{initials}</div>
            <div className="fa-uname">{name}</div>
          </div>
          <button className="fa-iconbtn" title="Logout" onClick={handleLogout}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 7V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-1" />
              <path d="M15 12H3" /><path d="M6 9l-3 3 3 3" />
            </svg>
          </button>
        </div>
      </div>

      <div className="fa-wrap">
        {/* Purpose tabs — one per assignment. Rendered only when the caller holds
            both; with a single assignment the heading below already names it. */}
        {scopes.length > 1 && (
          <div className="fa-tabs">
            {scopes.map((s) => (
              <button key={s} className={`fa-tab${tab === s ? ' active' : ''}`} onClick={() => setTab(s)}>
                {SCOPE_TAB[s] || s}
              </button>
            ))}
          </div>
        )}

        <div className="fa-scope">{SCOPE_TITLE[tab] || 'Buying Requests'}</div>
        <div className="fa-scope-sub">
          {tab
            ? `You approve ${SCOPE_TAB[tab] || tab} purpose requests. Approving reduces stock.`
            : 'Approving reduces stock; rejecting does not.'}
        </div>

        {error && <div className="fa-empty" style={{ color: 'var(--fa-red)' }}>{error}</div>}

        {loading ? (
          <div className="fa-spinner" />
        ) : scopes.length === 0 ? (
          !error && <div className="fa-empty">You are not assigned as an inventory approver.</div>
        ) : (
          <>
            {pending.length === 0 && decided.length === 0 && (
              <div className="fa-empty">No {SCOPE_TAB[tab] || tab} requests.</div>
            )}

            {pending.length > 0 && (
              <>
                <div className="fa-scope-sub" style={{ fontWeight: 800, color: 'var(--fa-text2)', marginBottom: 12 }}>
                  Pending ({pending.length})
                </div>
                {pending.map((r) => renderReq(r, true))}
              </>
            )}

            {decided.length > 0 && (
              <>
                <div className="fa-scope-sub" style={{ fontWeight: 800, color: 'var(--fa-text2)', margin: '22px 0 12px' }}>
                  Decided ({decided.length})
                </div>
                {decided.map((r) => renderReq(r, false))}
              </>
            )}
          </>
        )}

        {/* Returns — view only (approved by the Inventory Incharge, not faculty) */}
        {viewReturns.length > 0 && (
          <>
            <div className="fa-scope" style={{ fontSize: 16, margin: '30px 0 4px' }}>Returns <span style={{ fontSize: 12, color: 'var(--fa-text3)', fontWeight: 700 }}>(view only)</span></div>
            <div className="fa-scope-sub">Returns are reviewed by the Inventory Incharge — shown here for your reference.</div>
            {viewReturns.map((r) => (
              <div className="fa-req decided" key={`ret-${r.request_id}`}>
                <div className="fa-req-top">
                  <div style={{ minWidth: 0 }}>
                    <div className="fa-req-name">{r.student_name || 'Student'} <span className="fa-req-reg">{r.student_reg || ''}</span></div>
                    <div className="fa-req-meta">Return #{r.request_id} · {fmtDateTime(r.created_at)}</div>
                  </div>
                  <StatusPill status={r.status} />
                </div>
                <div className="fa-req-meta" style={{ marginTop: 4 }}>
                  {(r.items || []).map((it) => it.action === 'FULLY_COMPLETED'
                    ? `${it.item_name} — Fully completed`
                    : `${it.item_name} — Return ${money(it.return_quantity ?? it.quantity)} ${it.unit || ''}`
                  ).join(' · ') || '—'}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Reject modal (optional remarks) */}
      {rejectFor != null && (
        <div className="fa-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget && busyId == null) setRejectFor(null); }}>
          <div className="fa-modal">
            <div className="fa-modal-hd">
              <div className="fa-modal-title">Reject Request #{rejectFor}</div>
              <button className="fa-modal-x" onClick={() => busyId == null && setRejectFor(null)}>×</button>
            </div>
            <div className="fa-modal-bd">
              <textarea className="fa-textarea" placeholder="Optional reason for rejection…" value={rejectRemarks} onChange={(e) => setRejectRemarks(e.target.value)} autoFocus />
              <div className="fa-actions">
                <button className="fa-btn fa-reject" style={{ flex: 1 }} disabled={busyId != null} onClick={doReject}>
                  {busyId != null ? 'Rejecting…' : 'Confirm Reject'}
                </button>
                <button className="fa-btn" style={{ flex: 1, background: 'var(--fa-bg)', color: 'var(--fa-text2)', border: '1.5px solid var(--fa-border)' }} disabled={busyId != null} onClick={() => setRejectFor(null)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
