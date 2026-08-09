// InventoryInchargeDashboard.jsx — Inventory Incharge (role_id = 4) console.
// One function: stock management + a READ-ONLY view of buying requests.
// (Return approvals = Stage 5; faculty buying approvals = Stage 4 — see TODOs.)
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { authService } from '../../services/features/authService';
import { inventoryService } from '../../services/features/inventoryService';
// Dashboard styles moved from an injected <style> tag to a real stylesheet so
// Vite links them before first paint (no unstyled flash). CSS text unchanged.
import './InventoryInchargeDashboard.css';
// ===== WELCOME INTRO (removable: delete this line + the state block + the render block) =====
import WelcomeIntro from '../../components/WelcomeIntro';
// ===== END WELCOME INTRO =====
// CONSUMPTION REPORT (removable)
import ConsumptionReportBar from '../../components/ConsumptionReportBar';

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

// ── RETURNABLE ITEMS — REMOVABLE ──
// Maps the server's status_label onto the pill variants this page defines.
// Amber = still with the holder, purple = awaiting a decision, green = came
// back, grey = discharged without coming back.
const RETURNABLE_PILL = {
  'Out': 'pending',
  'Partly returned': 'pending',
  'Return pending': 'type',
  'Returned': 'approved',
  'Consumed': 'inactive',
};

// Reminder email. The feed is flat (one row per item), so a person's outstanding
// rows are gathered first and rendered as one list.
const REMINDER_SUBJECT = 'Return of Inventory Items — Reminder';
// A Gmail compose URL carries the whole body as a query param. Browsers and
// Google both cap URL length, so a very long list is truncated rather than
// silently mangled — the count of what was dropped is spelled out.
const REMINDER_MAX_ITEMS = 20;

function buildReminderBody(personName, rows) {
  const shown = rows.slice(0, REMINDER_MAX_ITEMS);
  const lines = shown.map(
    (r) => `- ${r.item_name || 'Item'}: ${money(r.quantity)} ${r.unit || ''}`.trimEnd()
      + ` (taken on ${fmtDateTime(r.date)})`
  );
  if (rows.length > shown.length) lines.push(`…and ${rows.length - shown.length} more item(s).`);
  return [
    `Dear ${personName || 'Student'},`,
    '',
    'Our records show that the following inventory item(s) are still to be returned:',
    '',
    ...lines,
    '',
    'Kindly return these items at the inventory at your available time.',
    '',
    'Thank you.',
  ].join('\n');
}

// The signed-in Gmail account becomes the sender — nothing to pass for "from".
const gmailComposeUrl = (to, subject, body) =>
  'https://mail.google.com/mail/?view=cm&fs=1'
  + `&to=${encodeURIComponent(to || '')}`
  + `&su=${encodeURIComponent(subject)}`
  + `&body=${encodeURIComponent(body)}`;
// ── END RETURNABLE ITEMS ──

const RENDER_CAP = 250; // guard against rendering the whole 1455-item catalog at once

