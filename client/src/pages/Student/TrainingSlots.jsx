// TrainingSlots.jsx — Complete Standalone File
// Extracted 100% from index_working.html
// All 20 PS courses + 18 PBL labs included
// CSS included inside — no external imports needed
// Usage: import TrainingSlots from './TrainingSlots.jsx'
//        <TrainingSlots onBack={() => {}} onBookSlot={(course, type) => {}} />

import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../../services/features/authService'
import { trainingService } from '../../services/features/trainingService'
import { useAuthStore } from '../../store/authStore'
import heroImg from '../../assets/hero.png'

function UserIdentity({ user }) {
  if (!user) return null

  const name = user?.name || 'User'
  const initials = String(name).trim()?.charAt(0)?.toUpperCase() || 'U'

  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, padding:'4px 14px 4px 4px', background:'var(--white)', border:'1.5px solid var(--border)', borderRadius:50 }}>
      <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--purple-dim)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:800, color:'var(--purple)', overflow:'hidden' }}>
        {initials}
      </div>
      <div style={{ fontSize:13, fontWeight:800, color:'var(--text)', maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</div>
    </div>
  )
}

// ── CSS ───────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Outfit:wght@600;700;800;900&display=swap');

  :root {
    --purple:#6c47ff; --purple-dim:rgba(108,71,255,0.1); --purple-glow:rgba(108,71,255,0.3);
    --bg:#f0f2f8; --white:#fff; --border:#e5e4eb;
    --text:#1a1a2e; --text2:#6b7280; --text3:#9ca3af;
    --green:#10b981; --red:#ef4444; --gold:#f59e0b;
    --font-head:'Outfit',sans-serif; --font-body:'Plus Jakarta Sans',sans-serif;
  }
  body.dark-mode { --bg:#0f0f1a; --white:#1a1a2e; --border:#2d2d4e; --text:#e8e6f0; --text2:#a89ec9; --text3:#6b6b8a; }
  *,*::before,*::after { box-sizing:border-box; margin:0; padding:0; }
  html,body,#root { min-height:100vh; width:100%; }
  body { background:var(--bg); font-family:var(--font-body); color:var(--text); -webkit-font-smoothing:antialiased; }

  /* HEADER */
  .pt-header { background:var(--white); border-bottom:1px solid var(--border); padding:16px 24px; display:flex; align-items:center; justify-content:space-between; gap:12px; position:sticky; top:0; z-index:100; box-shadow:0 1px 8px rgba(0,0,0,0.05); }
  .pt-header-icon { width:36px; height:36px; border-radius:10px; background:var(--purple-dim); display:flex; align-items:center; justify-content:center; font-size:18px; }
  .pt-header-title { font-size:18px; font-weight:800; color:var(--text); font-family:var(--font-head); }
  .pt-header-sub { font-size:12px; color:var(--text3); margin-top:1px; }
  .pt-dark-toggle { background:none; border:1.5px solid var(--border); border-radius:20px; padding:5px 11px; cursor:pointer; font-size:13px; color:var(--text2); display:flex; align-items:center; gap:5px; transition:all 0.2s; font-family:var(--font-body); font-weight:600; }
  .pt-dark-toggle:hover { border-color:var(--purple); color:var(--purple); }
  .pt-header-back { background:none; border:1.5px solid var(--border); border-radius:20px; padding:5px 11px; cursor:pointer; font-size:13px; color:var(--text2); display:flex; align-items:center; gap:6px; transition:all 0.2s; font-family:var(--font-body); font-weight:700; white-space:nowrap; }
  .pt-header-back:hover { border-color:var(--purple); color:var(--purple); background:var(--purple-dim); }
  .pt-icon-btn { width:36px; height:36px; border-radius:10px; background:none; border:1.5px solid var(--border); cursor:pointer; display:flex; align-items:center; justify-content:center; color:var(--text2); transition:all 0.2s; }
  .pt-icon-btn:hover { border-color:var(--purple); color:var(--purple); background:var(--purple-dim); }
  body.dark-mode .pt-header { background:#151525; border-bottom:1px solid #2d2d4e; }
  body.dark-mode .pt-dark-toggle { background:#1f1f3a; border-color:#2d2d4e; color:#a89ec9; }
  body.dark-mode .pt-header-back { background:#1f1f3a; border-color:#2d2d4e; color:#a89ec9; }
  body.dark-mode .pt-icon-btn { background:#1f1f3a; border-color:#2d2d4e; color:#a89ec9; }

  /* CONTENT + BACK */
  .pt-content { padding:16px 24px 32px; }
  .pt-section-back { display:flex; align-items:center; gap:8px; background:var(--white); border:1.5px solid var(--border); color:var(--text2); padding:9px 16px; border-radius:10px; font-size:13px; font-weight:700; cursor:pointer; transition:all 0.2s; width:fit-content; margin-bottom:16px; font-family:var(--font-body); }
  .pt-section-back:hover { background:var(--purple-dim); border-color:rgba(108,71,255,0.3); color:var(--purple); }

  /* MOBILE TOP BAR — back + booked slots row shown only on mobile */
  .pt-mobile-topbar { display:none; }

  /* TABS */
  .pt-tabs { display:flex; gap:6px; margin-bottom:16px; background:var(--white); border-radius:12px; padding:5px; border:1px solid var(--border); }
  .pt-tab { flex:1; padding:10px 14px; border-radius:8px; border:none; background:transparent; font-size:13px; font-weight:700; color:var(--text2); cursor:pointer; transition:all 0.2s; font-family:var(--font-body); }
  .pt-tab.active { background:var(--purple); color:#fff; box-shadow:0 2px 8px var(--purple-glow); }
  body.dark-mode .pt-tabs { background:var(--white); border-color:var(--border); }

  /* FILTERS */
  .pt-filters { display:flex; gap:10px; margin-bottom:14px; flex-wrap:wrap; }
  .pt-select { padding:8px 28px 8px 12px; border:1.5px solid var(--border); border-radius:8px; background:var(--white); font-size:13px; font-weight:600; color:var(--text); outline:none; cursor:pointer; appearance:none; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 8px center; font-family:var(--font-body); }
  .pt-select:focus { border-color:var(--purple); }
  .pt-search { flex:1; min-width:160px; padding:8px 14px; border:1.5px solid var(--border); border-radius:8px; background:var(--white); font-size:13px; color:var(--text); outline:none; font-family:var(--font-body); }
  .pt-search:focus { border-color:var(--purple); }
  .pt-search::placeholder { color:var(--text3); }
  body.dark-mode .pt-select, body.dark-mode .pt-search { background:var(--white); border-color:var(--border); color:var(--text); }

  /* COURSE GRID */
  .pt-course-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
  .pt-ccard { background:var(--white); border:1px solid var(--border); border-radius:16px; overflow:hidden; cursor:pointer; transition:transform 0.25s cubic-bezier(0.22,1,0.36,1),box-shadow 0.25s,border-color 0.2s; }
  .pt-ccard:hover { transform:translateY(-5px); box-shadow:0 16px 40px rgba(108,71,255,0.12); border-color:rgba(108,71,255,0.3); }
  .pt-ccard-img { position:relative; height:160px; overflow:hidden; }
  .pt-ccard-overlay { position:absolute; inset:0; background:linear-gradient(to top,rgba(26,26,46,0.4),transparent); }
  .pt-ccard-badge { position:absolute; top:10px; left:10px; padding:4px 10px; border-radius:20px; font-size:10px; font-weight:700; backdrop-filter:blur(8px); }
  .pt-ccard-slots-badge { position:absolute; top:10px; right:10px; padding:4px 10px; border-radius:20px; background:rgba(16,185,129,0.18); border:1px solid rgba(16,185,129,0.4); color:#10b981; font-size:10px; font-weight:700; }
  .pt-ccard-body { padding:12px 14px 14px; }
  .pt-ccard-name { font-size:13px; font-weight:700; color:var(--text); line-height:1.4; margin-bottom:8px; }
  .pt-ccard-footer { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
  .pt-ccard-meta { font-size:11px; color:var(--text3); font-weight:600; }
  .pt-ccard-status { font-size:12px; font-weight:700; color:var(--green); }
  .pt-ccard-status.warn { color:var(--red); }
  .pt-ccard-cta { display:flex; align-items:center; justify-content:space-between; background:var(--purple-dim); border:1px solid rgba(108,71,255,0.2); border-radius:8px; padding:8px 12px; color:var(--purple); font-size:12px; font-weight:700; transition:all 0.2s; }
  .pt-ccard:hover .pt-ccard-cta { background:rgba(108,71,255,0.15); border-color:rgba(108,71,255,0.4); }
  body.dark-mode .pt-ccard { background:var(--white); border-color:var(--border); }

  /* DETAIL PAGE */
  .pt-detail-layout { display:grid; grid-template-columns:1fr 300px; gap:18px; }
  .pt-detail-main { background:var(--white); border:1px solid var(--border); border-radius:16px; padding:24px; display:flex; flex-direction:column; gap:18px; }
  .pt-detail-back { display:flex; align-items:center; gap:8px; background:rgba(0,0,0,0.04); border:1px solid var(--border); color:var(--text2); padding:8px 16px; border-radius:8px; font-size:13px; font-weight:700; cursor:pointer; transition:all 0.2s; width:fit-content; margin-bottom:4px; font-family:var(--font-body); }
  .pt-detail-back:hover { background:var(--purple-dim); border-color:rgba(108,71,255,0.25); color:var(--purple); }
  .pt-detail-section-label { font-size:17px; font-weight:800; color:var(--text); margin-bottom:4px; font-family:var(--font-head); }
  .pt-detail-sublabel { font-size:12px; color:var(--text3); }
  .pt-topics-list { display:flex; flex-direction:column; gap:8px; }
  .pt-topic-item { display:flex; align-items:flex-start; gap:12px; padding:10px 14px; background:#f8f7ff; border:1px solid rgba(108,71,255,0.08); border-radius:8px; }
  .pt-topic-num  { font-size:12px; font-weight:800; color:var(--text3); min-width:22px; }
  .pt-topic-text { font-size:13px; color:var(--text); line-height:1.5; }
  .pt-detail-actions { display:flex; gap:12px; margin-top:4px; }
  .pt-open-link-btn { flex:1; padding:13px; border-radius:10px; border:1.5px solid rgba(108,71,255,0.3); background:var(--purple-dim); color:var(--purple); font-family:var(--font-body); font-size:13px; font-weight:700; cursor:pointer; transition:all 0.2s; }
  .pt-complete-btn  { flex:1; padding:13px; border-radius:10px; border:1.5px solid rgba(16,185,129,0.3); background:rgba(16,185,129,0.1); color:var(--green); font-family:var(--font-body); font-size:13px; font-weight:700; cursor:pointer; transition:all 0.2s; }
  .pt-detail-side { display:flex; flex-direction:column; gap:14px; }
  .pt-side-card { background:var(--white); border:1px solid var(--border); border-radius:16px; padding:20px; }
  .pt-side-card-title { font-size:11px; font-weight:700; color:var(--text3); letter-spacing:1.5px; text-transform:uppercase; margin-bottom:4px; }
  .pt-side-course-name { font-size:14px; font-weight:800; color:var(--text); margin-bottom:16px; line-height:1.4; }
  .pt-book-slot-btn { width:100%; padding:13px; background:var(--purple-dim); border:1.5px solid rgba(108,71,255,0.25); border-radius:8px; color:var(--purple); font-family:var(--font-head); font-size:14px; font-weight:800; cursor:pointer; transition:all 0.2s; }
  .pt-book-slot-btn:hover { background:rgba(108,71,255,0.18); border-color:var(--purple); }
  .pt-materials-card { background:var(--white); border:1px solid var(--border); border-radius:16px; padding:20px; }
  .pt-materials-title { font-size:14px; font-weight:800; color:var(--text); margin-bottom:14px; }
  .pt-material-item { border:1px solid var(--border); border-radius:8px; overflow:hidden; }
  .pt-material-header { display:flex; align-items:center; justify-content:space-between; padding:11px 14px; background:#f8f7ff; font-size:13px; font-weight:700; color:var(--text); }
  .pt-material-count { font-size:11px; color:var(--text3); }
  body.dark-mode .pt-detail-main,.pt-side-card,.pt-materials-card { background:var(--white); border-color:var(--border); }
  body.dark-mode .pt-topic-item { background:#1f1f3a; border-color:#2d2d4e; }
  body.dark-mode .pt-material-header { background:#1f1f3a; }

  /* SPINNER */
  .pt-spinner-wrap { text-align:center; padding:18px 8px 6px; }
  .pt-spinner { width:28px; height:28px; border:3px solid var(--border); border-top-color:var(--purple); border-radius:50%; animation:ptspin 0.7s linear infinite; margin:0 auto 10px; }
  .pt-spinner-text { font-size:12px; color:var(--text2); font-weight:700; }
  @keyframes ptspin { to{transform:rotate(360deg)} }

  /* EMPTY */
  .pt-empty { text-align:center; padding:40px 20px; color:var(--text3); font-size:14px; }
  .pt-count  { font-size:11px; color:var(--text3); text-align:right; margin-bottom:8px; }

  /* BOOKING MODAL */
  .pt-modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:10000; display:flex; align-items:center; justify-content:center; padding:20px; backdrop-filter:blur(4px); }
  .pt-modal { background:var(--white); border-radius:20px; width:100%; max-width:480px; overflow:hidden; box-shadow:0 24px 60px rgba(0,0,0,0.2); animation:modalIn 0.3s cubic-bezier(0.22,1,0.36,1) both; }
  .pt-modal-header { background:linear-gradient(135deg,#1e1b3a,#2d1f5e); padding:22px 24px; display:flex; align-items:center; justify-content:space-between; }
  .pt-modal-title { font-size:16px; font-weight:800; color:#fff; font-family:var(--font-head); }
  .pt-modal-sub { font-size:11px; color:rgba(255,255,255,0.6); margin-top:3px; }
  .pt-modal-close { width:32px; height:32px; border-radius:50%; border:1px solid rgba(255,255,255,0.2); background:transparent; color:rgba(255,255,255,0.7); display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:16px; transition:all 0.2s; }
  .pt-modal-close:hover { background:rgba(255,255,255,0.1); color:#fff; }
  .pt-modal-body { padding:24px; }
  .pt-field-label { font-size:10px; font-weight:800; color:var(--text3); letter-spacing:1.5px; text-transform:uppercase; margin-bottom:8px; }
  .pt-field-select { width:100%; padding:12px 16px; border:1.5px solid var(--border); border-radius:10px; background:#f0f2f8; font-size:13px; font-weight:600; color:var(--text); outline:none; margin-bottom:16px; appearance:none; font-family:var(--font-body); }
  .pt-field-select:focus { border-color:var(--purple); }
  .pt-slot-info { background:rgba(108,71,255,0.07); border:1px solid rgba(108,71,255,0.2); border-radius:10px; padding:14px 16px; margin-bottom:16px; }
  .pt-slot-row { display:flex; align-items:center; gap:8px; font-size:13px; color:var(--text2); margin-bottom:6px; }
  .pt-slot-row:last-child { margin-bottom:0; }
  .pt-slot-row strong { color:var(--purple); font-weight:700; }
  .pt-confirm-btn { width:100%; padding:14px; background:var(--purple); border:none; border-radius:12px; color:#fff; font-size:14px; font-weight:800; cursor:pointer; transition:all 0.22s; font-family:var(--font-body); }
  .pt-confirm-btn:hover:not(:disabled) { background:#5a3de8; }
  .pt-confirm-btn:disabled { opacity:0.4; cursor:not-allowed; }

  /* BOOKED SLOTS POPUP */
  .pt-booked-btn { display:flex; align-items:center; gap:6px; padding:7px 14px; background:var(--white); border:1.5px solid var(--border); border-radius:20px; cursor:pointer; font-size:12px; font-weight:700; color:var(--text2); transition:all 0.2s; font-family:var(--font-body); }
  .pt-booked-btn:hover { border-color:var(--purple); color:var(--purple); }
  .pt-booked-count { background:var(--purple); color:#fff; font-size:10px; font-weight:800; width:18px; height:18px; border-radius:50%; display:flex; align-items:center; justify-content:center; }
  .pt-booked-popup { position:absolute; top:calc(100% + 8px); right:0; background:var(--white); border:1.5px solid var(--border); border-radius:16px; box-shadow:0 8px 32px rgba(108,71,255,0.15); width:320px; z-index:999; animation:modalIn 0.2s ease; }
  .pt-booked-popup-hdr { padding:14px 16px; border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; }
  .pt-booked-popup-title { font-size:14px; font-weight:800; color:var(--text); }
  .pt-booked-popup-close { width:26px; height:26px; border-radius:50%; border:1px solid var(--border); background:transparent; cursor:pointer; font-size:14px; color:var(--text3); display:flex; align-items:center; justify-content:center; }
  .pt-booked-popup-body { padding:12px; max-height:320px; overflow-y:auto; }
  .pt-booked-item { padding:12px 14px; border:1px solid var(--border); border-radius:10px; margin-bottom:8px; background:#f8f7ff; }
  .pt-booked-item-name { font-size:13px; font-weight:700; color:var(--text); margin-bottom:6px; }
  .pt-booked-item-type { font-size:10px; font-weight:700; color:var(--purple); background:var(--purple-dim); padding:2px 8px; border-radius:10px; display:inline-block; margin-bottom:6px; }
  .pt-booked-item-row { display:flex; gap:6px; font-size:11px; color:var(--text2); margin-bottom:3px; }
  .pt-booked-item-label { font-weight:700; color:var(--text3); min-width:50px; }
  body.dark-mode .pt-booked-item { background:#1f1f3a; }
  body.dark-mode .pt-booked-popup { background:var(--white); border-color:var(--border); }
  body.dark-mode .pt-field-select { background:var(--white); border-color:var(--border); color:var(--text); }

  @keyframes modalIn { from{opacity:0;transform:translateY(8px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }

  /* ── LEVEL SELECT (intermediate page) ────────────────────── */
  .ptl-wrap { display:flex; flex-direction:column; gap:14px; }

  /* course hero banner */
  .ptl-hero { background:var(--white); border:1px solid var(--border); border-radius:16px; overflow:hidden; }
  .ptl-hero-inner { display:flex; align-items:stretch; gap:0; }
  .ptl-hero-info { flex:1; padding:22px 24px; display:flex; flex-direction:column; gap:10px; }
  .ptl-hero-title { font-size:20px; font-weight:800; color:var(--text); font-family:var(--font-head); line-height:1.2; }
  .ptl-hero-sub   { font-size:12px; color:var(--text3); margin-top:-4px; }
  .ptl-hero-meta  { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-top:4px; }
  .ptl-hero-pill  { display:flex; align-items:center; gap:5px; padding:5px 12px; border-radius:20px; font-size:11px; font-weight:700; border:1px solid; }
  .ptl-hero-banner { width:200px; min-height:140px; flex-shrink:0; position:relative; overflow:hidden; border-left:1px solid var(--border); }
  .ptl-hero-banner-inner { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; }
  .ptl-hero-banner-label { font-size:22px; font-weight:900; font-family:var(--font-head); opacity:0.22; text-align:center; line-height:1.15; padding:10px; word-break:break-word; }
  .ptl-hero-banner-icon  { font-size:52px; position:absolute; bottom:10px; right:14px; opacity:0.6; }
  body.dark-mode .ptl-hero { background:var(--white); border-color:var(--border); }

  /* levels list */
  .ptl-list { background:var(--white); border:1px solid var(--border); border-radius:16px; overflow:hidden; }
  .ptl-list-hdr { padding:14px 20px; border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; }
  .ptl-list-hdr-title { font-size:13px; font-weight:800; color:var(--text); }
  .ptl-list-hdr-sub   { font-size:11px; color:var(--text3); font-weight:600; }

  .ptl-item { border-bottom:1px solid var(--border); transition:background 0.18s; position:relative; }
  .ptl-item:last-child { border-bottom:none; }
  .ptl-item.unlocked { cursor:pointer; }
  .ptl-item.unlocked:hover { background:rgba(108,71,255,0.03); }
  .ptl-item.locked  { cursor:not-allowed; opacity:0.7; }

  .ptl-item-top { display:flex; align-items:center; gap:14px; padding:16px 20px 10px; }
  .ptl-item-num { width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:800; flex-shrink:0; }
  .ptl-item-num.unlocked-num { background:var(--purple-dim); border:1.5px solid rgba(108,71,255,0.3); color:var(--purple); }
  .ptl-item-num.locked-num   { background:rgba(0,0,0,0.04); border:1.5px solid var(--border); color:var(--text3); }
  body.dark-mode .ptl-item-num.locked-num { background:rgba(255,255,255,0.04); }

  .ptl-item-name  { font-size:13px; font-weight:700; color:var(--text); flex:1; }
  .ptl-item-locked-badge { display:flex; align-items:center; gap:4px; padding:4px 10px; border-radius:20px; background:rgba(0,0,0,0.05); border:1px solid var(--border); font-size:10px; font-weight:700; color:var(--text3); flex-shrink:0; }
  body.dark-mode .ptl-item-locked-badge { background:rgba(255,255,255,0.05); }
  .ptl-item-open-btn { display:flex; align-items:center; gap:5px; padding:5px 12px; border-radius:8px; border:1.5px solid rgba(108,71,255,0.25); background:var(--purple-dim); color:var(--purple); font-size:11px; font-weight:700; cursor:pointer; transition:all 0.18s; font-family:var(--font-body); flex-shrink:0; }
  .ptl-item.unlocked:hover .ptl-item-open-btn { background:rgba(108,71,255,0.18); border-color:var(--purple); }

  /* concepts */
  .ptl-concepts { padding:0 20px 14px 68px; display:flex; flex-wrap:wrap; gap:6px; }
  .ptl-concept-chip { padding:3px 10px; border-radius:20px; font-size:10px; font-weight:700; border:1px solid; white-space:nowrap; }
  .ptl-concept-chip.unlocked-chip { background:rgba(108,71,255,0.07); color:var(--purple); border-color:rgba(108,71,255,0.2); }
  .ptl-concept-chip.locked-chip   { background:rgba(0,0,0,0.04); color:var(--text3); border-color:var(--border); }
  body.dark-mode .ptl-concept-chip.locked-chip { background:rgba(255,255,255,0.04); }

  /* points row */
  .ptl-points-row { padding:0 20px 16px 68px; display:flex; align-items:center; gap:8px; }
  .ptl-point-badge { display:flex; align-items:center; gap:5px; padding:4px 11px; border-radius:20px; font-size:10px; font-weight:800; border:1px solid; letter-spacing:0.3px; }
  .ptl-point-badge.activity { background:rgba(245,158,11,0.1); color:#92400e; border-color:rgba(245,158,11,0.35); }
  .ptl-point-badge.reward   { background:rgba(139,92,246,0.1); color:#5b21b6; border-color:rgba(139,92,246,0.3); }
  body.dark-mode .ptl-point-badge.activity { color:#fbbf24; border-color:rgba(245,158,11,0.4); background:rgba(245,158,11,0.12); }
  body.dark-mode .ptl-point-badge.reward   { color:#a78bfa; border-color:rgba(139,92,246,0.4); background:rgba(139,92,246,0.12); }
  .ptl-point-val  { font-size:12px; font-weight:900; }
  .ptl-point-type { font-size:9px; font-weight:800; letter-spacing:0.8px; text-transform:uppercase; opacity:0.85; }

  /* lock overlay stripe */
  .ptl-item.locked::after { content:''; position:absolute; inset:0; background:repeating-linear-gradient(135deg,transparent,transparent 8px,rgba(0,0,0,0.012) 8px,rgba(0,0,0,0.012) 16px); pointer-events:none; }
  body.dark-mode .ptl-item.locked::after { background:repeating-linear-gradient(135deg,transparent,transparent 8px,rgba(255,255,255,0.012) 8px,rgba(255,255,255,0.012) 16px); }

  /* ── RESPONSIVE ── */
  @media (max-width: 900px) {
    .pt-course-grid { grid-template-columns: repeat(2, 1fr); }
    .pt-detail-layout { grid-template-columns: 1fr; }
    .pt-detail-side { flex-direction: row; flex-wrap: wrap; }
    .pt-side-card, .pt-materials-card { flex: 1; min-width: 240px; }
  }

  /* Level-select hero: stack earlier so the banner image doesn't get squeezed */
  @media (max-width: 820px) {
    .ptl-hero-inner { flex-direction: column; }
    .ptl-hero-banner {
      width: 100%;
      border-left: none;
      border-top: 1px solid var(--border);
      aspect-ratio: 16 / 9;
      min-height: 160px;
    }
  }

  @media (max-width: 640px) {
    /* ── Header: tighten, hide back+user+logout so only branding + dark toggle show ── */
    .pt-header { padding: 12px 14px; flex-wrap: nowrap; }
    .pt-header-sub { display: none; }
    .pt-header-back-wrap { display: none !important; }
    .pt-header-user-wrap { display: none !important; }
    .pt-header-booked-wrap { display: none !important; }
    .pt-header-logout-wrap { display: none !important; }

    /* ── Mobile top bar: ← Back on left, Booked Slots on right ── */
    .pt-mobile-topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 14px;
      gap: 10px;
    }
    .pt-mobile-topbar .pt-header-back {
      /* reuse same button style but make it fit */
      padding: 7px 14px;
      font-size: 13px;
    }

    .pt-content { padding: 14px 14px 24px; }

    .pt-tabs { flex-direction: row; }
    .pt-tab { padding: 9px 8px; font-size: 12px; }
    .pt-course-grid { grid-template-columns: 1fr; }
    .pt-ccard-img { height: 140px; }

    .pt-detail-main { padding: 16px; }
    .pt-detail-actions { flex-direction: column; }

    /* Header actions wrap so buttons don't overflow off-screen */
    .pt-header-actions { flex-wrap: nowrap; gap: 8px; }

    /* Booked popup: fixed & centered so it's always visible on mobile */
    .pt-booked-popup {
      position: fixed;
      top: 88px;
      left: 14px;
      right: 14px;
      width: auto;
      max-width: 520px;
      margin: 0 auto;
      z-index: 10001;
    }
    .pt-booked-popup-body { max-height: calc(100vh - 200px); }

    .ptl-hero-inner { flex-direction: column; }
    .ptl-hero-info { padding: 18px 14px; }
    .ptl-hero-banner { width: 100%; min-height: 120px; border-left: none; border-top: 1px solid var(--border); aspect-ratio: 16 / 9; }

    .ptl-item-top { padding: 14px 14px 10px; }
    .ptl-concepts { padding: 0 14px 14px 58px; }
    .ptl-points-row { padding: 0 14px 14px 58px; flex-wrap: wrap; }
  }
`

// ── SLOT_INFO — extracted from SLOT_INFO in original ────────
const SLOT_INFO = {
  'test-now': { day:'Today (Test)',  time:'Immediate — Unlocks in 5 seconds', venue:'Lab Block A, Room 101 (Test)', seats:30 },
  '9-10':     { day:'Monday',       time:'9:00 AM – 10:00 AM',               venue:'Lab Block A, Room 101',        seats:12 },
  '10-11':    { day:'Monday',       time:'10:00 AM – 11:00 AM',              venue:'Lab Block A, Room 102',        seats:8  },
  '11-12':    { day:'Tuesday',      time:'11:00 AM – 12:00 PM',              venue:'Lab Block B, Room 201',        seats:15 },
  '2-3':      { day:'Tuesday',      time:'2:00 PM – 3:00 PM',                venue:'Lab Block B, Room 202',        seats:10 },
  '3-4':      { day:'Wednesday',    time:'3:00 PM – 4:00 PM',                venue:'Lab Block C, Room 301',        seats:7  },
  '9-10-th':  { day:'Thursday',     time:'9:00 AM – 10:00 AM',               venue:'Lab Block A, Room 103',        seats:14 },
  '2-3-th':   { day:'Thursday',     time:'2:00 PM – 3:00 PM',                venue:'Lab Block C, Room 302',        seats:11 },
  '10-11-f':  { day:'Friday',       time:'10:00 AM – 11:00 AM',              venue:'Lab Block D, Room 401',        seats:9  },
  '3-4-f':    { day:'Friday',       time:'3:00 PM – 4:00 PM',                venue:'Lab Block D, Room 402',        seats:6  },
}

// ── getCatStyle — extracted from getCatStyle() in original ────
function getCatStyle(cat) {
  if (cat==='Software')    return { bg:'rgba(74,144,232,0.14)',  color:'#1a6abf', border:'rgba(74,144,232,0.3)'  }
  if (cat==='Hardware')    return { bg:'rgba(232,144,74,0.14)',  color:'#a85b10', border:'rgba(232,144,74,0.3)'  }
  if (cat==='General Skill') return { bg:'rgba(16,185,129,0.14)', color:'#0a6644', border:'rgba(16,185,129,0.3)' }
  return { bg:'rgba(108,71,255,0.1)', color:'#6c47ff', border:'rgba(108,71,255,0.2)' }
}

function getDeptStyle(dept) {
  const map = {
    CSE:  { bg:'rgba(74,144,232,0.12)',  color:'#1a6abf', border:'rgba(74,144,232,0.25)'  },
    ECE:  { bg:'rgba(232,144,74,0.12)',  color:'#a85b10', border:'rgba(232,144,74,0.25)'  },
    MECH: { bg:'rgba(16,185,129,0.12)',  color:'#0a6644', border:'rgba(16,185,129,0.25)'  },
    IT:   { bg:'rgba(139,92,246,0.12)',  color:'#5b21b6', border:'rgba(139,92,246,0.25)'  },
    BT:   { bg:'rgba(236,72,153,0.12)',  color:'#9d174d', border:'rgba(236,72,153,0.25)'  },
    EEE:  { bg:'rgba(245,158,11,0.12)',  color:'#92400e', border:'rgba(245,158,11,0.25)'  },
  }
  return map[dept] || { bg:'rgba(108,71,255,0.1)', color:'#6c47ff', border:'rgba(108,71,255,0.2)' }
}

function getBookingDisplay(booking) {
  const info = booking?.info || {}
  const date = info.booking_date || info.day || booking?.day || '—'
  const time = info.time || booking?.time || (info.start_time ? `${String(info.start_time)} to ${String(info.end_time || '')}` : '—')
  const venue = info.venue || booking?.venue || info.venue_name || '—'
  return { date, time, venue }
}

function normalizeBookingRow(row, fallback = {}) {
  if (!row) return null
  const typeRaw = String(row.skill_type || fallback.skill_type || '').toUpperCase()
  const typeKey = typeRaw === 'PBL' ? 'pbl' : 'ps'
  const typeLabel = typeKey === 'pbl' ? 'PBL Training Slot' : 'PS Training Slot'
  const skillId = row.training_skill_id || fallback.training_skill_id
  if (!skillId) return null
  return {
    key: `${typeKey}_${skillId}`,
    booking: {
      slot: String(row.mapping_id || fallback.mapping_id || ''),
      info: {
        start_time: row.start_time || fallback.start_time,
        end_time: row.end_time || fallback.end_time,
        venue_name: row.venue_name || fallback.venue_name,
        booking_date: row.booking_date || fallback.booking_date,
      },
      courseName: row.skill_name || fallback.courseName || fallback.skill_name,
      type: typeLabel,
    },
  }
}

const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/?api\/?$/, '')

function resolveSkillImageUrl(imageUrl, type) {
  if (!imageUrl) return heroImg
  const raw = String(imageUrl).trim()
  if (!raw) return heroImg
  if (/^https?:\/\//i.test(raw)) return raw

  if (raw.startsWith('/')) return `${API_ORIGIN}${raw}`
  if (raw.startsWith('courses/')) return `${API_ORIGIN}/${raw}`
  if (raw.startsWith('ps_courses/')) return `${API_ORIGIN}/courses/${raw}`
  if (raw.startsWith('pbl_courses/')) return `${API_ORIGIN}/courses/${raw}`

  const folder = String(type).toUpperCase() === 'PBL' ? 'pbl_courses' : 'ps_courses'
  return `${API_ORIGIN}/courses/${folder}/${raw}`
}

function useTrainingPagedSkills(type) {
  const PAGE_SIZE = 8

  const [categories, setCategories] = useState([])
  const [search, setSearch] = useState('')
  const [catId, setCatId] = useState('ALL')

  const [items, setItems] = useState([])
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const sentinelRef = useRef(null)
  const inFlightRef = useRef(false)
  const queryKeyRef = useRef('')
  const fetchedOffsetsRef = useRef(new Set())

  const fetchPage = useCallback(async ({ nextOffset, replace }) => {
    const normalizedSearch = String(search || '').trim().toLowerCase()
    const nextQueryKey = `${String(type)}|${String(catId)}|${normalizedSearch}`

    if (replace || queryKeyRef.current !== nextQueryKey) {
      queryKeyRef.current = nextQueryKey
      fetchedOffsetsRef.current = new Set()
    }

    const safeOffset = Math.max(0, Number(nextOffset) || 0)
    if (inFlightRef.current) return
    if (!replace && fetchedOffsetsRef.current.has(safeOffset)) return

    inFlightRef.current = true
    fetchedOffsetsRef.current.add(safeOffset)
    setLoading(true)
    setError('')
    try {
      const payload = await trainingService.getSkills({
        type,
        categoryId: catId === 'ALL' ? undefined : catId,
        search: normalizedSearch,
        limit: PAGE_SIZE,
        offset: safeOffset,
      })

      const rows = payload?.data || []
      const normalized = rows.map((r) => ({
        id: r.training_skill_id,
        name: r.skill_name,
        categoryId: r.category_id,
        category: r.category_name || 'Other',
        type: r.skill_type,
        image_url: r.image_url,
        levels: Number(r.levels_count || 0),
        slots: Number(r.slots_total || 0),
        capacity: Number(r.capacity_total || 0),
        reward_points: Number(r.reward_points || 0),
        activity_points: Number(r.activity_points || 0),
      }))

      setItems((prev) => (replace ? normalized : [...prev, ...normalized]))
      setOffset(safeOffset + normalized.length)
      setHasMore(normalized.length >= PAGE_SIZE)
    } catch {
      setError('Failed to load training skills. Check connection.')
      setHasMore(false)
    } finally {
      setLoading(false)
      inFlightRef.current = false
    }
  }, [catId, search, type])

  const refreshPage = useCallback(() => {
    if (inFlightRef.current) return
    queryKeyRef.current = ''
    fetchedOffsetsRef.current = new Set()
    setItems([])
    setOffset(0)
    setHasMore(true)
    fetchPage({ nextOffset: 0, replace: true })
  }, [fetchPage])

  useEffect(() => {
    let ignore = false
    ;(async () => {
      try {
        const payload = await trainingService.getCategories()
        if (ignore) return
        setCategories(payload?.data || [])
      } catch {
        if (ignore) return
        setCategories([])
      }
    })()
    return () => { ignore = true }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      setItems([])
      setOffset(0)
      setHasMore(true)
      fetchPage({ nextOffset: 0, replace: true })
    }, 250)
    return () => clearTimeout(t)
  }, [type, catId, search, fetchPage])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    if (!hasMore) return

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          fetchPage({ nextOffset: offset, replace: false })
        }
      },
      { root: null, rootMargin: '300px', threshold: 0.01 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [fetchPage, hasMore, offset])

  return {
    categories,
    search,
    setSearch,
    catId,
    setCatId,
    items,
    loading,
    error,
    hasMore,
    sentinelRef,
    pageSize: PAGE_SIZE,
    refreshPage,
  }
}



const GRADIENTS = [
  ['#e0dbff','#c5bfef'],['#d4f1e4','#a8dfc4'],['#fde8cc','#f5c98a'],['#ffd6e0','#ffb3c6'],
  ['#dbeafe','#93c5fd'],['#fef3c7','#fcd34d'],['#dcfce7','#86efac'],['#ffe4e6','#fda4af'],
]

// ── Course card ───────────────────────────────────────────────
function PSCourseCard({ course, index, onOpen }) {
  const cs = getCatStyle(course.category)
  const [bg1,bg2] = GRADIENTS[index % GRADIENTS.length]
  const img = resolveSkillImageUrl(course.image_url, 'PS')
  return (
    <div className="pt-ccard" onClick={() => onOpen(course)}>
      <div
        className="pt-ccard-img"
        style={{
          background: img
            ? `url(${img}) center/cover no-repeat, linear-gradient(135deg,${bg1},${bg2})`
            : `linear-gradient(135deg,${bg1},${bg2})`,
        }}
      >
        <div className="pt-ccard-overlay"/>
        <div className="pt-ccard-badge" style={{ background:cs.bg, color:cs.color, border:`1px solid ${cs.border}` }}>{course.category}</div>
        <div className="pt-ccard-slots-badge">{Number(course.slots||0)} Slots</div>
      </div>
      <div className="pt-ccard-body">
        <div className="pt-ccard-name">{course.name}</div>
        <div className="pt-ccard-footer">
          <div className="pt-ccard-meta">{course.levels} Level{course.levels!==1?'s':''}</div>
          <div className="pt-ccard-status">● Open</div>
        </div>
        <div className="pt-ccard-cta"><span>View Syllabus &amp; Book</span><span>→</span></div>
      </div>
    </div>
  )
}

function PBLLabCard({ lab, index, onOpen }) {
  const dc = getDeptStyle(lab.dept)
  const isWarn = lab.slots < 6
  const [bg1,bg2] = GRADIENTS[(index+3) % GRADIENTS.length]
  const img = resolveSkillImageUrl(lab.image_url, 'PBL')
  return (
    <div className="pt-ccard" onClick={() => onOpen(lab)}>
      <div
        className="pt-ccard-img"
        style={{
          background: img
            ? `url(${img}) center/cover no-repeat, linear-gradient(135deg,${bg1},${bg2})`
            : `linear-gradient(135deg,${bg1},${bg2})`,
        }}
      >
        <div className="pt-ccard-overlay"/>
        <div className="pt-ccard-badge" style={{ background:dc.bg, color:dc.color, border:`1px solid ${dc.border}` }}>{lab.dept}</div>
        <div className="pt-ccard-slots-badge" style={isWarn?{background:'rgba(239,68,68,0.18)',border:'1px solid rgba(239,68,68,0.4)',color:'#ef4444'}:{}}>{lab.slots} Slots</div>
      </div>
      <div className="pt-ccard-body">
        <div className="pt-ccard-name">{lab.name}</div>
        <div className="pt-ccard-footer">
          <div className="pt-ccard-meta">Cap: {lab.capacity}</div>
          <div className={`pt-ccard-status${isWarn?' warn':''}`}>{isWarn?'⚠ Few Slots':'● Available'}</div>
        </div>
        <div className="pt-ccard-cta"><span>View Lab &amp; Book</span><span>→</span></div>
      </div>
    </div>
  )
}

// ── HELPERS for level select ──────────────────────────────────

// Distribute topics across levels: each level gets 1-3 concepts cycling through topics[]
function getLevelConcepts(topics, levelIndex, totalLevels) {
  if (!topics || topics.length === 0) return []
  // Give each level ~2 concepts, cycling through the topics array
  const perLevel = Math.max(1, Math.ceil(topics.length / totalLevels))
  const start    = (levelIndex * perLevel) % topics.length
  const slice    = []
  for (let i = 0; i < Math.min(perLevel, 3); i++) {
    slice.push(topics[(start + i) % topics.length])
  }
  return slice
}

// Points per level: activity = 10*(lvl+1), reward = 5*(lvl+1)
function getLevelPoints(levelIndex) {
  return {
    activity: 10 * (levelIndex + 1),
    reward:   5  * (levelIndex + 1),
  }
}

// Category→ banner emoji
const CAT_EMOJI = {
  'Software':     '💻',
  'Hardware':     '🔧',
  'General Skill':'🧠',
}

// ── PSLevelSelect — NEW intermediate page ────────────────────
function PSLevelSelect({ course, onBack, onSelectLevel }) {
  const cs        = getCatStyle(course.category)
  const totalLvls = Array.isArray(course.levelsData) ? course.levelsData.length : course.levels
  const [bg1,bg2] = GRADIENTS[course.id % GRADIENTS.length]
  const emoji     = CAT_EMOJI[course.category] || '📚'
  const img       = resolveSkillImageUrl(course.image_url, 'PS')

  return (
    <div className="ptl-wrap">
      {/* ── Course hero ── */}
      <div className="ptl-hero">
        <div className="ptl-hero-inner">
          {/* left info */}
          <div className="ptl-hero-info">
            <button className="pt-detail-back" onClick={onBack}>← Back to Courses</button>
            <div>
              <div className="ptl-hero-title">{course.name}</div>
              <div className="ptl-hero-sub">{course.name}</div>
            </div>
            <div className="ptl-hero-meta">
              <div className="ptl-hero-pill" style={{ background:'rgba(108,71,255,0.07)', color:'var(--text2)', borderColor:'var(--border)' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                Levels: {totalLvls}
              </div>
              <div className="ptl-hero-pill" style={{ background:cs.bg, color:cs.color, borderColor:cs.border }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {course.category.toUpperCase()} SKILL
              </div>
            </div>
          </div>

          {/* right banner */}
          <div
            className="ptl-hero-banner"
            style={{
              background: img
                ? `url(${img}) center/cover no-repeat, linear-gradient(135deg,${bg1},${bg2})`
                : `linear-gradient(135deg,${bg1},${bg2})`,
            }}
          >

          </div>
        </div>
      </div>

      {/* ── Levels list ── */}
      <div className="ptl-list">
        <div className="ptl-list-hdr">
          <span className="ptl-list-hdr-title">Course Levels</span>
          <span className="ptl-list-hdr-sub">{totalLvls} Level{totalLvls!==1?'s':''} · Level 1 unlocked</span>
        </div>

        {Array.from({ length: totalLvls }, (_, i) => {
          const isUnlocked = i === 0
          const lvl = course.levelsData?.[i]
          const concepts = lvl?.syllabus?.length
            ? lvl.syllabus.slice(0, 3).map((s) => s.topic_title || s.topic_description).filter(Boolean)
            : getLevelConcepts(course.topics, i, totalLvls)
          const pts = {
            activity:
              Number(lvl?.activity_points ?? course.activity_points ?? 0) ||
              getLevelPoints(i).activity,
            reward:
              Number(lvl?.reward_points ?? course.reward_points ?? 0) ||
              getLevelPoints(i).reward,
          }
          const levelLabel = `${course.name} - Level ${i + 1}`

          return (
            <div
              key={i}
              className={`ptl-item ${isUnlocked ? 'unlocked' : 'locked'}`}
              onClick={() => isUnlocked && onSelectLevel(course, i)}
            >
              {/* top row */}
              <div className="ptl-item-top">
                <div className={`ptl-item-num ${isUnlocked ? 'unlocked-num' : 'locked-num'}`}>
                  {isUnlocked ? (i + 1) : (i + 1)}
                </div>
                <div className="ptl-item-name">{levelLabel}</div>
                {isUnlocked ? (
                  <button
                    className="ptl-item-open-btn"
                    onClick={e => { e.stopPropagation(); onSelectLevel(course, i) }}
                  >
                    Open →
                  </button>
                ) : (
                  <div className="ptl-item-locked-badge">
                    🔒 Locked
                  </div>
                )}
              </div>

              {/* skill_concepts chips */}
              <div className="ptl-concepts">
                {concepts.map((c, ci) => (
                  <span
                    key={ci}
                    className={`ptl-concept-chip ${isUnlocked ? 'unlocked-chip' : 'locked-chip'}`}
                  >
                    {c}
                  </span>
                ))}
              </div>


            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── PS Detail ─────────────────────────────────────────────────
function PSDetail({ course, onBack, onBookSlot, bookedSlot }) {
  const cs = getCatStyle(course.category)
  const isBooked = !!bookedSlot
  const display = getBookingDisplay(bookedSlot)
  const img = resolveSkillImageUrl(course.image_url, 'PS')
  const fallbackTopics = Array.isArray(course.topics) ? course.topics : []
  const topics = Array.isArray(course.selectedLevel?.syllabus) && course.selectedLevel.syllabus.length
    ? course.selectedLevel.syllabus.map((s) => s.topic_title || s.topic_description).filter(Boolean)
    : fallbackTopics
  return (
    <div className="pt-detail-layout">
      <div className="pt-detail-main">
        <div>
          <button className="pt-detail-back" onClick={onBack}>← Back to Levels</button>
          <div className="pt-detail-section-label">{course.name} — Syllabus</div>
          <div className="pt-detail-sublabel">{course.levels} Level{course.levels!==1?'s':''} · {course.category}</div>
        </div>
        <span style={{ display:'inline-block', padding:'4px 12px', borderRadius:20, fontSize:11, fontWeight:700, background:cs.bg, color:cs.color, border:`1px solid ${cs.border}` }}>{course.category}</span>

        <div className="pt-topics-list">
          {topics.map((t,i) => (
            <div className="pt-topic-item" key={i}>
              <span className="pt-topic-num">{i+1}</span>
              <span className="pt-topic-text">{t}</span>
            </div>
          ))}
        </div>
        <div className="pt-detail-actions">
          <button className="pt-open-link-btn" onClick={()=>alert('Opening course material...')}>Open Link</button>
          <button className="pt-complete-btn"  onClick={()=>alert('Marked complete!')}>Mark as Complete</button>
        </div>
      </div>
      <div className="pt-detail-side">
        <div className="pt-side-card">
          <div className="pt-side-card-title">Course Details</div>
          <div className="pt-side-course-name">{course.name} — Training Session</div>
          {isBooked ? (
            <div style={{ background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.25)', borderRadius:10, padding:'14px 16px' }}>
              <div style={{ fontSize:13, fontWeight:700, color:'#059669', marginBottom:10 }}>✅ Slot Booked</div>
              {[['Date',display.date],['Timings',display.time],['Venue',display.venue]].map(([l,v])=>(
                <div key={l} style={{ marginBottom:8 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:'var(--text3)', letterSpacing:1, textTransform:'uppercase', marginBottom:2 }}>{l}</div>
                  <div style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>{v}</div>
                </div>
              ))}
            </div>
          ) : (
            <button className="pt-book-slot-btn" onClick={()=>onBookSlot?.(course)}>Book a Slot</button>
          )}
        </div>
        {isBooked && (
          <div className="pt-side-card" style={{ padding:'16px 18px' }}>
            <div className="pt-side-card-title">Assessment</div>
            <div style={{ marginTop:8, fontSize:12, color:'var(--text2)', marginBottom:12 }}>Slot booked! Take your MCQ assessment now.</div>
            <div style={{ fontSize:11, background:'rgba(108,71,255,0.08)', border:'1px solid rgba(108,71,255,0.2)', borderRadius:6, padding:'6px 10px', marginBottom:8, color:'var(--purple)' }}>MCQ — 20 questions</div>
            <button style={{ width:'100%', padding:11, background:'var(--purple)', border:'none', borderRadius:8, color:'#fff', fontSize:13, fontWeight:800, cursor:'pointer', fontFamily:'var(--font-body)' }} onClick={()=>alert('Assessment opening...')}>Take Assessment</button>
          </div>
        )}
        <div className="pt-materials-card">
          <div className="pt-materials-title">Course Materials</div>
          <div className="pt-material-item">
            <div className="pt-material-header"><span>Study Guide</span><span className="pt-material-count">{topics.length} Topics</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── PBL Detail ────────────────────────────────────────────────
function PBLDetail({ lab, onBack, onBookSlot, bookedSlot }) {
  const dc = getDeptStyle(lab.dept)
  const isBooked = !!bookedSlot
  const display = getBookingDisplay(bookedSlot)
  const img = resolveSkillImageUrl(lab.image_url, 'PBL')
  const activities = Array.isArray(lab.activities) ? lab.activities : []
  return (
    <div className="pt-detail-layout">
      <div className="pt-detail-main">
        <div>
          <button className="pt-detail-back" onClick={onBack}>← Back to Activities</button>
          <div className="pt-detail-section-label">{lab.name}</div>
          <div className="pt-detail-sublabel">{lab.dept} Department · Capacity: {lab.capacity}</div>
        </div>
        <span style={{ display:'inline-block', padding:'4px 12px', borderRadius:20, fontSize:11, fontWeight:700, background:dc.bg, color:dc.color, border:`1px solid ${dc.border}` }}>{lab.dept}</span>

        <div className="pt-topics-list">
          {activities.map((a,i) => (
            <div className="pt-topic-item" key={i}>
              <span className="pt-topic-num">{i+1}</span>
              <span className="pt-topic-text">{a}</span>
            </div>
          ))}
        </div>
        <div className="pt-detail-actions">
          <button className="pt-open-link-btn" onClick={()=>alert('Opening lab guide...')}>Open Lab Guide</button>
          <button className="pt-complete-btn"  onClick={()=>alert('Marked complete!')}>Mark as Complete</button>
        </div>
      </div>
      <div className="pt-detail-side">
        <div className="pt-side-card">
          <div className="pt-side-card-title">Lab Details</div>
          <div className="pt-side-course-name">{lab.name} — PBL Session</div>
          {isBooked ? (
            <div style={{ background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.25)', borderRadius:10, padding:'14px 16px' }}>
              <div style={{ fontSize:13, fontWeight:700, color:'#059669', marginBottom:10 }}>✅ Slot Booked</div>
              {[['Date',display.date],['Timings',display.time],['Venue',display.venue]].map(([l,v])=>(
                <div key={l} style={{ marginBottom:8 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:'var(--text3)', letterSpacing:1, textTransform:'uppercase', marginBottom:2 }}>{l}</div>
                  <div style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>{v}</div>
                </div>
              ))}
            </div>
          ) : (
            <button className="pt-book-slot-btn" onClick={()=>onBookSlot?.(lab)}>Book a Slot</button>
          )}
        </div>
        {isBooked && (
          <div className="pt-side-card" style={{ padding:'16px 18px' }}>
            <div className="pt-side-card-title">Assessment</div>
            <div style={{ marginTop:8, fontSize:12, color:'var(--text2)', marginBottom:12 }}>Slot booked! Take your MCQ assessment now.</div>
            <button style={{ width:'100%', padding:11, background:'var(--purple)', border:'none', borderRadius:8, color:'#fff', fontSize:13, fontWeight:800, cursor:'pointer', fontFamily:'var(--font-body)' }} onClick={()=>alert('Assessment opening...')}>Take Assessment</button>
          </div>
        )}
        {isBooked && (
          <div className="pt-side-card" style={{ padding:'16px 18px' }}>
            <div className="pt-side-card-title">Lab Record</div>
            <div style={{ marginTop:8, fontSize:12, color:'var(--text2)', marginBottom:12 }}>Fill your lab record after completing the session.</div>
            <button style={{ width:'100%', padding:11, background:'rgba(16,185,129,0.1)', border:'1.5px solid rgba(16,185,129,0.3)', borderRadius:8, color:'var(--green)', fontSize:13, fontWeight:800, cursor:'pointer', fontFamily:'var(--font-body)' }} onClick={()=>alert('Lab record opening...')}>Fill Lab Record</button>
          </div>
        )}
        <div className="pt-side-card" style={{ padding:'16px 18px' }}>
          <div className="pt-side-card-title">Slot Availability</div>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:8 }}>
            <div style={{ width:44, height:44, borderRadius:'50%', background:lab.slots<6?'rgba(239,68,68,0.1)':'rgba(16,185,129,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:900, color:lab.slots<6?'var(--red)':'var(--green)' }}>{lab.slots}</div>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>{lab.slots} Slots Available</div>
              <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>Capacity: {lab.capacity} per session</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── BookingModal component ───────────────────────────────────
function BookingModal({ isOpen, onClose, onConfirm, courseName, type, trainingSkillId, confirming, confirmError }) {
  const [selectedSlot, setSelectedSlot] = useState('')
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    let ignore = false
    ;(async () => {
      if (!isOpen) return
      setSelectedSlot('')
      if (!trainingSkillId) return
      setLoading(true)
      try {
        const payload = await trainingService.getSkillSlots(trainingSkillId)
        if (ignore) return
        setSlots(payload?.data || [])
      } catch {
        if (ignore) return
        setSlots([])
      } finally {
        if (!ignore) setLoading(false)
      }
    })()
    return () => { ignore = true }
  }, [isOpen, trainingSkillId])

  if (!isOpen) return null
  const hasSlots = Array.isArray(slots) && slots.length > 0
  const info = hasSlots
    ? (slots.find((s) => String(s.slot_id) === String(selectedSlot)) || null)
    : null
  const sub  = type==='ps' ? 'Practical Skill Training Session' : 'PBL Lab Session'
  const seatsAvailable = Number(info?.seats_available ?? 0)

  function handleConfirm() {
    if (!selectedSlot || !info) return
    if (seatsAvailable <= 0) return
    onConfirm({ slot:selectedSlot, info, courseName, type })
    setSelectedSlot('')
  }

  return (
    <div className="pt-modal-overlay" onClick={e=>{if(e.target===e.currentTarget){onClose();setSelectedSlot('')}}}>
      <div className="pt-modal">
        <div className="pt-modal-header">
          <div>
            <div className="pt-modal-title">{courseName||'Book Slot'}</div>
            <div className="pt-modal-sub">{sub}</div>
          </div>
          <button className="pt-modal-close" onClick={()=>{onClose();setSelectedSlot('')}}>✕</button>
        </div>
        <div className="pt-modal-body">
          <div className="pt-field-label">Slot Timing</div>
          <select
            className="pt-field-select"
            value={selectedSlot}
            onChange={e=>setSelectedSlot(e.target.value)}
            disabled={loading || !hasSlots}
          >
            <option value="">Select a slot...</option>
            {hasSlots &&
              slots.map((s) => (
                <option key={s.slot_id} value={String(s.slot_id)}>
                  {String(s.start_time || '')} to {String(s.end_time || '')}
                </option>
              ))}
          </select>
          {loading && (
            <div className="pt-spinner-wrap">
              <div className="pt-spinner" />
              <div className="pt-spinner-text">Loading slots...</div>
            </div>
          )}
          {!loading && !hasSlots && (
            <div className="pt-empty" style={{ padding:'12px 0' }}>No slots available.</div>
          )}
          {info && (
            <div className="pt-slot-info">
              <div className="pt-slot-row">🕐 <strong>{`${String(info.start_time || '')} to ${String(info.end_time || '')}`}</strong></div>
              <div className="pt-slot-row">📍 <strong>{info.venue || info.venue_name || 'Assigned after booking'}</strong></div>
              <div className="pt-slot-row">👥 <span style={{fontWeight:700}}>{seatsAvailable} seats available</span></div>
            </div>
          )}
          <button
            className="pt-confirm-btn"
            disabled={loading || confirming || !selectedSlot || !info || seatsAvailable <= 0}
            onClick={handleConfirm}
          >
            {confirming ? 'Booking...' : 'Book Now'}
          </button>
          {confirmError && (
            <div style={{ marginTop:10, color:'var(--red)', fontSize:12, fontWeight:600 }}>
              {confirmError}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── BookingConfirm component ──────────────────────────────────
function BookingConfirm({ booking, onDone }) {
  const [countdown, setCountdown] = useState(5)
  const isTest = booking?.slot === 'test-now'

  useEffect(() => {
    if (!isTest) return
    setCountdown(5)
    const iv = setInterval(() => {
      setCountdown(c => { if(c<=1){clearInterval(iv);return 0} return c-1 })
    }, 1000)
    return () => clearInterval(iv)
  }, [booking])

  if (!booking) return null
  const { courseName, type, info } = booking
  const dateTxt = info?.booking_date || info?.day || (info?.start_time ? String(info.start_time) : '—')
  const timeTxt = info?.time || (info?.start_time ? `${String(info.start_time)} to ${String(info.end_time || '')}` : '—')
  const venueTxt = info?.venue || info?.venue_name || '—'

  return (
    <div style={{ padding:'0 0 32px' }}>
      <div style={{ background:'var(--white)', border:'1px solid var(--border)', borderRadius:16, overflow:'hidden', maxWidth:700, margin:'0 auto', boxShadow:'0 4px 20px rgba(108,71,255,0.08)' }}>
        <div style={{ background:'linear-gradient(135deg,#1e1b3a,#2d1f5e)', padding:'28px 32px' }}>
          <div style={{ fontSize:20, fontWeight:800, color:'#fff', fontFamily:'var(--font-head)', marginBottom:4 }}>Slot Booked Successfully!</div>
          <div style={{ fontSize:13, color:'rgba(255,255,255,0.6)' }}>{type} — Booking Confirmation</div>
        </div>
        <div style={{ padding:'28px 32px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:0, border:'1px solid var(--border)', borderRadius:12, overflow:'hidden', marginBottom:16 }}>
            {[['Course / Lab',courseName],['Booking Type',type],['Date',dateTxt],['Timings',timeTxt]].map(([lbl,val],i)=>(
              <div key={lbl} style={{ padding:'18px 22px', borderRight:i%2===0?'1px solid var(--border)':'none', borderBottom:'1px solid var(--border)' }}>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--text3)', letterSpacing:1.5, textTransform:'uppercase', marginBottom:6 }}>{lbl}</div>
                <div style={{ fontSize:14, fontWeight:700, color: lbl==='Booking Type'?'var(--purple)':'var(--text)' }}>{val||'—'}</div>
              </div>
            ))}
            <div style={{ padding:'18px 22px', gridColumn:'1/-1', borderBottom:'1px solid var(--border)' }}>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--text3)', letterSpacing:1.5, textTransform:'uppercase', marginBottom:6 }}>Venue</div>
              <div style={{ fontSize:14, fontWeight:700, color:'var(--text)' }}>{venueTxt}</div>
            </div>
          </div>

          {isTest && (
            <div style={{ padding:'14px 20px', borderRadius:10, marginBottom:16, background:countdown>0?'rgba(108,71,255,0.07)':'rgba(16,185,129,0.08)', border:`1px solid ${countdown>0?'rgba(108,71,255,0.2)':'rgba(16,185,129,0.25)'}` }}>
              {countdown>0
                ? <><div style={{fontSize:13,fontWeight:700,color:'var(--purple)'}}>⚡ Test Slot — Unlocking in {countdown}s</div><div style={{fontSize:12,color:'var(--text3)',marginTop:2}}>Your test slot will be ready shortly.</div></>
                : <><div style={{fontSize:13,fontWeight:700,color:'#059669'}}>✅ Test Slot Unlocked!</div><div style={{fontSize:12,color:'var(--text3)',marginTop:2}}>Go back and click Take Assessment.</div></>
              }
            </div>
          )}

          <div style={{ padding:'14px 20px', background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.25)', borderRadius:10, marginBottom:20 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#059669', marginBottom:4 }}>Booking Confirmed</div>
            <div style={{ fontSize:12, color:'var(--text3)' }}>This slot has been reserved for you.</div>
          </div>

          <button onClick={onDone} style={{ width:'100%', padding:14, background:'var(--purple)', border:'none', borderRadius:12, color:'#fff', fontSize:14, fontWeight:800, cursor:'pointer', fontFamily:'var(--font-body)' }}>
            Done ✓
          </button>
        </div>
      </div>
    </div>
  )
}

// ── BookedSlotsPopup component ────────────────────────────────
function BookedSlotsPopup({ bookedSlots }) {
  const [open, setOpen] = useState(false)
  const slots = Object.entries(bookedSlots||{})
  const count = slots.length

  useEffect(() => {
    function handleClick(e) {
      if (!e.target.closest('.pt-booked-wrap')) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div className="pt-booked-wrap" style={{ position:'relative', display:'inline-block' }}>
      <button className="pt-booked-btn" onClick={()=>setOpen(o=>!o)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        Booked Slots
        <span className="pt-booked-count" style={{ background:count>0?'var(--purple)':'var(--text3)' }}>{count}</span>
      </button>
      {open && (
        <div className="pt-booked-popup">
          <div className="pt-booked-popup-hdr">
            <div className="pt-booked-popup-title">Booked Slots</div>
            <button className="pt-booked-popup-close" onClick={()=>setOpen(false)}>✕</button>
          </div>
          <div className="pt-booked-popup-body">
            {count===0
              ? <div style={{textAlign:'center',padding:'20px',color:'var(--text3)',fontSize:13}}>No slots booked yet</div>
              : slots.map(([key,b])=>{
                const display = getBookingDisplay(b)
                return (
                <div className="pt-booked-item" key={key}>
                  <div className="pt-booked-item-name">{b.courseName}</div>
                  <div className="pt-booked-item-type">{b.type}</div>
                  {[['Date',display.date],['Time',display.time],['Venue',display.venue]].map(([lbl,val])=>(
                    <div className="pt-booked-item-row" key={lbl}>
                      <span className="pt-booked-item-label">{lbl}</span>
                      <span>{val||'—'}</span>
                    </div>
                  ))}
                </div>
              )})
            }
          </div>
        </div>
      )}
    </div>
  )
}

// ── PS Section ────────────────────────────────────────────────
// Navigation: null → grid  |  course set, levelIdx null → PSLevelSelect  |  levelIdx set → PSDetail
function PSSection({ bookedSlots, onBookSlot }) {
  const {
    categories,
    search,
    setSearch,
    catId,
    setCatId,
    items,
    loading,
    error,
    hasMore,
    sentinelRef,
    pageSize,
    refreshPage,
  } = useTrainingPagedSkills('PS')

  const [selected, setSelected] = useState(null) // summary
  const [details, setDetails] = useState(null) // normalized details
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [levelIdx, setLevelIdx] = useState(null)
  const didMountRef = useRef(false)

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true
      return
    }
    if (!selected && items.length < pageSize && !loading) {
      refreshPage()
    }
  }, [selected, items.length, pageSize, loading, refreshPage])

  const openCourse = useCallback(async (course) => {
    setSelected(course)
    setLevelIdx(null)
    setDetails(null)
    setDetailsLoading(true)
    try {
      const payload = await trainingService.getSkillDetails(course.id)
      const d = payload?.data
      if (!d) return setDetails(null)
      setDetails({
        id: d.training_skill_id,
        name: d.skill_name,
        categoryId: d.category_id,
        category: d.category_name || course.category || 'Other',
        image_url: d.image_url,
        slots: Number(course.slots || 0),
        capacity: Number(course.capacity || 0),
        reward_points: Number(d.reward_points || 0),
        activity_points: Number(d.activity_points || 0),
        levels: Array.isArray(d.levels) ? d.levels.length : Number(course.levels || 0),
        levelsData: d.levels || [],
      })
    } catch {
      setDetails(null)
    } finally {
      setDetailsLoading(false)
    }
  }, [])

  // ── Grid view ──
  if (!selected) {
    const filtered = items
    return (
      <div>
        <div style={{ marginBottom:10 }}>
          <div style={{ fontSize:14, fontWeight:700, color:'var(--text)', marginBottom:2 }}>PS Training Slots</div>
          <div style={{ fontSize:12, color:'var(--text3)' }}>Book your practical skill training. Click a course to view syllabus and book your slot.</div>
        </div>
        <div className="pt-filters">
          <input className="pt-search" placeholder="Search courses..." value={search} onChange={e=>setSearch(e.target.value)}/>
          <select className="pt-select" value={catId} onChange={e=>setCatId(e.target.value)}>
            <option value="ALL">All Categories</option>
            {(categories || []).map((c) => (
              <option key={c.category_id} value={String(c.category_id)}>
                {c.category_name}
              </option>
            ))}
          </select>
        </div>
        <div className="pt-count">{filtered.length} courses</div>
        {error && <div className="pt-empty" style={{ color:'var(--red)' }}>{error}</div>}
        {loading && filtered.length === 0 && <div className="pt-spinner-wrap"><div className="pt-spinner"></div><div className="pt-spinner-text">Loading courses...</div></div>}
        <div className="pt-course-grid">
          {!loading && filtered.length===0
            ? <div className="pt-empty" style={{gridColumn:'1/-1'}}>No courses found.</div>
            : filtered.map((c,i) => (
                <PSCourseCard
                  key={c.id}
                  course={c}
                  index={i}
                  onOpen={(course) => { openCourse(course) }}
                />
              ))
          }
        </div>
        {loading && filtered.length > 0 && <div className="pt-empty" style={{ gridColumn:'1/-1' }}>Loading more...</div>}
        {hasMore && <div ref={sentinelRef} style={{ height: 1 }} />}
      </div>
    )
  }

  if (detailsLoading || !details) {
    return (
      <div>
        <button className="pt-detail-back" onClick={() => { setSelected(null); setLevelIdx(null); setDetails(null) }}>← Back to Courses</button>
        <div className="pt-empty" style={{ marginTop: 10 }}>Loading course details...</div>
      </div>
    )
  }

  // ── Intermediate level-select view ──
  if (levelIdx === null) {
    return (
      <PSLevelSelect
        course={details}
        onBack={() => { setSelected(null); setLevelIdx(null); setDetails(null) }}
        onSelectLevel={(course, idx) => setLevelIdx(idx)}
      />
    )
  }

  // ── Detail view (existing, unchanged) ──
  return (
    <PSDetail
      course={{
        ...details,
        selectedLevel: details.levelsData?.[levelIdx] || null,
      }}
      onBack={() => setLevelIdx(null)}
      onBookSlot={(c) => { onBookSlot?.(c); setLevelIdx(null) }}
      bookedSlot={bookedSlots?.[`ps_${details.id}`]}
    />
  )
}

// ── DEPT emoji map ────────────────────────────────────────────
const DEPT_EMOJI = { CSE:'💻', IT:'🌐', ECE:'⚡', MECH:'⚙️', BT:'🧬', EEE:'🔌' }

// Split an activity string into sub-concept chips on ' & ' or ' / '
function getActivityConcepts(activity) {
  const parts = activity.split(/ & | \/ /)
  return parts.slice(0, 3)
}

// ── PBLLevelSelect — intermediate page for PBL ───────────────
function PBLLevelSelect({ lab, onBack, onSelectActivity }) {
  const dc       = getDeptStyle(lab.dept)
  const emoji    = DEPT_EMOJI[lab.dept] || '🔬'
  const activities = Array.isArray(lab.activities) ? lab.activities : []
  const totalAct = activities.length
  const [bg1,bg2] = GRADIENTS[(lab.id + 3) % GRADIENTS.length]
  const img = resolveSkillImageUrl(lab.image_url, 'PBL')

  return (
    <div className="ptl-wrap">
      {/* ── Lab hero ── */}
      <div className="ptl-hero">
        <div className="ptl-hero-inner">
          {/* left info */}
          <div className="ptl-hero-info">
            <button className="pt-detail-back" onClick={onBack}>← Back to Labs</button>
            <div>
              <div className="ptl-hero-title">{lab.name}</div>
              <div className="ptl-hero-sub">{lab.dept} Department</div>
            </div>
            <div className="ptl-hero-meta">
              <div className="ptl-hero-pill" style={{ background:'rgba(108,71,255,0.07)', color:'var(--text2)', borderColor:'var(--border)' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                Activities: {totalAct}
              </div>
              <div className="ptl-hero-pill" style={{ background:dc.bg, color:dc.color, borderColor:dc.border }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {lab.dept}
              </div>
              <div className="ptl-hero-pill" style={{ background:lab.slots<6?'rgba(239,68,68,0.08)':'rgba(16,185,129,0.08)', color:lab.slots<6?'var(--red)':'var(--green)', borderColor:lab.slots<6?'rgba(239,68,68,0.3)':'rgba(16,185,129,0.3)' }}>
                {lab.slots} Slots · Cap {lab.capacity}
              </div>
            </div>
          </div>

          {/* right banner */}
          <div
            className="ptl-hero-banner"
            style={{
              background: img
                ? `url(${img}) center/cover no-repeat, linear-gradient(135deg,${bg1},${bg2})`
                : `linear-gradient(135deg,${bg1},${bg2})`,
            }}
          >
          </div>
        </div>
      </div>

      {/* ── Activities list ── */}
      <div className="ptl-list">
        <div className="ptl-list-hdr">
          <span className="ptl-list-hdr-title">Lab Activities</span>
          <span className="ptl-list-hdr-sub">{totalAct} Activities · Activity 1 unlocked</span>
        </div>

        {activities.map((activity, i) => {
          const isUnlocked = i === 0
          const lvl = lab.levelsData?.[i]
          const concepts   = getActivityConcepts(activity)
          const pts        = {
            activity:
              Number(lvl?.activity_points ?? lab.activity_points ?? 0) ||
              getLevelPoints(i).activity,
            reward:
              Number(lvl?.reward_points ?? lab.reward_points ?? 0) ||
              getLevelPoints(i).reward,
          }
          const label      = `${lab.name} - Activity ${i + 1}`

          return (
            <div
              key={i}
              className={`ptl-item ${isUnlocked ? 'unlocked' : 'locked'}`}
              onClick={() => isUnlocked && onSelectActivity(lab, i)}
            >
              {/* top row */}
              <div className="ptl-item-top">
                <div className={`ptl-item-num ${isUnlocked ? 'unlocked-num' : 'locked-num'}`}>
                  {isUnlocked ? (i + 1) : '🔒'}
                </div>
                <div className="ptl-item-name">{label}</div>
                {isUnlocked ? (
                  <button
                    className="ptl-item-open-btn"
                    onClick={e => { e.stopPropagation(); onSelectActivity(lab, i) }}
                  >
                    Open →
                  </button>
                ) : (
                  <div className="ptl-item-locked-badge">🔒 Locked</div>
                )}
              </div>

              {/* skill_concepts chips */}
              <div className="ptl-concepts">
                {concepts.map((c, ci) => (
                  <span
                    key={ci}
                    className={`ptl-concept-chip ${isUnlocked ? 'unlocked-chip' : 'locked-chip'}`}
                  >
                    {c}
                  </span>
                ))}
              </div>


  
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── PBL Section ───────────────────────────────────────────────
// Navigation: null → grid  |  lab set, activityIdx null → PBLLevelSelect  |  activityIdx set → PBLDetail
function PBLSection({ bookedSlots, onBookSlot }) {
  const {
    categories,
    search,
    setSearch,
    catId,
    setCatId,
    items,
    loading,
    error,
    hasMore,
    sentinelRef,
    pageSize,
    refreshPage,
  } = useTrainingPagedSkills('PBL')

  const [selected, setSelected] = useState(null)
  const [details, setDetails] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [activityIdx, setActivityIdx] = useState(null)
  const didMountRef = useRef(false)

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true
      return
    }
    if (!selected && items.length < pageSize && !loading) {
      refreshPage()
    }
  }, [selected, items.length, pageSize, loading, refreshPage])

  const openLab = useCallback(async (lab) => {
    setSelected(lab)
    setActivityIdx(null)
    setDetails(null)
    setDetailsLoading(true)
    try {
      const payload = await trainingService.getSkillDetails(lab.id)
      const d = payload?.data
      if (!d) return setDetails(null)
      const activities = (d.levels || []).map((lvl) => lvl.core_concept).filter(Boolean)
      setDetails({
        id: d.training_skill_id,
        name: d.skill_name,
        dept: d.category_name || 'PBL',
        categoryId: d.category_id,
        category: d.category_name || 'Other',
        image_url: d.image_url,
        slots: Number(lab.slots || 0),
        capacity: Number(lab.capacity || 0),
        activities,
        levelsData: d.levels || [],
        reward_points: Number(d.reward_points || 0),
        activity_points: Number(d.activity_points || 0),
      })
    } catch {
      setDetails(null)
    } finally {
      setDetailsLoading(false)
    }
  }, [])

  // ── Grid view ──
  if (!selected) {
    const filtered = items.map((x) => ({
      id: x.id,
      name: x.name,
      dept: x.category,
      categoryId: x.categoryId,
      image_url: x.image_url,
      slots: x.slots,
      capacity: x.capacity,
      activities: [],
    }))
    return (
      <div>
        <div style={{ marginBottom:10 }}>
          <div style={{ fontSize:14, fontWeight:700, color:'var(--text)', marginBottom:2 }}>PBL Training Slots</div>
          <div style={{ fontSize:12, color:'var(--text3)' }}>Book your lab session for Project Based Learning.</div>
        </div>
        <div className="pt-filters">
          <input className="pt-search" placeholder="Search labs..." value={search} onChange={e=>setSearch(e.target.value)}/>
          <select className="pt-select" value={catId} onChange={e=>setCatId(e.target.value)}>
            <option value="ALL">All Categories</option>
            {(categories || []).map((c) => (
              <option key={c.category_id} value={String(c.category_id)}>
                {c.category_name}
              </option>
            ))}
          </select>
        </div>
        <div className="pt-count">{filtered.length} labs</div>
        {error && <div className="pt-empty" style={{ color:'var(--red)' }}>{error}</div>}
        {loading && filtered.length === 0 && <div className="pt-spinner-wrap"><div className="pt-spinner"></div><div className="pt-spinner-text">Loading labs...</div></div>}
        <div className="pt-course-grid">
          {!loading && filtered.length===0
            ? <div className="pt-empty" style={{gridColumn:'1/-1'}}>No labs found.</div>
            : filtered.map((l,i) => (
                <PBLLabCard
                  key={l.id}
                  lab={l}
                  index={i}
                  onOpen={(lab) => { openLab(lab) }}
                />
              ))
          }
        </div>
        {loading && filtered.length > 0 && <div className="pt-empty" style={{ gridColumn:'1/-1' }}>Loading more...</div>}
        {hasMore && <div ref={sentinelRef} style={{ height: 1 }} />}
      </div>
    )
  }

  if (detailsLoading || !details) {
    return (
      <div>
        <button className="pt-detail-back" onClick={() => { setSelected(null); setActivityIdx(null); setDetails(null) }}>← Back to Labs</button>
        <div className="pt-empty" style={{ marginTop: 10 }}>Loading lab details...</div>
      </div>
    )
  }

  // ── Intermediate activity-select view ──
  if (activityIdx === null) {
    return (
      <PBLLevelSelect
        lab={details}
        onBack={() => { setSelected(null); setActivityIdx(null); setDetails(null) }}
        onSelectActivity={(lab, idx) => setActivityIdx(idx)}
      />
    )
  }

  // ── Detail view (existing, unchanged) ──
  return (
    <PBLDetail
      lab={details}
      onBack={() => setActivityIdx(null)}
      onBookSlot={(l) => { onBookSlot?.(l); setActivityIdx(null) }}
      bookedSlot={bookedSlots?.[`pbl_${details.id}`]}
    />
  )
}

// ── Main TrainingSlots ────────────────────────────────────────
export default function TrainingSlots({ onBack }) {
  const navigate = useNavigate()
  const [tab,          setTab]         = useState('ps')
  const [darkMode,     setDarkMode]    = useState(() => localStorage.getItem('pt-dark')==='1')
  const { user } = useAuthStore()
  const [bookedSlots,  setBookedSlots] = useState({})
  const [showModal,    setShowModal]   = useState(false)
  const [modalCourse,  setModalCourse] = useState(null)
  const [modalType,    setModalType]   = useState('ps')
  const [showConfirm,  setShowConfirm] = useState(false)
  const [lastBooking,  setLastBooking] = useState(null)
  const [bookingLoading, setBookingLoading] = useState(false)
  const [bookingError, setBookingError] = useState('')

  const handleBack = () => {
    if (showConfirm) return setShowConfirm(false)
    if (typeof onBack === 'function') return onBack()
    if (window.history.length > 1) return navigate(-1)
    return navigate('/student-dashboard', { replace: true })
  }

  const handleLogout = async () => {
    try {
      await authService.logout()
    } finally {
      navigate('/auth/login', { replace: true })
    }
  }

  useEffect(() => {
    const el = document.createElement('style')
    el.id    = 'ts-styles'
    el.innerHTML = CSS
    if (!document.getElementById('ts-styles')) document.head.appendChild(el)
    return () => { const s=document.getElementById('ts-styles'); if(s) s.remove() }
  }, [])

  useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode)
    localStorage.setItem('pt-dark', darkMode?'1':'0')
  }, [darkMode])

  useEffect(() => {
    let ignore = false
    ;(async () => {
      try {
        const payload = await trainingService.getBookings()
        if (ignore) return
        const rows = payload?.data || []
        const next = {}
        rows.forEach((row) => {
          const normalized = normalizeBookingRow(row)
          if (normalized) next[normalized.key] = normalized.booking
        })
        setBookedSlots(next)
      } catch {
        if (!ignore) setBookedSlots({})
      }
    })()
    return () => { ignore = true }
  }, [])

  // Open booking modal
  function openBooking(course, type) {
    setModalCourse(course)
    setModalType(type)
    setBookingError('')
    setShowModal(true)
  }

  // Handle booking confirm
  async function handleConfirm({ slot, info, courseName, type }) {
    if (!modalCourse?.id || !slot) return
    setBookingError('')
    setBookingLoading(true)
    try {
      const payload = await trainingService.bookSlot({
        trainingSkillId: modalCourse.id,
        slotId: slot,
      })
      const row = payload?.data
      const normalized = normalizeBookingRow(row, {
        training_skill_id: modalCourse.id,
        slot_id: slot,
        start_time: info?.start_time,
        end_time: info?.end_time,
        courseName,
        skill_type: type === 'pbl' ? 'PBL' : 'PS',
      })
      if (!normalized) throw new Error('Booking failed')
      setBookedSlots(prev => ({ ...prev, [normalized.key]: normalized.booking }))
      setLastBooking(normalized.booking)
      setShowModal(false)
      setShowConfirm(true)
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Booking failed'
      setBookingError(msg)
    } finally {
      setBookingLoading(false)
    }
  }

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)' }}>
      {/* ── Header ──────────────────────────────────────────────
          Desktop: [← Back] [icon + title]  ···  [UserIdentity] [BookedSlots] [Dark] [Logout]
          Mobile:  [icon + title]            ···  [Dark]
          (Back + BookedSlots move to .pt-mobile-topbar in content)
      */}
      <div className="pt-header">
        {/* Left: back button (hidden on mobile) + branding */}
        <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
          {/* back btn — hidden on mobile via CSS */}
          <div className="pt-header-back-wrap">
            <button type="button" className="pt-header-back" onClick={handleBack} aria-label="Back">
              ← Back
            </button>
          </div>
          <div className="pt-header-icon">🏅</div>
          <div>
            <div className="pt-header-title">Training Slots</div>
            <div className="pt-header-sub">PS &amp; PBL Lab Booking</div>
          </div>
        </div>

        {/* Right: actions */}
        <div className="pt-header-actions" style={{ display:'flex', alignItems:'center', gap:10 }}>
          {/* UserIdentity — hidden on mobile */}
          <div className="pt-header-user-wrap">
            <UserIdentity user={user} />
          </div>
          {/* BookedSlotsPopup — hidden on mobile (shown in mobile topbar instead) */}
          <div className="pt-header-booked-wrap">
            <BookedSlotsPopup bookedSlots={bookedSlots} />
          </div>
          {/* Dark toggle — always visible */}
          <button className="pt-dark-toggle" onClick={()=>setDarkMode(d=>!d)}>
            {darkMode?'☀ Light':'🌙 Dark'}
          </button>
          {/* Logout — hidden on mobile */}
          <div className="pt-header-logout-wrap">
            <button
              type="button"
              className="pt-icon-btn"
              onClick={handleLogout}
              aria-label="Logout"
              title="Logout"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M10 7V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M15 12H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M6 9l-3 3 3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pt-content">

        {/* ── Mobile-only top bar: ← Back on left, Booked Slots on right ── */}
        <div className="pt-mobile-topbar">
          <button type="button" className="pt-header-back" onClick={handleBack} aria-label="Back">
            ← Back
          </button>
          <BookedSlotsPopup bookedSlots={bookedSlots} />
        </div>

        {/* Booking Confirm page */}
        {showConfirm && lastBooking ? (
          <>
            <BookingConfirm booking={lastBooking} onDone={()=>setShowConfirm(false)} />
          </>
        ) : (
          <>
            <div className="pt-tabs">
              <button className={`pt-tab${tab==='ps'?' active':''}`}  onClick={()=>setTab('ps')}>PS Training Slots</button>
              <button className={`pt-tab${tab==='pbl'?' active':''}`} onClick={()=>setTab('pbl')}>PBL Training Slots</button>
            </div>
            {tab==='ps'  && <PSSection  bookedSlots={bookedSlots} onBookSlot={(c)=>openBooking(c,'ps')}/>}
            {tab==='pbl' && <PBLSection bookedSlots={bookedSlots} onBookSlot={(c)=>openBooking(c,'pbl')}/>}
          </>
        )}
      </div>

      {/* Booking Modal */}
      <BookingModal
        isOpen={showModal}
        onClose={()=>setShowModal(false)}
        onConfirm={handleConfirm}
        courseName={modalCourse?.name + (modalType==='ps'?' — PS Training':' — PBL Session')}
        type={modalType}
        trainingSkillId={modalCourse?.id}
        confirming={bookingLoading}
        confirmError={bookingError}
      />
    </div>
  )
}