// InternDashboard.jsx — Intern / Lab Technician (role_id = 5) console.
// Two TABS in one route (`tab`), the first holding the original two views (`view`):
//   'purchases' tab
//     'labs' → grid of active lab cards, each with its 5 most recent purchases
//     'buy'  → the buying UI (category → item → qty → cart → submit) for one lab
//   'returns' tab → INTERN LAB RETURNS (removable): the intern's own past
//     purchases that still have something left to return, one card each.
// The buy UI mirrors the student page (InventoryRequest.jsx) MINUS the Returning
// tab and the Purpose/Project-Training selector — an intern buy is direct, with
// no request and no approval. Submitting POSTs /inventory/lab-purchase, which
// takes min(requested, available) per item and reports FULL / PARTIAL /
// OUT_OF_STOCK back for the summary popup.
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, MotionConfig, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { authService } from '../../services/features/authService';
import { inventoryService } from '../../services/features/inventoryService';
// ===== WELCOME INTRO (removable: delete this import + the showIntro state + the render block) =====
import WelcomeIntro from '../../components/WelcomeIntro';
import './InternDashboard.css';

const money = (n) => Number(n ?? 0).toLocaleString();

// ── UI MOTION (presentation only) ──────────────────────────────
// Shared framer-motion presets. They animate opacity/transform and nothing else:
// no handler, prop, condition or piece of state below changes because of them.
// The stylesheet deliberately leaves `transform` alone on every element listed
// here — framer writes it inline, so a CSS hover transform would be dead code.
const EASE = [0.22, 0.61, 0.36, 1];

// Grid → children: fade+rise one after the other.
const gridStagger = { hidden: {}, show: { transition: { staggerChildren: 0.055, delayChildren: 0.04 } } };
const cardRise = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: EASE } },
};
const labHover = { y: -5, transition: { duration: 0.2, ease: EASE } };
const retHover = { y: -3, transition: { duration: 0.2, ease: EASE } };

// Index-based delay rather than a variants container, for rows that mount after
// their data resolves (buy-view panels, cart rows) — the delay staggers them
// predictably no matter when they appear. Same helper as the student page.
const rise = (i = 0) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.26, ease: EASE, delay: Math.min(i, 6) * 0.045 },
});

// Whole-view swap (tab / labs↔buy). Entrance only — an exit animation would need
// AnimatePresence around the conditionals, which is exactly the kind of
// restructuring this pass avoids.
const viewFade = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.22, ease: EASE },
};
const overlayFade = { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.16 } };
const modalPop = {
  initial: { opacity: 0, y: 10, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0.24, ease: EASE },
};

// ── PURCHASE SUCCESS ANIMATION (presentation only) ─────────────
// Mirrors the student page's cover (InventoryRequest.jsx) so both flows
// celebrate identically. How long it holds before the summary popup takes over.
const SUCCESS_MS = 2500;

// Beat sheet, all inside SUCCESS_MS: cover fades in (0.00–0.24) → badge pops (0.12)
// → glow rings pulse (0.30 on, twice) → tick draws (0.46–0.86) → copy slides up
// (0.88–1.20) → hold → cover fades out.
const succBadgePop = {
  initial: { scale: 0.25, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  transition: { type: 'spring', stiffness: 380, damping: 14, mass: 0.8, delay: 0.12 },
};
// Tick: framer draws the stroke (pathLength 0 → 1) once the disc has landed.
const succCheckDraw = {
  initial: { pathLength: 0, opacity: 0 },
  animate: { pathLength: 1, opacity: 1 },
  transition: { pathLength: { duration: 0.4, ease: EASE, delay: 0.46 }, opacity: { duration: 0.01, delay: 0.46 } },
};
// Reduced-motion counterpart: the tick is simply already drawn. pathLength runs in
// JS, so neither the CSS media block nor MotionConfig would flatten it on its own.
const succCheckStatic = { initial: { pathLength: 1, opacity: 1 }, animate: { pathLength: 1, opacity: 1 } };
// Copy: slides up and fades in a beat after the tick finishes.
const succCopyRise = (delay) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.42, ease: EASE, delay },
});

// Read the OS preference at mount. The CSS media block covers the keyframe layers;
// this is only for the framer animations it cannot reach.
const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Three glow rings, staggered behind the badge.
const GLOW_DELAYS = ['0.30s', '0.52s', '0.74s'];

