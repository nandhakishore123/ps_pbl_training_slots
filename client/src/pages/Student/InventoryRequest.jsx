// InventoryRequest.jsx — Student inventory request (Stage 2: BUYING flow).
// Browse categories/items → build a cart → purpose + Project/Training → submit
// a PENDING buying request → Inventory Pass + "My Requests" list.
// Returning + approvals + stock changes come in later stages (see TODOs).
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { inventoryService } from '../../services/features/inventoryService';

// ── Scoped premium styles (self-contained; follows body.dark-mode) ──
const CSS = `
  .inv-root {
    --iv-purple:#6c47ff; --iv-purple-dim:rgba(108,71,255,0.1); --iv-purple-glow:rgba(108,71,255,0.28);
    --iv-bg:#f0f2f8; --iv-white:#fff; --iv-border:#e5e4eb;
    --iv-text:#1a1040; --iv-text2:#6b7280; --iv-text3:#9ca3af;
    --iv-green:#10b981; --iv-red:#ef4444; --iv-gold:#f59e0b;
    min-height:100vh; background:var(--iv-bg); color:var(--iv-text);
    font-family:'Segoe UI',system-ui,sans-serif;
  }
  body.dark-mode .inv-root {
    --iv-bg:#0f0f1a; --iv-white:#1a1a2e; --iv-border:#2d2d4e;
    --iv-text:#e8e6f0; --iv-text2:#a89ec9; --iv-text3:#6b6b8a;
  }
  .inv-header { background:var(--iv-white); border-bottom:1px solid var(--iv-border); padding:14px 24px;
    display:flex; align-items:center; justify-content:space-between; gap:12px; position:sticky; top:0; z-index:50;
    box-shadow:0 1px 10px rgba(26,16,64,0.05); }
  .inv-back { display:flex; align-items:center; gap:7px; background:var(--iv-white); border:1.5px solid var(--iv-border);
    color:var(--iv-text2); padding:8px 14px; border-radius:9px; font-size:13px; font-weight:700; cursor:pointer;
    transition:all .18s; font-family:inherit; white-space:nowrap; }
  .inv-back:hover { border-color:var(--iv-purple); color:var(--iv-purple); background:var(--iv-purple-dim); }
  .inv-htitle { font-size:17px; font-weight:900; letter-spacing:0.2px; }
  .inv-hsub { font-size:11.5px; color:var(--iv-text3); font-weight:600; margin-top:1px; }
  .inv-userpill { display:flex; align-items:center; gap:10px; padding:4px 14px 4px 4px; background:var(--iv-white);
    border:1.5px solid var(--iv-border); border-radius:50px; }
  .inv-avatar { width:36px; height:36px; border-radius:50%; background:linear-gradient(135deg,#6c47ff,#4b2fd6);
    display:flex; align-items:center; justify-content:center; font-size:15px; font-weight:900; color:#fff; flex-shrink:0; }
  .inv-uname { font-size:13px; font-weight:800; line-height:1.15; }
  .inv-uroll { font-size:10.5px; color:var(--iv-text3); font-weight:700; letter-spacing:0.4px; }
  .inv-dark { background:var(--iv-white); border:1.5px solid var(--iv-border); border-radius:20px; padding:6px 12px;
    cursor:pointer; font-size:12.5px; color:var(--iv-text2); font-weight:600; font-family:inherit; white-space:nowrap; }
  .inv-dark:hover { border-color:var(--iv-purple); color:var(--iv-purple); }

  .inv-wrap { max-width:1080px; margin:0 auto; padding:22px 24px 44px; }

  .inv-tabs { display:flex; gap:8px; background:var(--iv-white); border:1px solid var(--iv-border); border-radius:14px;
    padding:6px; margin-bottom:20px; }
  .inv-tab { flex:1; padding:11px 14px; border-radius:9px; border:none; background:transparent; font-size:13.5px;
    font-weight:800; color:var(--iv-text2); cursor:pointer; font-family:inherit; display:flex; align-items:center;
    justify-content:center; gap:8px; transition:all .18s; }
  .inv-tab.active { background:linear-gradient(135deg,#6c47ff,#4b2fd6); color:#fff; box-shadow:0 4px 14px var(--iv-purple-glow); }
  .inv-tab.disabled { cursor:not-allowed; opacity:0.55; }
  .inv-soon { font-size:9px; font-weight:800; letter-spacing:0.6px; text-transform:uppercase; padding:2px 8px;
    border-radius:20px; background:rgba(245,158,11,0.16); color:#b45309; border:1px solid rgba(245,158,11,0.4); }

  .inv-grid { display:grid; grid-template-columns:1fr 380px; gap:20px; align-items:start; }
  .inv-card { background:var(--iv-white); border:1px solid var(--iv-border); border-radius:18px; padding:22px;
    box-shadow:0 6px 26px rgba(26,16,64,0.06); }
  .inv-card + .inv-card { margin-top:18px; }
  .inv-card-title { font-size:15px; font-weight:900; margin-bottom:3px; }
  .inv-card-sub { font-size:12px; color:var(--iv-text3); margin-bottom:16px; }

  .inv-field-label { font-size:11px; font-weight:800; letter-spacing:0.8px; text-transform:uppercase;
    color:var(--iv-text2); margin-bottom:7px; display:block; }
  .inv-select, .inv-input, .inv-textarea { width:100%; padding:11px 14px; border:1.5px solid var(--iv-border);
    border-radius:11px; background:var(--iv-bg); color:var(--iv-text); font-size:13.5px; font-weight:600; outline:none;
    font-family:inherit; box-sizing:border-box; }
  .inv-select:focus, .inv-input:focus, .inv-textarea:focus { border-color:var(--iv-purple); }
  .inv-textarea { resize:vertical; min-height:76px; line-height:1.5; }
  .inv-row2 { display:flex; gap:12px; align-items:flex-end; }
  .inv-unit-chip { flex-shrink:0; padding:11px 14px; border-radius:11px; background:var(--iv-purple-dim);
    border:1.5px solid rgba(108,71,255,0.25); color:var(--iv-purple); font-size:13px; font-weight:800; white-space:nowrap; }

  .inv-btn { width:100%; padding:13px; border:none; border-radius:12px; font-size:14px; font-weight:800; cursor:pointer;
    font-family:inherit; transition:all .18s; }
  .inv-btn-primary { background:linear-gradient(135deg,#6c47ff,#4b2fd6); color:#fff; box-shadow:0 6px 20px var(--iv-purple-glow); }
  .inv-btn-primary:hover:not(:disabled) { filter:brightness(1.05); }
  .inv-btn:disabled { opacity:0.5; cursor:not-allowed; box-shadow:none; }
  .inv-btn-ghost { background:var(--iv-purple-dim); color:var(--iv-purple); border:1.5px solid rgba(108,71,255,0.3); }

  .inv-hint { font-size:12px; color:var(--iv-red); font-weight:700; margin-top:8px; }

  .inv-cart-row { display:flex; align-items:center; gap:12px; padding:12px 14px; border:1px solid var(--iv-border);
    border-radius:12px; margin-bottom:9px; background:var(--iv-bg); }
  .inv-cart-name { font-size:13px; font-weight:800; flex:1; min-width:0; }
  .inv-cart-qty { font-size:12.5px; font-weight:800; color:var(--iv-purple); white-space:nowrap; }
  .inv-cart-x { width:28px; height:28px; border-radius:8px; border:1px solid var(--iv-border); background:transparent;
    color:var(--iv-text3); cursor:pointer; font-size:15px; line-height:1; flex-shrink:0; font-family:inherit; }
  .inv-cart-x:hover { border-color:var(--iv-red); color:var(--iv-red); background:rgba(239,68,68,0.06); }
  .inv-empty { text-align:center; padding:26px 16px; color:var(--iv-text3); font-size:13px; font-weight:600; }

  .inv-pill { display:inline-flex; align-items:center; gap:6px; padding:4px 12px; border-radius:20px; font-size:11px;
    font-weight:800; letter-spacing:0.4px; text-transform:uppercase; }
  .inv-pill.pending { background:rgba(245,158,11,0.12); color:#b45309; border:1px solid rgba(245,158,11,0.4); }
  .inv-pill.approved { background:rgba(16,185,129,0.12); color:#047857; border:1px solid rgba(16,185,129,0.4); }
  .inv-pill.rejected { background:rgba(239,68,68,0.12); color:#b91c1c; border:1px solid rgba(239,68,68,0.4); }

  /* Inventory Pass */
  .inv-pass { background:var(--iv-white); border:1px solid var(--iv-border); border-radius:20px; overflow:hidden;
    box-shadow:0 16px 50px rgba(26,16,64,0.14); }
  .inv-pass-top { background:linear-gradient(135deg,#6c47ff 0%,#4b2fd6 60%,#3a1f9e 100%); padding:22px 24px; color:#fff;
    position:relative; overflow:hidden; }
  .inv-pass-orb { position:absolute; border-radius:50%; background:rgba(255,255,255,0.10); }
  .inv-pass-body { padding:22px 24px; }
  .inv-pass-kv { display:flex; justify-content:space-between; gap:14px; padding:9px 0; border-bottom:1px dashed var(--iv-border); font-size:13px; }
  .inv-pass-kv:last-child { border-bottom:none; }
  .inv-pass-k { color:var(--iv-text2); font-weight:700; }
  .inv-pass-v { font-weight:800; text-align:right; }
  .inv-pass-item { display:flex; justify-content:space-between; gap:12px; padding:9px 12px; background:var(--iv-bg);
    border:1px solid var(--iv-border); border-radius:10px; margin-bottom:7px; font-size:13px; }

  .inv-req { border:1px solid var(--iv-border); border-radius:14px; padding:14px 16px; margin-bottom:11px; background:var(--iv-white); }
  .inv-req-top { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:8px; }
  .inv-req-id { font-size:13px; font-weight:900; }
  .inv-req-meta { font-size:11.5px; color:var(--iv-text3); font-weight:600; margin-top:2px; }
  .inv-req-items { font-size:12.5px; color:var(--iv-text2); line-height:1.6; }
  .inv-spinner { width:26px; height:26px; border:3px solid var(--iv-border); border-top-color:var(--iv-purple);
    border-radius:50%; animation:invspin .7s linear infinite; margin:14px auto; }
  @keyframes invspin { to { transform:rotate(360deg); } }

  @media (max-width:820px) {
    .inv-grid { grid-template-columns:1fr; }
    .inv-hsub, .inv-uroll { display:none; }
    .inv-wrap { padding:16px 14px 36px; }
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
  return <span className={`inv-pill ${cls}`}>{s}</span>;
}

export default function InventoryRequest() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const name = user?.name || 'Student';
  const roll = user?.reg_num || '—';
  const initials = String(name).trim().charAt(0).toUpperCase() || 'S';

  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('pt-dark') === '1');
  const [tab, setTab] = useState('buying'); // 'buying' | 'returning' (returning disabled — later stage)

  // Catalog
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [addErr, setAddErr] = useState('');

  // Cart + purpose
  const [cart, setCart] = useState([]);
  const [purpose, setPurpose] = useState('');
  const [purposeType, setPurposeType] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState('');
  const [pass, setPass] = useState(null); // created request → Inventory Pass

  // My Requests
  const [myRequests, setMyRequests] = useState([]);
  const [mineLoading, setMineLoading] = useState(true);

  // Inject scoped styles
  useEffect(() => {
    const el = document.createElement('style');
    el.id = 'inv-styles';
    el.innerHTML = CSS;
    if (!document.getElementById('inv-styles')) document.head.appendChild(el);
    return () => { const s = document.getElementById('inv-styles'); if (s) s.remove(); };
  }, []);

  useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode);
    localStorage.setItem('pt-dark', darkMode ? '1' : '0');
  }, [darkMode]);

  const loadMine = useCallback(async () => {
    setMineLoading(true);
    try {
      const res = await inventoryService.getMyRequests();
      setMyRequests(res?.data?.items || []);
    } catch {
      setMyRequests([]);
    } finally {
      setMineLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await inventoryService.getCategories();
        setCategories((res?.data?.items || []).map((r) => r.category));
      } catch {
        setCategories([]);
      }
    })();
    loadMine();
  }, [loadMine]);

  // Load items when a category is chosen
  useEffect(() => {
    if (!selectedCategory) { setItems([]); setSelectedItemId(''); return; }
    let ignore = false;
    setItemsLoading(true);
    (async () => {
      try {
        const res = await inventoryService.getItems(selectedCategory);
        if (ignore) return;
        setItems(res?.data?.items || []);
      } catch {
        if (!ignore) setItems([]);
      } finally {
        if (!ignore) setItemsLoading(false);
      }
    })();
    setSelectedItemId('');
    return () => { ignore = true; };
  }, [selectedCategory]);

  const selectedItem = items.find((it) => String(it.item_id) === String(selectedItemId)) || null;

  const addToCart = () => {
    setAddErr('');
    if (!selectedItem) { setAddErr('Select an item first.'); return; }
    const qty = Number(quantity);
    if (!(qty > 0)) { setAddErr('Enter a quantity greater than 0.'); return; }
    const available = Number(selectedItem.current_quantity ?? 0);
    if (qty > available) { setAddErr(`Only ${money(available)} ${selectedItem.unit || ''} available.`); return; }

    setCart((prev) => {
      const idx = prev.findIndex((c) => c.item_id === selectedItem.item_id);
      if (idx !== -1) {
        const merged = Number(prev[idx].quantity) + qty;
        if (merged > available) { setAddErr(`Total exceeds available stock (${money(available)}).`); return prev; }
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: merged };
        return next;
      }
      return [...prev, {
        item_id: selectedItem.item_id,
        item_name: selectedItem.item_name,
        unit: selectedItem.unit || '',
        quantity: qty,
        available,
      }];
    });
    setQuantity('');
    setSelectedItemId('');
  };

  const removeFromCart = (itemId) => setCart((prev) => prev.filter((c) => c.item_id !== itemId));

  const canSubmit = cart.length > 0 && purpose.trim() !== '' && ['PROJECT', 'TRAINING'].includes(purposeType) && !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitErr('');
    setSubmitting(true);
    try {
      const res = await inventoryService.createRequest({
        purpose_type: purposeType,
        purpose: purpose.trim(),
        items: cart.map((c) => ({ item_id: c.item_id, quantity: c.quantity })),
      });
      setPass(res?.data || null);
      setCart([]);
      setPurpose('');
      setPurposeType('');
      setSelectedCategory('');
      setSelectedItemId('');
      setQuantity('');
      loadMine();
    } catch (err) {
      setSubmitErr(err?.response?.data?.message || 'Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="inv-root">
      {/* Header */}
      <div className="inv-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
          <button className="inv-back" onClick={() => navigate('/student-dashboard')}>← Dashboard</button>
          <div style={{ minWidth: 0 }}>
            <div className="inv-htitle">Inventory Request</div>
            <div className="inv-hsub">Request lab items & track approvals</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="inv-userpill">
            <div className="inv-avatar">{initials}</div>
            <div>
              <div className="inv-uname">{name}</div>
              <div className="inv-uroll">{roll}</div>
            </div>
          </div>
          <button className="inv-dark" onClick={() => setDarkMode((d) => !d)}>{darkMode ? '☀ Light' : '🌙 Dark'}</button>
        </div>
      </div>

      <div className="inv-wrap">
        {/* Tabs: Buying (active) | Returning (coming soon) */}
        <div className="inv-tabs">
          <button className={`inv-tab${tab === 'buying' ? ' active' : ''}`} onClick={() => setTab('buying')}>
            Buying
          </button>
          {/* TODO (Stage 3): enable Returning flow */}
          <button className="inv-tab disabled" disabled title="Coming soon">
            Returning <span className="inv-soon">Soon</span>
          </button>
        </div>

        {pass ? (
          /* ── Inventory Pass ── */
          <div style={{ maxWidth: 520, margin: '0 auto' }}>
            <div className="inv-pass">
              <div className="inv-pass-top">
                <div className="inv-pass-orb" style={{ width: 130, height: 130, top: -40, right: -30 }} />
                <div className="inv-pass-orb" style={{ width: 80, height: 80, bottom: -34, left: 20 }} />
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', opacity: 0.8 }}>Inventory Pass</div>
                <div style={{ fontSize: 22, fontWeight: 900, marginTop: 6 }}>{name}</div>
                <div style={{ fontSize: 12.5, fontWeight: 700, opacity: 0.85, letterSpacing: 0.5 }}>{roll}</div>
                <div style={{ marginTop: 12 }}><StatusPill status={pass.status || 'PENDING'} /></div>
              </div>
              <div className="inv-pass-body">
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase', color: 'var(--iv-text2)', marginBottom: 8 }}>Items</div>
                {(pass.items || []).map((it) => (
                  <div className="inv-pass-item" key={it.line_id || it.item_id}>
                    <span style={{ fontWeight: 700 }}>{it.item_name}</span>
                    <span style={{ fontWeight: 800, color: 'var(--iv-purple)' }}>{money(it.quantity)} {it.unit || ''}</span>
                  </div>
                ))}
                <div style={{ marginTop: 12 }}>
                  <div className="inv-pass-kv"><span className="inv-pass-k">Purpose</span><span className="inv-pass-v">{pass.purpose || '—'}</span></div>
                  <div className="inv-pass-kv"><span className="inv-pass-k">Type</span><span className="inv-pass-v">{pass.purpose_type || purposeType || '—'}</span></div>
                  <div className="inv-pass-kv"><span className="inv-pass-k">Request #</span><span className="inv-pass-v">{pass.request_id}</span></div>
                  <div className="inv-pass-kv"><span className="inv-pass-k">Date</span><span className="inv-pass-v">{fmtDateTime(pass.created_at)}</span></div>
                </div>
                <button className="inv-btn inv-btn-ghost" style={{ marginTop: 18 }} onClick={() => setPass(null)}>
                  + New Request
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ── Buying builder ── */
          <div className="inv-grid">
            {/* LEFT: item picker + purpose */}
            <div>
              <div className="inv-card">
                <div className="inv-card-title">Add items to your request</div>
                <div className="inv-card-sub">Pick a category, choose an item, set the quantity, then add it to your cart.</div>

                <label className="inv-field-label">Category</label>
                <select className="inv-select" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} style={{ marginBottom: 16 }}>
                  <option value="">Select a category…</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>

                <label className="inv-field-label">Item</label>
                <select className="inv-select" value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)} disabled={!selectedCategory || itemsLoading} style={{ marginBottom: 16 }}>
                  <option value="">{itemsLoading ? 'Loading items…' : selectedCategory ? 'Select an item…' : 'Choose a category first'}</option>
                  {items.map((it) => (
                    <option key={it.item_id} value={it.item_id}>
                      {it.item_name} — {money(it.current_quantity)} {it.unit || ''} available
                    </option>
                  ))}
                </select>

                <label className="inv-field-label">Quantity</label>
                <div className="inv-row2">
                  <input className="inv-input" type="number" min="0" step="any" placeholder="e.g. 100" value={quantity}
                    onChange={(e) => setQuantity(e.target.value)} />
                  <div className="inv-unit-chip">{selectedItem?.unit || '—'}</div>
                  <button className="inv-btn inv-btn-ghost" style={{ width: 'auto', padding: '11px 18px', whiteSpace: 'nowrap' }} onClick={addToCart}>
                    + Add
                  </button>
                </div>
                {addErr && <div className="inv-hint">{addErr}</div>}
              </div>

              {cart.length > 0 && (
                <div className="inv-card">
                  <div className="inv-card-title">Purpose</div>
                  <div className="inv-card-sub">Tell the approver why you need these items.</div>
                  <label className="inv-field-label">Reason</label>
                  <textarea className="inv-textarea" placeholder="e.g. For the microbial staining experiment in my final-year project…"
                    value={purpose} onChange={(e) => setPurpose(e.target.value)} style={{ marginBottom: 16 }} />
                  <label className="inv-field-label">Requested for</label>
                  <select className="inv-select" value={purposeType} onChange={(e) => setPurposeType(e.target.value)} style={{ marginBottom: 18 }}>
                    <option value="">Select Project or Training…</option>
                    <option value="PROJECT">Project</option>
                    <option value="TRAINING">Training</option>
                  </select>
                  <button className="inv-btn inv-btn-primary" disabled={!canSubmit} onClick={submit}>
                    {submitting ? 'Submitting…' : 'Submit Request'}
                  </button>
                  {submitErr && <div className="inv-hint">{submitErr}</div>}
                </div>
              )}
            </div>

            {/* RIGHT: cart */}
            <div className="inv-card">
              <div className="inv-card-title">Your Cart <span style={{ color: 'var(--iv-purple)' }}>({cart.length})</span></div>
              <div className="inv-card-sub">Items to request this time.</div>
              {cart.length === 0 ? (
                <div className="inv-empty">No items yet — add items from the left.</div>
              ) : (
                cart.map((c) => (
                  <div className="inv-cart-row" key={c.item_id}>
                    <div className="inv-cart-name">{c.item_name}</div>
                    <div className="inv-cart-qty">{money(c.quantity)} {c.unit}</div>
                    <button className="inv-cart-x" title="Remove" onClick={() => removeFromCart(c.item_id)}>×</button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── My Requests ── */}
        <div className="inv-card" style={{ marginTop: 22 }}>
          <div className="inv-card-title">My Requests</div>
          <div className="inv-card-sub">Your inventory requests and their approval status.</div>
          {mineLoading ? (
            <div className="inv-spinner" />
          ) : myRequests.length === 0 ? (
            <div className="inv-empty">You haven't made any requests yet.</div>
          ) : (
            myRequests.map((r) => (
              <div className="inv-req" key={r.request_id}>
                <div className="inv-req-top">
                  <div>
                    <div className="inv-req-id">Request #{r.request_id}
                      <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--iv-purple)', marginLeft: 8 }}>
                        {r.request_type === 'RETURN' ? 'RETURN' : (r.purpose_type || 'BUY')}
                      </span>
                    </div>
                    <div className="inv-req-meta">{fmtDateTime(r.created_at)} · {(r.items || []).length} item{(r.items || []).length !== 1 ? 's' : ''}</div>
                  </div>
                  <StatusPill status={r.status} />
                </div>
                <div className="inv-req-items">
                  {(r.items || []).map((it) => `${it.item_name} (${money(it.quantity)} ${it.unit || ''})`).join(' · ') || '—'}
                </div>
                {r.purpose && <div className="inv-req-meta" style={{ marginTop: 6 }}>Purpose: {r.purpose}</div>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
