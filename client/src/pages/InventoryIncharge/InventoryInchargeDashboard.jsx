// InventoryInchargeDashboard.jsx — Inventory Incharge (role_id = 4) console.
// One function: stock management + a READ-ONLY view of buying requests.
// (Return approvals = Stage 5; faculty buying approvals = Stage 4 — see TODOs.)
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { authService } from '../../services/features/authService';
import { inventoryService } from '../../services/features/inventoryService';
// Dashboard styles moved from an injected <style> tag to a real stylesheet so
// Vite links them before first paint (no unstyled flash). CSS text unchanged.
import './InventoryInchargeDashboard.css';
// ===== WELCOME INTRO (removable: delete this line + the state block + the render block) =====
import WelcomeIntro from '../../components/WelcomeIntro';
// ===== END WELCOME INTRO =====

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

  // ===== WELCOME INTRO (removable: delete this block + the WelcomeIntro import + the render block) =====
  const [showIntro, setShowIntro] = useState(() => sessionStorage.getItem('pt_show_intro') === '1');
  const introFirstName = String(user?.name || '').trim().split(/\s+/)[0] || '';
  useEffect(() => { sessionStorage.removeItem('pt_show_intro'); }, []);
  const handleIntroDone = () => { sessionStorage.removeItem('pt_show_intro'); setShowIntro(false); };
  // ===== END WELCOME INTRO =====

  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('pt-dark') === '1');
  const [tab, setTab] = useState('stock'); // 'stock' | 'buying' | 'returns'

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

  // Return Approvals (incharge's exclusive area)
  const [returns, setReturns] = useState([]);
  const [returnsLoading, setReturnsLoading] = useState(false);
  const [returnsLoaded, setReturnsLoaded] = useState(false);
  const [retBusyId, setRetBusyId] = useState(null);
  const [retRowErr, setRetRowErr] = useState({});
  const [retRejectFor, setRetRejectFor] = useState(null);
  const [retRejectRemarks, setRetRejectRemarks] = useState('');

  // Action modal: { mode:'edit'|'add'|'new', item? }
  const [modal, setModal] = useState(null);
  const [qtyInput, setQtyInput] = useState('');
  const [newItem, setNewItem] = useState({ category: '', subcategory: '', item_name: '', sub_name: '', unit: '', current_quantity: '', rack_location: '', is_returnable: false });
  const [saving, setSaving] = useState(false);
  const [modalErr, setModalErr] = useState('');

  const debounceRef = useRef(null);

  // Dashboard CSS is now imported from ./InventoryInchargeDashboard.css (see top
  // of file), so it is present before first paint — no runtime <style> injection.

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

  const loadReturns = useCallback(async () => {
    setReturnsLoading(true);
    try {
      const res = await inventoryService.getPendingReturns();
      setReturns(res?.data?.items || []);
      setReturnsLoaded(true);
    } catch {
      setReturns([]);
      setReturnsLoaded(true);
    } finally {
      setReturnsLoading(false);
    }
  }, []);

  // Lazy-load buying / returns lists when their tab is first opened
  useEffect(() => {
    if (tab === 'buying' && !buyingLoaded) loadBuying();
    if (tab === 'returns' && !returnsLoaded) loadReturns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const approveReturn = async (id) => {
    setRetBusyId(id);
    setRetRowErr((m) => ({ ...m, [id]: '' }));
    try {
      await inventoryService.approveReturn(id);
      await loadReturns();
    } catch (err) {
      setRetRowErr((m) => ({ ...m, [id]: err?.response?.data?.message || 'Failed to approve return.' }));
    } finally {
      setRetBusyId(null);
    }
  };

  const doRejectReturn = async () => {
    const id = retRejectFor;
    setRetBusyId(id);
    setRetRowErr((m) => ({ ...m, [id]: '' }));
    try {
      await inventoryService.rejectReturn(id, retRejectRemarks.trim() || undefined);
      setRetRejectFor(null);
      setRetRejectRemarks('');
      await loadReturns();
    } catch (err) {
      setRetRowErr((m) => ({ ...m, [id]: err?.response?.data?.message || 'Failed to reject return.' }));
    } finally {
      setRetBusyId(null);
    }
  };

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
      {/* ===== WELCOME INTRO (removable: delete this block + the WelcomeIntro import + the state block) ===== */}
      {showIntro && <WelcomeIntro name={introFirstName} onDone={handleIntroDone} />}
      {/* ===== END WELCOME INTRO ===== */}

      {/* Header */}
      <div className="ic-header">
        <div className="ic-brand">
          <div className="ic-logo">
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9">
              <path d="M20 7l-8-4-8 4 8 4 8-4z" /><path d="M4 7v10l8 4 8-4V7" /><path d="M12 11v10" />
            </svg>
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="ic-title">Inventory Console</div>
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
          <button className={`ic-tab${tab === 'returns' ? ' active' : ''}`} onClick={() => setTab('returns')}>Return Approvals</button>
        </div>

        {tab === 'stock' && (
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
        )}

        {tab === 'buying' && (
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

        {tab === 'returns' && (
          <>
            <div className="ic-note" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.35)', color: '#047857' }}>
              <span>✓</span> Approve returns to add stock back (for returned quantities). Fully-completed items are cleared with no stock change.
            </div>
            {returnsLoading ? (
              <div className="ic-spinner" />
            ) : returns.length === 0 ? (
              <div className="ic-empty">No return requests yet.</div>
            ) : (
              returns.map((r) => {
                const isPending = String(r.status).toUpperCase() === 'PENDING';
                return (
                  <div className="ic-req" key={r.request_id}>
                    <div className="ic-req-top">
                      <div>
                        <div className="ic-req-name">{r.student_name || 'Student'}
                          <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--ic-text3)', marginLeft: 8 }}>{r.student_reg || ''}</span>
                        </div>
                        <div className="ic-req-meta">Return #{r.request_id} · {fmtDateTime(r.created_at)}</div>
                      </div>
                      <StatusPill status={r.status} />
                    </div>
                    <div className="ic-req-items">
                      {(r.items || []).map((it) => it.action === 'FULLY_COMPLETED'
                        ? `${it.item_name} — Fully completed`
                        : `${it.item_name} — Return ${money(it.return_quantity ?? it.quantity)} ${it.unit || ''}`
                      ).join(' · ') || '—'}
                    </div>
                    {isPending ? (
                      <div style={{ display: 'flex', gap: 9, marginTop: 12 }}>
                        <button disabled={retBusyId === r.request_id} onClick={() => approveReturn(r.request_id)}
                          style={{ flex: 1, padding: '10px 16px', border: 'none', borderRadius: 10, background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', fontSize: 13, fontWeight: 800, cursor: retBusyId === r.request_id ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: retBusyId === r.request_id ? 0.5 : 1 }}>
                          {retBusyId === r.request_id ? 'Working…' : '✓ Approve'}
                        </button>
                        <button disabled={retBusyId === r.request_id} onClick={() => { setRetRejectFor(r.request_id); setRetRejectRemarks(''); }}
                          style={{ flex: 1, padding: '10px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.09)', color: '#dc2626', border: '1.5px solid rgba(239,68,68,0.4)', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
                          ✕ Reject
                        </button>
                      </div>
                    ) : (
                      <div className="ic-req-meta" style={{ marginTop: 8 }}>
                        {String(r.status).toUpperCase() === 'APPROVED' ? 'Approved' : 'Rejected'}{r.decided_at ? ` · ${fmtDateTime(r.decided_at)}` : ''}{r.remarks ? ` · ${r.remarks}` : ''}
                      </div>
                    )}
                    {retRowErr[r.request_id] && <div style={{ marginTop: 8, fontSize: 12.5, color: 'var(--ic-red)', fontWeight: 800 }}>{retRowErr[r.request_id]}</div>}
                  </div>
                );
              })
            )}
          </>
        )}
      </div>

      {/* Return reject modal */}
      {retRejectFor != null && (
        <div className="ic-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget && retBusyId == null) setRetRejectFor(null); }}>
          <div className="ic-modal">
            <div className="ic-modal-hd">
              <div className="ic-modal-title">Reject Return #{retRejectFor}</div>
              <button className="ic-modal-x" onClick={() => retBusyId == null && setRetRejectFor(null)}>×</button>
            </div>
            <div className="ic-modal-bd">
              <label className="ic-label">Reason (optional) — the student's obligations reopen so they can resubmit</label>
              <input className="ic-input" value={retRejectRemarks} onChange={(e) => setRetRejectRemarks(e.target.value)} placeholder="Optional reason…" autoFocus />
              <button className="ic-btn ic-btn-primary" style={{ width: '100%', background: 'linear-gradient(135deg,#ef4444,#dc2626)', boxShadow: 'none' }} disabled={retBusyId != null} onClick={doRejectReturn}>
                {retBusyId != null ? 'Rejecting…' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

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