function fmtDateTime(d) {
  const dt = d ? new Date(d) : new Date();
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const RECENT_LIMIT = 5;

// ── LAB PHOTO (removable) ──────────────────────────────────────
// Mirrors resolveSkillImageUrl in TrainingSlots.jsx: an absolute http(s) URL is
// used as-is, a server-relative path is prefixed with the API origin. Returns
// null when unset so the caller renders a placeholder instead of a broken <img>.
const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/?api\/?$/, '');
function resolveLabImageUrl(imageUrl) {
  const raw = String(imageUrl ?? '').trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('/')) return `${API_ORIGIN}${raw}`;
  return `${API_ORIGIN}/${raw}`;
}

// Neutral block shown when a lab has no photo, or when the URL fails to load.
function LabPhotoFallback({ className }) {
  return (
    <div className={className} data-placeholder="1">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
      </svg>
    </div>
  );
}

// <img> that swaps itself for the placeholder if the URL 404s / is blocked.
function LabPhoto({ src, alt, imgClass, fallbackClass }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <LabPhotoFallback className={fallbackClass} />;
  return <img className={imgClass} src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />;
}
// ── END LAB PHOTO ──────────────────────────────────────────────

// FULL → green, PARTIAL → amber, OUT_OF_STOCK → red.
function ResultBadge({ status }) {
  const s = String(status || '').toUpperCase();
  const cls = s === 'FULL' ? 'full' : s === 'PARTIAL' ? 'partial' : 'out';
  const label = s === 'OUT_OF_STOCK' ? 'Out of stock' : s === 'PARTIAL' ? 'Partial' : 'Full';
  return <span className={`in-badge ${cls}`}>{label}</span>;
}

