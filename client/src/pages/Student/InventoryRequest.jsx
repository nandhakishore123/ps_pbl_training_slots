// InventoryRequest.jsx — Student inventory request (Stage 2: BUYING flow).
// Browse categories/items → build a cart → purpose + Project/Training → submit
// a PENDING buying request → Inventory Pass + "My Requests" list.
// Returning + approvals + stock changes come in later stages (see TODOs).
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, MotionConfig, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { authService } from '../../services/features/authService';
import { inventoryService } from '../../services/features/inventoryService';
import { trainingService } from '../../services/features/trainingService';
import UserProfileBadge from '../../components/UserProfileBadge';

// ── Scoped premium styles (self-contained; follows body.dark-mode) ──
// Shares its design language with the intern console (InternDashboard.css): the
// same layered-shadow scale, gradient surfaces, focus ring and easing curve, only
// under this page's own --iv-* names. Every selector is .inv-*-scoped — this
// stylesheet is injected into <head>, so an unscoped rule would leak app-wide.
// Motion split, same as the intern page: framer-motion owns `transform` on the
// elements it animates, CSS owns colour/shadow/opacity. Never both on one element.
const CSS = `
  .inv-root {
    /* brand */
    --iv-purple:#6c47ff; --iv-purple-2:#4b2fd6; --iv-purple-lt:#7d5cff;
    --iv-purple-dim:rgba(108,71,255,0.1); --iv-purple-soft:rgba(108,71,255,0.055);
    --iv-purple-glow:rgba(108,71,255,0.28);
    /* surfaces */
    --iv-bg:#f0f2f8; --iv-white:#fff; --iv-border:#e5e4eb;
    --iv-text:#1a1040; --iv-text2:#6b7280; --iv-text3:#9ca3af;
    --iv-green:#10b981; --iv-red:#ef4444; --iv-gold:#f59e0b;
    --iv-amber-ink:#b45309;
    /* premium surface system */
    --iv-card:linear-gradient(180deg,#fff 0%,#fbfbff 100%);
    --iv-glass:rgba(255,255,255,0.78);
    --iv-inset:#f6f6fc;
    --iv-hairline:rgba(26,16,64,0.08);
    --iv-shadow-sm:0 1px 2px rgba(26,16,64,0.04), 0 2px 8px rgba(26,16,64,0.04);
    --iv-shadow-md:0 2px 4px rgba(26,16,64,0.04), 0 10px 28px rgba(26,16,64,0.07);
    --iv-shadow-lg:0 8px 18px rgba(26,16,64,0.07), 0 26px 54px rgba(26,16,64,0.14);
    --iv-shadow-brand:0 6px 18px rgba(108,71,255,0.32), 0 2px 6px rgba(108,71,255,0.18);
    --iv-ring:0 0 0 3px rgba(108,71,255,0.16);
    --iv-r-lg:20px; --iv-r-md:14px; --iv-r-sm:11px;
    --iv-ease:cubic-bezier(.22,.61,.36,1);
    /* Reuses the app-wide font vars from index.css; the literal names are only a
       fallback for when this page renders outside that stylesheet. */
    --iv-font-head:var(--font-head,'Outfit','Segoe UI',system-ui,sans-serif);
    --iv-font-body:var(--font-body,'Plus Jakarta Sans','Segoe UI',system-ui,sans-serif);

    min-height:100vh; color:var(--iv-text);
    background:
      radial-gradient(1100px 560px at 12% -12%, rgba(108,71,255,0.07), transparent 62%),
      radial-gradient(900px 480px at 92% 4%, rgba(108,71,255,0.045), transparent 60%),
      var(--iv-bg);
    background-attachment:fixed;
    font-family:var(--iv-font-body);
    -webkit-font-smoothing:antialiased; -moz-osx-font-smoothing:grayscale;
  }
  body.dark-mode .inv-root {
    --iv-bg:#0f0f1a; --iv-white:#1a1a2e; --iv-border:#2d2d4e;
    --iv-text:#e8e6f0; --iv-text2:#a89ec9; --iv-text3:#6b6b8a;
    --iv-amber-ink:#fbbf24;
    --iv-card:linear-gradient(180deg,#1e1c33 0%,#191828 100%);
    --iv-glass:rgba(23,23,40,0.78);
    --iv-inset:rgba(11,10,24,0.5);
    --iv-hairline:rgba(255,255,255,0.07);
    --iv-purple-dim:rgba(108,71,255,0.16);
    --iv-purple-soft:rgba(108,71,255,0.08);
    --iv-shadow-sm:0 1px 2px rgba(0,0,0,0.28), 0 2px 8px rgba(0,0,0,0.22);
    --iv-shadow-md:0 2px 6px rgba(0,0,0,0.3), 0 12px 30px rgba(0,0,0,0.3);
    --iv-shadow-lg:0 10px 22px rgba(0,0,0,0.34), 0 28px 60px rgba(0,0,0,0.46);
    --iv-ring:0 0 0 3px rgba(108,71,255,0.26);
  }

  /* Outfit for headings (it carries a real 900), Plus Jakarta Sans for body copy. */
  .inv-card-title, .inv-req-id, .inv-obl-name { font-family:var(--iv-font-head); }

  /* ══ HEADER — COPIED FROM PointsDashboard.jsx (start) ══
     The Points Dashboard header is the template; this page reuses its .pt-* class
     names and its rules verbatim so the two headers render identically. That CSS
     lives in PointsDashboard's own injected <style id="pd-styles">, which is
     removed when that page unmounts, so it has to be duplicated here rather than
     relied upon.

     Two deliberate deviations from a straight copy:
     1. Every selector is prefixed with .inv-root. This stylesheet is injected into
        <head> (see the note at the top of this file), so an unscoped .pt-* rule
        would sit in the document alongside PointsDashboard's own copy. Scoping
        keeps it contained; the prefix is applied uniformly, so the relative
        specificity between these rules — including the !important mobile
        overrides — is unchanged.
     2. The .pt-* rules read the GLOBAL tokens (--white/--border/--text/--purple/
        --font-head), not this page's --iv-* ones. Those globals are defined in
        index.css and match PointsDashboard's own :root exactly, so light mode is
        already identical. Dark mode is not: index.css and PointsDashboard disagree
        slightly (--white #1e1b2e vs #1a1a2e, --text #f1f0ff vs #e8e6f0, …), so the
        block below restates PointsDashboard's dark values, scoped to .inv-root.
        Nothing else under .inv-root reads these names — every other rule on this
        page uses --iv-* — so the override reaches only the header and the profile
        badge's inline var(--white,…) fallbacks, which is exactly what should match. */
  body.dark-mode .inv-root {
    --white:#1a1a2e; --border:#2d2d4e;
    --text:#e8e6f0; --text2:#a89ec9; --text3:#6b6b8a;
  }

  .inv-root .pt-header { background:var(--white); border-bottom:1px solid var(--border); padding:16px 24px; display:flex; align-items:center; justify-content:space-between; gap:12px; position:sticky; top:0; z-index:100; box-shadow:0 1px 8px rgba(0,0,0,0.05); }
  .inv-root .pt-header-icon { width:36px; height:36px; border-radius:10px; background:var(--purple-dim); display:flex; align-items:center; justify-content:center; font-size:18px; flex-shrink:0; }
  /* min-width:0 only licenses shrinking; desktop has room and is unaffected. */
  .inv-root .pt-header-title { font-size:18px; font-weight:800; color:var(--text); font-family:var(--font-head); min-width:0; }
  .inv-root .pt-header-sub { font-size:12px; color:var(--text3); margin-top:1px; }
  .inv-root .pt-dark-toggle { background:none; border:1.5px solid var(--border); border-radius:20px; padding:5px 11px; cursor:pointer; font-size:13px; color:var(--text2); display:flex; align-items:center; gap:5px; transition:all 0.2s; font-family:var(--font-body); font-weight:600; white-space:nowrap; }
  .inv-root .pt-dark-toggle:hover { border-color:var(--purple); color:var(--purple); }
  .inv-root .pt-header-back { background:none; border:1.5px solid var(--border); border-radius:20px; padding:5px 11px; cursor:pointer; font-size:13px; color:var(--text2); display:flex; align-items:center; gap:6px; transition:all 0.2s; font-family:var(--font-body); font-weight:700; white-space:nowrap; }
  .inv-root .pt-header-back:hover { border-color:var(--purple); color:var(--purple); background:var(--purple-dim); }
  .inv-root .pt-icon-btn { width:36px; height:36px; border-radius:10px; background:none; border:1.5px solid var(--border); cursor:pointer; display:flex; align-items:center; justify-content:center; color:var(--text2); transition:all 0.2s; }
  .inv-root .pt-icon-btn:hover { border-color:var(--purple); color:var(--purple); background:var(--purple-dim); }
  body.dark-mode .inv-root .pt-header { background:#151525; border-bottom:1px solid #2d2d4e; }
  body.dark-mode .inv-root .pt-dark-toggle { background:#1f1f3a; border-color:#2d2d4e; color:#a89ec9; }
  body.dark-mode .inv-root .pt-header-back { background:#1f1f3a; border-color:#2d2d4e; color:#a89ec9; }
  body.dark-mode .inv-root .pt-icon-btn { background:#1f1f3a; border-color:#2d2d4e; color:#a89ec9; }

  /* BACK BUTTON — the mobile-only row below the header. */
  .inv-root .pt-section-back { display:flex; align-items:center; gap:8px; background:var(--white); border:1.5px solid var(--border); color:var(--text2); padding:9px 16px; border-radius:10px; font-size:13px; font-weight:700; cursor:pointer; transition:all 0.2s; width:fit-content; margin-bottom:16px; font-family:var(--font-body); }
  .inv-root .pt-section-back:hover { background:var(--purple-dim); border-color:rgba(108,71,255,0.3); color:var(--purple); }

  /* MOBILE/DESKTOP VISIBILITY HELPERS
     Named as on the home header so the shared .pt-menu-* dropdown and the
     ".pt-header-right-mobile > button:first-child" overlap fix in the global
     StudentDashboard.css apply here identically. Those global rules carry
     !important inside their media queries, so they drive the actual switching;
     these two are the base-state fallback. */
  .inv-root .pt-header-right-mobile { display: none; }
  .inv-root .pt-header-right-desktop { display: flex; }
  .inv-root .pt-section-back-mobile-only { display: none; }
  /* ══ HEADER — COPIED FROM PointsDashboard.jsx (end) ══ */

  .inv-wrap { max-width:none; margin:0; padding:24px 24px 48px; }

  .inv-tabs { display:flex; gap:4px; background:var(--iv-inset); border:1px solid var(--iv-border);
    border-radius:var(--iv-r-md); padding:5px; margin-bottom:22px; box-shadow:var(--iv-shadow-sm); }
  .inv-tab { flex:1; padding:10px 14px; border-radius:10px; border:none; background:transparent; font-size:13.5px;
    font-weight:800; color:var(--iv-text2); cursor:pointer; font-family:inherit; display:flex; align-items:center;
    justify-content:center; gap:8px;
    transition:color .22s var(--iv-ease), background .22s var(--iv-ease), box-shadow .22s var(--iv-ease),
      transform .22s var(--iv-ease); }
  .inv-tab:hover:not(.active):not(.disabled) { color:var(--iv-purple); background:var(--iv-purple-dim); }
  .inv-tab:active:not(.disabled) { transform:translateY(1px); }
  .inv-tab.active { background:linear-gradient(135deg,var(--iv-purple-lt),var(--iv-purple-2)); color:#fff;
    box-shadow:var(--iv-shadow-brand), inset 0 1px 0 rgba(255,255,255,0.22); }
  .inv-tab:focus-visible { outline:none; box-shadow:var(--iv-ring); }
  .inv-tab.disabled { cursor:not-allowed; opacity:0.55; }
  .inv-soon { font-size:9px; font-weight:800; letter-spacing:0.6px; text-transform:uppercase; padding:2px 8px;
    border-radius:20px; background:rgba(245,158,11,0.16); color:var(--iv-amber-ink); border:1px solid rgba(245,158,11,0.4); }

  .inv-grid { display:grid; grid-template-columns:1fr 380px; gap:22px; align-items:start; }
  .inv-card { background:var(--iv-card); border:1px solid var(--iv-border); border-radius:var(--iv-r-lg); padding:24px;
    box-shadow:var(--iv-shadow-md);
    transition:box-shadow .3s var(--iv-ease), border-color .3s var(--iv-ease); }
  .inv-card + .inv-card { margin-top:18px; }
  .inv-card-title { font-size:15.5px; font-weight:800; margin-bottom:4px; letter-spacing:-0.2px; }
  .inv-card-sub { font-size:12px; color:var(--iv-text3); margin-bottom:18px; line-height:1.55; }

  .inv-field-label { font-size:11px; font-weight:800; letter-spacing:0.8px; text-transform:uppercase;
    color:var(--iv-text2); margin-bottom:8px; display:block; }
  .inv-select, .inv-input, .inv-textarea { width:100%; padding:12px 14px; border:1.5px solid var(--iv-border);
    border-radius:var(--iv-r-sm); background:var(--iv-inset); color:var(--iv-text); font-size:13.5px; font-weight:600;
    outline:none; font-family:inherit; box-sizing:border-box;
    transition:border-color .2s var(--iv-ease), box-shadow .2s var(--iv-ease), background .2s var(--iv-ease); }
  .inv-select:hover:not(:disabled), .inv-input:hover:not(:disabled), .inv-textarea:hover:not(:disabled) {
    border-color:rgba(108,71,255,0.4); }
  .inv-select:focus, .inv-input:focus, .inv-textarea:focus { border-color:var(--iv-purple); box-shadow:var(--iv-ring);
    background:var(--iv-white); }
  .inv-select:disabled, .inv-input:disabled, .inv-textarea:disabled { opacity:0.6; cursor:not-allowed; }
  .inv-textarea { resize:vertical; min-height:82px; line-height:1.55; }
  .inv-row2 { display:flex; gap:12px; align-items:flex-end; }
  .inv-unit-chip { flex-shrink:0; padding:12px 14px; border-radius:var(--iv-r-sm); background:var(--iv-purple-dim);
    border:1.5px solid rgba(108,71,255,0.25); color:var(--iv-purple); font-size:13px; font-weight:800; white-space:nowrap; }

  .inv-item-list { max-height:248px; overflow-y:auto; border:1.5px solid var(--iv-border); border-radius:var(--iv-r-sm);
    background:var(--iv-inset); padding:6px; display:flex; flex-direction:column; gap:3px;
    scrollbar-width:thin; scrollbar-color:rgba(108,71,255,0.35) transparent; }
  .inv-item-list::-webkit-scrollbar { width:9px; }
  .inv-item-list::-webkit-scrollbar-track { background:transparent; }
  .inv-item-list::-webkit-scrollbar-thumb { background:rgba(108,71,255,0.28); border-radius:20px;
    border:3px solid transparent; background-clip:content-box; }
  .inv-item-list::-webkit-scrollbar-thumb:hover { background:rgba(108,71,255,0.5); background-clip:content-box; }
  .inv-item-row { display:flex; align-items:center; justify-content:space-between; gap:10px; width:100%;
    padding:10px 12px; border:1.5px solid transparent; border-radius:9px; background:transparent; cursor:pointer;
    font-family:inherit; text-align:left; color:var(--iv-text);
    transition:background .16s var(--iv-ease), border-color .16s var(--iv-ease), box-shadow .16s var(--iv-ease); }
  .inv-item-row:hover { background:var(--iv-purple-dim); }
  .inv-item-row.sel { background:var(--iv-purple-dim); border-color:var(--iv-purple); box-shadow:var(--iv-shadow-sm); }
  .inv-item-name { font-size:13px; font-weight:700; }
  .inv-item-avail { font-size:11.5px; font-weight:700; color:var(--iv-text3); white-space:nowrap; flex-shrink:0; }
  .inv-item-row.sel .inv-item-avail { color:var(--iv-purple); }
  .inv-item-empty { padding:18px 12px; text-align:center; font-size:12.5px; color:var(--iv-text3); font-weight:600; }
  .inv-item-count { font-size:11px; font-weight:700; color:var(--iv-text3); margin:7px 2px 0; text-align:right; }

  .inv-btn { width:100%; padding:13px; border:none; border-radius:12px; font-size:14px; font-weight:800; cursor:pointer;
    font-family:inherit; position:relative; overflow:hidden;
    transition:transform .18s var(--iv-ease), box-shadow .24s var(--iv-ease), background .24s var(--iv-ease),
      border-color .24s var(--iv-ease), opacity .2s var(--iv-ease), filter .2s var(--iv-ease); }
  .inv-btn-primary { color:#fff; box-shadow:var(--iv-shadow-brand), inset 0 1px 0 rgba(255,255,255,0.22);
    background:linear-gradient(135deg,var(--iv-purple-lt) 0%,var(--iv-purple) 48%,var(--iv-purple-2) 100%); }
  /* Soft sheen across the top half — reads as depth, not as a shine effect. */
  .inv-btn-primary::after { content:''; position:absolute; inset:0 0 50% 0; pointer-events:none;
    background:linear-gradient(180deg,rgba(255,255,255,0.16),transparent); }
  .inv-btn-primary:hover:not(:disabled) { transform:translateY(-1px); filter:brightness(1.04);
    box-shadow:0 10px 28px rgba(108,71,255,0.42), 0 3px 8px rgba(108,71,255,0.22),
      inset 0 1px 0 rgba(255,255,255,0.26); }
  .inv-btn-ghost { background:var(--iv-purple-dim); color:var(--iv-purple); border:1.5px solid rgba(108,71,255,0.3); }
  .inv-btn-ghost:hover:not(:disabled) { background:rgba(108,71,255,0.17); border-color:var(--iv-purple);
    transform:translateY(-1px); box-shadow:0 4px 14px rgba(108,71,255,0.18); }
  .inv-btn:active:not(:disabled) { transform:translateY(1px) scale(.994); }
  .inv-btn:focus-visible { outline:none; box-shadow:var(--iv-ring), var(--iv-shadow-brand); }
  .inv-btn:disabled { opacity:0.45; cursor:not-allowed; box-shadow:none; transform:none; filter:grayscale(0.25); }

  .inv-hint { font-size:12px; color:var(--iv-red); font-weight:700; margin-top:9px;
    padding:9px 12px; border-radius:10px; background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.22); }

  .inv-cart-row { display:flex; align-items:center; gap:12px; padding:12px 14px; border:1px solid var(--iv-border);
    border-radius:12px; margin-bottom:10px; background:var(--iv-inset);
    transition:border-color .2s var(--iv-ease), box-shadow .2s var(--iv-ease), background .2s var(--iv-ease); }
  .inv-cart-row:hover { border-color:rgba(108,71,255,0.32); box-shadow:var(--iv-shadow-sm); }
  .inv-cart-name { font-size:13px; font-weight:800; flex:1; min-width:0; }
  .inv-cart-qty { font-size:12.5px; font-weight:800; color:var(--iv-purple); white-space:nowrap; }
  .inv-cart-x { width:28px; height:28px; border-radius:8px; border:1px solid var(--iv-border); background:transparent;
    color:var(--iv-text3); cursor:pointer; font-size:15px; line-height:1; flex-shrink:0; font-family:inherit;
    transition:color .18s var(--iv-ease), border-color .18s var(--iv-ease), background .18s var(--iv-ease),
      transform .18s var(--iv-ease); }
  .inv-cart-x:hover { border-color:var(--iv-red); color:var(--iv-red); background:rgba(239,68,68,0.09);
    transform:rotate(90deg); }
  .inv-empty { text-align:center; padding:28px 18px; color:var(--iv-text3); font-size:13px; font-weight:600;
    border:1px dashed var(--iv-border); border-radius:var(--iv-r-md); background:var(--iv-purple-soft); }

  .inv-pill { display:inline-flex; align-items:center; gap:6px; padding:5px 13px; border-radius:20px; font-size:11px;
    font-weight:800; letter-spacing:0.4px; text-transform:uppercase; }
  .inv-pill.pending { background:rgba(245,158,11,0.12); color:#b45309; border:1px solid rgba(245,158,11,0.4); }
  .inv-pill.approved { background:rgba(16,185,129,0.12); color:#047857; border:1px solid rgba(16,185,129,0.4); }
  .inv-pill.rejected { background:rgba(239,68,68,0.12); color:#b91c1c; border:1px solid rgba(239,68,68,0.4); }
  /* The 700-weight inks above are unreadable on the dark surface — lift them. */
  body.dark-mode .inv-root .inv-pill.pending { color:#fbbf24; background:rgba(245,158,11,0.18); }
  body.dark-mode .inv-root .inv-pill.approved { color:#34d399; background:rgba(16,185,129,0.16); }
  body.dark-mode .inv-root .inv-pill.rejected { color:#f87171; background:rgba(239,68,68,0.16); }
  /* …but the pass header is always dark purple, so its pill keeps the light inks. */
  .inv-pass-top .inv-pill { background:rgba(255,255,255,0.18); color:#fff; border-color:rgba(255,255,255,0.45);
    backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px); }

  /* Inventory Pass */
  .inv-pass { background:var(--iv-card); border:1px solid var(--iv-border); border-radius:var(--iv-r-lg); overflow:hidden;
    box-shadow:var(--iv-shadow-lg), 0 0 0 1px var(--iv-hairline); }
  .inv-pass-top { background:linear-gradient(135deg,#7d5cff 0%,#6c47ff 34%,#4b2fd6 68%,#3a1f9e 100%);
    padding:24px; color:#fff; position:relative; overflow:hidden;
    box-shadow:inset 0 -1px 0 rgba(255,255,255,0.14); }
  .inv-pass-orb { position:absolute; border-radius:50%; background:rgba(255,255,255,0.10);
    filter:blur(0.5px); pointer-events:none; }
  .inv-pass-body { padding:22px 24px; }
  .inv-pass-kv { display:flex; justify-content:space-between; gap:14px; padding:10px 0;
    border-bottom:1px dashed var(--iv-hairline); font-size:13px; }
  .inv-pass-kv:last-child { border-bottom:none; }
  .inv-pass-k { color:var(--iv-text2); font-weight:700; }
  .inv-pass-v { font-weight:800; text-align:right; }
  .inv-pass-item { display:flex; justify-content:space-between; gap:12px; padding:10px 12px; background:var(--iv-inset);
    border:1px solid var(--iv-border); border-radius:10px; margin-bottom:8px; font-size:13px;
    transition:border-color .2s var(--iv-ease); }
  .inv-pass-item:hover { border-color:rgba(108,71,255,0.3); }

  /* No transform here — framer owns the lift on these cards. */
  .inv-req { border:1px solid var(--iv-border); border-radius:var(--iv-r-md); padding:15px 17px; margin-bottom:12px;
    background:var(--iv-inset); cursor:pointer;
    transition:border-color .26s var(--iv-ease), box-shadow .26s var(--iv-ease), background .26s var(--iv-ease); }
  .inv-req:hover { border-color:rgba(108,71,255,0.32); box-shadow:var(--iv-shadow-sm);
    background:var(--iv-purple-soft); }
  .inv-req:focus-visible { outline:none; box-shadow:var(--iv-ring); border-color:var(--iv-purple); }
  /* Click affordance — appears on hover, so the resting row stays clean. */
  .inv-req-view { display:block; margin-top:8px; font-size:11px; font-weight:800; letter-spacing:0.4px;
    color:var(--iv-purple); opacity:0; transition:opacity .24s var(--iv-ease); }
  .inv-req:hover .inv-req-view, .inv-req:focus-visible .inv-req-view { opacity:1; }
  .inv-req-top { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:9px; }
  .inv-req-id { font-size:13.5px; font-weight:800; letter-spacing:-0.1px; }
  .inv-req-meta { font-size:11.5px; color:var(--iv-text3); font-weight:600; margin-top:3px; }
  .inv-req-items { font-size:12.5px; color:var(--iv-text2); line-height:1.65; }
  .inv-spinner { width:28px; height:28px; border:3px solid var(--iv-border); border-top-color:var(--iv-purple);
    border-right-color:var(--iv-purple); border-radius:50%; animation:invspin .68s linear infinite; margin:18px auto; }
  @keyframes invspin { to { transform:rotate(360deg); } }

  /* Returning — obligation rows */
  .inv-obl { border:1px solid var(--iv-border); border-radius:12px; padding:13px 15px; margin-bottom:11px;
    background:var(--iv-inset);
    transition:border-color .24s var(--iv-ease), box-shadow .24s var(--iv-ease); }
  .inv-obl:hover { border-color:rgba(108,71,255,0.3); box-shadow:var(--iv-shadow-sm); }
  .inv-obl-head { display:flex; align-items:flex-start; gap:11px; cursor:pointer; }
  .inv-obl-head input { margin-top:3px; width:16px; height:16px; accent-color:var(--iv-purple); flex-shrink:0;
    cursor:pointer; }
  .inv-obl-name { font-size:13.5px; font-weight:800; display:block; }
  .inv-obl-meta { font-size:11.5px; color:var(--iv-text3); font-weight:600; display:block; margin-top:3px; }
  .inv-obl-body { margin-top:13px; padding-left:27px; }
  .inv-obl-actions { display:flex; gap:8px; }
  .inv-seg { padding:8px 14px; border-radius:10px; border:1.5px solid var(--iv-border); background:var(--iv-card);
    color:var(--iv-text2); font-size:12.5px; font-weight:800; cursor:pointer; font-family:inherit;
    box-shadow:var(--iv-shadow-sm);
    transition:color .18s var(--iv-ease), border-color .18s var(--iv-ease), background .18s var(--iv-ease),
      box-shadow .18s var(--iv-ease), transform .18s var(--iv-ease); }
  .inv-seg:hover:not(:disabled):not(.active) { border-color:rgba(108,71,255,0.4); color:var(--iv-purple); }
  .inv-seg:active:not(:disabled) { transform:translateY(1px); }
  .inv-seg.active { background:var(--iv-purple-dim); border-color:var(--iv-purple); color:var(--iv-purple);
    box-shadow:0 3px 12px rgba(108,71,255,0.16); }
  .inv-seg:disabled { opacity:0.4; cursor:not-allowed; box-shadow:none; }

  /* ══ REQUEST PASS POPUP — ADDITIVE BLOCK (start) ══
     The page had no overlay before this; these mirror the intern console's
     .in-overlay / .in-modal-x so the popup matches the rest of the app. The pass
     inside is plain .inv-pass — the same markup the post-create pass uses. */
  .inv-overlay { position:fixed; inset:0; background:rgba(15,10,40,0.55);
    backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); z-index:1000;
    display:flex; align-items:center; justify-content:center; padding:20px; }
  /* Long item lists scroll inside the body; the gradient header stays put. */
  .inv-pass-modal { width:100%; max-width:520px; max-height:86vh; display:flex; flex-direction:column; }
  .inv-pass-modal .inv-pass-top { flex-shrink:0; }
  .inv-pass-modal .inv-pass-body { overflow-y:auto;
    scrollbar-width:thin; scrollbar-color:rgba(108,71,255,0.35) transparent; }
  .inv-pass-modal .inv-pass-body::-webkit-scrollbar { width:9px; }
  .inv-pass-modal .inv-pass-body::-webkit-scrollbar-track { background:transparent; }
  .inv-pass-modal .inv-pass-body::-webkit-scrollbar-thumb { background:rgba(108,71,255,0.28);
    border-radius:20px; border:3px solid transparent; background-clip:content-box; }
  /* Sits on the purple header, so it is styled as glass rather than on --iv-inset. */
  .inv-modal-x { position:absolute; top:14px; right:14px; z-index:3; width:32px; height:32px;
    border-radius:10px; border:1px solid rgba(255,255,255,0.35); background:rgba(255,255,255,0.16);
    color:#fff; font-size:18px; line-height:1; cursor:pointer; font-family:inherit;
    display:flex; align-items:center; justify-content:center;
    backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px);
    transition:background .18s var(--iv-ease), border-color .18s var(--iv-ease), transform .18s var(--iv-ease); }
  .inv-modal-x:hover { background:rgba(255,255,255,0.3); border-color:rgba(255,255,255,0.62);
    transform:rotate(90deg); }
  .inv-modal-x:focus-visible { outline:none; box-shadow:0 0 0 3px rgba(255,255,255,0.45); }
  /* ══ REQUEST PASS POPUP — ADDITIVE BLOCK (end) ══ */

  /* ══ SUCCESS ANIMATION — ADDITIVE BLOCK (start) ══
     A full-screen purple cover held for ~2.5s after a request is created, before
     the Inventory Pass mounts. Presentation only. Motion split as everywhere else
     on this page: framer-motion owns transform on the badge, tick and copy; CSS
     keyframes own the glow rings (throwaway elements, no state). The cover is
     opaque by design — nothing behind it shows through, so the page theme
     underneath is irrelevant while it is up. */
  .inv-succ-ov { position:fixed; inset:0; width:100vw; height:100vh; height:100dvh;
    z-index:9999; overflow:hidden; isolation:isolate;
    display:flex; align-items:center; justify-content:center; padding:24px;
    background:
      radial-gradient(120% 92% at 50% 6%, #8b6bff 0%, rgba(139,107,255,0) 58%),
      radial-gradient(96% 84% at 10% 104%, #5a37e0 0%, rgba(90,55,224,0) 62%),
      linear-gradient(158deg, #7d5cff 0%, #6c47ff 46%, #4b2fd6 100%); }
  /* Vignette — lifts the centre and settles the edges. Sits below the copy, which
     carries a z-index. */
  .inv-succ-ov::after { content:''; position:absolute; inset:0; pointer-events:none;
    background:radial-gradient(78% 64% at 50% 45%, rgba(255,255,255,0.13), rgba(18,6,66,0.28) 100%); }
  .inv-succ-inner { position:relative; z-index:2; text-align:center; max-width:560px; }

  /* Stage: badge centred, glow rings expanding from the same centre.
     --bsz drives the badge and the rings together so one value resizes both. */
  .inv-succ-stage { --bsz:132px; position:relative; width:calc(var(--bsz) * 1.45);
    height:calc(var(--bsz) * 1.45); margin:0 auto 30px;
    display:flex; align-items:center; justify-content:center; }

  /* White 3D disc: off-centre radial for the light source, a bright inner top
     highlight and a purple inner bottom shade for volume, a deep drop shadow to
     lift it off the cover, and a wide soft halo. */
  .inv-succ-badge { position:relative; width:var(--bsz); height:var(--bsz); border-radius:50%;
    display:flex; align-items:center; justify-content:center;
    background:radial-gradient(116% 116% at 32% 20%, #fff 0%, #fdfbff 46%, #ebe4ff 100%);
    box-shadow:0 28px 62px rgba(18,5,70,0.4), 0 10px 24px rgba(18,5,70,0.26),
      inset 0 3px 4px rgba(255,255,255,0.95), inset 0 -14px 28px rgba(108,71,255,0.2),
      0 0 0 12px rgba(255,255,255,0.09), 0 0 72px rgba(255,255,255,0.42); }
  /* Glossy top sheen */
  .inv-succ-badge::after { content:''; position:absolute; top:11px; left:50%; transform:translateX(-50%);
    width:calc(var(--bsz) * 0.58); height:calc(var(--bsz) * 0.28); border-radius:50%; pointer-events:none;
    background:linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,255,255,0)); filter:blur(2px); }

  /* Three concentric rings, staggered by --gd, each pulsing twice across the hold. */
  .inv-succ-glow { position:absolute; top:50%; left:50%; width:var(--bsz); height:var(--bsz);
    margin:calc(var(--bsz) / -2) 0 0 calc(var(--bsz) / -2); border-radius:50%;
    border:2px solid rgba(255,255,255,0.85); opacity:0; pointer-events:none;
    animation:inv-succ-glow 1.6s cubic-bezier(.2,.6,.3,1) var(--gd,0s) 2 both; }
  @keyframes inv-succ-glow {
    0%   { transform:scale(.86); opacity:.7; }
    70%  { opacity:.1; }
    100% { transform:scale(2.55); opacity:0; }
  }

  .inv-succ-title { font-family:var(--iv-font-head); color:#fff; font-weight:900;
    font-size:clamp(21px, 4.6vw, 33px); letter-spacing:-0.5px; line-height:1.2;
    text-shadow:0 4px 20px rgba(20,6,70,0.38); }
  .inv-succ-sub { margin-top:12px; color:rgba(255,255,255,0.9); font-weight:600;
    font-size:clamp(13.5px, 2.6vw, 17px); line-height:1.5;
    text-shadow:0 2px 12px rgba(20,6,70,0.32); }

  @media (max-width:520px) {
    .inv-succ-stage { --bsz:104px; margin-bottom:24px; }
  }

  /* Reduced motion: keep the cover, the badge and the message — drop the pulses
     entirely. (The global block below flattens what remains, and MotionConfig
     reducedMotion="user" quiets the framer transforms to match.) */
  @media (prefers-reduced-motion: reduce) {
    .inv-succ-glow { display:none; }
  }
  /* ══ SUCCESS ANIMATION — ADDITIVE BLOCK (end) ══ */

  @media (max-width:820px) {
    .inv-grid { grid-template-columns:1fr; }
    .inv-wrap { padding:16px 14px 40px; }
  }

  /* ── Mobile header — COPIED FROM PointsDashboard.jsx ─────────────
     Same breakpoints and same values as the template: below 640px the desktop
     cluster (Back + profile + Dark + Logout) is swapped for the tight mobile
     cluster (profile + Dark), and the "← Back" row below the header takes over.
     Layout only — no handler, route or piece of state is involved. */
  @media (max-width:640px) {
    /* Header: the title was being squeezed between the fixed-width icon and the
       profile + Dark cluster. Shrink both flanks and let the title wrap. */
    .inv-root .pt-header { padding: 12px 13px; gap: 10px; }
    .inv-root .pt-header-icon { width: 30px; height: 30px; font-size: 15px; border-radius: 9px; }
    .inv-root .pt-header-title { font-size: 15px; line-height: 1.25; white-space: normal; overflow-wrap: anywhere; }
    .inv-root .pt-header-sub { font-size: 11px; white-space: normal; line-height: 1.3; }
    .inv-root .pt-header-right-desktop { display: none !important; }
    .inv-root .pt-header-right-mobile {
      display: flex !important;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }
    .inv-root .pt-section-back-mobile-only { display: flex !important; }
    .inv-root .pt-section-back { margin-bottom: 14px; padding: 8px 14px; font-size: 13px; }
  }

  /* Tightest phones — keep the header title readable rather than clipped. */
  @media (max-width:380px) {
    .inv-root .pt-header { padding: 11px 10px; gap: 8px; }
    .inv-root .pt-header-icon { width: 27px; height: 27px; font-size: 14px; }
    .inv-root .pt-header-title { font-size: 14px; }
    .inv-root .pt-header-right-mobile { gap: 5px; }
  }

  /* Users who ask for less motion get the same layout, minus the movement.
     MotionConfig reducedMotion="user" quiets the framer animations to match. */
  @media (prefers-reduced-motion: reduce) {
    .inv-root *, .inv-root *::before, .inv-root *::after {
      animation-duration:.01ms !important; animation-iteration-count:1 !important;
      transition-duration:.01ms !important;
    }
  }
`;

