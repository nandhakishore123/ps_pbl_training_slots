// PointsDashboard.jsx — Complete Standalone File
// Reward Points listing → BASE_API (Google Apps Script) — logic from RewardPoints.jsx
// Reward Points details modal → PRANESH_BASE (Gradio API)
// Activity Points → pointsService (unchanged)
// Usage: import PointsDashboard from './PointsDashboard.jsx'
//        <PointsDashboard onBack={() => {}} />

import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../../services/features/authService'
import { pointsService } from '../../services/features/pointsService'
import { useAuthStore } from '../../store/authStore'

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

function UserIdentityMobile({ user }) {
  if (!user) return null
  const name = user?.name || 'User'
  const initials = String(name).trim()?.charAt(0)?.toUpperCase() || 'U'
  return (
    <div style={{ display:'flex', alignItems:'center', gap:7, padding:'3px 10px 3px 3px', background:'var(--white)', border:'1.5px solid var(--border)', borderRadius:50, maxWidth:130 }}>
      <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--purple-dim)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, color:'var(--purple)', flexShrink:0 }}>
        {initials}
      </div>
      <div style={{ fontSize:12, fontWeight:700, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</div>
    </div>
  )
}

// ── CSS ───────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Outfit:wght@600;700;800;900&display=swap');

  :root {
    --purple:      #6c47ff;
    --purple-dim:  rgba(108,71,255,0.1);
    --purple-glow: rgba(108,71,255,0.3);
    --bg:          #f0f2f8;
    --white:       #fff;
    --border:      #e5e4eb;
    --text:        #1a1a2e;
    --text2:       #6b7280;
    --text3:       #9ca3af;
    --green:       #10b981;
    --red:         #ef4444;
    --gold:        #f59e0b;
    --silver:      #9ca3af;
    --bronze:      #b87a3c;
    --font-head:   'Outfit', sans-serif;
    --font-body:   'Plus Jakarta Sans', sans-serif;
  }
  body.dark-mode {
    --bg:#0f0f1a; --white:#1a1a2e; --border:#2d2d4e;
    --text:#e8e6f0; --text2:#a89ec9; --text3:#6b6b8a;
  }
  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
  html, body, #root { min-height:100vh; width:100%; }
  body { background:var(--bg); font-family:var(--font-body); color:var(--text); -webkit-font-smoothing:antialiased; }

  /* HEADER */
  .pt-header { background:var(--white); border-bottom:1px solid var(--border); padding:16px 24px; display:flex; align-items:center; justify-content:space-between; gap:12px; position:sticky; top:0; z-index:100; box-shadow:0 1px 8px rgba(0,0,0,0.05); }
  .pt-header-icon { width:36px; height:36px; border-radius:10px; background:var(--purple-dim); display:flex; align-items:center; justify-content:center; font-size:18px; flex-shrink:0; }
  .pt-header-title { font-size:18px; font-weight:800; color:var(--text); font-family:var(--font-head); }
  .pt-header-sub { font-size:12px; color:var(--text3); margin-top:1px; }
  .pt-dark-toggle { background:none; border:1.5px solid var(--border); border-radius:20px; padding:5px 11px; cursor:pointer; font-size:13px; color:var(--text2); display:flex; align-items:center; gap:5px; transition:all 0.2s; font-family:var(--font-body); font-weight:600; white-space:nowrap; }
  .pt-dark-toggle:hover { border-color:var(--purple); color:var(--purple); }
  .pt-header-back { background:none; border:1.5px solid var(--border); border-radius:20px; padding:5px 11px; cursor:pointer; font-size:13px; color:var(--text2); display:flex; align-items:center; gap:6px; transition:all 0.2s; font-family:var(--font-body); font-weight:700; white-space:nowrap; }
  .pt-header-back:hover { border-color:var(--purple); color:var(--purple); background:var(--purple-dim); }
  .pt-icon-btn { width:36px; height:36px; border-radius:10px; background:none; border:1.5px solid var(--border); cursor:pointer; display:flex; align-items:center; justify-content:center; color:var(--text2); transition:all 0.2s; }
  .pt-icon-btn:hover { border-color:var(--purple); color:var(--purple); background:var(--purple-dim); }
  body.dark-mode .pt-header { background:#151525; border-bottom:1px solid #2d2d4e; }
  body.dark-mode .pt-dark-toggle { background:#1f1f3a; border-color:#2d2d4e; color:#a89ec9; }
  body.dark-mode .pt-header-back { background:#1f1f3a; border-color:#2d2d4e; color:#a89ec9; }
  body.dark-mode .pt-icon-btn { background:#1f1f3a; border-color:#2d2d4e; color:#a89ec9; }

  /* CONTENT */
  .pt-content { padding:16px 24px 32px; }

  /* BACK BUTTON */
  .pt-section-back { display:flex; align-items:center; gap:8px; background:var(--white); border:1.5px solid var(--border); color:var(--text2); padding:9px 16px; border-radius:10px; font-size:13px; font-weight:700; cursor:pointer; transition:all 0.2s; width:fit-content; margin-bottom:16px; font-family:var(--font-body); }
  .pt-section-back:hover { background:var(--purple-dim); border-color:rgba(108,71,255,0.3); color:var(--purple); }

  /* TABS */
  .pt-tabs { display:flex; gap:6px; margin-bottom:16px; background:var(--white); border-radius:12px; padding:5px; border:1px solid var(--border); }
  .pt-tab { flex:1; padding:10px 14px; border-radius:8px; border:none; background:transparent; font-size:13px; font-weight:700; color:var(--text2); cursor:pointer; transition:all 0.2s; font-family:var(--font-body); }
  .pt-tab.active { background:var(--purple); color:#fff; box-shadow:0 2px 8px var(--purple-glow); }
  body.dark-mode .pt-tabs { background:var(--white); border-color:var(--border); }

  /* SUBTABS */
  .pt-subtabs { display:flex; gap:8px; margin-bottom:14px; }
  .pt-subtab { padding:7px 16px; border-radius:20px; border:1px solid var(--border); background:transparent; font-size:12px; font-weight:700; color:var(--text2); cursor:pointer; transition:all 0.2s; font-family:var(--font-body); }
  .pt-subtab.active { background:var(--purple-dim); border-color:var(--purple-glow); color:var(--purple); }
  body.dark-mode .pt-subtab { border-color:#2d2d4e; }

  /* FILTERS */
  .pt-filters { display:flex; gap:10px; margin-bottom:14px; flex-wrap:wrap; }
  .pt-select { padding:8px 28px 8px 12px; border:1.5px solid var(--border); border-radius:8px; background:var(--white); font-size:13px; font-weight:600; color:var(--text); outline:none; cursor:pointer; appearance:none; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 8px center; font-family:var(--font-body); }
  .pt-select:focus { border-color:var(--purple); }
  .pt-search { flex:1; min-width:160px; padding:8px 14px; border:1.5px solid var(--border); border-radius:8px; background:var(--white); font-size:13px; color:var(--text); outline:none; font-family:var(--font-body); }
  .pt-search:focus { border-color:var(--purple); }
  .pt-search::placeholder { color:var(--text3); }
  body.dark-mode .pt-select, body.dark-mode .pt-search { background:var(--white); border-color:var(--border); color:var(--text); }

  /* MOTIVATOR */
  .pt-motivator { background:linear-gradient(135deg,rgba(108,71,255,0.08),rgba(108,71,255,0.03)); border:1px solid rgba(108,71,255,0.2); border-left:3px solid var(--purple); border-radius:10px; padding:12px 16px; margin-bottom:14px; font-size:13px; color:#5b4fdb; font-weight:500; display:flex; align-items:center; gap:10px; }
  .pt-motivator strong { font-weight:800; }
  .pt-count { font-size:11px; color:var(--text3); text-align:right; margin-bottom:8px; }

  /* TABLE */
  .pt-table-card { background:var(--white); border-radius:14px; border:1px solid var(--border); overflow:hidden; }
  .pt-table-head { display:grid; grid-template-columns:56px 1fr 100px 90px; padding:10px 18px; background:linear-gradient(90deg,#f8f7ff,#f0eeff); font-size:10px; font-weight:800; color:var(--text3); letter-spacing:1.5px; text-transform:uppercase; border-bottom:1px solid var(--border); }
  .pt-table-head-with-btn { display:grid; grid-template-columns:56px 1fr 90px 100px 90px; padding:10px 18px; background:linear-gradient(90deg,#f8f7ff,#f0eeff); font-size:10px; font-weight:800; color:var(--text3); letter-spacing:1.5px; text-transform:uppercase; border-bottom:1px solid var(--border); }
  .pt-table-head-pts { text-align:right; }
  .pt-table-row { display:grid; grid-template-columns:56px 1fr 100px 90px; align-items:center; padding:12px 18px; border-bottom:1px solid #f3f4f6; transition:background 0.15s; animation:rowIn 0.3s ease both; }
  .pt-table-row-with-btn { display:grid; grid-template-columns:56px 1fr 90px 100px 90px; align-items:center; padding:12px 18px; border-bottom:1px solid #f3f4f6; transition:background 0.15s; animation:rowIn 0.3s ease both; }
  .pt-table-row:last-child, .pt-table-row-with-btn:last-child { border-bottom:none; }
  .pt-table-row:hover, .pt-table-row-with-btn:hover { background:#f8f7ff; }
  .pt-rank { font-size:15px; font-weight:900; color:var(--text3); }
  .pt-name { font-size:13px; font-weight:700; color:var(--text); }
  .pt-roll { font-size:11px; color:var(--text3); margin-top:2px; }
  .pt-dept { font-size:12px; color:var(--text2); font-weight:600; }
  .pt-pts  { font-size:16px; font-weight:900; color:var(--purple); text-align:right; }
  body.dark-mode .pt-table-card { background:var(--white); }
  body.dark-mode .pt-table-head, body.dark-mode .pt-table-head-with-btn { background:linear-gradient(90deg,#1f1f3a,#1a1a2e); }
  body.dark-mode .pt-table-row:hover, body.dark-mode .pt-table-row-with-btn:hover { background:#1f1f3a; }
  body.dark-mode .pt-table-row, body.dark-mode .pt-table-row-with-btn { border-bottom-color:#2d2d4e; }

  /* DETAILS BUTTON */
  .details-btn { display:inline-flex; align-items:center; gap:3px; padding:3px 9px; border-radius:20px; border:1px solid rgba(108,71,255,0.25); background:rgba(108,71,255,0.07); color:var(--purple); font-family:var(--font-body); font-size:10px; font-weight:700; cursor:pointer; transition:all 0.2s; white-space:nowrap; letter-spacing:0.5px; }
  .details-btn:hover { background:rgba(108,71,255,0.16); border-color:var(--purple); }

  /* GROUP CARDS */
  .pt-grp-card { display:grid; grid-template-columns:48px 1fr auto; align-items:center; gap:16px; padding:16px 20px; background:var(--white); border:1px solid var(--border); border-radius:12px; margin-bottom:8px; transition:all 0.2s; animation:rowIn 0.3s ease both; }
  .pt-grp-card:hover { border-color:rgba(108,71,255,0.3); box-shadow:0 2px 12px rgba(108,71,255,0.08); }
  .pt-grp-rank { font-size:17px; font-weight:900; color:var(--text3); }
  .pt-grp-id   { font-size:15px; font-weight:800; color:var(--text); }
  .pt-grp-meta { font-size:12px; color:var(--text3); margin-top:3px; }
  .pt-grp-pts-wrap { text-align:right; }
  .pt-grp-pts { font-size:18px; font-weight:900; color:var(--purple); line-height:1.1; }
  .pt-grp-avg-label { font-size:10px; color:var(--text3); margin-top:2px; letter-spacing:0.3px; }
  body.dark-mode .pt-grp-card { background:var(--white); border-color:var(--border); }

  /* ACTIVITY INDIVIDUAL TABLE */
  .pt-act-table-card { background:var(--white); border-radius:14px; border:1px solid var(--border); overflow:hidden; }
  .pt-act-table-head { display:grid; grid-template-columns:72px 1fr 140px 100px; padding:10px 20px; background:linear-gradient(90deg,#f8f7ff,#f0eeff); font-size:10px; font-weight:800; color:var(--text3); letter-spacing:1.5px; text-transform:uppercase; border-bottom:1px solid var(--border); }
  .pt-act-table-head-pts { text-align:right; }
  .pt-act-table-row { display:grid; grid-template-columns:72px 1fr 140px 100px; align-items:center; padding:13px 20px; border-bottom:1px solid #f3f4f6; transition:background 0.15s; animation:rowIn 0.3s ease both; }
  .pt-act-table-row:last-child { border-bottom:none; }
  .pt-act-table-row:hover { background:#f8f7ff; }
  .pt-act-rank { font-size:15px; font-weight:900; color:var(--text3); }
  .pt-act-name { font-size:13px; font-weight:700; color:var(--text); }
  .pt-act-roll-wrap { display:flex; align-items:center; gap:6px; margin-top:3px; }
  .pt-act-roll { font-size:11px; color:var(--text3); }
  .pt-act-year-badge { font-size:10px; font-weight:700; color:var(--purple); background:var(--purple-dim); border-radius:10px; padding:1px 7px; white-space:nowrap; }
  .pt-act-dept-year { font-size:12px; font-weight:600; color:var(--text2); }
  .pt-act-pts { font-size:16px; font-weight:900; color:var(--purple); text-align:right; }
  .pt-act-count { font-size:11px; color:var(--text3); text-align:right; margin-bottom:8px; }
  body.dark-mode .pt-act-table-card { background:var(--white); }
  body.dark-mode .pt-act-table-head { background:linear-gradient(90deg,#1f1f3a,#1a1a2e); }
  body.dark-mode .pt-act-table-row { border-bottom-color:#2d2d4e; }
  body.dark-mode .pt-act-table-row:hover { background:#1f1f3a; }

  /* SPINNER */
  .pt-spinner-wrap { text-align:center; padding:40px 20px; }
  .pt-spinner { width:32px; height:32px; border:3px solid var(--border); border-top-color:var(--purple); border-radius:50%; animation:spin 0.7s linear infinite; margin:0 auto 12px; }
  .pt-spinner-text { font-size:13px; color:var(--text2); font-weight:600; }
  .pt-empty { text-align:center; padding:40px 20px; color:var(--text3); font-size:14px; }

  /* DETAILS MODAL */
  .pt-details-overlay {
    position:fixed; inset:0; background:rgba(0,0,0,0.5);
    z-index:10001; display:flex; align-items:center; justify-content:center;
    padding:20px; backdrop-filter:blur(4px);
  }
  .pt-details-modal {
    background:var(--white); border-radius:20px; width:100%;
    max-width:560px; max-height:85vh; overflow:hidden;
    display:flex; flex-direction:column;
    animation:modalIn 0.3s cubic-bezier(0.22,1,0.36,1) both;
    box-shadow:0 24px 60px rgba(0,0,0,0.2);
  }
  .pt-details-header {
    background:linear-gradient(135deg,#1e1b3a,#2d1f5e);
    padding:20px 24px; display:flex; align-items:center;
    justify-content:space-between; flex-shrink:0;
  }
  .pt-details-name { font-size:17px; font-weight:800; color:#fff; font-family:var(--font-head); }
  .pt-details-roll { font-size:11px; color:rgba(255,255,255,0.6); margin-top:3px; letter-spacing:1px; }
  .pt-details-close {
    width:32px; height:32px; border-radius:50%;
    border:1px solid rgba(255,255,255,0.2); background:transparent;
    color:rgba(255,255,255,0.7); display:flex; align-items:center;
    justify-content:center; cursor:pointer; font-size:16px; transition:all 0.2s;
    flex-shrink:0;
  }
  .pt-details-close:hover { background:rgba(255,255,255,0.1); color:#fff; }
  .pt-details-body {
    overflow-y:auto;
    -webkit-overflow-scrolling:touch;
    padding:20px;
    display:flex; flex-direction:column; gap:14px;
    flex:1;
    min-height:0;
  }
  .pt-details-total {
    display:flex; align-items:center; justify-content:space-between;
    background:rgba(108,71,255,0.07); border:1px solid rgba(108,71,255,0.2);
    border-radius:10px; padding:16px 20px;
  }
  .pt-details-total-label { font-size:13px; font-weight:600; color:var(--text2); }
  .pt-details-total-val { font-size:24px; font-weight:900; color:var(--purple); font-family:var(--font-head); }
  .pt-details-group { border:1px solid var(--border); border-radius:12px; overflow:hidden; margin-bottom:2px; }
  .pt-details-group-hdr {
    display:flex; align-items:center; justify-content:space-between;
    padding:11px 16px; font-size:11px; font-weight:800;
    letter-spacing:1px; text-transform:uppercase;
  }
  .pt-details-group-total { font-size:13px; font-weight:900; }
  .pt-details-item {
    display:flex; align-items:flex-start; justify-content:space-between;
    gap:12px; padding:11px 16px; border-top:1px solid var(--border); transition:background 0.15s;
  }
  .pt-details-item:hover { background:#f8f7ff; }
  .pt-details-item-name { font-size:13px; font-weight:600; color:var(--text); line-height:1.4; }
  .pt-details-item-date { font-size:11px; color:var(--text3); margin-top:2px; }
  .pt-details-item-pts { font-size:14px; font-weight:800; color:var(--purple); white-space:nowrap; flex-shrink:0; }
  body.dark-mode .pt-details-item:hover { background:#1f1f3a; }
  body.dark-mode .pt-details-modal { background:var(--white); }

  @keyframes rowIn  { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
  @keyframes spin   { to{transform:rotate(360deg)} }
  @keyframes modalIn { from{opacity:0;transform:translateY(24px) scale(0.96)} to{opacity:1;transform:translateY(0) scale(1)} }

  /* ── MOBILE/DESKTOP VISIBILITY HELPERS ── */
  .pt-col-desktop-only { /* visible by default */ }
  .pt-col-mobile-year { display: none; font-size:11px; color:var(--text2); font-weight:600; }
  .pt-details-mobile-inline { display: none !important; }
  .pt-hdr-right-mobile { display: none; }
  .pt-hdr-right-desktop { display: flex; }
  .pt-section-back-mobile-only { display: none; }

  /* ── RESPONSIVE ── */
  @media (max-width: 640px) {
    .pt-header { padding: 12px 16px; gap: 8px; }
    .pt-header-sub { font-size: 11px; white-space: normal; line-height: 1.3; }
    .pt-hdr-right-desktop { display: none !important; }
    .pt-hdr-right-mobile {
      display: flex !important;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }
    .pt-content { padding: 14px 14px 24px; }
    .pt-section-back-mobile-only { display: flex !important; }
    .pt-section-back { margin-bottom: 14px; padding: 8px 14px; font-size: 13px; }
    .pt-tabs { flex-direction: row; gap: 4px; padding: 4px; }
    .pt-tab { padding: 9px 8px; font-size: 12px; }
    .pt-subtabs { flex-wrap: wrap; gap: 6px; }
    .pt-subtab { padding: 6px 12px; font-size: 11px; }
    .pt-filters { gap: 8px; }
    .pt-select { font-size: 12px; padding: 7px 24px 7px 10px; }
    .pt-search { font-size: 12px; min-width: 100%; }
    .pt-table-head-with-btn {
      grid-template-columns: 44px 1fr 68px;
      padding-left: 12px;
      padding-right: 12px;
      font-size: 9px;
      letter-spacing: 1px;
    }
    .pt-table-row-with-btn {
      grid-template-columns: 44px 1fr 68px;
      padding-left: 12px;
      padding-right: 12px;
    }
    .pt-col-desktop-only { display: none !important; }
    .pt-col-mobile-year { display: block !important; font-size: 11px; color: var(--text2); font-weight: 600; white-space: nowrap; }
    .pt-details-mobile-inline { display: inline-flex !important; margin-top: 5px; }
    .pt-table-head, .pt-table-row {
      grid-template-columns: 44px 1fr 80px 70px;
      padding-left: 12px;
      padding-right: 12px;
    }
    .pt-act-table-head, .pt-act-table-row {
      grid-template-columns: 44px 1fr 56px 70px;
      padding-left: 10px;
      padding-right: 10px;
    }
    .pt-act-table-head { font-size: 9px; letter-spacing: 1px; }
    .pt-act-name { font-size: 12px; }
    .pt-act-roll { font-size: 10px; }
    .pt-act-dept-year { font-size: 11px; }
    .pt-act-pts { font-size: 14px; }
    .pt-grp-card {
      grid-template-columns: 40px 1fr auto;
      gap: 10px;
      padding: 14px 12px;
    }
    .pt-grp-pts-wrap { text-align: right; }
    .pt-grp-id { font-size: 14px; }
    .pt-grp-meta { font-size: 11px; }
    .pt-grp-pts { font-size: 16px; }
    .pt-details-modal { max-width: 96vw; max-height: 90vh; }
    .pt-details-body { padding: 14px; gap: 10px; }
    .pt-details-header { padding: 16px 18px; }
    .pt-details-name { font-size: 15px; }
  }
`

// ── Constants ─────────────────────────────────────────────────
// PRANESH_BASE: Gradio API — used for Reward Points details
const PRANESH_BASE = 'https://praneshjs-rewardpointssite.hf.space'

const DEPTS = ['AGRI','AIDS','AIML','BIOMEDICAL','BT','CIVIL','CSBS','CSD','CSE','CT','EEE','ECE','EIE','FT','ISE','IT','MECH','MTRS']

const DEPT_NAMES = {
  AGRI:'Agricultural Engg', AIDS:'AI & Data Science', AIML:'AI & ML',
  BIOMEDICAL:'Biomedical', BT:'Biotechnology', CIVIL:'Civil Engg',
  CSBS:'CS & Business Systems', CSD:'CS & Design', CSE:'Computer Science',
  CT:'Computer Technology', EEE:'Electrical & Electronics', ECE:'Electronics & Comm',
  EIE:'Electronics & Instr', FT:'Fashion Technology', ISE:'Info Science & Engg',
  IT:'Information Technology', MECH:'Mechanical Engg', MTRS:'Mechatronics',
}

// ── getCatGroupStyle ──────────────────────────────────────────
function getCatGroupStyle(cat) {
  const c = (cat||'').toUpperCase()
  if (c.includes('P SKILL') || c.includes('SKILL'))
    return { bg:'#eff6ff', border:'rgba(59,130,246,0.3)', hdr:'#1e40af' }
  if (c.includes('INITIATIVE'))
    return { bg:'#f0fdf4', border:'rgba(34,197,94,0.3)',  hdr:'#15803d' }
  if (c.includes('HACKATHON') || c.includes('TECHNICAL'))
    return { bg:'#fdf4ff', border:'rgba(168,85,247,0.3)', hdr:'#7e22ce' }
  if (c.includes('PROJECT'))
    return { bg:'#fff7ed', border:'rgba(249,115,22,0.3)', hdr:'#c2410c' }
  return { bg:'#f8fafc', border:'rgba(148,163,184,0.3)', hdr:'#475569' }
}

// ── parseCourseDetails ────────────────────────────────────────
function parseCourseDetails(raw) {
  const lines = raw.split('\n').map(l=>l.trim()).filter(Boolean)
  const courses = []
  let totalPoints = 0
  const tm = raw.match(/TOTAL REWARD POINTS FROM ACTIVITIES:\s*([\d.]+)/i)
  if (tm) totalPoints = parseFloat(tm[1])
  for (const line of lines) {
    const m2 = line.match(/^\d+\.\s+(.+?)\s*-\s*\(([^)]+)\)\s*-\s*([\d.]+)\s*pts$/i)
    if (m2) {
      const [,lbl,dr,pts] = m2
      const [cat,...np] = lbl.trim().split(':')
      courses.push({ category:cat.trim(), name:np.length?np.join(':').trim():lbl.trim(), dateRange:dr.trim(), points:parseFloat(pts) })
      continue
    }
    const m1 = line.match(/^\d+\.\s+(.+?)\s*-\s*([\d.]+)\s*pts$/i)
    if (m1) {
      const [,lbl,pts] = m1
      const [cat,...np] = lbl.trim().split(':')
      courses.push({ category:cat.trim(), name:np.length?np.join(':').trim():lbl.trim(), dateRange:null, points:parseFloat(pts) })
    }
  }
  return { courses, totalPoints }
}



// ── GroupDetailsModal (unchanged — uses pointsService) ─────────
function GroupDetailsModal({ isOpen, onClose, group }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen || !group?.group_id) return
    let ignore = false
    setLoading(true)
    setError('')
    pointsService.getGroupMembersPoints(group.group_id)
      .then(res => { if(!ignore) setMembers(res?.data?.items||[]) })
      .catch(err => { if(!ignore) setError('Failed to fetch members') })
      .finally(() => { if(!ignore) setLoading(false) })
    return () => { ignore = true }
  }, [isOpen, group])

  if (!isOpen || !group) return null

  const roleOrder   = ['Captain','Vice Captain','Manager','Strategist']
  const sorted      = [...members].sort((a,b) => {
    const ai=roleOrder.indexOf(a.role_name), bi=roleOrder.indexOf(b.role_name)
    if (ai!==-1&&bi!==-1) return ai-bi
    if (ai!==-1) return -1
    if (bi!==-1) return 1
    return 0
  })
  const leaders     = sorted.filter(m=>roleOrder.includes(m.role_name))
  const teamMembers = sorted.filter(m=>!roleOrder.includes(m.role_name))

  return (
    <div className="pt-details-overlay" onClick={e=>{if(e.target===e.currentTarget) onClose()}}>
      <div className="pt-details-modal">
        <div className="pt-details-header">
          <div>
            <div className="pt-details-name">{group.group_id || group.id}</div>
            <div className="pt-details-roll">
              {Number(group.member_count||group.members?.length||0)} members · Avg {Number(group.avg_points||group.avgPts||0).toLocaleString()} pts
            </div>
          </div>
          <button className="pt-details-close" onClick={onClose}>✕</button>
        </div>
        <div className="pt-details-body">
          {loading ? (
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:14,padding:'50px 20px',color:'var(--text2)',fontSize:14}}>
              <div className="pt-spinner"/>
              <p>Fetching members for <strong>{group.group_id}</strong>...</p>
            </div>
          ) : error ? (
            <div style={{textAlign:'center',padding:'50px 20px',color:'var(--text3)',fontSize:14}}>{error}</div>
          ) : (
            <>
              <div className="pt-details-total">
                <span className="pt-details-total-label" style={{fontSize:11,fontWeight:800,letterSpacing:1,textTransform:'uppercase'}}>Group Average</span>
                <span style={{fontSize:22,fontWeight:900,color:'var(--purple)',fontFamily:'var(--font-head)'}}>
                  {Number(group.avg_points||group.avgPts||0).toLocaleString()}
                  <span style={{fontSize:12,fontWeight:600,marginLeft:4}}>avg pts</span>
                </span>
              </div>
              {leaders.length > 0 && (
                <>
                  <div style={{fontSize:11,fontWeight:800,letterSpacing:1,color:'var(--text2)',textTransform:'uppercase',marginBottom:4}}>
                    Leadership
                  </div>
                  {leaders.map((m,i)=>(
                    <div key={i} style={{borderBottom:'1px solid var(--border)',padding:'12px 4px'}}>
                      <div style={{fontSize:10,fontWeight:700,color:'var(--purple)',marginBottom:4}}>{m.role_name}</div>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
                        <div>
                          <div style={{fontSize:13,fontWeight:700,color:'var(--text)'}}>{m.name}</div>
                          <div style={{fontSize:11,color:'var(--text2)',marginTop:2}}>{m.reg_num}</div>
                        </div>
                        <div style={{fontSize:12,fontWeight:700,color:'var(--purple)',whiteSpace:'nowrap'}}>
                          {m.points_available ? m.points_available.toLocaleString()+' pts' : '—'}
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
              {teamMembers.length > 0 && (
                <>
                  <div style={{fontSize:11,fontWeight:800,letterSpacing:1,color:'var(--text2)',textTransform:'uppercase',margin:'10px 0 4px'}}>
                    Team Members ({teamMembers.length})
                  </div>
                  {teamMembers.map((m,i)=>(
                    <div key={i} style={{borderBottom:'1px solid var(--border)',padding:'12px 4px'}}>
                      <div style={{fontSize:10,fontWeight:700,color:'var(--text2)',marginBottom:4}}>
                        Team Member {String(i+1).padStart(2,'0')}
                      </div>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
                        <div>
                          <div style={{fontSize:13,fontWeight:600,color:'var(--text)'}}>{m.name}</div>
                          <div style={{fontSize:11,color:'var(--text2)',marginTop:2}}>{m.reg_num}</div>
                        </div>
                        <div style={{fontSize:12,fontWeight:700,color:'var(--purple)',whiteSpace:'nowrap'}}>
                          {m.points_available ? m.points_available.toLocaleString()+' pts' : '—'}
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────
function RankCell({rank}) {
  return <span className="pt-rank">#{rank+1}</span>
}
function Spinner({text}) {
  return <div className="pt-spinner-wrap"><div className="pt-spinner"/><div className="pt-spinner-text">{text}</div></div>
}

// ── highlight: case-insensitive <mark> highlighter ────────────
function highlight(text, search) {
  const t = String(text)
  if (!search) return t
  const out = []
  const upper = t.toUpperCase()
  const su = search.toUpperCase()
  let i = 0, key = 0
  if (!su.length) return t
  while (true) {
    const idx = upper.indexOf(su, i)
    if (idx === -1) { out.push(t.slice(i)); break }
    if (idx > i) out.push(t.slice(i, idx))
    out.push(<mark key={key++}>{t.slice(idx, idx + su.length)}</mark>)
    i = idx + su.length
  }
  return out
}

// ── RewardPoints: inline details via PRANESH_BASE Gradio API ────
function RewardPoints({ user }) {
  const [status, setStatus] = useState('loading') // loading | done | error
  const [raw,    setRaw]    = useState('')
  const [errMsg, setErrMsg] = useState('')

  const fetchData = useCallback(async (r) => {
    try {
      const submitRes = await fetch(`${PRANESH_BASE}/gradio_api/call/search_student`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ data:[r] }),
      })
      if (!submitRes.ok) throw new Error(`HTTP ${submitRes.status}`)
      const { event_id } = await submitRes.json()
      if (!event_id) throw new Error('No event_id')
      const rawText = await new Promise((resolve, reject) => {
        const src   = new EventSource(`${PRANESH_BASE}/gradio_api/call/search_student/${event_id}`)
        const timer = setTimeout(() => { src.close(); reject(new Error('Timeout')) }, 30000)
        src.addEventListener('complete', (e) => {
          clearTimeout(timer); src.close()
          try { resolve(String(JSON.parse(e.data)[0]||'')) }
          catch { reject(new Error('Parse error')) }
        })
        src.onmessage = (e) => {
          if (e.data && e.data !== '[DONE]') {
            try {
              const d = JSON.parse(e.data)
              if (Array.isArray(d) && d[0]) { clearTimeout(timer); src.close(); resolve(String(d[0])) }
            } catch {}
          }
        }
        src.onerror = () => { clearTimeout(timer); src.close(); reject(new Error('Stream error')) }
      })
      if (!rawText || rawText.trim().length < 10) {
        setErrMsg(`No data found for ${r}.`); setStatus('error')
      } else {
        setRaw(rawText); setStatus('done')
      }
    } catch(err) {
      setErrMsg(err.message||'Failed to fetch.'); setStatus('error')
    }
  }, [])

  useEffect(() => {
    if (!user?.reg_num) return
    setStatus('loading'); setRaw(''); setErrMsg('')
    fetchData(user.reg_num)
  }, [user?.reg_num, fetchData])

  const { courses, totalPoints } = status==='done' ? parseCourseDetails(raw) : { courses:[], totalPoints:0 }
  const grouped = {}
  for (const c of courses) {
    if (!grouped[c.category]) grouped[c.category] = []
    grouped[c.category].push(c)
  }

  return (
    <div style={{ marginTop: 16 }}>
      <div className="pt-count" style={{ marginBottom: 12 }}>
        Your Reward Points Details
      </div>

      {status === 'loading' && (
        <Spinner text="Fetching your detailed reward points..." />
      )}

      {status === 'error' && (
        <div className="pt-empty" style={{ color: 'var(--red)' }}>{errMsg}</div>
      )}

      {status === 'done' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {!courses.length ? (
            <div className="pt-empty">No course activity found.</div>
          ) : (
            <>
              {totalPoints > 0 && (
                <div className="pt-details-total">
                  <span className="pt-details-total-label">Total Points from Activities</span>
                  <span className="pt-details-total-val">{totalPoints.toLocaleString()} pts</span>
                </div>
              )}
              {Object.entries(grouped).map(([cat, items]) => {
                const s = getCatGroupStyle(cat)
                const grpTotal = items.reduce((a,c)=>a+c.points,0)
                return (
                  <div className="pt-details-group" key={cat}>
                    <div className="pt-details-group-hdr" style={{background:s.bg, color:s.hdr, borderBottom:`1px solid ${s.border}`}}>
                      <span>{cat}</span>
                      <span className="pt-details-group-total">{grpTotal.toLocaleString()} PTS</span>
                    </div>
                    {items.map((c,i)=>(
                      <div className="pt-details-item" key={i}>
                        <div>
                          <div className="pt-details-item-name">{c.name}</div>
                          {c.dateRange && <div className="pt-details-item-date">{c.dateRange}</div>}
                        </div>
                        <div className="pt-details-item-pts">+{c.points.toLocaleString()} pts</div>
                      </div>
                    ))}
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── ActivityPoints (unchanged — uses pointsService) ───────────
function ActivityPoints({ onOpenGroup }) {
  const [apTab,    setApTab]    = useState('individual')
  const [apYear,   setApYear]   = useState('ALL')
  const [apDept,   setApDept]   = useState('ALL')
  const [apSearch, setApSearch] = useState('')
  const [grpSearch,setGrpSearch]= useState('')
  const [indData,   setIndData]   = useState([])
  const [indLoading,setIndLoading]= useState(false)
  const [indError,  setIndError]  = useState('')
  const [grpData,   setGrpData]   = useState([])
  const [grpLoading,setGrpLoading]= useState(false)
  const [grpError,  setGrpError]  = useState('')

  const loadIndividuals = useCallback(async () => {
    setIndLoading(true); setIndError('')
    try {
      const payload = await pointsService.getActivityIndividualRanking({
        course: apDept==='ALL'?undefined:apDept,
        year:apYear, search:apSearch,
        limit:apSearch?200:100, offset:0,
      })
      setIndData(payload?.data?.items||[])
    } catch { setIndError('Failed to load. Check connection.'); setIndData([]) }
    finally { setIndLoading(false) }
  }, [apDept,apYear,apSearch])

  const loadGroups = useCallback(async () => {
    setGrpLoading(true); setGrpError('')
    try {
      const payload = await pointsService.getGroupAverageRanking({
        search:grpSearch, limit:grpSearch?200:20, offset:0,
      })
      setGrpData(payload?.data?.items||[])
    } catch { setGrpError('Failed to load. Check connection.'); setGrpData([]) }
    finally { setGrpLoading(false) }
  }, [grpSearch])

  useEffect(() => {
    if (apTab!=='individual') return
    const t = setTimeout(()=>loadIndividuals(),250)
    return ()=>clearTimeout(t)
  }, [apTab,loadIndividuals])

  useEffect(() => {
    if (apTab!=='group') return
    const t = setTimeout(()=>loadGroups(),250)
    return ()=>clearTimeout(t)
  }, [apTab,loadGroups])

  const filtInd = [...indData].sort((a,b)=>Number(b.points_available||0)-Number(a.points_available||0))
  const filtGrp = [...grpData].sort((a,b)=>Number(b.avg_points||0)-Number(a.avg_points||0))
  const showInd = apSearch?filtInd:filtInd.slice(0,100)
  const showGrp = grpSearch?filtGrp:filtGrp.slice(0,20)

  return (
    <div>
      <div className="pt-subtabs">
        <button className={`pt-subtab${apTab==='individual'?' active':''}`} onClick={()=>setApTab('individual')}>Individual Ranking</button>
        <button className={`pt-subtab${apTab==='group'?' active':''}`}      onClick={()=>setApTab('group')}>Group Average Ranking</button>
      </div>

      {apTab==='individual' && (
        <div>
          <div className="pt-filters">
            <select className="pt-select" value={apYear} onChange={e=>setApYear(e.target.value)}>
              <option value="ALL">All Years</option>
              <option value="2nd">2nd Year</option>
              <option value="1st">1st Year</option>
            </select>
            <select className="pt-select" value={apDept} onChange={e=>setApDept(e.target.value)}>
              <option value="ALL">All Depts</option>
              {DEPTS.map(d=><option key={d} value={d}>{d}</option>)}
            </select>
            <input className="pt-search" placeholder="e.g. Gowtham J / 7376242AL126" value={apSearch} onChange={e=>setApSearch(e.target.value)}/>
          </div>
          {indLoading && <Spinner text="Loading activity rankings..."/>}
          {indError   && <div className="pt-empty" style={{color:'var(--red)'}}>{indError}</div>}
          {!indLoading && !indError && (
            <>
              <div className="pt-act-count">Showing top {showInd.length} of {filtInd.length} students</div>
              <div className="pt-act-table-card">
                <div className="pt-act-table-head">
                  <div>Rank</div><div>Student</div><div>Dept/Year</div>
                  <div className="pt-act-table-head-pts">Act. Pts</div>
                </div>
                {showInd.length===0
                  ? <div className="pt-empty">No students found.</div>
                  : showInd.map((s,i)=>{
                    const y=Number(s.year_of_study)
                    const yrShort=y===1?'1st Yr':y===2?'2nd Yr':y===3?'3rd Yr':''
                    return (
                      <div className="pt-act-table-row" key={s.reg_num||i} style={{animationDelay:`${Math.min(i,20)*0.03}s`}}>
                        <div className="pt-act-rank"><RankCell rank={i}/></div>
                        <div>
                          <div className="pt-act-name">{s.name}</div>
                          <div className="pt-act-roll-wrap">
                            <span className="pt-act-roll">{s.reg_num}</span>
                            {yrShort && <span className="pt-act-year-badge">{yrShort}</span>}
                          </div>
                        </div>
                        <div className="pt-act-dept-year">{s.course||'-'}</div>
                        <div className="pt-act-pts">{Number(s.points_available||0).toLocaleString()}</div>
                      </div>
                    )
                  })
                }
              </div>
            </>
          )}
        </div>
      )}

      {apTab==='group' && (
        <div>
          <div className="pt-filters">
            <input className="pt-search" style={{flex:'none',width:180}} placeholder="e.g. A#100027" value={grpSearch} onChange={e=>setGrpSearch(e.target.value)}/>
          </div>
          {grpLoading && <Spinner text="Loading group rankings..."/>}
          {grpError   && <div className="pt-empty" style={{color:'var(--red)'}}>{grpError}</div>}
          {!grpLoading && !grpError && (
            <>
              <div className="pt-act-count">{filtGrp.length} groups ranked by average activity points</div>
              {showGrp.map((g,i)=>(
                <div className="pt-grp-card" key={g.group_id||i} style={{animationDelay:`${Math.min(i,20)*0.03}s`}}>
                  <div className="pt-grp-rank"><RankCell rank={i}/></div>
                  <div>
                    <div className="pt-grp-id">{g.group_id}{g.group_name?` · ${g.group_name}`:''}</div>
                    <div className="pt-grp-meta">
                      {g.captain_name?`Captain: ${g.captain_name} · `:''}
                      {Number(g.member_count||0)} members
                    </div>
                    <button className="details-btn" style={{marginTop:6}} onClick={()=>onOpenGroup?.(g)}>
                      Details
                    </button>
                  </div>
                  <div className="pt-grp-pts-wrap">
                    <div className="pt-grp-pts">{Number(g.avg_points||0).toLocaleString()}</div>
                    <div className="pt-grp-avg-label">avg pts</div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main PointsDashboard ──────────────────────────────────────
export default function PointsDashboard({ onBack }) {
  const navigate = useNavigate()
  const [tab,          setTab]          = useState('rp')
  const [darkMode,     setDarkMode]     = useState(()=>localStorage.getItem('pt-dark')==='1')
  const { user } = useAuthStore()
  const [groupOpen,    setGroupOpen]    = useState(false)
  const [selectedGroup,setSelectedGroup]= useState(null)

  const handleBack = () => {
    if (typeof onBack==='function') return onBack()
    if (window.history.length>1) return navigate(-1)
    return navigate('/student-dashboard',{replace:true})
  }

  const handleLogout = async () => {
    try { await authService.logout() }
    finally { navigate('/auth/login',{replace:true}) }
  }

  useEffect(() => {
    const el = document.createElement('style')
    el.id    = 'pd-styles'
    el.innerHTML = CSS
    if (!document.getElementById('pd-styles')) document.head.appendChild(el)
    return () => { const s=document.getElementById('pd-styles'); if(s) s.remove() }
  }, [])

  useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode)
    localStorage.setItem('pt-dark', darkMode?'1':'0')
  }, [darkMode])

  return (
    <div style={{minHeight:'100vh', background:'var(--bg)'}}>

      {/* ── Header ── */}
      <div className="pt-header">
        <div style={{display:'flex', alignItems:'center', gap:10, minWidth:0, flex:1}}>
          <div className="pt-header-icon">🏅</div>
          <div style={{minWidth:0}}>
            <div className="pt-header-title">Points Dashboard</div>
            <div className="pt-header-sub">Reward Points &amp; Activity Points Rankings</div>
          </div>
        </div>

        {/* Desktop right */}
        <div className="pt-hdr-right-desktop" style={{alignItems:'center', gap:10}}>
          <button type="button" className="pt-header-back" onClick={handleBack}>← Back</button>
          <UserIdentity user={user} />
          <button className="pt-dark-toggle" onClick={()=>setDarkMode(d=>!d)}>
            {darkMode?'☀ Light':'🌙 Dark'}
          </button>
          <button type="button" className="pt-icon-btn" onClick={handleLogout} title="Logout">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M10 7V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M15 12H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 9l-3 3 3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Mobile right */}
        <div className="pt-hdr-right-mobile">
          <UserIdentityMobile user={user} />
          <button className="pt-dark-toggle" onClick={()=>setDarkMode(d=>!d)}>
            {darkMode?'☀ Light':'Dark'}
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="pt-content">
        <button type="button" className="pt-section-back pt-section-back-mobile-only" onClick={handleBack}>
          ← Back
        </button>

        <div className="pt-tabs">
          <button className={`pt-tab${tab==='rp'?' active':''}`} onClick={()=>setTab('rp')}>Reward Points</button>
          <button className={`pt-tab${tab==='ap'?' active':''}`} onClick={()=>setTab('ap')}>Activity Points</button>
        </div>
        {tab==='rp' && <RewardPoints user={user}/>}
        {tab==='ap' && <ActivityPoints onOpenGroup={(g)=>{setSelectedGroup(g);setGroupOpen(true)}}/>}
      </div>

      {/* ── Modals ── */}
      {groupOpen && (
        <GroupDetailsModal
          isOpen={groupOpen}
          onClose={()=>setGroupOpen(false)}
          group={selectedGroup}
        />
      )}
    </div>
  )
}