export default function InternDashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const name = user?.name || 'Intern';
  const initials = String(name).trim().charAt(0).toUpperCase() || 'I';

  // ===== WELCOME INTRO (removable: delete this block + the WelcomeIntro import + the render block) =====
  // Show the intro ONLY right after a real login. Login.jsx sets 'pt_show_intro'
  // on a successful sign-in; we read it once, then clear it immediately so a
  // refresh / re-navigation / fresh tab never replays it (until the next login).
  const [showIntro, setShowIntro] = useState(() => sessionStorage.getItem('pt_show_intro') === '1');
  const introFirstName = String(user?.name || '').trim().split(/\s+/)[0] || '';
  useEffect(() => { sessionStorage.removeItem('pt_show_intro'); }, []);
  const handleIntroDone = () => { sessionStorage.removeItem('pt_show_intro'); setShowIntro(false); };
  // ===== END WELCOME INTRO =====

  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('pt-dark') === '1');
  const [tab, setTab] = useState('purchases');     // 'purchases' | 'returns'  (INTERN LAB RETURNS — removable)
  const [view, setView] = useState('labs');        // 'labs' | 'buy'  (within the 'purchases' tab)
  const [activeLab, setActiveLab] = useState(null); // { lab_id, lab_name }

  // ── Labs + their recent purchases ──
  const [labs, setLabs] = useState([]);
  const [labsLoading, setLabsLoading] = useState(true);
  const [labsError, setLabsError] = useState('');
  const [recent, setRecent] = useState({});         // { [lab_id]: [purchase, ...] }

  // ── Full-log modal ──
  const [logModal, setLogModal] = useState(null);   // { lab, items, loading }

  // ── Buy view: catalog / cart ──
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [quantity, setQuantity] = useState('');
  const [addErr, setAddErr] = useState('');
  const [cart, setCart] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState('');
  const [result, setResult] = useState(null);       // purchase response → summary popup
  // Success celebration: sits between "purchase succeeded" and the summary popup.
  // The response waits in the ref for SUCCESS_MS, then goes into `result`.
  const [showPurchaseSuccess, setShowPurchaseSuccess] = useState(false);
  const pendingResultRef = useRef(null);
  const successTimerRef = useRef(null);
  // Read once on mount — only the tick draw needs it (see succCheckStatic).
  const [reducedMotion] = useState(prefersReducedMotion);

  // ── INTERN LAB RETURNS (removable): Returns tab state ──
  const [returnables, setReturnables] = useState([]);      // returnable past purchases
  const [retLoading, setRetLoading] = useState(false);
  const [retError, setRetError] = useState('');
  const [retQty, setRetQty] = useState({});                // { [purchase_id]: '4' }
  const [retErr, setRetErr] = useState({});                // { [purchase_id]: 'message' }
  const [retBusy, setRetBusy] = useState(null);            // purchase_id of the in-flight return
  const [toast, setToast] = useState('');

  useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode);
    localStorage.setItem('pt-dark', darkMode ? '1' : '0');
  }, [darkMode]);

  // Drop the celebration timer if the page unmounts mid-animation.
  useEffect(() => () => clearTimeout(successTimerRef.current), []);

  // ── INTERN LAB RETURNS (removable) ──
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3600);
    return () => clearTimeout(t);
  }, [toast]);

  // The intern's own returnable purchases. Re-fetched on every entry to the tab
  // (and after each return) — remaining quantities go stale as soon as anything
  // is bought or returned, so caching would only show wrong caps.
  const loadReturnables = useCallback(async () => {
    setRetLoading(true); setRetError('');
    try {
      const res = await inventoryService.getMyReturnablePurchases();
      setReturnables(res?.data?.items || []);
    } catch {
      setRetError('Failed to load your returnable purchases.'); setReturnables([]);
    } finally { setRetLoading(false); }
  }, []);

  useEffect(() => { if (tab === 'returns') loadReturnables(); }, [tab, loadReturnables]);

  // Return some/all of ONE past purchase. The client cap below is only a guard
  // rail for typos — the server re-checks ownership and the remaining quantity
  // inside its transaction, so a stale list can never over-return.
  const submitReturn = async (p) => {
    const id = p.purchase_id;
    const remaining = Number(p.remaining_returnable);
    const qty = Number(retQty[id]);

    setRetErr((m) => ({ ...m, [id]: '' }));
    if (!(qty > 0)) { setRetErr((m) => ({ ...m, [id]: 'Enter a quantity greater than 0.' })); return; }
    if (qty > remaining) {
      setRetErr((m) => ({ ...m, [id]: `You can only return up to ${money(remaining)} ${p.unit || ''}.`.trim() }));
      return;
    }

    setRetBusy(id);
    try {
      const res = await inventoryService.submitLabReturn(id, qty);
      const d = res?.data || {};
      setToast(
        `Returned ${money(d.returned ?? qty)} ${p.unit || ''} of ${p.item_name} — ${money(d.remaining_after ?? 0)} remaining`
          .replace(/\s+/g, ' ')
      );
      setRetQty((m) => ({ ...m, [id]: '' }));
      await loadReturnables();   // remaining drops; a fully-returned purchase disappears
    } catch (err) {
      setRetErr((m) => ({ ...m, [id]: err?.response?.data?.message || 'Failed to record the return. Please try again.' }));
    } finally { setRetBusy(null); }
  };

  // Recent purchases for ONE lab (used on load and after a purchase).
  const loadRecent = useCallback(async (labId) => {
    try {
      const res = await inventoryService.getLabPurchases(labId, RECENT_LIMIT);
      setRecent((m) => ({ ...m, [labId]: res?.data?.items || [] }));
    } catch {
      setRecent((m) => ({ ...m, [labId]: [] }));
    }
  }, []);

  const loadLabs = useCallback(async () => {
    setLabsLoading(true); setLabsError('');
    try {
      const res = await inventoryService.getLabs(1); // active labs only
      const list = res?.data?.items || [];
      setLabs(list);
      // Fetch each lab's recent purchases in parallel; one failure can't break the grid.
      await Promise.all(list.map((l) => loadRecent(l.lab_id)));
    } catch {
      setLabsError('Failed to load labs.'); setLabs([]);
    } finally { setLabsLoading(false); }
  }, [loadRecent]);

  useEffect(() => { loadLabs(); }, [loadLabs]);

  // Categories load once, on first entry to the buy view.
  useEffect(() => {
    if (view !== 'buy' || categories.length) return;
    (async () => {
      try {
        const res = await inventoryService.getCategories();
        setCategories((res?.data?.items || []).map((r) => r.category));
      } catch { setCategories([]); }
    })();
  }, [view, categories.length]);

  // Items follow the selected category.
  useEffect(() => {
    if (!selectedCategory) { setItems([]); setSelectedItemId(''); setItemSearch(''); return; }
    let ignore = false;
    setItemsLoading(true);
    (async () => {
      try {
        const res = await inventoryService.getItems(selectedCategory);
        if (!ignore) setItems(res?.data?.items || []);
      } catch {
        if (!ignore) setItems([]);
      } finally {
        if (!ignore) setItemsLoading(false);
      }
    })();
    setSelectedItemId('');
    setItemSearch('');
    return () => { ignore = true; };
  }, [selectedCategory]);

  const selectedItem = items.find((it) => String(it.item_id) === String(selectedItemId)) || null;
  const itemQuery = itemSearch.trim().toLowerCase();
  const filteredItems = itemQuery
    ? items.filter((it) =>
        (it.item_name || '').toLowerCase().includes(itemQuery) ||
        (it.sub_name || '').toLowerCase().includes(itemQuery))
    : items;

  const openBuy = (lab) => {
    setActiveLab({ lab_id: lab.lab_id, lab_name: lab.lab_name, image_url: lab.image_url ?? null });
    setCart([]); setSelectedCategory(''); setSelectedItemId('');
    setQuantity(''); setAddErr(''); setSubmitErr(''); setResult(null);
    setView('buy');
  };

  const backToLabs = () => { setView('labs'); setActiveLab(null); };

  // NOTE: unlike the student cart, an over-stock quantity is ALLOWED here — the
  // server takes what it can and reports PARTIAL. We only warn.
  const addToCart = () => {
    setAddErr('');
    if (!selectedItem) { setAddErr('Select an item first.'); return; }
    const qty = Number(quantity);
    if (!(qty > 0)) { setAddErr('Enter a quantity greater than 0.'); return; }

    setCart((prev) => {
      const idx = prev.findIndex((c) => c.item_id === selectedItem.item_id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: Number(next[idx].quantity) + qty };
        return next;
      }
      return [...prev, {
        item_id: selectedItem.item_id,
        item_name: selectedItem.item_name,
        unit: selectedItem.unit || '',
        quantity: qty,
        available: Number(selectedItem.current_quantity ?? 0),
      }];
    });
    setQuantity('');
    setSelectedItemId('');
  };

  const removeFromCart = (itemId) => setCart((prev) => prev.filter((c) => c.item_id !== itemId));

  const shortCart = cart.filter((c) => Number(c.quantity) > Number(c.available));
  const canSubmit = cart.length > 0 && !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitErr(''); setSubmitting(true);
    try {
      const res = await inventoryService.createLabPurchase({
        lab_id: activeLab.lab_id,
        items: cart.map((c) => ({ item_id: c.item_id, quantity: c.quantity })),
      });
      // Celebrate first, then hand the (unchanged) summary popup its data. Only
      // reached on success — a failed purchase throws straight to the catch below.
      pendingResultRef.current = res?.data || null;
      setShowPurchaseSuccess(true);
      clearTimeout(successTimerRef.current);
      successTimerRef.current = setTimeout(() => {
        setShowPurchaseSuccess(false);
        setResult(pendingResultRef.current);
        pendingResultRef.current = null;
      }, SUCCESS_MS);
    } catch (err) {
      setSubmitErr(err?.response?.data?.message || 'Failed to record the purchase. Please try again.');
    } finally { setSubmitting(false); }
  };

  // Closing the summary clears the cart and refreshes that lab's recent log.
  const closeResult = async () => {
    const labId = activeLab?.lab_id;
    setResult(null);
    setCart([]);
    setSelectedItemId(''); setQuantity('');
    if (labId) {
      await loadRecent(labId);
      // Re-pull the item list so the on-screen availability reflects the purchase.
      if (selectedCategory) {
        try {
          const res = await inventoryService.getItems(selectedCategory);
          setItems(res?.data?.items || []);
        } catch { /* non-fatal */ }
      }
    }
  };

  const openFullLog = async (lab) => {
    setLogModal({ lab, items: [], loading: true });
    try {
      const res = await inventoryService.getLabPurchases(lab.lab_id, 'all');
      setLogModal({ lab, items: res?.data?.items || [], loading: false });
    } catch {
      setLogModal({ lab, items: [], loading: false });
    }
  };

  const handleLogout = async () => {
    try { await authService.logout(); } finally { navigate('/auth/login', { replace: true }); }
  };

  return (
    // reducedMotion="user" makes framer honour the OS "reduce motion" setting,
    // mirroring the @media (prefers-reduced-motion) block in the stylesheet.
    // MotionConfig is a context provider — it renders no DOM of its own.
    <MotionConfig reducedMotion="user">
    <div className="in-root">
      {/* ===== WELCOME INTRO (removable: delete this block + the WelcomeIntro import + the state block) ===== */}
      {showIntro && <WelcomeIntro name={introFirstName} onDone={handleIntroDone} />}
      {/* ===== END WELCOME INTRO ===== */}

      {/* Header */}
      <div className="in-header">
        <div className="in-brand">
          {tab === 'purchases' && view === 'buy' && <button className="in-back" onClick={backToLabs}>← Labs</button>}
          <div className="in-logo">
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9">
              <path d="M20 7l-8-4-8 4 8 4 8-4z" /><path d="M4 7v10l8 4 8-4V7" /><path d="M12 11v10" />
            </svg>
          </div>
          <div style={{ minWidth: 0 }}>
            {/* Title follows the active tab (INTERN LAB RETURNS — removable). */}
            <div className="in-title">{tab === 'returns' ? 'Returns' : 'Lab Purchases'}</div>
            <div className="in-sub">
              {tab === 'returns' ? 'Return items from your past purchases' : 'Buy items directly for your lab'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="in-userpill">
            <div className="in-avatar">{initials}</div>
            <div className="in-uname">{name}</div>
          </div>
          <button className="in-dark" onClick={() => setDarkMode((d) => !d)}>{darkMode ? '☀ Light' : '🌙 Dark'}</button>
          <button className="in-iconbtn" title="Logout" onClick={handleLogout}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 7V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-1" />
              <path d="M15 12H3" /><path d="M6 9l-3 3 3 3" />
            </svg>
          </button>
        </div>
      </div>

      <div className="in-wrap">
        {/* ══ TAB STRIP (INTERN LAB RETURNS — removable) ══ */}
        <div className="in-tabs">
          <button className={`in-tab${tab === 'purchases' ? ' active' : ''}`} onClick={() => setTab('purchases')}>
            Lab Purchases
          </button>
          <button className={`in-tab${tab === 'returns' ? ' active' : ''}`} onClick={() => setTab('returns')}>
            Returns
          </button>
        </div>

        {/* ══ LAB CARDS ══ */}
        {tab === 'purchases' && view === 'labs' && (
          <motion.div {...viewFade}>
            <div className="in-page-title">Select a lab</div>
            <div className="in-page-sub">Choose the lab you're buying for. Each card shows its most recent purchases.</div>

            {labsError && <div className="in-empty" style={{ color: 'var(--in-red)' }}>{labsError}</div>}
            {labsLoading ? <div className="in-spinner" /> : labs.length === 0 ? (
              <div className="in-empty">No active labs yet. Ask an admin to add one.</div>
            ) : (
              <motion.div className="in-labs" variants={gridStagger} initial="hidden" animate="show">
                {labs.map((lab) => {
                  const log = recent[lab.lab_id];
                  return (
                    <motion.div className="in-lab" key={lab.lab_id} variants={cardRise} whileHover={labHover}>
                      <button type="button" className="in-lab-body" onClick={() => openBuy(lab)}>
                        {/* LAB PHOTO (removable) */}
                        <LabPhoto
                          src={resolveLabImageUrl(lab.image_url)}
                          alt={lab.lab_name}
                          imgClass="in-lab-photo"
                          fallbackClass="in-lab-photo in-lab-photo-empty"
                        />
                        <div className="in-lab-name">{lab.lab_name}</div>
                        {lab.lab_code && <div className="in-lab-code">{lab.lab_code}</div>}
                        <div className="in-lab-meta">
                          {lab.in_charge ? <>In charge: {lab.in_charge}<br /></> : null}
                          {lab.room_no ? <>Room: {lab.room_no}</> : null}
                          {!lab.in_charge && !lab.room_no ? 'No additional details' : null}
                        </div>
                        <div className="in-lab-cta">Buy items for this lab →</div>
                      </button>

                      <div className="in-lab-log">
                        <div className="in-log-head">
                          <span className="in-log-title">Recent purchases</span>
                          <button className="in-log-link" onClick={() => openFullLog(lab)}>View full log</button>
                        </div>
                        {log === undefined ? (
                          <div className="in-log-empty">Loading…</div>
                        ) : log.length === 0 ? (
                          <div className="in-log-empty">No purchases yet.</div>
                        ) : (
                          log.map((p) => (
                            <div className="in-log-row" key={p.purchase_id}>
                              <div style={{ minWidth: 0 }}>
                                <div className="in-log-item">{p.item_name}</div>
                                <div className="in-log-by">{p.buyer_name || '—'} · {fmtDateTime(p.created_at)}</div>
                              </div>
                              <div className="in-log-qty">{money(p.quantity)} {p.unit || ''}</div>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ══ BUY VIEW ══ */}
        {tab === 'purchases' && view === 'buy' && activeLab && (
          <motion.div {...viewFade}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
              {/* LAB PHOTO (removable) */}
              <LabPhoto
                src={resolveLabImageUrl(activeLab.image_url)}
                alt={activeLab.lab_name}
                imgClass="in-labthumb"
                fallbackClass="in-labthumb in-labthumb-empty"
              />
              <span className="in-labchip">Purchasing for: {activeLab.lab_name}</span>
            </div>

            <div className="in-grid">
              {/* LEFT: picker */}
              <motion.div {...rise(0)}>
                <div className="in-card">
                  <div className="in-card-title">Add items</div>
                  <div className="in-card-sub">Pick a category, choose an item, set the quantity, then add it to your cart.</div>

                  <label className="in-field-label">Category</label>
                  <select className="in-select" value={selectedCategory} style={{ marginBottom: 16 }}
                    onChange={(e) => setSelectedCategory(e.target.value)}>
                    <option value="">Select a category…</option>
                    {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>

                  <label className="in-field-label">Item</label>
                  <input className="in-input" type="text" style={{ marginBottom: 8 }}
                    placeholder={itemsLoading ? 'Loading items…' : selectedCategory ? 'Search items by name…' : 'Choose a category first'}
                    value={itemSearch} onChange={(e) => setItemSearch(e.target.value)}
                    disabled={!selectedCategory || itemsLoading} />
                  <div className="in-item-list" style={{ marginBottom: 6 }}>
                    {!selectedCategory ? (
                      <div className="in-item-empty">Choose a category first.</div>
                    ) : itemsLoading ? (
                      <div className="in-item-empty">Loading items…</div>
                    ) : filteredItems.length === 0 ? (
                      <div className="in-item-empty">No items found.</div>
                    ) : (
                      filteredItems.map((it) => (
                        <button type="button" key={it.item_id}
                          className={`in-item-row${String(it.item_id) === String(selectedItemId) ? ' sel' : ''}`}
                          onClick={() => setSelectedItemId(String(it.item_id))}>
                          <span className="in-item-name">{it.item_name}</span>
                          <span className="in-item-avail">{money(it.current_quantity)} {it.unit || ''} available</span>
                        </button>
                      ))
                    )}
                  </div>
                  {selectedCategory && !itemsLoading && filteredItems.length > 0 && (
                    <div className="in-item-count" style={{ marginBottom: 16 }}>
                      {itemQuery ? `${filteredItems.length} of ${items.length} items` : `${items.length} items`}
                    </div>
                  )}

                  <label className="in-field-label">Quantity</label>
                  <div className="in-row2">
                    <input className="in-input" type="number" min="0" step="any" placeholder="e.g. 10"
                      value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                    <div className="in-unit-chip">{selectedItem?.unit || '—'}</div>
                    <button className="in-btn in-btn-ghost" style={{ width: 'auto', padding: '11px 18px', whiteSpace: 'nowrap' }}
                      onClick={addToCart}>+ Add</button>
                  </div>
                  {addErr && <div className="in-hint">{addErr}</div>}
                </div>
              </motion.div>

              {/* RIGHT: cart + submit */}
              <motion.div className="in-card" {...rise(1)}>
                <div className="in-card-title">Your Cart <span style={{ color: 'var(--in-purple)' }}>({cart.length})</span></div>
                <div className="in-card-sub">Items to buy for {activeLab.lab_name}.</div>
                {cart.length === 0 ? (
                  <div className="in-empty">No items yet — add items from the left.</div>
                ) : (
                  <>
                    {cart.map((c, i) => (
                      <motion.div className="in-cart-row" key={c.item_id} {...rise(i)}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="in-cart-name">{c.item_name}</div>
                          {Number(c.quantity) > Number(c.available) && (
                            <div className="in-log-by in-stockwarn">
                              only {money(c.available)} in stock
                            </div>
                          )}
                        </div>
                        <div className="in-cart-qty">{money(c.quantity)} {c.unit}</div>
                        <button className="in-cart-x" title="Remove" onClick={() => removeFromCart(c.item_id)}>×</button>
                      </motion.div>
                    ))}
                    {shortCart.length > 0 && (
                      <div className="in-warn">
                        {shortCart.length} item{shortCart.length !== 1 ? 's' : ''} exceed{shortCart.length === 1 ? 's' : ''} current stock — you'll receive what's available.
                      </div>
                    )}
                    <button className="in-btn in-btn-primary" style={{ marginTop: 14 }} disabled={!canSubmit} onClick={submit}>
                      {submitting ? 'Purchasing…' : `Confirm Purchase (${cart.length})`}
                    </button>
                    {submitErr && <div className="in-hint">{submitErr}</div>}
                  </>
                )}
              </motion.div>
            </div>
          </motion.div>
        )}
        {/* ══ RETURNS VIEW (INTERN LAB RETURNS — removable) ══ */}
        {tab === 'returns' && (
          <motion.div {...viewFade}>
            <div className="in-page-title">Return items</div>
            <div className="in-page-sub">
              Your past purchases that still have something left to return. Returning puts the stock straight
              back into the shared pool — no approval needed.
            </div>

            {retError && <div className="in-empty" style={{ color: 'var(--in-red)' }}>{retError}</div>}
            {retLoading ? <div className="in-spinner" /> : returnables.length === 0 ? (
              <div className="in-empty">You have no items to return.</div>
            ) : (
              <motion.div className="in-rets" variants={gridStagger} initial="hidden" animate="show">
                {returnables.map((p) => {
                  const remaining = Number(p.remaining_returnable);
                  const typed = Number(retQty[p.purchase_id]);
                  const over = typed > remaining;
                  const busy = retBusy === p.purchase_id;
                  return (
                    <motion.div className="in-card" key={p.purchase_id} variants={cardRise} whileHover={retHover}>
                      <div className="in-ret-hd">
                        <div style={{ minWidth: 0 }}>
                          <div className="in-card-title">{p.item_name}</div>
                          <div className="in-ret-meta">
                            {p.lab_name || 'Unknown lab'} · bought {fmtDateTime(p.created_at)}
                          </div>
                        </div>
                        <span className="in-labchip">{money(remaining)} {p.unit || ''} left</span>
                      </div>

                      <div className="in-ret-stats">
                        <div className="in-ret-stat">
                          <span>Purchased</span><b>{money(p.purchased_qty)} {p.unit || ''}</b>
                        </div>
                        <div className="in-ret-stat">
                          <span>Returned</span><b>{money(p.already_returned)} {p.unit || ''}</b>
                        </div>
                        <div className="in-ret-stat left">
                          <span>Remaining</span><b>{money(remaining)} {p.unit || ''}</b>
                        </div>
                      </div>

                      <label className="in-field-label">Quantity to return</label>
                      <div className="in-row2">
                        <input className="in-input" type="number" min="0" step="any" max={remaining}
                          placeholder={`Up to ${money(remaining)}`}
                          value={retQty[p.purchase_id] ?? ''} disabled={busy}
                          onChange={(e) => setRetQty((m) => ({ ...m, [p.purchase_id]: e.target.value }))} />
                        <div className="in-unit-chip">{p.unit || '—'}</div>
                        <button className="in-btn in-btn-ghost"
                          style={{ width: 'auto', padding: '11px 18px', whiteSpace: 'nowrap' }}
                          disabled={busy || over || !(typed > 0)} onClick={() => submitReturn(p)}>
                          {busy ? 'Returning…' : 'Return'}
                        </button>
                      </div>

                      <button className="in-log-link in-ret-all" disabled={busy}
                        onClick={() => setRetQty((m) => ({ ...m, [p.purchase_id]: String(remaining) }))}>
                        Return all {money(remaining)} {p.unit || ''}
                      </button>

                      {/* Client-side cap. The server re-checks it regardless. */}
                      {over && (
                        <div className="in-warn">
                          Only {money(remaining)} {p.unit || ''} left to return on this purchase.
                        </div>
                      )}
                      {retErr[p.purchase_id] && <div className="in-hint">{retErr[p.purchase_id]}</div>}
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </motion.div>
        )}
      </div>

      {/* ══ RETURN TOAST (INTERN LAB RETURNS — removable) ══ */}
      {toast && <div className="in-toast" role="status">{toast}</div>}

      {/* ══ PURCHASE SUMMARY POPUP ══ */}
      {result && (
        <motion.div className="in-overlay" {...overlayFade}
          onMouseDown={(e) => { if (e.target === e.currentTarget) closeResult(); }}>
          <motion.div className="in-modal" role="dialog" aria-modal="true" aria-label="Purchase summary" {...modalPop}>
            <div className="in-modal-hd">
              <div className="in-modal-title">Purchase Summary — {result.lab?.lab_name}</div>
              <button className="in-modal-x" onClick={closeResult}>×</button>
            </div>
            <div className="in-modal-bd">
              <div className="in-sum-counts">
                <span className="in-badge full">{result.summary?.fully ?? 0} full</span>
                <span className="in-badge partial">{result.summary?.partial ?? 0} partial</span>
                <span className="in-badge out">{result.summary?.out_of_stock ?? 0} out of stock</span>
              </div>
              {(result.results || []).map((r) => (
                <div className="in-sum-row" key={r.item_id}>
                  <div style={{ minWidth: 0 }}>
                    <div className="in-sum-name">{r.item_name}</div>
                    <div className="in-sum-meta">
                      Requested {money(r.requested)} {r.unit || ''} · Received {money(r.taken)} {r.unit || ''}
                      {Number(r.shortfall) > 0 ? ` · Short ${money(r.shortfall)}` : ''}
                    </div>
                  </div>
                  <ResultBadge status={r.status} />
                </div>
              ))}
              <button className="in-btn in-btn-primary" style={{ marginTop: 8 }} onClick={closeResult}>Done</button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* ══ FULL PURCHASE LOG ══ */}
      {logModal && (
        <motion.div className="in-overlay" {...overlayFade}
          onMouseDown={(e) => { if (e.target === e.currentTarget) setLogModal(null); }}>
          <motion.div className="in-modal" role="dialog" aria-modal="true" aria-label="Full purchase log" {...modalPop}>
            <div className="in-modal-hd">
              <div className="in-modal-title">Purchase Log — {logModal.lab.lab_name}</div>
              <button className="in-modal-x" onClick={() => setLogModal(null)}>×</button>
            </div>
            <div className="in-modal-bd">
              {logModal.loading ? <div className="in-spinner" /> : logModal.items.length === 0 ? (
                <div className="in-empty">No purchases recorded for this lab yet.</div>
              ) : (
                <>
                  <div className="in-item-count" style={{ textAlign: 'left', marginBottom: 10 }}>
                    {logModal.items.length} purchase{logModal.items.length !== 1 ? 's' : ''}
                  </div>
                  {logModal.items.map((p) => (
                    <div className="in-sum-row" key={p.purchase_id}>
                      <div style={{ minWidth: 0 }}>
                        <div className="in-sum-name">{p.item_name}</div>
                        <div className="in-sum-meta">{p.buyer_name || '—'} · {fmtDateTime(p.created_at)}</div>
                      </div>
                      <div className="in-log-qty">{money(p.quantity)} {p.unit || ''}</div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* ══ PURCHASE SUCCESS ANIMATION (additive) ══
          Shown for SUCCESS_MS right after a purchase is recorded, then it fades
          out and the summary popup above renders exactly as it always has. Purely
          a curtain over the existing flow — it purchases, validates and changes
          nothing. AnimatePresence is only here so the overlay can fade on exit. */}
      <AnimatePresence>
        {showPurchaseSuccess && (
          <motion.div className="in-succ-ov" role="status" aria-live="polite"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ opacity: { duration: 0.24, ease: EASE } }}>

            <div className="in-succ-inner">
              <div className="in-succ-stage">
                {/* Glow pulses expand from behind the disc, staggered. */}
                {GLOW_DELAYS.map((gd) => (
                  <span key={gd} className="in-succ-glow" aria-hidden="true" style={{ '--gd': gd }} />
                ))}

                <motion.div className="in-succ-badge" {...succBadgePop}>
                  <svg width="58%" height="58%" viewBox="0 0 52 52" fill="none" aria-hidden="true">
                    <motion.path
                      d="M14 27.5 L22.5 36 L38 17"
                      stroke="#6c47ff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"
                      {...(reducedMotion ? succCheckStatic : succCheckDraw)}
                    />
                  </svg>
                </motion.div>
              </div>

              <motion.div className="in-succ-title" {...succCopyRise(0.88)}>
                Successfully purchased from inventory!
              </motion.div>
              <motion.div className="in-succ-sub" {...succCopyRise(1.0)}>
                All the best for your work
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </MotionConfig>
  );
}
