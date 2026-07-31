// InternDashboard.jsx — Intern / Lab Technician (role_id = 5) console.
// Two views in one route:
//   'labs' → grid of active lab cards, each with its 5 most recent purchases
//   'buy'  → the buying UI (category → item → qty → cart → submit) for one lab
// The buy UI mirrors the student page (InventoryRequest.jsx) MINUS the Returning
// tab and the Purpose/Project-Training selector — an intern buy is direct, with
// no request and no approval. Submitting POSTs /inventory/lab-purchase, which
// takes min(requested, available) per item and reports FULL / PARTIAL /
// OUT_OF_STOCK back for the summary popup.
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { authService } from '../../services/features/authService';
import { inventoryService } from '../../services/features/inventoryService';
import './InternDashboard.css';

const money = (n) => Number(n ?? 0).toLocaleString();

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

  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('pt-dark') === '1');
  const [view, setView] = useState('labs');        // 'labs' | 'buy'
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

  useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode);
    localStorage.setItem('pt-dark', darkMode ? '1' : '0');
  }, [darkMode]);

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
      setResult(res?.data || null);
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
    <div className="in-root">
      {/* Header */}
      <div className="in-header">
        <div className="in-brand">
          {view === 'buy' && <button className="in-back" onClick={backToLabs}>← Labs</button>}
          <div className="in-logo">
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9">
              <path d="M20 7l-8-4-8 4 8 4 8-4z" /><path d="M4 7v10l8 4 8-4V7" /><path d="M12 11v10" />
            </svg>
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="in-title">Lab Purchases</div>
            <div className="in-sub">Buy items directly for your lab</div>
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
        {/* ══ LAB CARDS ══ */}
        {view === 'labs' && (
          <>
            <div className="in-page-title">Select a lab</div>
            <div className="in-page-sub">Choose the lab you're buying for. Each card shows its most recent purchases.</div>

            {labsError && <div className="in-empty" style={{ color: 'var(--in-red)' }}>{labsError}</div>}
            {labsLoading ? <div className="in-spinner" /> : labs.length === 0 ? (
              <div className="in-empty">No active labs yet. Ask an admin to add one.</div>
            ) : (
              <div className="in-labs">
                {labs.map((lab) => {
                  const log = recent[lab.lab_id];
                  return (
                    <div className="in-lab" key={lab.lab_id}>
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
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ══ BUY VIEW ══ */}
        {view === 'buy' && activeLab && (
          <>
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
              <div>
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
              </div>

              {/* RIGHT: cart + submit */}
              <div className="in-card">
                <div className="in-card-title">Your Cart <span style={{ color: 'var(--in-purple)' }}>({cart.length})</span></div>
                <div className="in-card-sub">Items to buy for {activeLab.lab_name}.</div>
                {cart.length === 0 ? (
                  <div className="in-empty">No items yet — add items from the left.</div>
                ) : (
                  <>
                    {cart.map((c) => (
                      <div className="in-cart-row" key={c.item_id}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="in-cart-name">{c.item_name}</div>
                          {Number(c.quantity) > Number(c.available) && (
                            <div className="in-log-by" style={{ color: '#b45309' }}>
                              only {money(c.available)} in stock
                            </div>
                          )}
                        </div>
                        <div className="in-cart-qty">{money(c.quantity)} {c.unit}</div>
                        <button className="in-cart-x" title="Remove" onClick={() => removeFromCart(c.item_id)}>×</button>
                      </div>
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
              </div>
            </div>
          </>
        )}
      </div>

      {/* ══ PURCHASE SUMMARY POPUP ══ */}
      {result && (
        <div className="in-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) closeResult(); }}>
          <div className="in-modal" role="dialog" aria-modal="true" aria-label="Purchase summary">
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
          </div>
        </div>
      )}

      {/* ══ FULL PURCHASE LOG ══ */}
      {logModal && (
        <div className="in-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setLogModal(null); }}>
          <div className="in-modal" role="dialog" aria-modal="true" aria-label="Full purchase log">
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
          </div>
        </div>
      )}
    </div>
  );
}