// ── UI MOTION (presentation only) ──────────────────────────────
// Same presets as the intern console. They animate opacity/transform and nothing
// else — no handler, prop, condition or piece of state below changes because of
// them. Entrance-only: exit animations would need AnimatePresence wrapped around
// the tab/pass conditionals, which is exactly the restructuring this pass avoids.
const EASE = [0.22, 0.61, 0.36, 1];

// Index-based delay rather than a variants container: these lists render *after*
// their fetch resolves, so the rows mount later than any parent would. A plain
// per-row delay staggers them predictably regardless of when they appear.
const rise = (i = 0) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.26, ease: EASE, delay: Math.min(i, 6) * 0.045 },
});
const passPop = {
  initial: { opacity: 0, y: 12, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0.28, ease: EASE },
};
const rowHover = { y: -2, transition: { duration: 0.18, ease: EASE } };

// ── SUCCESS ANIMATION (presentation only) ──────────────────────
// How long the celebration holds the screen before the Inventory Pass takes over.
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
// Overlay behind the request-pass popup — opacity only, so it writes no transform
// and stays a clean containing block for the fixed overlay.
const overlayFade = { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.16 } };

const money = (n) => Number(n ?? 0).toLocaleString();

function fmtDateTime(d) {
  const dt = d ? new Date(d) : new Date();
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Announcement timestamps — same formatter the home dashboard uses. Distinct from
// fmtDateTime above, which also renders a time and is used by the pass.
function formatAnnDate(ts) {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return String(ts);
  }
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

  // Header actions — mirrored from PointsDashboard.jsx so both headers behave the
  // same. This page takes no props, so handleBack drops the template's `onBack`
  // branch and keeps the rest: browser-back when there is history to go back to,
  // otherwise a replace onto the dashboard.
  const handleBack = () => {
    if (window.history.length > 1) return navigate(-1);
    return navigate('/student-dashboard', { replace: true });
  };

  const handleLogout = async () => {
    try { await authService.logout(); }
    finally { navigate('/auth/login', { replace: true }); }
  };

  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('pt-dark') === '1');
  const [tab, setTab] = useState('buying'); // 'buying' | 'returning' (returning disabled — later stage)

  // ── Announcements: bell dropdown + ☰ menu (mirrors StudentDashboard) ──
  // Notifications only. No surveys/Documents on this page, and no one-time login
  // popup either — that stays on the home dashboard, so the bell is the only way
  // an announcement surfaces here.
  const [announcements, setAnnouncements] = useState([]);
  const [bellOpen, setBellOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const unreadCount = announcements.filter((a) => !a.read_at).length;
  // Same badge the home header carries, minus the survey half of the sum.
  const menuAlertCount = unreadCount;

  // Catalog
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [itemSearch, setItemSearch] = useState(''); // buying: searchable item filter (client-side)
  const [quantity, setQuantity] = useState('');
  const [addErr, setAddErr] = useState('');

  // Cart + purpose
  const [cart, setCart] = useState([]);
  const [purpose, setPurpose] = useState('');
  const [purposeType, setPurposeType] = useState('');
  // ── SELECT LAB (required on a buying request) ──
  const [labs, setLabs] = useState([]);
  const [labsErr, setLabsErr] = useState('');
  const [labId, setLabId] = useState('');
  // ── PROJECT GUIDE (required on a buying request) ──
  const [faculties, setFaculties] = useState([]);
  const [facultiesErr, setFacultiesErr] = useState('');
  const [projectGuideId, setProjectGuideId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState('');
  const [pass, setPass] = useState(null); // created request → Inventory Pass
  // Success celebration: sits between "create succeeded" and the pass appearing.
  // The created request waits in the ref for SUCCESS_MS, then goes into `pass`.
  const [showSuccess, setShowSuccess] = useState(false);
  const pendingPassRef = useRef(null);
  const successTimerRef = useRef(null);
  // Read once on mount — only the tick draw needs it (see succCheckStatic).
  const [reducedMotion] = useState(prefersReducedMotion);

  // My Requests
  const [myRequests, setMyRequests] = useState([]);
  const [mineLoading, setMineLoading] = useState(true);

  // ── REQUEST PASS POPUP (additive) ──
  // The request clicked in "My Requests", displayed read-only as its Inventory
  // Pass. It holds an object straight out of myRequests — listRequestsForStudent
  // already returns each request's line items, so opening it fetches nothing and
  // mutates nothing. null = closed.
  const [passRequest, setPassRequest] = useState(null);

  // Returning (Stage 5): open obligations → return cart
  const [obligations, setObligations] = useState([]);
  const [oblLoading, setOblLoading] = useState(false);
  const [oblLoaded, setOblLoaded] = useState(false);
  const [returnForm, setReturnForm] = useState({}); // { [obligation_id]: { include, action, qty } }
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [returnErr, setReturnErr] = useState('');
  const [returnPass, setReturnPass] = useState(null);

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

  // Drop the celebration timer if the page unmounts mid-animation.
  useEffect(() => () => clearTimeout(successTimerRef.current), []);

  // Fetch this student's announcements on mount. Unlike the home dashboard this
  // deliberately does NOT auto-pop the newest unseen one — no setPopup here.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await trainingService.getStudentAnnouncements();
        if (!alive) return;
        setAnnouncements(res?.data?.items || []);
      } catch {
        /* silent — announcements are non-critical */
      }
    })();
    return () => { alive = false; };
  }, []);

  // Open an announcement from the bell → mark read (decrements unread count).
  // Optimistic, and the POST is fire-and-forget, exactly as on the home page.
  const openAnnouncement = async (a) => {
    if (a.read_at) return;
    setAnnouncements((prev) =>
      prev.map((x) => (x.announcement_id === a.announcement_id ? { ...x, read_at: new Date().toISOString() } : x))
    );
    try { await trainingService.markAnnouncementRead(a.announcement_id); } catch { /* ignore */ }
  };

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
    if (!selectedCategory) { setItems([]); setSelectedItemId(''); setItemSearch(''); return; }
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
    setItemSearch('');
    return () => { ignore = true; };
  }, [selectedCategory]);

  const selectedItem = items.find((it) => String(it.item_id) === String(selectedItemId)) || null;

  // Buying: case-insensitive substring filter over item_name (and sub_name if present). In-memory only.
  const itemQuery = itemSearch.trim().toLowerCase();
  const filteredItems = itemQuery
    ? items.filter((it) =>
        (it.item_name || '').toLowerCase().includes(itemQuery) ||
        (it.sub_name || '').toLowerCase().includes(itemQuery))
    : items;

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

  // ── SELECT LAB ──
  // Active labs for the required dropdown. Loaded once on mount; a failure is
  // non-fatal to the rest of the page — the picker just reports it and submit
  // stays blocked (the server requires lab_id regardless).
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const res = await inventoryService.getLabs(1);   // active labs only
        if (!ignore) setLabs(res?.data?.items || []);
      } catch {
        if (!ignore) { setLabs([]); setLabsErr('Could not load labs. Please refresh and try again.'); }
      }
    })();
    return () => { ignore = true; };
  }, []);

  // ── PROJECT GUIDE ──
  // Every faculty, for the required dropdown. Loaded once on mount and handled
  // exactly like the labs fetch above: a failure is non-fatal to the rest of the
  // page — the picker reports it and submit stays blocked (the server requires
  // project_guide_id regardless).
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const res = await inventoryService.getFacultyList();
        if (!ignore) setFaculties(res?.data?.items || []);
      } catch {
        if (!ignore) { setFaculties([]); setFacultiesErr('Could not load the faculty list. Please refresh and try again.'); }
      }
    })();
    return () => { ignore = true; };
  }, []);

  const canSubmit = cart.length > 0 && purpose.trim() !== '' && ['PROJECT', 'TRAINING'].includes(purposeType) && labId && projectGuideId && !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitErr('');
    setSubmitting(true);
    try {
      const res = await inventoryService.createRequest({
        purpose_type: purposeType,
        purpose: purpose.trim(),
        items: cart.map((c) => ({ item_id: c.item_id, quantity: c.quantity })),
        lab_id: Number(labId),          // SELECT LAB — required server-side
        project_guide_id: Number(projectGuideId),   // PROJECT GUIDE — required server-side
      });
      // The pass modal needs the lab + guide names; the create response carries
      // both, but fall back to the picked options so the modal is never blank.
      const created = res?.data || null;
      const resolved = created
        ? {
          ...created,
          lab_name: created.lab_name
            ?? labs.find((l) => String(l.lab_id) === String(labId))?.lab_name ?? null,
          project_guide_name: created.project_guide_name
            ?? faculties.find((f) => String(f.user_id) === String(projectGuideId))?.name ?? null,
        }
        : created;
      // Celebrate first, then hand the (unchanged) pass its data. Only reached on
      // success — a failed create throws straight to the catch below.
      pendingPassRef.current = resolved;
      setShowSuccess(true);
      clearTimeout(successTimerRef.current);
      successTimerRef.current = setTimeout(() => {
        setShowSuccess(false);
        setPass(pendingPassRef.current);
        pendingPassRef.current = null;
      }, SUCCESS_MS);
      setCart([]);
      setPurpose('');
      setPurposeType('');
      setLabId('');
      setProjectGuideId('');
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

  // ── Returning flow ──
  const loadObligations = useCallback(async () => {
    setOblLoading(true);
    try {
      const res = await inventoryService.getMyObligations();
      const list = res?.data?.items || [];
      setObligations(list);
      const form = {};
      // Pre-fill with what is STILL owed, not the original taken quantity — a
      // reopened partial obligation would otherwise seed a figure the server
      // now rejects.
      for (const o of list) {
        const rem = o.remaining ?? (Number(o.taken_quantity ?? 0) - Number(o.returned_quantity ?? 0));
        form[o.obligation_id] = { include: false, action: 'RETURN', qty: String(rem ?? '') };
      }
      setReturnForm(form);
      setOblLoaded(true);
    } catch {
      setObligations([]);
      setOblLoaded(true);
    } finally {
      setOblLoading(false);
    }
  }, []);

  // Lazy-load obligations when the Returning tab is first opened
  useEffect(() => {
    if (tab === 'returning' && !oblLoaded) loadObligations();
  }, [tab, oblLoaded, loadObligations]);

  const setRF = (id, patch) => setReturnForm((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const returnLines = obligations.filter((o) => returnForm[o.obligation_id]?.include);
  const canSubmitReturn = returnLines.length > 0 && !returnSubmitting;

  const submitReturn = async () => {
    setReturnErr('');
    const lines = [];
    for (const o of returnLines) {
      const f = returnForm[o.obligation_id];
      if (f.action === 'RETURN') {
        const q = Number(f.qty);
        if (!(q > 0)) { setReturnErr(`Enter a return quantity for "${o.item_name}".`); return; }
        // Cap at what is still owed — mirrors the server-side check, which is
        // authoritative either way.
        const rem = Number(o.remaining ?? (Number(o.taken_quantity) - Number(o.returned_quantity ?? 0)));
        if (q > rem) { setReturnErr(`Return quantity for "${o.item_name}" exceeds the ${money(rem)} still to return.`); return; }
        lines.push({ obligation_id: o.obligation_id, action: 'RETURN', return_quantity: q });
      } else {
        lines.push({ obligation_id: o.obligation_id, action: 'FULLY_COMPLETED' });
      }
    }
    setReturnSubmitting(true);
    try {
      const res = await inventoryService.createReturn(lines);
      setReturnPass(res?.data || null);
      await loadObligations();
      loadMine();
    } catch (err) {
      setReturnErr(err?.response?.data?.message || 'Failed to submit return. Please try again.');
    } finally {
      setReturnSubmitting(false);
    }
  };

  return (
    // reducedMotion="user" makes framer honour the OS "reduce motion" setting,
    // mirroring the @media (prefers-reduced-motion) block in CSS above.
    // MotionConfig is a context provider — it renders no DOM of its own.
    <MotionConfig reducedMotion="user">
    <div className="inv-root">
      {/* ── Header ── (structure copied from PointsDashboard.jsx; only the icon,
          title, subtitle and back destination are this page's own) */}
      <div className="pt-header">
        <div style={{display:'flex', alignItems:'center', gap:10, minWidth:0, flex:1}}>
          <div className="pt-header-icon">🏅</div>
          <div style={{minWidth:0}}>
            <div className="pt-header-title">Inventory Request</div>
            <div className="pt-header-sub">Request lab items &amp; track approvals</div>
          </div>
        </div>

        {/* Desktop right */}
        <div className="pt-header-right-desktop" style={{alignItems:'center', gap:10}}>
          <button type="button" className="pt-header-back" onClick={handleBack}>← Back</button>
          <UserProfileBadge user={user} variant="desktop" />
          <button
            type="button"
            className="pt-icon-btn"
            onClick={() => setBellOpen((o) => !o)}
            aria-label="Announcements"
            title="Announcements"
            style={{ position: 'relative' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unreadCount > 0 && <span className="pt-bell-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </button>
          <button className="pt-dark-toggle" onClick={() => setDarkMode((d) => !d)}>
            {darkMode ? '☀ Light' : '🌙 Dark'}
          </button>
          <button type="button" className="pt-icon-btn" onClick={handleLogout} title="Logout">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M10 7V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M15 12H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 9l-3 3 3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Mobile right — profile badge + ☰ menu, same shape as the home header.
            The badge MUST stay the first child: the global overlap fix targets it
            positionally via `.pt-header-right-mobile > button:first-child`. */}
        <div className="pt-header-right-mobile">
          <UserProfileBadge user={user} variant="mobile" />
          <button
            type="button"
            className="pt-menu-btn"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Menu"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            title="Menu"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M3 6h18" /><path d="M3 12h18" /><path d="M3 18h18" />
            </svg>
            {menuAlertCount > 0 && <span className="pt-bell-badge">{menuAlertCount > 9 ? '9+' : menuAlertCount}</span>}
          </button>

          {menuOpen && (
            <>
              <div className="pt-bell-backdrop" onClick={() => setMenuOpen(false)} />
              <div className="pt-menu-panel" role="menu">
                {/* The menu closes first so the bell panel (a fixed sibling at
                    z-index 201) isn't stacked behind this panel's backdrop. */}
                <button
                  type="button" role="menuitem" className="pt-menu-item"
                  onClick={() => { setMenuOpen(false); setBellOpen(true); }}
                >
                  <span className="pt-menu-ico" aria-hidden="true">🔔</span>
                  <span className="pt-menu-label">Notifications</span>
                  {unreadCount > 0 && <span className="pt-menu-count">{unreadCount > 9 ? '9+' : unreadCount}</span>}
                </button>
                <button
                  type="button" role="menuitem" className="pt-menu-item"
                  onClick={() => { setDarkMode((d) => !d); setMenuOpen(false); }}
                >
                  <span className="pt-menu-ico" aria-hidden="true">🌙</span>
                  <span className="pt-menu-label">Dark mode</span>
                  {darkMode && <span className="pt-menu-check" aria-hidden="true">✓</span>}
                </button>
                <button
                  type="button" role="menuitem" className="pt-menu-item danger"
                  onClick={() => { setMenuOpen(false); handleLogout(); }}
                >
                  <span className="pt-menu-ico" aria-hidden="true">↩</span>
                  <span className="pt-menu-label">Logout</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Bell dropdown panel ── fixed sibling of the header, so the sticky
          header cannot clip it. No surveys panel and no auto-popup here. */}
      {bellOpen && (
        <>
          <div className="pt-bell-backdrop" onClick={() => setBellOpen(false)} />
          <div className="pt-bell-panel">
            <div className="pt-bell-panel-head">
              <span>Announcements</span>
              {unreadCount > 0 && <span className="pt-bell-panel-count">{unreadCount} unread</span>}
            </div>
            {announcements.length === 0 ? (
              <div className="pt-bell-empty">No announcements</div>
            ) : (
              announcements.map((a) => (
                <div
                  key={a.announcement_id}
                  className={`pt-bell-item${!a.read_at ? ' unread' : ''}`}
                  onClick={() => openAnnouncement(a)}
                >
                  <div className="pt-bell-item-top">
                    {!a.read_at && <span className="pt-bell-dot" />}
                    <span className="pt-bell-item-title">{a.title}</span>
                  </div>
                  <div className="pt-bell-item-body">{a.body}</div>
                  <div className="pt-bell-item-date">{formatAnnDate(a.created_at)}</div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      <div className="inv-wrap">
        {/* Mobile-only "← Back" row, exactly as on the Points Dashboard: below the
            header, first child of the content wrapper. */}
        <button type="button" className="pt-section-back pt-section-back-mobile-only" onClick={handleBack}>
          ← Back
        </button>

        {/* Tabs: Buying (active) | Returning (coming soon) */}
        <div className="inv-tabs">
          <button className={`inv-tab${tab === 'buying' ? ' active' : ''}`} onClick={() => setTab('buying')}>
            Buying
          </button>
          <button className={`inv-tab${tab === 'returning' ? ' active' : ''}`} onClick={() => setTab('returning')}>
            Returning
          </button>
        </div>

        {tab === 'buying' && (pass ? (
          /* ── Inventory Pass ── */
          <div style={{ maxWidth: 520, margin: '0 auto' }}>
            <motion.div className="inv-pass" {...passPop}>
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
                  {/* SELECT LAB */}
                  <div className="inv-pass-kv"><span className="inv-pass-k">Lab</span><span className="inv-pass-v">{pass.lab_name || '—'}</span></div>
                  {/* PROJECT GUIDE */}
                  <div className="inv-pass-kv"><span className="inv-pass-k">Project Guide</span><span className="inv-pass-v">{pass.project_guide_name || '—'}</span></div>
                  <div className="inv-pass-kv"><span className="inv-pass-k">Request #</span><span className="inv-pass-v">{pass.request_id}</span></div>
                  <div className="inv-pass-kv"><span className="inv-pass-k">Date</span><span className="inv-pass-v">{fmtDateTime(pass.created_at)}</span></div>
                </div>
                <button className="inv-btn inv-btn-ghost" style={{ marginTop: 18 }} onClick={() => setPass(null)}>
                  + New Request
                </button>
              </div>
            </motion.div>
          </div>
        ) : (
          /* ── Buying builder ── */
          <div className="inv-grid">
            {/* LEFT: item picker + purpose */}
            <motion.div {...rise(0)}>
              <div className="inv-card">
                <div className="inv-card-title">Add items to your request</div>
                <div className="inv-card-sub">Pick a category, choose an item, set the quantity, then add it to your cart.</div>

                <label className="inv-field-label">Category</label>
                <select className="inv-select" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} style={{ marginBottom: 16 }}>
                  <option value="">Select a category…</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>

                <label className="inv-field-label">Item</label>
                <input
                  className="inv-input"
                  type="text"
                  placeholder={itemsLoading ? 'Loading items…' : selectedCategory ? 'Search items by name…' : 'Choose a category first'}
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  disabled={!selectedCategory || itemsLoading}
                  style={{ marginBottom: 8 }}
                />
                <div className="inv-item-list" style={{ marginBottom: 6 }}>
                  {!selectedCategory ? (
                    <div className="inv-item-empty">Choose a category first.</div>
                  ) : itemsLoading ? (
                    <div className="inv-item-empty">Loading items…</div>
                  ) : filteredItems.length === 0 ? (
                    <div className="inv-item-empty">No items found.</div>
                  ) : (
                    filteredItems.map((it) => (
                      <button
                        type="button"
                        key={it.item_id}
                        className={`inv-item-row${String(it.item_id) === String(selectedItemId) ? ' sel' : ''}`}
                        onClick={() => setSelectedItemId(String(it.item_id))}
                      >
                        <span className="inv-item-name">{it.item_name}</span>
                        <span className="inv-item-avail">{money(it.current_quantity)} {it.unit || ''} available</span>
                      </button>
                    ))
                  )}
                </div>
                {selectedCategory && !itemsLoading && filteredItems.length > 0 && (
                  <div className="inv-item-count" style={{ marginBottom: 16 }}>
                    {itemQuery ? `${filteredItems.length} of ${items.length} items` : `${items.length} items`}
                  </div>
                )}

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
                  <select className="inv-select" value={purposeType} onChange={(e) => setPurposeType(e.target.value)} style={{ marginBottom: 16 }}>
                    <option value="">Select Project or Training…</option>
                    <option value="PROJECT">Project</option>
                    <option value="TRAINING">Training</option>
                  </select>

                  {/* ── SELECT LAB (required) ── */}
                  <label className="inv-field-label">Lab</label>
                  <select className="inv-select" value={labId} onChange={(e) => setLabId(e.target.value)}
                    disabled={labs.length === 0} style={{ marginBottom: labsErr ? 8 : 18 }}>
                    <option value="" disabled>-- Select Lab --</option>
                    {labs.map((l) => <option key={l.lab_id} value={l.lab_id}>{l.lab_name}</option>)}
                  </select>
                  {labsErr && <div className="inv-hint" style={{ marginBottom: 14 }}>{labsErr}</div>}

                  {/* ── PROJECT GUIDE (required) ── */}
                  <label className="inv-field-label">Project Guide</label>
                  <select className="inv-select" value={projectGuideId} onChange={(e) => setProjectGuideId(e.target.value)}
                    disabled={faculties.length === 0} style={{ marginBottom: facultiesErr ? 8 : 18 }}>
                    <option value="" disabled>-- Select Project Guide --</option>
                    {/* "Prof." is a DISPLAY prefix only — the value stays the raw
                        user_id, and the name snapshotted on the request is the
                        plain one the server reads from `faculties`. */}
                    {faculties.map((f) => (
                      <option key={f.user_id} value={f.user_id}>
                        Prof. {f.name}
                      </option>
                    ))}
                  </select>
                  {facultiesErr && <div className="inv-hint" style={{ marginBottom: 14 }}>{facultiesErr}</div>}

                  <button className="inv-btn inv-btn-primary" disabled={!canSubmit} onClick={submit}>
                    {submitting ? 'Submitting…' : 'Submit Request'}
                  </button>
                  {submitErr && <div className="inv-hint">{submitErr}</div>}
                </div>
              )}
            </motion.div>

            {/* RIGHT: cart */}
            <motion.div className="inv-card" {...rise(1)}>
              <div className="inv-card-title">Your Cart <span style={{ color: 'var(--iv-purple)' }}>({cart.length})</span></div>
              <div className="inv-card-sub">Items to request this time.</div>
              {cart.length === 0 ? (
                <div className="inv-empty">No items yet — add items from the left.</div>
              ) : (
                cart.map((c, i) => (
                  <motion.div className="inv-cart-row" key={c.item_id} {...rise(i)}>
                    <div className="inv-cart-name">{c.item_name}</div>
                    <div className="inv-cart-qty">{money(c.quantity)} {c.unit}</div>
                    <button className="inv-cart-x" title="Remove" onClick={() => removeFromCart(c.item_id)}>×</button>
                  </motion.div>
                ))
              )}
            </motion.div>
          </div>
        ))}

        {/* ── Returning flow ── */}
        {tab === 'returning' && (
          returnPass ? (
            <div style={{ maxWidth: 520, margin: '0 auto' }}>
              <motion.div className="inv-pass" {...passPop}>
                <div className="inv-pass-top">
                  <div className="inv-pass-orb" style={{ width: 130, height: 130, top: -40, right: -30 }} />
                  <div className="inv-pass-orb" style={{ width: 80, height: 80, bottom: -34, left: 20 }} />
                  <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', opacity: 0.8 }}>Return Receipt</div>
                  <div style={{ fontSize: 22, fontWeight: 900, marginTop: 6 }}>{name}</div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, opacity: 0.85, letterSpacing: 0.5 }}>{roll}</div>
                  <div style={{ marginTop: 12 }}><StatusPill status={returnPass.status || 'PENDING'} /></div>
                </div>
                <div className="inv-pass-body">
                  <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase', color: 'var(--iv-text2)', marginBottom: 8 }}>Returned / Completed</div>
                  {(returnPass.items || []).map((it) => (
                    <div className="inv-pass-item" key={it.line_id || it.obligation_id}>
                      <span style={{ fontWeight: 700 }}>{it.item_name}</span>
                      <span style={{ fontWeight: 800, color: 'var(--iv-purple)' }}>
                        {it.action === 'FULLY_COMPLETED' ? 'Fully completed' : `Return ${money(it.return_quantity ?? it.quantity)} ${it.unit || ''}`}
                      </span>
                    </div>
                  ))}
                  <div style={{ marginTop: 12 }}>
                    <div className="inv-pass-kv"><span className="inv-pass-k">Request #</span><span className="inv-pass-v">{returnPass.request_id}</span></div>
                    <div className="inv-pass-kv"><span className="inv-pass-k">Awaiting</span><span className="inv-pass-v">Inventory Incharge approval</span></div>
                  </div>
                  <button className="inv-btn inv-btn-ghost" style={{ marginTop: 18 }} onClick={() => setReturnPass(null)}>Done</button>
                </div>
              </motion.div>
            </div>
          ) : (
            <motion.div className="inv-card" {...rise(0)}>
              <div className="inv-card-title">Return / Complete taken items</div>
              <div className="inv-card-sub">Clear each item you took — return a quantity, or mark it fully completed (consumed). Returnable items (e.g. glassware) must be returned. Each goes to the Inventory Incharge for approval.</div>
              {oblLoading ? (
                <div className="inv-spinner" />
              ) : obligations.length === 0 ? (
                <div className="inv-empty">No items to return — you're all cleared. ✓</div>
              ) : (
                <>
                  {obligations.map((o, i) => {
                    const f = returnForm[o.obligation_id] || { include: false, action: 'RETURN', qty: '' };
                    const returnable = Number(o.is_returnable) === 1;
                    // PARTIAL RETURNS: what is still owed. The server sends
                    // `remaining`; the fallback covers a cached older payload.
                    const alreadyReturned = Number(o.returned_quantity ?? 0);
                    const remaining = Number(o.remaining ?? (Number(o.taken_quantity) - alreadyReturned));
                    return (
                      <motion.div className="inv-obl" key={o.obligation_id} {...rise(i)}>
                        <label className="inv-obl-head">
                          <input type="checkbox" checked={!!f.include} onChange={(e) => setRF(o.obligation_id, { include: e.target.checked })} />
                          <span>
                            <span className="inv-obl-name">{o.item_name}</span>
                            {/* Once something has been returned the original taken
                                figure alone is misleading, so the running total
                                and the balance are both spelled out. */}
                            <span className="inv-obl-meta">
                              {o.category} · took {money(o.taken_quantity)} {o.unit || ''}
                              {alreadyReturned > 0 ? ` · ${money(alreadyReturned)} returned · ${money(remaining)} remaining` : ''}
                              {returnable ? ' · Returnable' : ''}
                            </span>
                          </span>
                        </label>
                        {f.include && (
                          <div className="inv-obl-body">
                            <div className="inv-obl-actions">
                              <button className={`inv-seg${f.action === 'RETURN' ? ' active' : ''}`} onClick={() => setRF(o.obligation_id, { action: 'RETURN' })}>Return qty</button>
                              <button className={`inv-seg${f.action === 'FULLY_COMPLETED' ? ' active' : ''}`} disabled={returnable} title={returnable ? 'Returnable item must be returned' : ''} onClick={() => setRF(o.obligation_id, { action: 'FULLY_COMPLETED' })}>Fully completed</button>
                            </div>
                            {f.action === 'RETURN' && (
                              <div className="inv-row2" style={{ marginTop: 10 }}>
                                <input className="inv-input" type="number" min="0" step="any" max={remaining} value={f.qty} onChange={(e) => setRF(o.obligation_id, { qty: e.target.value })} placeholder={`Max ${money(remaining)}`} />
                                <div className="inv-unit-chip">{o.unit || '—'}</div>
                              </div>
                            )}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                  <button className="inv-btn inv-btn-primary" style={{ marginTop: 16 }} disabled={!canSubmitReturn} onClick={submitReturn}>
                    {returnSubmitting ? 'Submitting…' : `Submit Return (${returnLines.length})`}
                  </button>
                  {returnErr && <div className="inv-hint">{returnErr}</div>}
                </>
              )}
            </motion.div>
          )
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
            myRequests.map((r, i) => (
              /* REQUEST PASS POPUP — the row opens a read-only pass for this
                 request. Its existing content and entrance animation are unchanged. */
              <motion.div className="inv-req" key={r.request_id} {...rise(i)} whileHover={rowHover}
                role="button" tabIndex={0}
                onClick={() => setPassRequest(r)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPassRequest(r); } }}>
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
                {/* SELECT LAB — BUY requests only; a RETURN genuinely has no lab.
                    '—' covers requests created before lab_id existed. */}
                {r.request_type !== 'RETURN' && (
                  <div className="inv-req-meta" style={{ marginTop: 6 }}>Lab: {r.lab_name || '—'}</div>
                )}
                {/* PROJECT GUIDE — BUY only, for the same reason as the Lab line above. */}
                {r.request_type !== 'RETURN' && (
                  <div className="inv-req-meta" style={{ marginTop: 6 }}>Project Guide: {r.project_guide_name || '—'}</div>
                )}
                {r.purpose && <div className="inv-req-meta" style={{ marginTop: 6 }}>Purpose: {r.purpose}</div>}
                <span className="inv-req-view">View pass →</span>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* ══ REQUEST PASS POPUP (additive) ══
          A read-only view of one row from "My Requests" — same .inv-pass design as
          the pass shown after creating a request, in a centered overlay. It renders
          data already held in state; nothing here fetches, submits or edits.
          Closes on the × and on an overlay click; mousedown + the target check keeps
          a click that starts inside the pass from closing it. */}
      {passRequest && (
        <motion.div className="inv-overlay" {...overlayFade}
          onMouseDown={(e) => { if (e.target === e.currentTarget) setPassRequest(null); }}>
          <motion.div className="inv-pass inv-pass-modal" role="dialog" aria-modal="true"
            aria-label="Request pass" {...passPop}>
            <div className="inv-pass-top">
              <div className="inv-pass-orb" style={{ width: 130, height: 130, top: -40, right: -30 }} />
              <div className="inv-pass-orb" style={{ width: 80, height: 80, bottom: -34, left: 20 }} />
              <button className="inv-modal-x" title="Close" aria-label="Close"
                onClick={() => setPassRequest(null)}>×</button>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', opacity: 0.8 }}>
                {passRequest.request_type === 'RETURN' ? 'Return Receipt' : 'Inventory Pass'}
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, marginTop: 6 }}>{name}</div>
              <div style={{ fontSize: 12.5, fontWeight: 700, opacity: 0.85, letterSpacing: 0.5 }}>{roll}</div>
              <div style={{ marginTop: 12 }}><StatusPill status={passRequest.status} /></div>
            </div>
            <div className="inv-pass-body">
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase', color: 'var(--iv-text2)', marginBottom: 8 }}>Items</div>
              {(passRequest.items || []).length === 0 ? (
                <div className="inv-empty">No items on this request.</div>
              ) : (
                (passRequest.items || []).map((it) => (
                  <div className="inv-pass-item" key={it.line_id || it.item_id}>
                    <span style={{ fontWeight: 700 }}>{it.item_name}</span>
                    <span style={{ fontWeight: 800, color: 'var(--iv-purple)' }}>{money(it.quantity)} {it.unit || ''}</span>
                  </div>
                ))
              )}
              <div style={{ marginTop: 12 }}>
                <div className="inv-pass-kv"><span className="inv-pass-k">Purpose</span><span className="inv-pass-v">{passRequest.purpose || '—'}</span></div>
                <div className="inv-pass-kv"><span className="inv-pass-k">Type</span><span className="inv-pass-v">{passRequest.purpose_type || '—'}</span></div>
                {/* SELECT LAB */}
                <div className="inv-pass-kv"><span className="inv-pass-k">Lab</span><span className="inv-pass-v">{passRequest.lab_name || '—'}</span></div>
                {/* PROJECT GUIDE */}
                <div className="inv-pass-kv"><span className="inv-pass-k">Project Guide</span><span className="inv-pass-v">{passRequest.project_guide_name || '—'}</span></div>
                <div className="inv-pass-kv"><span className="inv-pass-k">Request #</span><span className="inv-pass-v">{passRequest.request_id}</span></div>
                <div className="inv-pass-kv"><span className="inv-pass-k">Date</span><span className="inv-pass-v">{fmtDateTime(passRequest.created_at)}</span></div>
              </div>
              <button className="inv-btn inv-btn-ghost" style={{ marginTop: 18 }} onClick={() => setPassRequest(null)}>
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* ══ SUCCESS ANIMATION (additive) ══
          Shown for SUCCESS_MS right after a request is created, then it fades out
          and the Inventory Pass above renders exactly as it always has. Purely a
          curtain over the existing flow — it submits, validates and changes
          nothing. AnimatePresence is only here so the overlay can fade on exit. */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div className="inv-succ-ov" role="status" aria-live="polite"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ opacity: { duration: 0.24, ease: EASE } }}>

            <div className="inv-succ-inner">
              <div className="inv-succ-stage">
                {/* Glow pulses expand from behind the disc, staggered. */}
                {GLOW_DELAYS.map((gd) => (
                  <span key={gd} className="inv-succ-glow" aria-hidden="true" style={{ '--gd': gd }} />
                ))}

                <motion.div className="inv-succ-badge" {...succBadgePop}>
                  <svg width="58%" height="58%" viewBox="0 0 52 52" fill="none" aria-hidden="true">
                    <motion.path
                      d="M14 27.5 L22.5 36 L38 17"
                      stroke="#6c47ff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"
                      {...(reducedMotion ? succCheckStatic : succCheckDraw)}
                    />
                  </svg>
                </motion.div>
              </div>

              <motion.div className="inv-succ-title" {...succCopyRise(0.88)}>
                Successfully requested from inventory!
              </motion.div>
              <motion.div className="inv-succ-sub" {...succCopyRise(1.0)}>
                All the best for your project
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </MotionConfig>
  );
}
