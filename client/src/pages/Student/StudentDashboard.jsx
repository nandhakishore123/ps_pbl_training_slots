// FrontPage.jsx — Complete Standalone File
// Extracted 100% from index_working.html
// CSS included inside — no external imports needed
// Usage: import FrontPage from './FrontPage.jsx'
//        <FrontPage onSelectPoints={() => {}} onSelectTraining={() => {}} />

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../../services/features/authService'
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

// Compact pill for mobile: avatar initial + truncated name
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

// ── CSS — extracted from index_working.html ───────────────────
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
    --font-head:   'Outfit', sans-serif;
    --font-body:   'Plus Jakarta Sans', sans-serif;
  }

  body.dark-mode {
    --bg:     #0f0f1a;
    --white:  #1a1a2e;
    --border: #2d2d4e;
    --text:   #e8e6f0;
    --text2:  #a89ec9;
    --text3:  #6b6b8a;
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { min-height: 100vh; width: 100%; }
  body { background: var(--bg); font-family: var(--font-body); color: var(--text); -webkit-font-smoothing: antialiased; }

  /* ── HEADER ── */
  .pt-header {
    background: var(--white);
    border-bottom: 1px solid var(--border);
    padding: 16px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    position: sticky;
    top: 0;
    z-index: 100;
    box-shadow: 0 1px 8px rgba(0,0,0,0.05);
  }
  .pt-header-icon {
    width: 36px; height: 36px;
    border-radius: 10px;
    background: var(--purple-dim);
    display: flex; align-items: center; justify-content: center;
    font-size: 18px;
    flex-shrink: 0;
  }
  .pt-header-title {
    font-size: 18px; font-weight: 800;
    color: var(--text);
    font-family: var(--font-head);
  }
  .pt-header-sub {
    font-size: 12px;
    color: var(--text3);
    margin-top: 1px;
  }

  /* ── DARK TOGGLE ── */
  .pt-dark-toggle {
    background: none;
    border: 1.5px solid var(--border);
    border-radius: 20px;
    padding: 5px 11px;
    cursor: pointer;
    font-size: 13px;
    color: var(--text2);
    display: flex; align-items: center; gap: 5px;
    transition: all 0.2s;
    font-family: var(--font-body);
    font-weight: 600;
    white-space: nowrap;
  }
  .pt-dark-toggle:hover { border-color: var(--purple); color: var(--purple); }
  body.dark-mode .pt-dark-toggle { background: #1f1f3a; border-color: #2d2d4e; color: #a89ec9; }
  body.dark-mode .pt-dark-toggle:hover { border-color: var(--purple); color: var(--purple); }

  .pt-icon-btn {
    width: 36px; height: 36px;
    border-radius: 10px;
    background: none;
    border: 1.5px solid var(--border);
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    color: var(--text2);
    transition: all 0.2s;
  }
  .pt-icon-btn:hover { border-color: var(--purple); color: var(--purple); background: var(--purple-dim); }

  /* ── BOXES ── */
  .pt-boxes-col {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 20px 24px 0;
  }
  .pt-box {
    background: var(--white);
    border: 1.5px solid var(--border);
    border-radius: 14px;
    padding: 18px 20px;
    cursor: pointer;
    transition: all 0.22s;
    display: flex;
    align-items: center;
    gap: 14px;
    position: relative;
  }
  .pt-box:hover {
    border-color: var(--purple);
    box-shadow: 0 4px 16px rgba(108,71,255,0.1);
  }
  .pt-box.active {
    border-color: var(--purple);
    background: rgba(108,71,255,0.04);
  }
  .pt-box-icon-wrap {
    width: 44px; height: 44px;
    border-radius: 12px;
    background: var(--purple-dim);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .pt-box-icon-wrap svg { width: 22px; height: 22px; color: var(--purple); }
  .pt-box-info { flex: 1; }
  .pt-box-label { font-size: 15px; font-weight: 700; color: var(--text); }
  .pt-box-desc  { font-size: 12px; color: var(--text2); margin-top: 2px; }
  .pt-box-arrow { color: var(--text3); font-size: 20px; transition: color 0.2s; }
  .pt-box.active .pt-box-arrow { color: var(--purple); }

  /* ── DARK MODE ── */
  body.dark-mode .pt-header { background: #151525; border-bottom: 1px solid #2d2d4e; }
  body.dark-mode .pt-box    { background: #1a1a2e; border-color: #2d2d4e; }
  body.dark-mode .pt-icon-btn { background: #1f1f3a; border-color: #2d2d4e; color: #a89ec9; }

  /* ── RESPONSIVE ── */
  @media (max-width: 640px) {
    .pt-header {
      padding: 12px 16px;
      flex-wrap: nowrap;
    }
    .pt-header-left {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
      flex: 1 1 auto;
    }
    .pt-header-title {
      font-size: 15px;
    }
    .pt-header-sub {
      display: none;
      margin-top: 0px;
    }
    .pt-header-right-desktop {
      display: none !important;
    }
    .pt-header-right-mobile {
      display: flex !important;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
      width: auto;
      justify-content: flex-end;
      margin-top: 0;
    }

    .pt-dark-toggle {
      padding: 4px 9px;
      font-size: 12px;
    }

    .pt-icon-btn {
      width: 34px;
      height: 34px;
    }
    .pt-boxes-col {
      padding: 16px 16px 0;
      gap: 10px;
    }
    .pt-box {
      padding: 16px 14px;
      border-radius: 12px;
    }
    .pt-box-label { font-size: 14px; }
    .pt-box-desc  { font-size: 11px; }
  }

  @media (min-width: 641px) {
    .pt-header-right-mobile {
      display: none !important;
    }
    .pt-header-right-desktop {
      display: flex !important;
    }
  }
`

// ── Main FrontPage Component ──────────────────────────────────
export default function FrontPage({ onSelectPoints, onSelectTraining }) {
  const [activeBox, setActiveBox] = useState(null)
  const [darkMode,  setDarkMode]  = useState(() => localStorage.getItem('pt-dark') === '1')
  const { user } = useAuthStore()

  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await authService.logout()
    } finally {
      navigate('/auth/login', { replace: true })
    }
  }

  // Inject CSS on mount
  useEffect(() => {
    const el = document.createElement('style')
    el.id    = 'fp-styles'
    el.innerHTML = CSS
    if (!document.getElementById('fp-styles')) document.head.appendChild(el)
    return () => { const s = document.getElementById('fp-styles'); if (s) s.remove() }
  }, [])

  // Dark mode
  useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode)
    localStorage.setItem('pt-dark', darkMode ? '1' : '0')
  }, [darkMode])

  // selectBox — extracted from selectBox() in original
  function selectBox(box) {
    setActiveBox(box)
    if (box === 'points')  onSelectPoints?.()
    else                   onSelectTraining?.()
  }

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)' }}>

      {/* ── Header ── */}
      <div className="pt-header">

        {/* Left: icon + title */}
        <div className="pt-header-left" style={{ display:'flex', alignItems:'center', gap:10, minWidth:0, flex:1 }}>
          <div className="pt-header-icon">🏅</div>
          <div style={{ minWidth:0 }}>
            <div className="pt-header-title">Points &amp; Training</div>
            <div className="pt-header-sub">Reward Points, Activity Points &amp; Training Slots</div>
          </div>
        </div>

        {/* Right: desktop (UserIdentity + dark toggle + logout) */}
        <div className="pt-header-right-desktop" style={{ alignItems:'center', gap:10 }}>
          <UserIdentity user={user} />
          <button className="pt-dark-toggle" onClick={() => setDarkMode(d => !d)}>
            {darkMode ? '☀ Light' : '🌙 Dark'}
          </button>
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

        {/* Right: mobile (user pill + dark toggle) */}
        <div className="pt-header-right-mobile">
          <UserIdentityMobile user={user} />
          <button className="pt-dark-toggle" onClick={() => setDarkMode(d => !d)}>
            {darkMode ? '☀ Light' : 'Dark'}
          </button>
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

      {/* ── Two Boxes ── */}
      <div className="pt-boxes-col">

        {/* Points Dashboard box */}
        <div
          className={`pt-box${activeBox === 'points' ? ' active' : ''}`}
          onClick={() => {selectBox('points'),navigate("/points-page")}}
        >
          <div className="pt-box-icon-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="18" y="3"  width="4" height="18" />
              <rect x="10" y="8"  width="4" height="13" />
              <rect x="2"  y="13" width="4" height="8"  />
            </svg>
          </div>
          <div className="pt-box-info">
            <div className="pt-box-label">Points Dashboard</div>
            <div className="pt-box-desc">Reward &amp; Activity Points Rankings</div>
          </div>
          <span className="pt-box-arrow">›</span>
        </div>

        {/* Training Slots box */}
        <div
          className={`pt-box${activeBox === 'slots' ? ' active' : ''}`}
          onClick={() => {selectBox('/slots'), navigate("/training-slots")}}
        >
          <div className="pt-box-icon-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2"  x2="16" y2="6"  />
              <line x1="8"  y1="2"  x2="8"  y2="6"  />
              <line x1="3"  y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div className="pt-box-info">
            <div className="pt-box-label">Training Slots</div>
            <div className="pt-box-desc">PS &amp; PBL Lab Booking</div>
          </div>
          <span className="pt-box-arrow">›</span>
        </div>

      </div>
    </div>
  )
}