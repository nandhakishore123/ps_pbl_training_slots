// AdminInventory.jsx — Stage 6: admin full inventory view + control.
// Admin sees everything (all buying, all returns, all stock, overview counts) and
// has full power: approve/reject any buying (both purposes) or return, and manage stock.
// Reuses the shared inventory endpoints (role 3 is permitted / bypasses purpose routing).
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useStore } from '../../store/useStore';
import { inventoryService } from '../../services/features/inventoryService';
// CONSUMPTION REPORT (removable)
import ConsumptionReportBar from '../../components/ConsumptionReportBar';

const CSS = `
  .ad-root {
    --ad-purple:#6c47ff; --ad-purple-dim:rgba(108,71,255,0.1); --ad-glow:rgba(108,71,255,0.28);
    --ad-bg:#f0f2f8; --ad-white:#fff; --ad-border:#e5e4eb;
    --ad-text:#1a1040; --ad-text2:#6b7280; --ad-text3:#9ca3af;
    --ad-green:#10b981; --ad-red:#ef4444; --ad-gold:#f59e0b;
    min-height:100vh; background:var(--ad-bg); color:var(--ad-text); font-family:'Segoe UI',system-ui,sans-serif;
  }
  body.dark-mode .ad-root {
    --ad-bg:#0f0f1a; --ad-white:#1a1a2e; --ad-border:#2d2d4e; --ad-text:#e8e6f0; --ad-text2:#a89ec9; --ad-text3:#6b6b8a;
  }
  .ad-header { background:var(--ad-white); border-bottom:1px solid var(--ad-border); padding:14px 24px;
    display:flex; align-items:center; justify-content:space-between; gap:12px; position:sticky; top:0; z-index:50;
    box-shadow:0 1px 10px rgba(26,16,64,0.05); }
  .ad-brand { display:flex; align-items:center; gap:12px; min-width:0; }
  .ad-logo { width:40px; height:40px; border-radius:11px; background:linear-gradient(135deg,#6c47ff,#4b2fd6);
    display:flex; align-items:center; justify-content:center; flex-shrink:0; box-shadow:0 4px 12px var(--ad-glow); }
  .ad-title { font-size:16px; font-weight:900; display:flex; align-items:center; gap:9px; }
  .ad-badge { font-size:9.5px; font-weight:800; letter-spacing:0.6px; text-transform:uppercase; padding:3px 9px;
    border-radius:20px; background:var(--ad-purple-dim); color:var(--ad-purple); border:1px solid rgba(108,71,255,0.3); }
  .ad-sub { font-size:11.5px; color:var(--ad-text3); font-weight:600; margin-top:1px; }
  .ad-back { display:flex; align-items:center; gap:7px; background:var(--ad-white); border:1.5px solid var(--ad-border);
    color:var(--ad-text2); padding:8px 14px; border-radius:9px; font-size:13px; font-weight:700; cursor:pointer; font-family:inherit; }
  .ad-back:hover { border-color:var(--ad-purple); color:var(--ad-purple); background:var(--ad-purple-dim); }
  .ad-dark { background:var(--ad-white); border:1.5px solid var(--ad-border); border-radius:20px; padding:7px 12px;
    cursor:pointer; font-size:12.5px; color:var(--ad-text2); font-weight:600; font-family:inherit; white-space:nowrap; }
  .ad-dark:hover { border-color:var(--ad-purple); color:var(--ad-purple); }

  .ad-wrap { max-width:none; margin:0; padding:22px 24px 48px; }
  .ad-tabs { display:flex; gap:8px; background:var(--ad-white); border:1px solid var(--ad-border); border-radius:14px;
    padding:6px; margin-bottom:20px; flex-wrap:wrap; }
  .ad-tab { flex:1; min-width:120px; padding:11px 14px; border-radius:9px; border:none; background:transparent; font-size:13.5px;
    font-weight:800; color:var(--ad-text2); cursor:pointer; font-family:inherit; transition:all .18s; }
  .ad-tab.active { background:linear-gradient(135deg,#6c47ff,#4b2fd6); color:#fff; box-shadow:0 4px 14px var(--ad-glow); }

  /* overview */
  .ad-stats { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:14px; }
  .ad-stat { background:var(--ad-white); border:1px solid var(--ad-border); border-radius:16px; padding:18px 20px;
    box-shadow:0 6px 24px rgba(26,16,64,0.06); }
  .ad-stat-val { font-size:30px; font-weight:900; color:var(--ad-purple); line-height:1; }
  .ad-stat-label { font-size:12px; font-weight:700; color:var(--ad-text2); margin-top:8px; }
  .ad-stat-sub { font-size:11px; color:var(--ad-text3); font-weight:600; margin-top:2px; }
  .ad-stat.warn .ad-stat-val { color:var(--ad-gold); }
  .ad-stat.danger .ad-stat-val { color:var(--ad-red); }

  /* toolbar / list */
  .ad-toolbar { display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin-bottom:16px; }
  .ad-search { flex:1; min-width:200px; padding:11px 14px; border:1.5px solid var(--ad-border); border-radius:11px;
    background:var(--ad-white); color:var(--ad-text); font-size:13.5px; outline:none; font-family:inherit; }
  .ad-search:focus { border-color:var(--ad-purple); }
  .ad-select { padding:11px 14px; border:1.5px solid var(--ad-border); border-radius:11px; background:var(--ad-white);
    color:var(--ad-text); font-size:13.5px; font-weight:600; outline:none; font-family:inherit; cursor:pointer; }
  .ad-btn { padding:11px 18px; border:none; border-radius:11px; font-size:13.5px; font-weight:800; cursor:pointer; font-family:inherit; transition:all .18s; white-space:nowrap; }
  .ad-btn:disabled { opacity:0.5; cursor:not-allowed; box-shadow:none; }
  .ad-btn-primary { background:linear-gradient(135deg,#6c47ff,#4b2fd6); color:#fff; box-shadow:0 6px 18px var(--ad-glow); }
  .ad-btn-ghost { background:var(--ad-purple-dim); color:var(--ad-purple); border:1.5px solid rgba(108,71,255,0.3); }
  .ad-btn-outline { background:transparent; border:1.5px solid var(--ad-border); color:var(--ad-text2); }
  .ad-btn-outline:hover { border-color:var(--ad-purple); color:var(--ad-purple); background:var(--ad-purple-dim); }
  .ad-btn-sm { padding:7px 12px; font-size:12px; border-radius:9px; }
  .ad-count { font-size:11.5px; color:var(--ad-text3); font-weight:700; margin-bottom:10px; }

  .ad-approvers { background:var(--ad-white); border:1px solid var(--ad-border); border-radius:16px;
    box-shadow:0 6px 24px rgba(26,16,64,0.06); padding:24px; max-width:820px; }
  .ad-appr-head { margin-bottom:20px; }
  .ad-appr-title { font-size:16px; font-weight:900; margin-bottom:4px; }
  .ad-appr-sub { font-size:12.5px; color:var(--ad-text3); font-weight:600; line-height:1.5; }
  .ad-appr-grid { display:grid; grid-template-columns:1fr 1fr; gap:18px; }
  @media (max-width:640px) { .ad-appr-grid { grid-template-columns:1fr; } }

  .ad-card { background:var(--ad-white); border:1px solid var(--ad-border); border-radius:16px; overflow:hidden; box-shadow:0 6px 24px rgba(26,16,64,0.06); }
  .ad-item { display:grid; grid-template-columns:1fr 140px 130px auto; gap:14px; align-items:center; padding:14px 18px; border-bottom:1px solid var(--ad-border); }
  .ad-item:last-child { border-bottom:none; }
  .ad-item:hover { background:var(--ad-purple-dim); }
  .ad-item-name { font-size:13.5px; font-weight:800; }
  .ad-item-meta { font-size:11px; color:var(--ad-text3); font-weight:600; margin-top:2px; }
  .ad-qty { font-size:15px; font-weight:900; color:var(--ad-purple); }
  .ad-qty.low { color:var(--ad-red); }
  .ad-qty-unit { font-size:11px; color:var(--ad-text3); font-weight:700; }
  .ad-rack { font-size:12px; color:var(--ad-text2); font-weight:700; }
  .ad-tag { display:inline-block; font-size:9.5px; font-weight:800; letter-spacing:0.4px; text-transform:uppercase; padding:2px 8px; border-radius:20px; margin-top:4px; background:rgba(16,185,129,0.12); color:#047857; border:1px solid rgba(16,185,129,0.4); }
  .ad-actions { display:flex; gap:7px; justify-content:flex-end; }

  .ad-req { border:1px solid var(--ad-border); border-radius:14px; padding:15px 17px; margin-bottom:11px; background:var(--ad-white); }
  .ad-req-top { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; margin-bottom:8px; }
  .ad-req-name { font-size:14px; font-weight:900; }
  .ad-req-reg { font-size:11px; font-weight:800; color:var(--ad-text3); margin-left:8px; }
  .ad-req-meta { font-size:11.5px; color:var(--ad-text3); font-weight:600; margin-top:2px; }
  .ad-req-items { font-size:12.5px; color:var(--ad-text2); line-height:1.6; }
  .ad-two { display:flex; gap:9px; margin-top:12px; }
  .ad-approve { flex:1; padding:10px 16px; border:none; border-radius:10px; background:linear-gradient(135deg,#10b981,#059669); color:#fff; font-size:13px; font-weight:800; cursor:pointer; font-family:inherit; }
  .ad-reject { flex:1; padding:10px 16px; border-radius:10px; background:rgba(239,68,68,0.09); color:#dc2626; border:1.5px solid rgba(239,68,68,0.4); font-size:13px; font-weight:800; cursor:pointer; font-family:inherit; }
  .ad-approve:disabled, .ad-reject:disabled { opacity:0.5; cursor:not-allowed; }
  .ad-err { margin-top:8px; font-size:12.5px; color:var(--ad-red); font-weight:800; }

  .ad-pill { display:inline-flex; align-items:center; gap:6px; padding:4px 12px; border-radius:20px; font-size:11px; font-weight:800; letter-spacing:0.4px; text-transform:uppercase; white-space:nowrap; }
  .ad-pill.pending { background:rgba(245,158,11,0.12); color:#b45309; border:1px solid rgba(245,158,11,0.4); }
  .ad-pill.approved { background:rgba(16,185,129,0.12); color:#047857; border:1px solid rgba(16,185,129,0.4); }
  .ad-pill.rejected { background:rgba(239,68,68,0.12); color:#b91c1c; border:1px solid rgba(239,68,68,0.4); }
  .ad-pill.type { background:var(--ad-purple-dim); color:var(--ad-purple); border:1px solid rgba(108,71,255,0.3); }

  .ad-empty { text-align:center; padding:40px 20px; color:var(--ad-text3); font-size:13.5px; font-weight:600; }
  .ad-spinner { width:28px; height:28px; border:3px solid var(--ad-border); border-top-color:var(--ad-purple); border-radius:50%; animation:adspin .7s linear infinite; margin:28px auto; }
  @keyframes adspin { to { transform:rotate(360deg); } }

  .ad-overlay { position:fixed; inset:0; background:rgba(15,10,40,0.55); backdrop-filter:blur(5px); -webkit-backdrop-filter:blur(5px); z-index:1000; display:flex; align-items:center; justify-content:center; padding:20px; }
  .ad-modal { background:var(--ad-white); border:1px solid var(--ad-border); border-radius:16px; width:100%; max-width:460px; box-shadow:0 30px 80px rgba(15,10,40,0.4); overflow:hidden; }
  .ad-modal-hd { padding:16px 20px; border-bottom:1px solid var(--ad-border); display:flex; align-items:center; justify-content:space-between; }
  .ad-modal-title { font-size:15px; font-weight:900; }
  .ad-modal-x { width:30px; height:30px; border-radius:8px; border:none; background:var(--ad-bg); color:var(--ad-text2); font-size:17px; cursor:pointer; font-family:inherit; }
  .ad-modal-bd { padding:20px; }
  .ad-label { font-size:11px; font-weight:800; letter-spacing:0.7px; text-transform:uppercase; color:var(--ad-text2); margin-bottom:7px; display:block; }
  .ad-input { width:100%; padding:11px 14px; border:1.5px solid var(--ad-border); border-radius:11px; background:var(--ad-bg); color:var(--ad-text); font-size:13.5px; font-weight:600; outline:none; font-family:inherit; box-sizing:border-box; margin-bottom:14px; }
  .ad-input:focus { border-color:var(--ad-purple); }
  .ad-check { display:flex; align-items:center; gap:9px; font-size:13px; font-weight:700; margin-bottom:16px; cursor:pointer; }

  @media (max-width:760px) {
    .ad-item { grid-template-columns:1fr auto; }
    .ad-item-hide { display:none; }
    .ad-actions { grid-column:1 / -1; justify-content:flex-start; }
    .ad-sub { display:none; }
    .ad-wrap { padding:16px 14px 40px; }
  }
`;

