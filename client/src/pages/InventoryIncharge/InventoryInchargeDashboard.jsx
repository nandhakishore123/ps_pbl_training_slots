// InventoryInchargeDashboard.jsx — Inventory Incharge (role_id = 4) console.
// One function: stock management + a READ-ONLY view of buying requests.
// (Return approvals = Stage 5; faculty buying approvals = Stage 4 — see TODOs.)
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { authService } from '../../services/features/authService';
import { inventoryService } from '../../services/features/inventoryService';

const CSS = `
  .ic-root {
    --ic-purple:#6c47ff; --ic-purple-dim:rgba(108,71,255,0.1); --ic-glow:rgba(108,71,255,0.28);
    --ic-bg:#f0f2f8; --ic-white:#fff; --ic-border:#e5e4eb;
    --ic-text:#1a1040; --ic-text2:#6b7280; --ic-text3:#9ca3af;
    --ic-green:#10b981; --ic-red:#ef4444; --ic-gold:#f59e0b;
    min-height:100vh; background:var(--ic-bg); color:var(--ic-text);
    font-family:'Segoe UI',system-ui,sans-serif;
  }
  body.dark-mode .ic-root {
    --ic-bg:#0f0f1a; --ic-white:#1a1a2e; --ic-border:#2d2d4e;
    --ic-text:#e8e6f0; --ic-text2:#a89ec9; --ic-text3:#6b6b8a;
  }
  .ic-header { background:var(--ic-white); border-bottom:1px solid var(--ic-border); padding:14px 24px;
    display:flex; align-items:center; justify-content:space-between; gap:12px; position:sticky; top:0; z-index:50;
    box-shadow:0 1px 10px rgba(26,16,64,0.05); }
  .ic-brand { display:flex; align-items:center; gap:12px; min-width:0; }
  .ic-logo { width:40px; height:40px; border-radius:11px; background:linear-gradient(135deg,#6c47ff,#4b2fd6);
    display:flex; align-items:center; justify-content:center; flex-shrink:0; box-shadow:0 4px 12px var(--ic-glow); }
  .ic-title { font-size:16px; font-weight:900; letter-spacing:0.2px; display:flex; align-items:center; gap:9px; }
  .ic-badge { font-size:9.5px; font-weight:800; letter-spacing:0.6px; text-transform:uppercase; padding:3px 9px;
    border-radius:20px; background:var(--ic-purple-dim); color:var(--ic-purple); border:1px solid rgba(108,71,255,0.3); }
  .ic-sub { font-size:11.5px; color:var(--ic-text3); font-weight:600; margin-top:1px; }
  .ic-userpill { display:flex; align-items:center; gap:10px; padding:4px 14px 4px 4px; background:var(--ic-white);
    border:1.5px solid var(--ic-border); border-radius:50px; }
  .ic-avatar { width:34px; height:34px; border-radius:50%; background:linear-gradient(135deg,#6c47ff,#4b2fd6);
    display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:900; color:#fff; flex-shrink:0; }
  .ic-uname { font-size:13px; font-weight:800; }
  .ic-iconbtn { width:38px; height:38px; border-radius:10px; background:var(--ic-white); border:1.5px solid var(--ic-border);
    color:var(--ic-text2); cursor:pointer; display:flex; align-items:center; justify-content:center; }
  .ic-iconbtn:hover { border-color:var(--ic-purple); color:var(--ic-purple); background:var(--ic-purple-dim); }
  .ic-dark { background:var(--ic-white); border:1.5px solid var(--ic-border); border-radius:20px; padding:7px 12px;
    cursor:pointer; font-size:12.5px; color:var(--ic-text2); font-weight:600; font-family:inherit; white-space:nowrap; }
  .ic-dark:hover { border-color:var(--ic-purple); color:var(--ic-purple); }

  .ic-wrap { max-width:1160px; margin:0 auto; padding:22px 24px 48px; }

  .ic-tabs { display:flex; gap:8px; background:var(--ic-white); border:1px solid var(--ic-border); border-radius:14px;
    padding:6px; margin-bottom:20px; max-width:440px; }
  .ic-tab { flex:1; padding:11px 14px; border-radius:9px; border:none; background:transparent; font-size:13.5px;
    font-weight:800; color:var(--ic-text2); cursor:pointer; font-family:inherit; transition:all .18s; }
  .ic-tab.active { background:linear-gradient(135deg,#6c47ff,#4b2fd6); color:#fff; box-shadow:0 4px 14px var(--ic-glow); }

  .ic-toolbar { display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin-bottom:16px; }
  .ic-search { flex:1; min-width:200px; padding:11px 14px; border:1.5px solid var(--ic-border); border-radius:11px;
    background:var(--ic-white); color:var(--ic-text); font-size:13.5px; outline:none; font-family:inherit; }
  .ic-search:focus { border-color:var(--ic-purple); }
  .ic-select { padding:11px 14px; border:1.5px solid var(--ic-border); border-radius:11px; background:var(--ic-white);
    color:var(--ic-text); font-size:13.5px; font-weight:600; outline:none; font-family:inherit; cursor:pointer; }
  .ic-btn { padding:11px 18px; border:none; border-radius:11px; font-size:13.5px; font-weight:800; cursor:pointer;
    font-family:inherit; transition:all .18s; white-space:nowrap; }
  .ic-btn-primary { background:linear-gradient(135deg,#6c47ff,#4b2fd6); color:#fff; box-shadow:0 6px 18px var(--ic-glow); }
  .ic-btn-primary:hover:not(:disabled) { filter:brightness(1.05); }
  .ic-btn:disabled { opacity:0.5; cursor:not-allowed; box-shadow:none; }
  .ic-btn-ghost { background:var(--ic-purple-dim); color:var(--ic-purple); border:1.5px solid rgba(108,71,255,0.3); }
  .ic-btn-sm { padding:7px 12px; font-size:12px; border-radius:9px; }
  .ic-btn-outline { background:transparent; border:1.5px solid var(--ic-border); color:var(--ic-text2); }
  .ic-btn-outline:hover { border-color:var(--ic-purple); color:var(--ic-purple); background:var(--ic-purple-dim); }

  .ic-count { font-size:11.5px; color:var(--ic-text3); font-weight:700; margin-bottom:10px; }

  .ic-card { background:var(--ic-white); border:1px solid var(--ic-border); border-radius:16px; overflow:hidden;
    box-shadow:0 6px 26px rgba(26,16,64,0.06); }
  .ic-item { display:grid; grid-template-columns:1fr 140px 130px auto; gap:14px; align-items:center;
    padding:14px 18px; border-bottom:1px solid var(--ic-border); }
  .ic-item:last-child { border-bottom:none; }
  .ic-item:hover { background:var(--ic-purple-dim); }
  .ic-item-name { font-size:13.5px; font-weight:800; }
  .ic-item-meta { font-size:11px; color:var(--ic-text3); font-weight:600; margin-top:2px; }
  .ic-qty { font-size:15px; font-weight:900; color:var(--ic-purple); }
  .ic-qty-unit { font-size:11px; color:var(--ic-text3); font-weight:700; }
  .ic-rack { font-size:12px; color:var(--ic-text2); font-weight:700; }
  .ic-tag { display:inline-block; font-size:9.5px; font-weight:800; letter-spacing:0.4px; text-transform:uppercase;
    padding:2px 8px; border-radius:20px; margin-top:4px; }
  .ic-tag.ret { background:rgba(16,185,129,0.12); color:#047857; border:1px solid rgba(16,185,129,0.4); }
  .ic-actions { display:flex; gap:7px; justify-content:flex-end; }

  .ic-empty { text-align:center; padding:40px 20px; color:var(--ic-text3); font-size:13px; font-weight:600; }
  .ic-spinner { width:28px; height:28px; border:3px solid var(--ic-border); border-top-color:var(--ic-purple);
    border-radius:50%; animation:icspin .7s linear infinite; margin:26px auto; }
  @keyframes icspin { to { transform:rotate(360deg); } }

  .ic-note { display:flex; align-items:center; gap:8px; background:rgba(245,158,11,0.09); border:1px solid rgba(245,158,11,0.35);
    border-radius:12px; padding:10px 14px; font-size:12.5px; font-weight:700; color:#b45309; margin-bottom:16px; }

  .ic-req { border:1px solid var(--ic-border); border-radius:14px; padding:15px 17px; margin-bottom:11px; background:var(--ic-white); }
  .ic-req-top { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:8px; }
  .ic-req-name { font-size:13.5px; font-weight:900; }
  .ic-req-meta { font-size:11.5px; color:var(--ic-text3); font-weight:600; margin-top:2px; }
  .ic-req-items { font-size:12.5px; color:var(--ic-text2); line-height:1.6; }
  .ic-pill { display:inline-flex; align-items:center; gap:6px; padding:4px 12px; border-radius:20px; font-size:11px;
    font-weight:800; letter-spacing:0.4px; text-transform:uppercase; }
  .ic-pill.pending { background:rgba(245,158,11,0.12); color:#b45309; border:1px solid rgba(245,158,11,0.4); }
  .ic-pill.approved { background:rgba(16,185,129,0.12); color:#047857; border:1px solid rgba(16,185,129,0.4); }
  .ic-pill.rejected { background:rgba(239,68,68,0.12); color:#b91c1c; border:1px solid rgba(239,68,68,0.4); }
  .ic-pill.type { background:var(--ic-purple-dim); color:var(--ic-purple); border:1px solid rgba(108,71,255,0.3); }

  /* Modal */
  .ic-overlay { position:fixed; inset:0; background:rgba(15,10,40,0.55); backdrop-filter:blur(5px);
    -webkit-backdrop-filter:blur(5px); z-index:1000; display:flex; align-items:center; justify-content:center; padding:20px; }
  .ic-modal { background:var(--ic-white); border:1px solid var(--ic-border); border-radius:16px; width:100%; max-width:460px;
    box-shadow:0 30px 80px rgba(15,10,40,0.4); overflow:hidden; }
  .ic-modal-hd { padding:16px 20px; border-bottom:1px solid var(--ic-border); display:flex; align-items:center;
    justify-content:space-between; }
  .ic-modal-title { font-size:15px; font-weight:900; }
  .ic-modal-x { width:30px; height:30px; border-radius:8px; border:none; background:var(--ic-bg); color:var(--ic-text2);
    font-size:17px; cursor:pointer; font-family:inherit; }
  .ic-modal-bd { padding:20px; }
  .ic-label { font-size:11px; font-weight:800; letter-spacing:0.7px; text-transform:uppercase; color:var(--ic-text2);
    margin-bottom:7px; display:block; }
  .ic-input { width:100%; padding:11px 14px; border:1.5px solid var(--ic-border); border-radius:11px; background:var(--ic-bg);
    color:var(--ic-text); font-size:13.5px; font-weight:600; outline:none; font-family:inherit; box-sizing:border-box; margin-bottom:14px; }
  .ic-input:focus { border-color:var(--ic-purple); }
  .ic-check { display:flex; align-items:center; gap:9px; font-size:13px; font-weight:700; margin-bottom:16px; cursor:pointer; }
  .ic-hint { font-size:12px; color:var(--ic-red); font-weight:700; margin-bottom:12px; }

  @media (max-width:760px) {
    .ic-item { grid-template-columns:1fr auto; }
    .ic-item-col-hide { display:none; }
    .ic-actions { grid-column:1 / -1; justify-content:flex-start; }
    .ic-sub, .ic-uname { display:none; }
    .ic-wrap { padding:16px 14px 40px; }
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
  return <span className={`ic-pill ${cls}`}>{s}</span>;
}

const RENDER_CAP = 250; // guard against rendering the whole 1455-item catalog at once

export default function InventoryInchargeDashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const name = user?.name || 'Incharge';
  const initials = String(name).trim().charAt(0).toUpperCase() || 'I';

  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('pt-dark') === '1');
  const [tab, setTab] = useState('stock'); // 'stock' | 'buying'

  // Stock
  const [stock, setStock] = useState([]);
  const [stockLoading, setStockLoading] = useState(true);
  const [stockError, setStockError] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState([]);

  // Buying (read-only)
  const [buying, setBuying] = useState([]);
  const [buyingLoading, setBuyingLoading] = useState(false);
  const [buyingLoaded, setBuyingLoaded] = useState(false);

  // Action modal: { mode:'edit'|'add'|'new', item? }
  const [modal, setModal] = useState(null);
  const [qtyInput, setQtyInput] = useState('');
  const [newItem, setNewItem] = useState({ category: '', subcategory: '', item_name: '', sub_name: '', unit: '', current_quantity: '', rack_location: '', is_returnable: false });
  const [saving, setSaving] = useState(false);
  const [modalErr, setModalErr] = useState('');

  const debounceRef = useRef(null);

  useEffect(() => {
    const el = document.createElement('style');
    el.id = 'ic-styles';
    el.innerHTML = CSS;
    if (!document.getElementById('ic-styles')) document.head.appendChild(el);
    return () => { const s = document.getElementById('ic-styles'); if (s) s.remove(); };
  }, []);

  useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode);
    localStorage.setItem('pt-dark', darkMode ? '1' : '0');
  }, [darkMode]);

  const loadStock = useCallback(async (opts = {}) => {
    setStockLoading(true);
    setStockError('');
    try {
      const res = await inventoryService.getStock({
        category: opts.category ?? categoryFilter,
        search: opts.search ?? search,
      });
      setStock(res?.data?.items || []);
    } catch {
      setStockError('Failed to load stock. Check connection.');
      setStock([]);
    } finally {
      setStockLoading(false);
    }
  }, [categoryFilter, search]);

  const loadBuying = useCallback(async () => {
    setBuyingLoading(true);
    try {
      const res = await inventoryService.getBuyingReadOnly();
      setBuying(res?.data?.items || []);
      setBuyingLoaded(true);
    } catch {
      setBuying([]);
      setBuyingLoaded(true);
    } finally {
      setBuyingLoading(false);
    }
  }, []);

  // Initial: categories + stock
  useEffect(() => {
    (async () => {
      try {
        const res = await inventoryService.getCategories();
        setCategories((res?.data?.items || []).map((r) => r.category));
      } catch { setCategories([]); }
    })();
    loadStock({ category: '', search: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Category filter → reload immediately
  useEffect(() => {
    if (stockLoading && stock.length === 0) return; // skip initial double-fetch
    loadStock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter]);

  // Search → debounced reload
  const onSearchChange = (v) => {
    setSearch(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadStock({ search: v }), 300);
  };

  // Lazy-load buying list when its tab is first opened
  useEffect(() => {
    if (tab === 'buying' && !buyingLoaded) loadBuying();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const openEdit = (item) => { setModal({ mode: 'edit', item }); setQtyInput(String(item.current_quantity ?? '')); setModalErr(''); };
  const openAdd = (item) => { setModal({ mode: 'add', item }); setQtyInput(''); setModalErr(''); };
  const openNew = () => {
    setModal({ mode: 'new' });
    setNewItem({ category: categoryFilter || '', subcategory: '', item_name: '', sub_name: '', unit: '', current_quantity: '', rack_location: '', is_returnable: false });
    setModalErr('');
  };
  const closeModal = () => { if (!saving) { setModal(null); setModalErr(''); } };

  const submitModal = async () => {
    setModalErr('');
    setSaving(true);
    try {
      if (modal.mode === 'edit') {
        const q = Number(qtyInput);
        if (Number.isNaN(q) || q < 0) throw new Error('Enter a quantity of 0 or more.');
        await inventoryService.editStock(modal.item.item_id, q);
      } else if (modal.mode === 'add') {
        const q = Number(qtyInput);
        if (!(q > 0)) throw new Error('Enter a quantity greater than 0.');
        await inventoryService.addStock(modal.item.item_id, q);
      } else if (modal.mode === 'new') {
        if (!newItem.category.trim() || !newItem.item_name.trim() || !newItem.unit.trim()) {
          throw new Error('Category, item name and unit are required.');
        }
        await inventoryService.addNewItem({
          ...newItem,
          current_quantity: Number(newItem.current_quantity || 0),
          is_returnable: !!newItem.is_returnable,
        });
      }
      setModal(null);
      await loadStock();
    } catch (err) {
      setModalErr(err?.response?.data?.message || err?.message || 'Action failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try { await authService.logout(); } finally { navigate('/auth/login', { replace: true }); }
  };

  const shown = stock.slice(0, RENDER_CAP);

  return (
    <div className="ic-root">
      {/* Header */}
      <div className="ic-header">
        <div className="ic-brand">
          <div className="ic-logo">
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9">
              <path d="M20 7l-8-4-8 4 8 4 8-4z" /><path d="M4 7v10l8 4 8-4V7" /><path d="M12 11v10" />
            </svg>
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="ic-title">Inventory Console <span className="ic-badge">Incharge</span></div>
            <div className="ic-sub">Manage stock & review requests</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="ic-userpill">
            <div className="ic-avatar">{initials}</div>
            <div className="ic-uname">{name}</div>
          </div>
          <button className="ic-dark" onClick={() => setDarkMode((d) => !d)}>{darkMode ? '☀ Light' : '🌙 Dark'}</button>
          <button className="ic-iconbtn" title="Logout" onClick={handleLogout}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 7V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-1" />
              <path d="M15 12H3" /><path d="M6 9l-3 3 3 3" />
            </svg>
          </button>
        </div>
      </div>

      <div className="ic-wrap">
        {/* Tabs */}
        <div className="ic-tabs">
          <button className={`ic-tab${tab === 'stock' ? ' active' : ''}`} onClick={() => setTab('stock')}>Stock Management</button>
          <button className={`ic-tab${tab === 'buying' ? ' active' : ''}`} onClick={() => setTab('buying')}>Buying Requests</button>
        </div>

        {tab === 'stock' ? (
          <>
            <div className="ic-toolbar">
              <input className="ic-search" placeholder="Search items by name…" value={search} onChange={(e) => onSearchChange(e.target.value)} />
              <select className="ic-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                <option value="">All Categories</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <button className="ic-btn ic-btn-primary" onClick={openNew}>+ Add New Item</button>
            </div>

            {stockError && <div className="ic-empty" style={{ color: 'var(--ic-red)' }}>{stockError}</div>}

            {stockLoading ? (
              <div className="ic-spinner" />
            ) : stock.length === 0 ? (
              <div className="ic-empty">No items found.</div>
            ) : (
              <>
                <div className="ic-count">
                  Showing {shown.length} of {stock.length} item{stock.length !== 1 ? 's' : ''}
                  {stock.length > RENDER_CAP ? ' · refine your search/category to narrow the list' : ''}
                </div>
                <div className="ic-card">
                  {shown.map((it) => (
                    <div className="ic-item" key={it.item_id}>
                      <div style={{ minWidth: 0 }}>
                        <div className="ic-item-name">{it.item_name}</div>
                        <div className="ic-item-meta">
                          {it.category}{it.subcategory ? ` · ${it.subcategory}` : ''}{it.sub_name ? ` · ${it.sub_name}` : ''}
                        </div>
                        {Number(it.is_returnable) === 1 && <span className="ic-tag ret">Returnable</span>}
                      </div>
                      <div className="ic-item-col-hide">
                        <span className="ic-qty">{money(it.current_quantity)}</span> <span className="ic-qty-unit">{it.unit || ''}</span>
                      </div>
                      <div className="ic-item-col-hide ic-rack">{it.rack_location || '—'}</div>
                      <div className="ic-actions">
                        <button className="ic-btn ic-btn-outline ic-btn-sm" onClick={() => openEdit(it)}>Edit qty</button>
                        <button className="ic-btn ic-btn-ghost ic-btn-sm" onClick={() => openAdd(it)}>Add stock</button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <>
            <div className="ic-note">
              <span>ⓘ</span> Read-only — buying requests are approved by <strong>Faculty</strong>. You cannot approve or reject them here.
            </div>
            {buyingLoading ? (
              <div className="ic-spinner" />
            ) : buying.length === 0 ? (
              <div className="ic-empty">No buying requests yet.</div>
            ) : (
              buying.map((r) => (
                <div className="ic-req" key={r.request_id}>
                  <div className="ic-req-top">
                    <div>
                      <div className="ic-req-name">{r.student_name || 'Student'}
                        <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--ic-text3)', marginLeft: 8 }}>{r.student_reg || ''}</span>
                      </div>
                      <div className="ic-req-meta">
                        Request #{r.request_id} · {fmtDateTime(r.created_at)}
                        {r.purpose_type ? <> · <span className="ic-pill type" style={{ padding: '1px 8px' }}>{r.purpose_type}</span></> : null}
                      </div>
                    </div>
                    <StatusPill status={r.status} />
                  </div>
                  <div className="ic-req-items">
                    {(r.items || []).map((it) => `${it.item_name} (${money(it.quantity)} ${it.unit || ''})`).join(' · ') || '—'}
                  </div>
                  {r.purpose && <div className="ic-req-meta" style={{ marginTop: 6 }}>Purpose: {r.purpose}</div>}
                </div>
              ))
            )}
          </>
        )}
      </div>

      {/* Action modal */}
      {modal && (
        <div className="ic-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="ic-modal">
            <div className="ic-modal-hd">
              <div className="ic-modal-title">
                {modal.mode === 'edit' ? 'Edit Quantity' : modal.mode === 'add' ? 'Add Stock' : 'Add New Item'}
              </div>
              <button className="ic-modal-x" onClick={closeModal}>×</button>
            </div>
            <div className="ic-modal-bd">
              {modal.mode !== 'new' && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 14, fontWeight: 800 }}>{modal.item.item_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--ic-text3)', fontWeight: 600, marginTop: 2 }}>
                    Current: {money(modal.item.current_quantity)} {modal.item.unit || ''}
                  </div>
                </div>
              )}

              {modal.mode === 'edit' && (
                <>
                  <label className="ic-label">New quantity ({modal.item.unit || 'units'})</label>
                  <input className="ic-input" type="number" min="0" step="any" value={qtyInput} onChange={(e) => setQtyInput(e.target.value)} autoFocus />
                </>
              )}
              {modal.mode === 'add' && (
                <>
                  <label className="ic-label">Quantity to add ({modal.item.unit || 'units'})</label>
                  <input className="ic-input" type="number" min="0" step="any" value={qtyInput} onChange={(e) => setQtyInput(e.target.value)} autoFocus />
                </>
              )}
              {modal.mode === 'new' && (
                <>
                  <label className="ic-label">Category *</label>
                  <input className="ic-input" list="ic-cats" value={newItem.category} onChange={(e) => setNewItem((s) => ({ ...s, category: e.target.value }))} placeholder="e.g. Chemicals" />
                  <datalist id="ic-cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
                  <label className="ic-label">Subcategory</label>
                  <input className="ic-input" value={newItem.subcategory} onChange={(e) => setNewItem((s) => ({ ...s, subcategory: e.target.value }))} placeholder="Optional" />
                  <label className="ic-label">Item name *</label>
                  <input className="ic-input" value={newItem.item_name} onChange={(e) => setNewItem((s) => ({ ...s, item_name: e.target.value }))} />
                  <label className="ic-label">Sub name</label>
                  <input className="ic-input" value={newItem.sub_name} onChange={(e) => setNewItem((s) => ({ ...s, sub_name: e.target.value }))} placeholder="Optional" />
                  <label className="ic-label">Unit *</label>
                  <input className="ic-input" value={newItem.unit} onChange={(e) => setNewItem((s) => ({ ...s, unit: e.target.value }))} placeholder="e.g. ML, G, Nos" />
                  <label className="ic-label">Initial quantity</label>
                  <input className="ic-input" type="number" min="0" step="any" value={newItem.current_quantity} onChange={(e) => setNewItem((s) => ({ ...s, current_quantity: e.target.value }))} placeholder="0" />
                  <label className="ic-label">Rack location</label>
                  <input className="ic-input" value={newItem.rack_location} onChange={(e) => setNewItem((s) => ({ ...s, rack_location: e.target.value }))} placeholder="Optional" />
                  <label className="ic-check">
                    <input type="checkbox" checked={newItem.is_returnable} onChange={(e) => setNewItem((s) => ({ ...s, is_returnable: e.target.checked }))} />
                    Returnable item (e.g. glassware)
                  </label>
                </>
              )}

              {modalErr && <div className="ic-hint">{modalErr}</div>}
              <button className="ic-btn ic-btn-primary" style={{ width: '100%' }} disabled={saving} onClick={submitModal}>
                {saving ? 'Saving…' : modal.mode === 'edit' ? 'Update Quantity' : modal.mode === 'add' ? 'Add Stock' : 'Create Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