// ══ RETURNABLE ITEMS (reference popup) — REMOVABLE ══
// Returnable + still active. /inventory/stock returns inactive rows too, so the
// popup filters them out — it is a "what can be borrowed" reference.
const isReturnableItem = (it) => Number(it.is_returnable) === 1 && Number(it.is_active) !== 0;

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
  // Active tab lives in the URL (?tab=…) rather than in component state, so a
  // refresh — or a shared/bookmarked link — lands on the same tab instead of
  // snapping back to Stock Management. Same idiom PointsDashboard.jsx uses.
  // An unknown or absent value falls back to 'stock', so old links and a bare
  // URL both still work. The lazy-load effect below keys off `tab`, so it fires
  // on mount with the restored value and that tab's data loads as usual.
  const [searchParams, setSearchParams] = useSearchParams();
  const TAB_KEYS = ['stock', 'buying', 'returns', 'labpurchases', 'returnables'];
  const tabParam = searchParams.get('tab');
  const tab = TAB_KEYS.includes(tabParam) ? tabParam : 'stock';
  const setTab = useCallback((val) => {
    setSearchParams((prev) => { const p = new URLSearchParams(prev); p.set('tab', val); return p; });
  }, [setSearchParams]);

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

  // ── LAB PURCHASES (intern role 5) — read-only view, REMOVABLE ──
  const [labPurchases, setLabPurchases] = useState([]);
  const [labPurchasesLoading, setLabPurchasesLoading] = useState(false);
  const [labPurchasesLoaded, setLabPurchasesLoaded] = useState(false);
  // ── END LAB PURCHASES ──

  // ── RETURNABLE ITEMS (students + interns) — read-only view, REMOVABLE ──
  const [returnables, setReturnables] = useState([]);
  const [returnablesLoading, setReturnablesLoading] = useState(false);
  const [returnablesLoaded, setReturnablesLoaded] = useState(false);
  const [returnFilter, setReturnFilter] = useState('all');   // 'all' | 'outstanding'
  // Reminder popup: the person whose outstanding items are being shown, or null.
  const [emailPerson, setEmailPerson] = useState(null);
  const [emailCopied, setEmailCopied] = useState(false);
  // ── END RETURNABLE ITEMS ──

  // Return Approvals (incharge's exclusive area)
  const [returns, setReturns] = useState([]);
  const [returnsLoading, setReturnsLoading] = useState(false);
  const [returnsLoaded, setReturnsLoaded] = useState(false);
  const [retBusyId, setRetBusyId] = useState(null);
  const [retRowErr, setRetRowErr] = useState({});
  const [retRejectFor, setRetRejectFor] = useState(null);
  const [retRejectRemarks, setRetRejectRemarks] = useState('');

  // ══ RETURNABLE ITEMS (reference popup) — REMOVABLE BLOCK (start) ══
  const [retOpen, setRetOpen] = useState(false);
  const [retItems, setRetItems] = useState([]);
  const [retLoading, setRetLoading] = useState(false);
  const [retError, setRetError] = useState('');
  const [retSearch, setRetSearch] = useState('');   // in-popup filter, display only
  // ══ RETURNABLE ITEMS — REMOVABLE BLOCK (end) ══

  // Action modal: { mode:'editItem'|'add'|'new', item? }
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

  // ── LAB PURCHASES (intern role 5) — read-only view, REMOVABLE ──
  const loadLabPurchases = useCallback(async () => {
    setLabPurchasesLoading(true);
    try {
      const res = await inventoryService.getLabPurchasesFeed();
      setLabPurchases(res?.data?.items || []);
      setLabPurchasesLoaded(true);
    } catch {
      setLabPurchases([]);
      setLabPurchasesLoaded(true);
    } finally {
      setLabPurchasesLoading(false);
    }
  }, []);
  // ── END LAB PURCHASES ──

  // ── RETURNABLE ITEMS — read-only view, REMOVABLE ──
  // Merged student + lab-member returnable takings. The server already computes
  // status_label and the outstanding flag per row, so nothing is derived here.
  const loadReturnables = useCallback(async () => {
    setReturnablesLoading(true);
    try {
      const res = await inventoryService.getReturnableFeed();
      setReturnables(res?.data?.items || []);
      setReturnablesLoaded(true);
    } catch {
      setReturnables([]);
      setReturnablesLoaded(true);
    } finally {
      setReturnablesLoading(false);
    }
  }, []);
  // ── END RETURNABLE ITEMS ──

  // Lazy-load buying / returns lists when their tab is first opened
  useEffect(() => {
    if (tab === 'buying' && !buyingLoaded) loadBuying();
    if (tab === 'returns' && !returnsLoaded) loadReturns();
    if (tab === 'labpurchases' && !labPurchasesLoaded) loadLabPurchases();  // removable
    if (tab === 'returnables' && !returnablesLoaded) loadReturnables();     // removable
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

  // Full item edit — the same form as "Add New Item", pre-filled from the row.
  // Replaces the old qty-only "Edit qty": quantity is now just one field of it.
  // `item` is kept on the modal state so submit knows which id to PUT.
  const openEditItem = (item) => {
    setModal({ mode: 'editItem', item });
    setNewItem({
      category: item.category ?? '',
      subcategory: item.subcategory ?? '',
      item_name: item.item_name ?? '',
      sub_name: item.sub_name ?? '',
      unit: item.unit ?? '',
      current_quantity: String(item.current_quantity ?? ''),
      rack_location: item.rack_location ?? '',
      is_returnable: Number(item.is_returnable) === 1,
    });
    setModalErr('');
  };
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
      if (modal.mode === 'add') {
        const q = Number(qtyInput);
        if (!(q > 0)) throw new Error('Enter a quantity greater than 0.');
        await inventoryService.addStock(modal.item.item_id, q);
      } else {
        // 'new' and 'editItem' share the same form, validation and payload shape.
        if (!newItem.category.trim() || !newItem.item_name.trim() || !newItem.unit.trim()) {
          throw new Error('Category, item name and unit are required.');
        }
        const payload = {
          ...newItem,
          current_quantity: Number(newItem.current_quantity || 0),
          is_returnable: !!newItem.is_returnable,
        };
        if (modal.mode === 'editItem') {
          await inventoryService.updateItem(modal.item.item_id, payload);
        } else {
          await inventoryService.addNewItem(payload);
        }
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

  // ══ RETURNABLE ITEMS (reference popup) — REMOVABLE BLOCK (start) ══
  // Read-only; touches no stock/edit/add state. `stock` already holds the FULL
  // catalog (RENDER_CAP only caps what is *rendered*), so with no filter active
  // it can be filtered in place. With a category/search filter on, `stock` is a
  // subset — re-read the same /inventory/stock endpoint unfiltered so the popup
  // is always the complete returnable list.
  const openReturnable = async () => {
    setRetOpen(true); setRetError(''); setRetSearch('');
    if (!categoryFilter && !search && !stockLoading && stock.length > 0) {
      setRetItems(stock.filter(isReturnableItem)); return;
    }
    setRetLoading(true);
    try {
      const res = await inventoryService.getStock({ category: '', search: '' });
      setRetItems((res?.data?.items || []).filter(isReturnableItem));
    } catch { setRetError('Failed to load returnable items.'); setRetItems([]); }
    finally { setRetLoading(false); }
  };
  const closeReturnable = () => { setRetOpen(false); setRetSearch(''); };

  // Display-only filter over the already-loaded returnable list — `retItems`
  // (the complete set) is never mutated, so the count below can show both.
  const retQuery = retSearch.trim().toLowerCase();
  const retShown = retQuery
    ? retItems.filter((it) => `${it.item_name || ''} ${it.category || ''} ${it.subcategory || ''}`.toLowerCase().includes(retQuery))
    : retItems;
  // ══ RETURNABLE ITEMS — REMOVABLE BLOCK (end) ══

  // Unit suggestions for the Add/Edit form's datalist — the Category field offers
  // the same affordance, so Unit shouldn't make you retype "ML" from memory.
  // Read straight off the items already in state (no extra request); deduped
  // case-insensitively so ML/ml collapse to whichever spelling the catalog used
  // first. Still a free-type input: this is a hint list, never a constraint.
  const units = useMemo(() => {
    const seen = new Map();
    for (const it of stock) {
      const u = String(it.unit ?? '').trim();
      if (!u) continue;
      const key = u.toLowerCase();
      if (!seen.has(key)) seen.set(key, u);
    }
    return [...seen.values()].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [stock]);

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
          {/* BIT LOGO (removable) — public/bit-logo.png. BASE_URL keeps the path
              correct under the app's '/slot-matrix/' base (a bare '/bit-logo.png'
              404s). onError hides it so a missing file can't break the header. */}
          <img
            className="ic-bitlogo"
            src={`${import.meta.env.BASE_URL}bit-logo.png`}
            alt="BIT"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <div style={{ minWidth: 0 }}>
            <div className="ic-title">Inventory Console - Consumables Management</div>
            <div className="ic-sub">Manage stock & review requests</div>
          </div>
        </div>
        {/* Right cluster — classed (was an unclassed inline-styled div) so the
            stylesheet can hold it to a single control height and stop it
            shrinking before the title does. Contents unchanged. */}
        <div className="ic-hactions">
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
          <button className={`ic-tab${tab === 'buying' ? ' active' : ''}`} onClick={() => setTab('buying')}>Consumables Requests</button>
          <button className={`ic-tab${tab === 'returns' ? ' active' : ''}`} onClick={() => setTab('returns')}>Return Approvals</button>
          {/* LAB PURCHASES (intern role 5) — removable */}
          <button className={`ic-tab${tab === 'labpurchases' ? ' active' : ''}`} onClick={() => setTab('labpurchases')}>Lab Purchases</button>
          {/* RETURNABLE ITEMS — removable */}
          <button className={`ic-tab${tab === 'returnables' ? ' active' : ''}`} onClick={() => setTab('returnables')}>Returnable Items</button>
        </div>

        {tab === 'stock' && (
          <>
            <div className="ic-toolbar">
              <input className="ic-search" placeholder="Search items by name…" value={search} onChange={(e) => onSearchChange(e.target.value)} />
              <select className="ic-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                <option value="">All Categories</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              {/* RETURNABLE ITEMS (reference popup) — removable */}
              <button className="ic-btn ic-btn-outline ic-ret-btn" onClick={openReturnable} title="View all returnable items">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-15-6.7L3 13" />
                </svg>
                Returnable Items
              </button>
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
                        <button className="ic-btn ic-btn-outline ic-btn-sm" onClick={() => openEditItem(it)}>Edit</button>
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
            {/* CONSUMPTION REPORT (removable) */}
            <ConsumptionReportBar prefix="ic" />
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
                  {/* SELECT LAB + PROJECT GUIDE — both already returned by
                      listAllBuyingRequests; '—' covers rows predating the columns. */}
                  <div className="ic-req-meta" style={{ marginTop: 6 }}>
                    Lab: {r.lab_name || '—'} · Project Guide: {r.project_guide_name || '—'}
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

        {/* ══ LAB PURCHASES (intern role 5) — read-only, REMOVABLE (start) ══ */}
        {tab === 'labpurchases' && (
          <>
            <div className="ic-note">
              <span>ⓘ</span> Read-only — intern lab purchases are direct and already final. This is a view only.
            </div>
            {labPurchasesLoading ? (
              <div className="ic-spinner" />
            ) : labPurchases.length === 0 ? (
              <div className="ic-empty">No lab purchases yet.</div>
            ) : (
              labPurchases.map((p) => (
                <div className="ic-req" key={p.purchase_key || p.purchase_id}>
                  <div className="ic-req-top">
                    <div>
                      <div className="ic-req-name">{p.buyer_name || 'Intern'}
                        <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--ic-text3)', marginLeft: 8 }}>{p.lab_name || 'Unknown lab'}</span>
                      </div>
                      <div className="ic-req-meta">
                        {fmtDateTime(p.created_at)} · <span className="ic-pill type" style={{ padding: '1px 8px' }}>Direct purchase</span>
                      </div>
                    </div>
                  </div>
                  <div className="ic-req-items">
                    {(p.items || []).map((it) => `${it.item_name} (${money(it.quantity)} ${it.unit || ''})`).join(' · ') || '—'}
                  </div>
                  {/* LAB GUIDE + PURPOSE — cart-level on the grouped feed, so once
                      per card. '—' covers purchases predating the columns. */}
                  <div className="ic-req-meta" style={{ marginTop: 6 }}>
                    Lab Guide: {p.lab_guide_name || '—'} · Purpose: {p.purpose || '—'}
                  </div>
                </div>
              ))
            )}
          </>
        )}
        {/* ══ LAB PURCHASES — REMOVABLE (end) ══ */}

        {/* ══ RETURNABLE ITEMS — REMOVABLE (start) ══ */}
        {tab === 'returnables' && (() => {
          // Filter is presentation-only — the full feed stays in state, so
          // toggling never refetches. `outstanding` is computed server-side.
          const shown = returnFilter === 'outstanding' ? returnables.filter((r) => r.outstanding) : returnables;
          const outstandingCount = returnables.filter((r) => r.outstanding).length;

          // A person's outstanding rows, keyed by source+user_id. Built from the
          // FULL feed, not `shown`, so the reminder always lists everything they
          // still owe regardless of which filter is active. person_name /
          // person_ref are display strings (and person_ref means different things
          // per source), so person_user_id is the only safe key.
          const outstandingByPerson = new Map();
          for (const r of returnables) {
            if (!r.outstanding || r.person_user_id == null) continue;
            const key = `${r.source}-${r.person_user_id}`;
            let p = outstandingByPerson.get(key);
            if (!p) {
              p = { key, name: r.person_name, ref: r.person_ref, email: r.person_email, source: r.source, rows: [] };
              outstandingByPerson.set(key, p);
            }
            p.rows.push(r);
          }
          // The feed is flat, so one person can span several cards. The icon is
          // drawn on their FIRST card only — this set tracks who has had theirs.
          const iconDrawn = new Set();
          return (
            <>
              <div className="ic-note">
                <span>ⓘ</span> Read-only — returnable items taken by students and interns.
              </div>

              {/* Filter: All | Outstanding. Inline-styled rather than adding CSS —
                  two pills only, and they follow the page's theme variables. */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                {[
                  { key: 'all', label: `All (${returnables.length})` },
                  { key: 'outstanding', label: `Outstanding (${outstandingCount})` },
                ].map((f) => {
                  const on = returnFilter === f.key;
                  return (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setReturnFilter(f.key)}
                      style={{
                        padding: '6px 14px', borderRadius: 20, cursor: 'pointer',
                        fontSize: 12, fontWeight: 800, fontFamily: 'inherit',
                        border: `1px solid ${on ? 'var(--ic-purple)' : 'var(--ic-border)'}`,
                        background: on ? 'var(--ic-purple-dim)' : 'transparent',
                        color: on ? 'var(--ic-purple)' : 'var(--ic-text2)',
                      }}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>

              {returnablesLoading ? (
                <div className="ic-spinner" />
              ) : shown.length === 0 ? (
                <div className="ic-empty">
                  {returnables.length === 0 ? 'No returnable items yet.' : 'Nothing outstanding — everything has been returned.'}
                </div>
              ) : (
                <>
                  <div className="ic-count">
                    {shown.length} item{shown.length !== 1 ? 's' : ''}
                    {returnFilter === 'outstanding' ? ' still out' : ' (students + interns)'}
                  </div>
                  {shown.map((r) => {
                    // Icon appears once per person, on their first card, and only
                    // if they actually still owe something — nobody who has
                    // returned everything gets a reminder button.
                    const pKey = r.person_user_id != null ? `${r.source}-${r.person_user_id}` : null;
                    const person = pKey ? outstandingByPerson.get(pKey) : null;
                    const showIcon = !!person && !iconDrawn.has(pKey);
                    if (showIcon) iconDrawn.add(pKey);
                    return (
                    // id is only unique WITHIN a source (obligation_id vs
                    // purchase_id), so the key has to carry the source too.
                    <div className="ic-req" key={`${r.source}-${r.id}`}>
                      <div className="ic-req-top">
                        <div style={{ minWidth: 0 }}>
                          <div className="ic-req-name">{r.person_name || '—'}
                            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--ic-text3)', marginLeft: 8 }}>
                              {r.person_ref || '—'}
                            </span>
                          </div>
                          <div className="ic-req-meta">
                            {fmtDateTime(r.date)}
                            {r.lab_name ? ` · ${r.lab_name}` : ''} ·{' '}
                            <span className="ic-pill type" style={{ padding: '1px 8px' }}>
                              {r.source === 'STUDENT' ? 'Student' : 'Intern'}
                            </span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                          <span className={`ic-pill ${RETURNABLE_PILL[r.status_label] || 'pending'}`}>
                            {r.status_label}
                          </span>
                          {showIcon && (
                            <button
                              type="button"
                              onClick={() => { setEmailCopied(false); setEmailPerson(person); }}
                              disabled={!person.email}
                              title={person.email
                                ? `Send a return reminder to ${person.name || 'this person'}`
                                : 'No email on file'}
                              aria-label="Send return reminder"
                              style={{
                                width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: '1.5px solid var(--ic-border)', background: 'transparent',
                                color: person.email ? 'var(--ic-purple)' : 'var(--ic-text3)',
                                cursor: person.email ? 'pointer' : 'not-allowed',
                                opacity: person.email ? 1 : 0.5, fontFamily: 'inherit',
                              }}
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="ic-req-items">
                        {r.item_name || '—'} ({money(r.quantity)} {r.unit || ''})
                      </div>
                    </div>
                    );
                  })}
                </>
              )}
            </>
          );
        })()}
        {/* ══ RETURNABLE ITEMS — REMOVABLE (end) ══ */}
      </div>

      {/* ══ RETURNABLE ITEMS: reminder popup — REMOVABLE (start) ══ */}
      {emailPerson && (() => {
        const body = buildReminderBody(emailPerson.name, emailPerson.rows);
        return (
          <div className="ic-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setEmailPerson(null); }}>
            <div className="ic-modal" role="dialog" aria-modal="true" aria-label="Return reminder">
              <div className="ic-modal-hd">
                <div className="ic-modal-title">Return reminder</div>
                <button className="ic-modal-x" onClick={() => setEmailPerson(null)}>×</button>
              </div>
              <div className="ic-modal-bd">
                <div className="ic-req-name" style={{ marginBottom: 2 }}>
                  {emailPerson.name || '—'}
                  <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--ic-text3)', marginLeft: 8 }}>
                    {emailPerson.ref || '—'}
                  </span>
                </div>
                <div className="ic-req-meta" style={{ marginBottom: 14 }}>
                  {emailPerson.email || 'No email on file'} ·{' '}
                  <span className="ic-pill type" style={{ padding: '1px 8px' }}>
                    {emailPerson.source === 'STUDENT' ? 'Student' : 'Intern'}
                  </span>
                </div>

                <div className="ic-count">
                  {emailPerson.rows.length} outstanding item{emailPerson.rows.length !== 1 ? 's' : ''}
                </div>
                <div style={{ maxHeight: 240, overflowY: 'auto', marginBottom: 16 }}>
                  {emailPerson.rows.map((r) => (
                    <div
                      key={`${r.source}-${r.id}`}
                      style={{
                        display: 'flex', justifyContent: 'space-between', gap: 12,
                        padding: '9px 0', borderBottom: '1px solid var(--ic-border)', fontSize: 13,
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 800 }}>{r.item_name || '—'}</div>
                        <div className="ic-req-meta">{fmtDateTime(r.date)}</div>
                      </div>
                      <div style={{ fontWeight: 800, whiteSpace: 'nowrap', color: 'var(--ic-purple)' }}>
                        {money(r.quantity)} {r.unit || ''}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    className="ic-btn ic-btn-primary"
                    style={{ flex: 1, minWidth: 170 }}
                    disabled={!emailPerson.email}
                    title={emailPerson.email ? '' : 'No email on file'}
                    onClick={() => window.open(gmailComposeUrl(emailPerson.email, REMINDER_SUBJECT, body), '_blank', 'noopener,noreferrer')}
                  >
                    Send Gmail reminder
                  </button>
                  <button
                    className="ic-btn ic-btn-outline"
                    onClick={async () => {
                      // Clipboard needs a secure context; fall back silently to
                      // leaving the button unconfirmed rather than throwing.
                      try {
                        await navigator.clipboard.writeText(body);
                        setEmailCopied(true);
                        setTimeout(() => setEmailCopied(false), 2000);
                      } catch { /* ignore — user can still read the list above */ }
                    }}
                  >
                    {emailCopied ? '✓ Copied' : 'Copy details'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
      {/* ══ RETURNABLE ITEMS: reminder popup — REMOVABLE (end) ══ */}

      {/* ══ RETURNABLE ITEMS (reference popup) — REMOVABLE BLOCK (start) ══ */}
      {retOpen && (
        <div className="ic-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) closeReturnable(); }}>
          <div className="ic-modal ic-ret-modal" role="dialog" aria-modal="true" aria-label="Returnable items">
            <div className="ic-modal-hd">
              <div className="ic-modal-title">Returnable Items</div>
              <button className="ic-modal-x" onClick={closeReturnable}>×</button>
            </div>
            <div className="ic-modal-bd ic-ret-bd">
              {!retLoading && !retError && retItems.length > 0 && (
                <div className="ic-ret-search-wrap">
                  <input className="ic-input ic-ret-search" value={retSearch} autoFocus
                    onChange={(e) => setRetSearch(e.target.value)}
                    placeholder="Search returnable items…" />
                </div>
              )}
              {retLoading ? <div className="ic-spinner" />
                : retError ? <div className="ic-empty" style={{ color: 'var(--ic-red)' }}>{retError}</div>
                : retItems.length === 0 ? <div className="ic-empty">No returnable items.</div>
                : retShown.length === 0 ? <div className="ic-empty">No matching returnable items.</div> : (
                  <div className="ic-ret-scroll">
                    <div className="ic-ret-row head">
                      <div>Item Name</div>
                      <div className="ic-ret-hide">Category</div>
                      <div>Stock</div>
                      <div className="ic-ret-hide">Rack</div>
                    </div>
                    {retShown.map((it) => {
                      const cat = `${it.category || '—'}${it.subcategory ? ` · ${it.subcategory}` : ''}`;
                      return (
                        <div className="ic-ret-row" key={it.item_id}>
                          <div style={{ minWidth: 0 }}>
                            <div className="ic-ret-name">{it.item_name}</div>
                            <div className="ic-ret-meta">{cat}{it.rack_location ? ` · ${it.rack_location}` : ''}</div>
                          </div>
                          <div className="ic-ret-hide ic-ret-cat">{cat}</div>
                          <div><span className="ic-qty">{money(it.current_quantity)}</span> <span className="ic-qty-unit">{it.unit || ''}</span></div>
                          <div className="ic-ret-hide ic-rack">{it.rack_location || '—'}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              <div className="ic-ret-ft">
                <div className="ic-count" style={{ marginBottom: 0 }}>
                  {retLoading ? 'Loading…'
                    : retQuery ? `${retShown.length} of ${retItems.length} returnable item${retItems.length !== 1 ? 's' : ''}`
                    : `${retItems.length} returnable item${retItems.length !== 1 ? 's' : ''}`}
                </div>
                <button className="ic-btn ic-btn-outline" onClick={closeReturnable}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ══ RETURNABLE ITEMS — REMOVABLE BLOCK (end) ══ */}

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
                {modal.mode === 'add' ? 'Add Stock' : modal.mode === 'editItem' ? 'Edit Item' : 'Add New Item'}
              </div>
              <button className="ic-modal-x" onClick={closeModal}>×</button>
            </div>
            <div className="ic-modal-bd">
              {/* 'editItem' shows the item's identity through the form itself, so this
                  name/current-qty header is only needed for the quantity-only Add stock. */}
              {modal.mode === 'add' && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 14, fontWeight: 800 }}>{modal.item.item_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--ic-text3)', fontWeight: 600, marginTop: 2 }}>
                    Current: {money(modal.item.current_quantity)} {modal.item.unit || ''}
                  </div>
                </div>
              )}

              {modal.mode === 'add' && (
                <>
                  <label className="ic-label">Quantity to add ({modal.item.unit || 'units'})</label>
                  <input className="ic-input" type="number" min="0" step="any" value={qtyInput} onChange={(e) => setQtyInput(e.target.value)} autoFocus />
                </>
              )}
              {/* Same field block for both 'new' and 'editItem' — only the labels differ. */}
              {modal.mode !== 'add' && (
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
                  <input className="ic-input" list="ic-units" value={newItem.unit} onChange={(e) => setNewItem((s) => ({ ...s, unit: e.target.value }))} placeholder="e.g. ML, G, Nos" />
                  <datalist id="ic-units">{units.map((u) => <option key={u} value={u} />)}</datalist>
                  <label className="ic-label">{modal.mode === 'editItem' ? 'Current quantity' : 'Initial quantity'}</label>
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
                {saving ? 'Saving…' : modal.mode === 'add' ? 'Add Stock' : modal.mode === 'editItem' ? 'Save Changes' : 'Create Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