/* ═══ LABS (Stage 4) — REMOVABLE BLOCK (start) ═══
   Only additive classes; everything else reuses the existing .ad-* styles. */
const LAB_CSS = `
  .ad-lab-row { grid-template-columns:1fr 160px 110px auto; }
  .ad-lab-row.inactive { opacity:0.55; }
  .ad-pill.inactive { background:rgba(156,163,175,0.16); color:#6b7280; border:1px solid rgba(156,163,175,0.45); }
  .ad-lab-code { font-size:11px; font-weight:800; color:var(--ad-purple); letter-spacing:0.3px; }
  @media (max-width:760px) { .ad-lab-row { grid-template-columns:1fr auto; } }
`;
/* ═══ LABS (Stage 4) — REMOVABLE BLOCK (end) ═══ */

const money = (n) => Number(n ?? 0).toLocaleString();
function fmtDateTime(d) {
  const dt = d ? new Date(d) : new Date();
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function StatusPill({ status }) {
  const s = String(status || 'PENDING').toUpperCase();
  const cls = s === 'APPROVED' ? 'approved' : s === 'REJECTED' ? 'rejected' : 'pending';
  return <span className={`ad-pill ${cls}`}>{s}</span>;
}
const RENDER_CAP = 250;

export default function AdminInventory() {
  const navigate = useNavigate();
  const { showToast } = useStore();
  const user = useAuthStore((s) => s.user);
  const name = user?.name || 'Admin';

  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('pt-dark') === '1');
  const [tab, setTab] = useState('overview'); // overview | buying | returns | stock

  const [overview, setOverview] = useState(null);
  const [ovLoading, setOvLoading] = useState(true);

  const [buying, setBuying] = useState([]);
  const [buyingLoading, setBuyingLoading] = useState(false);
  const [buyingLoaded, setBuyingLoaded] = useState(false);

  const [returns, setReturns] = useState([]);
  const [returnsLoading, setReturnsLoading] = useState(false);
  const [returnsLoaded, setReturnsLoaded] = useState(false);

  const [stock, setStock] = useState([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockLoaded, setStockLoaded] = useState(false);
  const [stockError, setStockError] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState([]);

  // Approvers settings tab (admin-configurable buying approvers)
  const [approverFaculty, setApproverFaculty] = useState([]);
  const [approverSel, setApproverSel] = useState({ project: '', training: '' });
  const [approverLoading, setApproverLoading] = useState(false);
  const [approverLoaded, setApproverLoaded] = useState(false);
  const [approverError, setApproverError] = useState('');
  const [approverSaving, setApproverSaving] = useState(false);

  // ═══ LABS (Stage 4) — REMOVABLE BLOCK (start) ═══
  const [labs, setLabs] = useState([]);
  const [labsLoading, setLabsLoading] = useState(false);
  const [labsLoaded, setLabsLoaded] = useState(false);
  const [labsError, setLabsError] = useState('');
  const [labModal, setLabModal] = useState(null);      // { mode:'new'|'edit', lab? }
  const [labForm, setLabForm] = useState({ lab_name: '', lab_code: '', in_charge: '', room_no: '', image_url: '' });
  const [labSaving, setLabSaving] = useState(false);
  const [labModalErr, setLabModalErr] = useState('');
  const [labConfirm, setLabConfirm] = useState(null);  // lab pending deactivation
  const [labBusy, setLabBusy] = useState(false);
  // ═══ LABS (Stage 4) — REMOVABLE BLOCK (end) ═══

  const [busyId, setBusyId] = useState(null);
  const [rowErr, setRowErr] = useState({});
  const [rejectModal, setRejectModal] = useState(null); // { kind:'BUY'|'RETURN', id }
  const [rejectRemarks, setRejectRemarks] = useState('');

  const [stockModal, setStockModal] = useState(null); // { mode:'edit'|'add'|'new', item? }
  const [qtyInput, setQtyInput] = useState('');
  const [newItem, setNewItem] = useState({ category: '', subcategory: '', item_name: '', sub_name: '', unit: '', current_quantity: '', rack_location: '', is_returnable: false });
  const [saving, setSaving] = useState(false);
  const [modalErr, setModalErr] = useState('');
  const debounceRef = useRef(null);
  const lowThreshold = overview?.low_stock_threshold ?? 10;

  useEffect(() => {
    const el = document.createElement('style');
    el.id = 'ad-styles';
    el.innerHTML = CSS + LAB_CSS; // LAB_CSS: Stage 4 labs — removable
    if (!document.getElementById('ad-styles')) document.head.appendChild(el);
    return () => { const s = document.getElementById('ad-styles'); if (s) s.remove(); };
  }, []);

  useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode);
    localStorage.setItem('pt-dark', darkMode ? '1' : '0');
  }, [darkMode]);

  const loadOverview = useCallback(async () => {
    setOvLoading(true);
    try { const res = await inventoryService.getAdminOverview(); setOverview(res?.data || null); }
    catch { setOverview(null); }
    finally { setOvLoading(false); }
  }, []);

  const loadBuying = useCallback(async () => {
    setBuyingLoading(true);
    try { const res = await inventoryService.getAdminBuying(); setBuying(res?.data?.items || []); setBuyingLoaded(true); }
    catch { setBuying([]); setBuyingLoaded(true); }
    finally { setBuyingLoading(false); }
  }, []);

  const loadReturns = useCallback(async () => {
    setReturnsLoading(true);
    try { const res = await inventoryService.getAdminReturns(); setReturns(res?.data?.items || []); setReturnsLoaded(true); }
    catch { setReturns([]); setReturnsLoaded(true); }
    finally { setReturnsLoading(false); }
  }, []);

  const loadStock = useCallback(async (opts = {}) => {
    setStockLoading(true); setStockError('');
    try {
      const res = await inventoryService.getStock({ category: opts.category ?? categoryFilter, search: opts.search ?? search });
      setStock(res?.data?.items || []); setStockLoaded(true);
    } catch { setStockError('Failed to load stock.'); setStock([]); setStockLoaded(true); }
    finally { setStockLoading(false); }
  }, [categoryFilter, search]);

  const loadApprovers = useCallback(async () => {
    setApproverLoading(true); setApproverError('');
    try {
      const [facRes, idRes] = await Promise.all([
        inventoryService.listApproverFaculty(),
        inventoryService.getApproverIds(),
      ]);
      const faculty = facRes?.data?.items || [];
      const ids = idRes?.data || {};
      setApproverFaculty(faculty);
      setApproverSel({
        project: ids.project_approver_user_id != null ? String(ids.project_approver_user_id) : '',
        training: ids.training_approver_user_id != null ? String(ids.training_approver_user_id) : '',
      });
      setApproverLoaded(true);
    } catch {
      setApproverError('Failed to load approver settings.'); setApproverLoaded(true);
    } finally { setApproverLoading(false); }
  }, []);

  const saveApprovers = async () => {
    setApproverSaving(true);
    try {
      await inventoryService.setApprovers({
        project_approver_user_id: Number(approverSel.project),
        training_approver_user_id: Number(approverSel.training),
      });
      showToast('Approvers updated', false);
      await loadApprovers();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to save approvers.';
      showToast(msg, true);
    } finally { setApproverSaving(false); }
  };

  // ═══ LABS (Stage 4) — REMOVABLE BLOCK (start) ═══
  // Loads ALL labs (active + inactive) so the admin can re-activate.
  const loadLabs = useCallback(async () => {
    setLabsLoading(true); setLabsError('');
    try {
      const res = await inventoryService.getLabs();
      setLabs(res?.data?.items || []); setLabsLoaded(true);
    } catch {
      setLabsError('Failed to load labs.'); setLabs([]); setLabsLoaded(true);
    } finally { setLabsLoading(false); }
  }, []);

  const openNewLab = () => {
    setLabForm({ lab_name: '', lab_code: '', in_charge: '', room_no: '', image_url: '' });
    setLabModalErr(''); setLabModal({ mode: 'new' });
  };
  const openEditLab = (lab) => {
    setLabForm({
      lab_name: lab.lab_name ?? '', lab_code: lab.lab_code ?? '',
      in_charge: lab.in_charge ?? '', room_no: lab.room_no ?? '',
      image_url: lab.image_url ?? '',
    });
    setLabModalErr(''); setLabModal({ mode: 'edit', lab });
  };
  const closeLabModal = () => { if (!labSaving) { setLabModal(null); setLabModalErr(''); } };

  const submitLabModal = async () => {
    setLabModalErr(''); setLabSaving(true);
    try {
      const name = labForm.lab_name.trim();
      if (!name) throw new Error('Lab name is required.');
      const payload = {
        lab_name: name,
        lab_code: labForm.lab_code.trim(),
        in_charge: labForm.in_charge.trim(),
        room_no: labForm.room_no.trim(),
        image_url: labForm.image_url.trim(),   // lab photo — pasted URL, removable
      };
      if (labModal.mode === 'new') {
        await inventoryService.createLab(payload);
        showToast('Lab created', false);
      } else {
        await inventoryService.updateLab(labModal.lab.lab_id, payload);
        showToast('Lab updated', false);
      }
      setLabModal(null);
      await loadLabs();
    } catch (err) {
      setLabModalErr(err?.response?.data?.message || err?.message || 'Action failed.');
    } finally { setLabSaving(false); }
  };

  // Soft delete — confirmed in a modal because history stays attached to the lab.
  const confirmDeactivate = async () => {
    setLabBusy(true);
    try {
      await inventoryService.deleteLab(labConfirm.lab_id);
      showToast('Lab deactivated', false);
      setLabConfirm(null);
      await loadLabs();
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to deactivate lab.', true);
    } finally { setLabBusy(false); }
  };

  const activateLab = async (lab) => {
    setLabBusy(true);
    try {
      await inventoryService.updateLab(lab.lab_id, { is_active: 1 });
      showToast('Lab activated', false);
      await loadLabs();
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to activate lab.', true);
    } finally { setLabBusy(false); }
  };
  // ═══ LABS (Stage 4) — REMOVABLE BLOCK (end) ═══

  useEffect(() => { loadOverview(); }, [loadOverview]);

  useEffect(() => {
    if (tab === 'buying' && !buyingLoaded) loadBuying();
    if (tab === 'returns' && !returnsLoaded) loadReturns();
    if (tab === 'stock' && !stockLoaded) {
      (async () => {
        try { const res = await inventoryService.getCategories(); setCategories((res?.data?.items || []).map((r) => r.category)); } catch { /* ignore */ }
      })();
      loadStock({ category: '', search: '' });
    }
    if (tab === 'settings' && !approverLoaded) loadApprovers();
    if (tab === 'labs' && !labsLoaded) loadLabs();   // Stage 4 labs — removable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    if (!stockLoaded) return;
    loadStock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter]);

  const onSearchChange = (v) => {
    setSearch(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadStock({ search: v }), 300);
  };

  // ── Approve / reject (buying + returns) ──
  const approveBuy = async (id) => {
    setBusyId(id); setRowErr((m) => ({ ...m, [id]: '' }));
    try { await inventoryService.approveBuying(id); showToast('Buying approved — stock reduced', false); await loadBuying(); loadOverview(); }
    catch (err) { const msg = err?.response?.data?.message || 'Failed to approve.'; setRowErr((m) => ({ ...m, [id]: msg })); showToast(msg, true); }
    finally { setBusyId(null); }
  };
  const approveRet = async (id) => {
    setBusyId(id); setRowErr((m) => ({ ...m, [id]: '' }));
    try { await inventoryService.approveReturn(id); showToast('Return approved — stock updated', false); await loadReturns(); loadOverview(); }
    catch (err) { const msg = err?.response?.data?.message || 'Failed to approve.'; setRowErr((m) => ({ ...m, [id]: msg })); showToast(msg, true); }
    finally { setBusyId(null); }
  };
  const doReject = async () => {
    const { kind, id } = rejectModal;
    setBusyId(id); setRowErr((m) => ({ ...m, [id]: '' }));
    try {
      if (kind === 'BUY') { await inventoryService.rejectBuying(id, rejectRemarks.trim() || undefined); await loadBuying(); }
      else { await inventoryService.rejectReturn(id, rejectRemarks.trim() || undefined); await loadReturns(); }
      showToast('Rejected', false);
      setRejectModal(null); setRejectRemarks(''); loadOverview();
    } catch (err) { const msg = err?.response?.data?.message || 'Failed to reject.'; setRowErr((m) => ({ ...m, [id]: msg })); showToast(msg, true); }
    finally { setBusyId(null); }
  };

  // ── Stock modal ──
  const openEdit = (item) => { setStockModal({ mode: 'edit', item }); setQtyInput(String(item.current_quantity ?? '')); setModalErr(''); };
  const openAdd = (item) => { setStockModal({ mode: 'add', item }); setQtyInput(''); setModalErr(''); };
  const openNew = () => { setStockModal({ mode: 'new' }); setNewItem({ category: categoryFilter || '', subcategory: '', item_name: '', sub_name: '', unit: '', current_quantity: '', rack_location: '', is_returnable: false }); setModalErr(''); };
  const closeStockModal = () => { if (!saving) { setStockModal(null); setModalErr(''); } };
  const submitStockModal = async () => {
    setModalErr(''); setSaving(true);
    try {
      if (stockModal.mode === 'edit') {
        const q = Number(qtyInput); if (Number.isNaN(q) || q < 0) throw new Error('Enter a quantity of 0 or more.');
        await inventoryService.editStock(stockModal.item.item_id, q);
      } else if (stockModal.mode === 'add') {
        const q = Number(qtyInput); if (!(q > 0)) throw new Error('Enter a quantity greater than 0.');
        await inventoryService.addStock(stockModal.item.item_id, q);
      } else {
        if (!newItem.category.trim() || !newItem.item_name.trim() || !newItem.unit.trim()) throw new Error('Category, item name and unit are required.');
        await inventoryService.addNewItem({ ...newItem, current_quantity: Number(newItem.current_quantity || 0), is_returnable: !!newItem.is_returnable });
      }
      setStockModal(null); await loadStock(); loadOverview();
    } catch (err) { setModalErr(err?.response?.data?.message || err?.message || 'Action failed.'); }
    finally { setSaving(false); }
  };

  const shownStock = stock.slice(0, RENDER_CAP);

  const renderBuying = (r) => {
    const isPending = String(r.status).toUpperCase() === 'PENDING';
    return (
      <div className="ad-req" key={`b-${r.request_id}`}>
        <div className="ad-req-top">
          <div style={{ minWidth: 0 }}>
            <div className="ad-req-name">{r.student_name || 'Student'}<span className="ad-req-reg">{r.student_reg || ''}</span></div>
            <div className="ad-req-meta">Request #{r.request_id} · {fmtDateTime(r.created_at)}
              {r.purpose_type ? <> · <span className="ad-pill type" style={{ padding: '1px 8px' }}>{r.purpose_type}</span></> : null}
            </div>
          </div>
          <StatusPill status={r.status} />
        </div>
        <div className="ad-req-items">{(r.items || []).map((it) => `${it.item_name} (${money(it.quantity)} ${it.unit || ''})`).join(' · ') || '—'}</div>
        {r.purpose && <div className="ad-req-meta" style={{ marginTop: 6 }}>Purpose: {r.purpose}</div>}
        {isPending ? (
          <div className="ad-two">
            <button className="ad-approve" disabled={busyId === r.request_id} onClick={() => approveBuy(r.request_id)}>{busyId === r.request_id ? 'Working…' : '✓ Approve'}</button>
            <button className="ad-reject" disabled={busyId === r.request_id} onClick={() => { setRejectModal({ kind: 'BUY', id: r.request_id }); setRejectRemarks(''); }}>✕ Reject</button>
          </div>
        ) : (
          <div className="ad-req-meta" style={{ marginTop: 8 }}>{String(r.status).toUpperCase() === 'APPROVED' ? 'Approved' : 'Rejected'}{r.decided_at ? ` · ${fmtDateTime(r.decided_at)}` : ''}{r.remarks ? ` · ${r.remarks}` : ''}</div>
        )}
        {rowErr[r.request_id] && <div className="ad-err">{rowErr[r.request_id]}</div>}
      </div>
    );
  };

  const renderReturn = (r) => {
    const isPending = String(r.status).toUpperCase() === 'PENDING';
    return (
      <div className="ad-req" key={`r-${r.request_id}`}>
        <div className="ad-req-top">
          <div style={{ minWidth: 0 }}>
            <div className="ad-req-name">{r.student_name || 'Student'}<span className="ad-req-reg">{r.student_reg || ''}</span></div>
            <div className="ad-req-meta">Return #{r.request_id} · {fmtDateTime(r.created_at)}</div>
          </div>
          <StatusPill status={r.status} />
        </div>
        <div className="ad-req-items">
          {(r.items || []).map((it) => it.action === 'FULLY_COMPLETED'
            ? `${it.item_name} — Fully completed`
            : `${it.item_name} — Return ${money(it.return_quantity ?? it.quantity)} ${it.unit || ''}`).join(' · ') || '—'}
        </div>
        {isPending ? (
          <div className="ad-two">
            <button className="ad-approve" disabled={busyId === r.request_id} onClick={() => approveRet(r.request_id)}>{busyId === r.request_id ? 'Working…' : '✓ Approve'}</button>
            <button className="ad-reject" disabled={busyId === r.request_id} onClick={() => { setRejectModal({ kind: 'RETURN', id: r.request_id }); setRejectRemarks(''); }}>✕ Reject</button>
          </div>
        ) : (
          <div className="ad-req-meta" style={{ marginTop: 8 }}>{String(r.status).toUpperCase() === 'APPROVED' ? 'Approved' : 'Rejected'}{r.decided_at ? ` · ${fmtDateTime(r.decided_at)}` : ''}{r.remarks ? ` · ${r.remarks}` : ''}</div>
        )}
        {rowErr[r.request_id] && <div className="ad-err">{rowErr[r.request_id]}</div>}
      </div>
    );
  };

  return (
    <div className="ad-root">
      <div className="ad-header">
        <div className="ad-brand">
          <button className="ad-back" onClick={() => navigate('/admin-dashboard')}>← Dashboard</button>
          <div className="ad-logo">
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9"><path d="M20 7l-8-4-8 4 8 4 8-4z" /><path d="M4 7v10l8 4 8-4V7" /><path d="M12 11v10" /></svg>
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="ad-title">Inventory Management</div>
          </div>
        </div>
        <button className="ad-dark" onClick={() => setDarkMode((d) => !d)}>{darkMode ? '☀ Light' : '🌙 Dark'}</button>
      </div>

      <div className="ad-wrap">
        <div className="ad-tabs">
          <button className={`ad-tab${tab === 'overview' ? ' active' : ''}`} onClick={() => setTab('overview')}>Overview</button>
          <button className={`ad-tab${tab === 'buying' ? ' active' : ''}`} onClick={() => setTab('buying')}>Buying</button>
          <button className={`ad-tab${tab === 'returns' ? ' active' : ''}`} onClick={() => setTab('returns')}>Returns</button>
          <button className={`ad-tab${tab === 'stock' ? ' active' : ''}`} onClick={() => setTab('stock')}>Stock</button>
          <button className={`ad-tab${tab === 'settings' ? ' active' : ''}`} onClick={() => setTab('settings')}>Approvers</button>
          {/* LABS (Stage 4) — removable */}
          <button className={`ad-tab${tab === 'labs' ? ' active' : ''}`} onClick={() => setTab('labs')}>Labs</button>
        </div>

        {/* OVERVIEW */}
        {tab === 'overview' && (
          ovLoading ? <div className="ad-spinner" /> : !overview ? <div className="ad-empty">Failed to load overview.</div> : (
            <div className="ad-stats">
              <div className="ad-stat"><div className="ad-stat-val">{money(overview.total_items)}</div><div className="ad-stat-label">Total Items</div><div className="ad-stat-sub">Active catalog</div></div>
              <div className="ad-stat warn"><div className="ad-stat-val">{money(overview.pending_buying)}</div><div className="ad-stat-label">Pending Buying</div><div className="ad-stat-sub">Awaiting approval</div></div>
              <div className="ad-stat warn"><div className="ad-stat-val">{money(overview.pending_returns)}</div><div className="ad-stat-label">Pending Returns</div><div className="ad-stat-sub">Awaiting incharge/admin</div></div>
              <div className="ad-stat"><div className="ad-stat-val">{money(overview.open_obligations)}</div><div className="ad-stat-label">Open Obligations</div><div className="ad-stat-sub">Items not yet cleared</div></div>
              <div className="ad-stat danger"><div className="ad-stat-val">{money(overview.low_stock)}</div><div className="ad-stat-label">Low Stock</div><div className="ad-stat-sub">≤ {overview.low_stock_threshold} in stock</div></div>
            </div>
          )
        )}

        {/* BUYING */}
        {tab === 'buying' && (
          <>
            {/* CONSUMPTION REPORT (removable) — outside the empty-list branch so
                the report stays available even with no buying requests. */}
            <ConsumptionReportBar prefix="ad" onNotify={(msg, isErr) => showToast(msg, isErr)} />
            {buyingLoading ? <div className="ad-spinner" /> : buying.length === 0 ? <div className="ad-empty">No buying requests.</div> : (
              <>
                <div className="ad-count">{buying.length} buying request{buying.length !== 1 ? 's' : ''} (all purposes & statuses)</div>
                {buying.map(renderBuying)}
              </>
            )}
          </>
        )}

        {/* RETURNS */}
        {tab === 'returns' && (
          returnsLoading ? <div className="ad-spinner" /> : returns.length === 0 ? <div className="ad-empty">No return requests.</div> : (
            <>
              <div className="ad-count">{returns.length} return request{returns.length !== 1 ? 's' : ''} (all statuses)</div>
              {returns.map(renderReturn)}
            </>
          )
        )}

        {/* STOCK */}
        {tab === 'stock' && (
          <>
            <div className="ad-toolbar">
              <input className="ad-search" placeholder="Search items by name…" value={search} onChange={(e) => onSearchChange(e.target.value)} />
              <select className="ad-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                <option value="">All Categories</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <button className="ad-btn ad-btn-primary" onClick={openNew}>+ Add New Item</button>
            </div>
            {stockError && <div className="ad-empty" style={{ color: 'var(--ad-red)' }}>{stockError}</div>}
            {stockLoading ? <div className="ad-spinner" /> : stock.length === 0 ? <div className="ad-empty">No items found.</div> : (
              <>
                <div className="ad-count">Showing {shownStock.length} of {stock.length} item{stock.length !== 1 ? 's' : ''}{stock.length > RENDER_CAP ? ' · refine to narrow the list' : ''}</div>
                <div className="ad-card">
                  {shownStock.map((it) => {
                    const low = Number(it.current_quantity) <= lowThreshold;
                    return (
                      <div className="ad-item" key={it.item_id}>
                        <div style={{ minWidth: 0 }}>
                          <div className="ad-item-name">{it.item_name}</div>
                          <div className="ad-item-meta">{it.category}{it.subcategory ? ` · ${it.subcategory}` : ''}</div>
                          {Number(it.is_returnable) === 1 && <span className="ad-tag">Returnable</span>}
                        </div>
                        <div className="ad-item-hide"><span className={`ad-qty${low ? ' low' : ''}`}>{money(it.current_quantity)}</span> <span className="ad-qty-unit">{it.unit || ''}</span></div>
                        <div className="ad-item-hide ad-rack">{it.rack_location || '—'}</div>
                        <div className="ad-actions">
                          <button className="ad-btn ad-btn-outline ad-btn-sm" onClick={() => openEdit(it)}>Edit qty</button>
                          <button className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => openAdd(it)}>Add stock</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}

        {/* APPROVERS (settings) */}
        {tab === 'settings' && (
          approverLoading ? <div className="ad-spinner" /> :
          approverError ? <div className="ad-empty" style={{ color: 'var(--ad-red)' }}>{approverError}</div> :
          approverFaculty.length === 0 ? <div className="ad-empty">No active faculty found to assign as approvers.</div> : (
            <div className="ad-approvers">
              <div className="ad-appr-head">
                <div className="ad-appr-title">Buying Approvers</div>
                <div className="ad-appr-sub">Choose which faculty approves student buying requests for each purpose. Project requests route to the Project approver; Training requests to the Training approver.</div>
              </div>

              <div className="ad-appr-grid">
                <div>
                  <label className="ad-label">Project Approver</label>
                  <select className="ad-select" style={{ width: '100%' }} value={approverSel.project}
                    onChange={(e) => setApproverSel((s) => ({ ...s, project: e.target.value }))}>
                    <option value="">Select faculty…</option>
                    {approverFaculty.map((f) => (
                      <option key={f.user_id} value={f.user_id}>{f.name} — {f.email}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="ad-label">Training Approver</label>
                  <select className="ad-select" style={{ width: '100%' }} value={approverSel.training}
                    onChange={(e) => setApproverSel((s) => ({ ...s, training: e.target.value }))}>
                    <option value="">Select faculty…</option>
                    {approverFaculty.map((f) => (
                      <option key={f.user_id} value={f.user_id}>{f.name} — {f.email}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button className="ad-btn ad-btn-primary" style={{ marginTop: 20 }}
                disabled={approverSaving || !approverSel.project || !approverSel.training}
                onClick={saveApprovers}>
                {approverSaving ? 'Saving…' : 'Save Approvers'}
              </button>
            </div>
          )
        )}

        {/* ═══ LABS (Stage 4) — REMOVABLE BLOCK (start) ═══ */}
        {tab === 'labs' && (
          <>
            <div className="ad-toolbar">
              <div style={{ flex: 1, minWidth: 200 }}>
                <div className="ad-appr-title">Labs</div>
                <div className="ad-appr-sub">Add, edit or deactivate labs. Deactivating is reversible and always keeps purchase history.</div>
              </div>
              <button className="ad-btn ad-btn-primary" onClick={openNewLab}>+ Add Lab</button>
            </div>

            {labsError && <div className="ad-empty" style={{ color: 'var(--ad-red)' }}>{labsError}</div>}
            {labsLoading ? <div className="ad-spinner" /> : labs.length === 0 ? <div className="ad-empty">No labs yet. Use “+ Add Lab” to create one.</div> : (
              <>
                <div className="ad-count">
                  {labs.length} lab{labs.length !== 1 ? 's' : ''} · {labs.filter((l) => Number(l.is_active) === 1).length} active
                </div>
                <div className="ad-card">
                  {labs.map((lab) => {
                    const active = Number(lab.is_active) === 1;
                    return (
                      <div className={`ad-item ad-lab-row${active ? '' : ' inactive'}`} key={lab.lab_id}>
                        <div style={{ minWidth: 0 }}>
                          <div className="ad-item-name">
                            {lab.lab_name}
                            {!active && <span className="ad-pill inactive" style={{ marginLeft: 8, padding: '1px 8px' }}>Inactive</span>}
                          </div>
                          <div className="ad-item-meta">
                            {lab.lab_code ? <span className="ad-lab-code">{lab.lab_code}</span> : <span>No code</span>}
                          </div>
                        </div>
                        <div className="ad-item-hide ad-rack">{lab.in_charge || '—'}</div>
                        <div className="ad-item-hide ad-rack">{lab.room_no || '—'}</div>
                        <div className="ad-actions">
                          <button className="ad-btn ad-btn-outline ad-btn-sm" onClick={() => openEditLab(lab)}>Edit</button>
                          {active ? (
                            <button className="ad-btn ad-btn-sm ad-reject" style={{ flex: 'none' }} disabled={labBusy} onClick={() => setLabConfirm(lab)}>Deactivate</button>
                          ) : (
                            <button className="ad-btn ad-btn-ghost ad-btn-sm" disabled={labBusy} onClick={() => activateLab(lab)}>Activate</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}
        {/* ═══ LABS (Stage 4) — REMOVABLE BLOCK (end) ═══ */}
      </div>

      {/* Reject modal (buying or return) */}
      {rejectModal && (
        <div className="ad-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget && busyId == null) setRejectModal(null); }}>
          <div className="ad-modal">
            <div className="ad-modal-hd">
              <div className="ad-modal-title">Reject {rejectModal.kind === 'BUY' ? 'Buying' : 'Return'} #{rejectModal.id}</div>
              <button className="ad-modal-x" onClick={() => busyId == null && setRejectModal(null)}>×</button>
            </div>
            <div className="ad-modal-bd">
              <label className="ad-label">Reason (optional){rejectModal.kind === 'RETURN' ? ' — obligations reopen' : ''}</label>
              <input className="ad-input" value={rejectRemarks} onChange={(e) => setRejectRemarks(e.target.value)} placeholder="Optional reason…" autoFocus />
              <button className="ad-btn ad-btn-primary" style={{ width: '100%', background: 'linear-gradient(135deg,#ef4444,#dc2626)', boxShadow: 'none' }} disabled={busyId != null} onClick={doReject}>
                {busyId != null ? 'Rejecting…' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock modal */}
      {stockModal && (
        <div className="ad-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) closeStockModal(); }}>
          <div className="ad-modal">
            <div className="ad-modal-hd">
              <div className="ad-modal-title">{stockModal.mode === 'edit' ? 'Edit Quantity' : stockModal.mode === 'add' ? 'Add Stock' : 'Add New Item'}</div>
              <button className="ad-modal-x" onClick={closeStockModal}>×</button>
            </div>
            <div className="ad-modal-bd">
              {stockModal.mode !== 'new' && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 14, fontWeight: 800 }}>{stockModal.item.item_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--ad-text3)', fontWeight: 600, marginTop: 2 }}>Current: {money(stockModal.item.current_quantity)} {stockModal.item.unit || ''}</div>
                </div>
              )}
              {stockModal.mode === 'edit' && (<><label className="ad-label">New quantity ({stockModal.item.unit || 'units'})</label><input className="ad-input" type="number" min="0" step="any" value={qtyInput} onChange={(e) => setQtyInput(e.target.value)} autoFocus /></>)}
              {stockModal.mode === 'add' && (<><label className="ad-label">Quantity to add ({stockModal.item.unit || 'units'})</label><input className="ad-input" type="number" min="0" step="any" value={qtyInput} onChange={(e) => setQtyInput(e.target.value)} autoFocus /></>)}
              {stockModal.mode === 'new' && (
                <>
                  <label className="ad-label">Category *</label>
                  <input className="ad-input" list="ad-cats" value={newItem.category} onChange={(e) => setNewItem((s) => ({ ...s, category: e.target.value }))} placeholder="e.g. Chemicals" />
                  <datalist id="ad-cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
                  <label className="ad-label">Subcategory</label>
                  <input className="ad-input" value={newItem.subcategory} onChange={(e) => setNewItem((s) => ({ ...s, subcategory: e.target.value }))} placeholder="Optional" />
                  <label className="ad-label">Item name *</label>
                  <input className="ad-input" value={newItem.item_name} onChange={(e) => setNewItem((s) => ({ ...s, item_name: e.target.value }))} />
                  <label className="ad-label">Sub name</label>
                  <input className="ad-input" value={newItem.sub_name} onChange={(e) => setNewItem((s) => ({ ...s, sub_name: e.target.value }))} placeholder="Optional" />
                  <label className="ad-label">Unit *</label>
                  <input className="ad-input" value={newItem.unit} onChange={(e) => setNewItem((s) => ({ ...s, unit: e.target.value }))} placeholder="e.g. ML, G, Nos" />
                  <label className="ad-label">Initial quantity</label>
                  <input className="ad-input" type="number" min="0" step="any" value={newItem.current_quantity} onChange={(e) => setNewItem((s) => ({ ...s, current_quantity: e.target.value }))} placeholder="0" />
                  <label className="ad-label">Rack location</label>
                  <input className="ad-input" value={newItem.rack_location} onChange={(e) => setNewItem((s) => ({ ...s, rack_location: e.target.value }))} placeholder="Optional" />
                  <label className="ad-check"><input type="checkbox" checked={newItem.is_returnable} onChange={(e) => setNewItem((s) => ({ ...s, is_returnable: e.target.checked }))} /> Returnable item (e.g. glassware)</label>
                </>
              )}
              {modalErr && <div className="ad-err" style={{ marginBottom: 12 }}>{modalErr}</div>}
              <button className="ad-btn ad-btn-primary" style={{ width: '100%' }} disabled={saving} onClick={submitStockModal}>
                {saving ? 'Saving…' : stockModal.mode === 'edit' ? 'Update Quantity' : stockModal.mode === 'add' ? 'Add Stock' : 'Create Item'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ LABS (Stage 4) — REMOVABLE BLOCK (start) ═══ */}
      {/* Add / edit lab */}
      {labModal && (
        <div className="ad-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) closeLabModal(); }}>
          <div className="ad-modal" role="dialog" aria-modal="true" aria-label={labModal.mode === 'new' ? 'Add lab' : 'Edit lab'}>
            <div className="ad-modal-hd">
              <div className="ad-modal-title">{labModal.mode === 'new' ? 'Add Lab' : 'Edit Lab'}</div>
              <button className="ad-modal-x" onClick={closeLabModal}>×</button>
            </div>
            <div className="ad-modal-bd">
              <label className="ad-label">Lab name *</label>
              <input className="ad-input" value={labForm.lab_name} autoFocus
                onChange={(e) => setLabForm((s) => ({ ...s, lab_name: e.target.value }))}
                placeholder="e.g. Electronics Lab" />
              <label className="ad-label">Lab code</label>
              <input className="ad-input" value={labForm.lab_code}
                onChange={(e) => setLabForm((s) => ({ ...s, lab_code: e.target.value }))} placeholder="Optional — e.g. ECE-1" />
              <label className="ad-label">In charge</label>
              <input className="ad-input" value={labForm.in_charge}
                onChange={(e) => setLabForm((s) => ({ ...s, in_charge: e.target.value }))} placeholder="Optional" />
              <label className="ad-label">Room no</label>
              <input className="ad-input" value={labForm.room_no}
                onChange={(e) => setLabForm((s) => ({ ...s, room_no: e.target.value }))} placeholder="Optional" />
              {/* Lab photo — pasted URL, same as the course Image URL field. Removable. */}
              <label className="ad-label">Image URL</label>
              <input className="ad-input" value={labForm.image_url}
                onChange={(e) => setLabForm((s) => ({ ...s, image_url: e.target.value }))}
                placeholder="https://… or a hosted image link" />
              {labModalErr && <div className="ad-err" style={{ marginBottom: 12 }}>{labModalErr}</div>}
              <button className="ad-btn ad-btn-primary" style={{ width: '100%' }}
                disabled={labSaving || !labForm.lab_name.trim()} onClick={submitLabModal}>
                {labSaving ? 'Saving…' : labModal.mode === 'new' ? 'Create Lab' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deactivate confirm — same shape as the Reject modal */}
      {labConfirm && (
        <div className="ad-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget && !labBusy) setLabConfirm(null); }}>
          <div className="ad-modal" role="dialog" aria-modal="true" aria-label="Confirm deactivate lab">
            <div className="ad-modal-hd">
              <div className="ad-modal-title">Deactivate Lab</div>
              <button className="ad-modal-x" onClick={() => !labBusy && setLabConfirm(null)}>×</button>
            </div>
            <div className="ad-modal-bd">
              <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 6 }}>
                Deactivate “{labConfirm.lab_name}”?
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--ad-text3)', fontWeight: 600, lineHeight: 1.5, marginBottom: 18 }}>
                Its purchase history is kept. You can activate it again at any time.
              </div>
              <div className="ad-two" style={{ marginTop: 0 }}>
                <button className="ad-btn ad-btn-outline" style={{ flex: 1 }} disabled={labBusy} onClick={() => setLabConfirm(null)}>Cancel</button>
                <button className="ad-btn ad-btn-primary" style={{ flex: 1, background: 'linear-gradient(135deg,#ef4444,#dc2626)', boxShadow: 'none' }}
                  disabled={labBusy} onClick={confirmDeactivate}>
                  {labBusy ? 'Deactivating…' : 'Deactivate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ═══ LABS (Stage 4) — REMOVABLE BLOCK (end) ═══ */}
    </div>
  );
}
