// FileNotFound.jsx — 404 Page
// Theme matches FrontPage.jsx (Plus Jakarta Sans + Outfit, purple brand, CSS vars)
// Usage: <Route path="*" element={<FileNotFound />} />
// Redirects to /auth/login if refresh token is expired/missing, else to dashboard

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore.jsx'

// ── Inject matching CSS vars + fonts ──────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Outfit:wght@600;700;800;900&display=swap');

  :root {
    --purple:      #6c47ff;
    --purple-dim:  rgba(108,71,255,0.10);
    --purple-glow: rgba(108,71,255,0.25);
    --bg:          #f0f2f8;
    --white:       #fff;
    --border:      #e5e4eb;
    --text:        #1a1a2e;
    --text2:       #6b7280;
    --text3:       #9ca3af;
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

  *, *::before, *::after { box-sizing: border-box; }

  body {
    background: var(--bg);
    font-family: var(--font-body);
    color: var(--text);
    -webkit-font-smoothing: antialiased;
  }

  /* ── 404 glitch number ── */
  @keyframes glitch-shift {
    0%   { clip-path: inset(0 0 96% 0); transform: translate(-4px,  0); }
    10%  { clip-path: inset(10% 0 80% 0); transform: translate( 4px,  0); }
    20%  { clip-path: inset(50% 0 30% 0); transform: translate(-3px,  0); }
    30%  { clip-path: inset(80% 0 5%  0); transform: translate( 3px,  0); }
    40%  { clip-path: inset(5%  0 90% 0); transform: translate(-2px,  0); }
    50%  { clip-path: inset(0 0 0 0);     transform: translate(0,     0); }
    100% { clip-path: inset(0 0 0 0);     transform: translate(0,     0); }
  }

  .fn-glitch {
    position: relative;
    font-family: var(--font-head);
    font-size: clamp(96px, 22vw, 180px);
    font-weight: 900;
    line-height: 1;
    letter-spacing: -4px;
    color: var(--purple);
    user-select: none;
  }
  .fn-glitch::before,
  .fn-glitch::after {
    content: attr(data-text);
    position: absolute;
    inset: 0;
    color: var(--purple);
  }
  .fn-glitch::before {
    left: 3px;
    color: #ff47c7;
    opacity: 0.55;
    animation: glitch-shift 3.5s infinite steps(1);
  }
  .fn-glitch::after {
    left: -3px;
    color: #47c7ff;
    opacity: 0.45;
    animation: glitch-shift 3.5s infinite steps(1) reverse;
  }

  /* ── Orbit ring ── */
  @keyframes spin-slow {
    from { transform: rotate(0deg);   }
    to   { transform: rotate(360deg); }
  }
  @keyframes spin-rev {
    from { transform: rotate(0deg);   }
    to   { transform: rotate(-360deg); }
  }
  .fn-orbit-outer {
    animation: spin-slow 18s linear infinite;
  }
  .fn-orbit-inner {
    animation: spin-rev 12s linear infinite;
  }

  /* ── Countdown ring ── */
  @keyframes stroke-shrink {
    from { stroke-dashoffset: 0; }
    to   { stroke-dashoffset: 283; }
  }
  .fn-progress-ring {
    animation: stroke-shrink var(--countdown-duration, 10s) linear forwards;
  }

  /* ── Button ── */
  .fn-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 13px 28px;
    background: var(--purple);
    color: #fff;
    border: none;
    border-radius: 50px;
    font-family: var(--font-body);
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.22s;
    box-shadow: 0 4px 18px var(--purple-glow);
    letter-spacing: 0.2px;
  }
  .fn-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 28px var(--purple-glow);
    filter: brightness(1.08);
  }
  .fn-btn:active { transform: translateY(0); }

  /* ── Ghost button ── */
  .fn-btn-ghost {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 12px 24px;
    background: var(--white);
    color: var(--text2);
    border: 1.5px solid var(--border);
    border-radius: 50px;
    font-family: var(--font-body);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.22s;
  }
  .fn-btn-ghost:hover {
    border-color: var(--purple);
    color: var(--purple);
    background: var(--purple-dim);
  }

  /* ── Floating particles ── */
  @keyframes float-up {
    0%   { transform: translateY(0)   scale(1);   opacity: 0.6; }
    100% { transform: translateY(-80px) scale(0.4); opacity: 0;   }
  }
  .fn-particle {
    position: absolute;
    border-radius: 50%;
    background: var(--purple);
    animation: float-up var(--dur, 4s) ease-in infinite;
    animation-delay: var(--delay, 0s);
  }

  /* ── Fade-in ── */
  @keyframes fade-up {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0);    }
  }
  .fn-fade { animation: fade-up 0.55s ease both; }
  .fn-fade-1 { animation-delay: 0.05s; }
  .fn-fade-2 { animation-delay: 0.18s; }
  .fn-fade-3 { animation-delay: 0.30s; }
  .fn-fade-4 { animation-delay: 0.42s; }
`

// ── Countdown ring ────────────────────────────────────────────
function CountdownRing({ seconds, total }) {
  const r = 22
  const circ = 2 * Math.PI * r          // ≈138.2
  const pct  = seconds / total
  const dashoffset = circ * (1 - pct)

  return (
    <svg width="54" height="54" viewBox="0 0 54 54" style={{ transform:'rotate(-90deg)' }}>
      {/* track */}
      <circle cx="27" cy="27" r={r} fill="none" stroke="var(--border)" strokeWidth="3.5" />
      {/* progress */}
      <circle
        cx="27" cy="27" r={r}
        fill="none"
        stroke="var(--purple)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={dashoffset}
        style={{ transition: 'stroke-dashoffset 0.9s linear' }}
      />
    </svg>
  )
}

// ── Main component ────────────────────────────────────────────
const REDIRECT_DELAY = 10   // seconds before auto-redirect

export default function FileNotFound() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const accessToken = useAuthStore((s) => s.accessToken)
  const [seconds, setSeconds] = useState(REDIRECT_DELAY)
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('pt-dark') === '1')

  // Inject CSS
  useEffect(() => {
    const el = document.createElement('style')
    el.id = 'fn-styles'
    el.innerHTML = CSS
    if (!document.getElementById('fn-styles')) document.head.appendChild(el)
    return () => { const s = document.getElementById('fn-styles'); if (s) s.remove() }
  }, [])

  // Dark mode sync
  useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode)
    localStorage.setItem('pt-dark', darkMode ? '1' : '0')
  }, [darkMode])

  // Countdown + redirect
  useEffect(() => {
    if (seconds <= 0) {
      handleHome()
      return
    }
    const t = setTimeout(() => setSeconds(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [seconds])

  // Smart redirect: login if no refresh token, else dashboard
  function handleHome() {
    if (!accessToken || !user) {
      navigate('/auth/login', { replace: true })
    } else {
      navigate('/', { replace: true })
    }
  }

  // Particle positions (stable)
  const particles = [
    { left: '12%', top: '70%', size: 5,  dur: '4s',   delay: '0s'   },
    { left: '25%', top: '80%', size: 3,  dur: '5.5s', delay: '1.2s' },
    { left: '40%', top: '75%', size: 7,  dur: '3.8s', delay: '0.4s' },
    { left: '60%', top: '78%', size: 4,  dur: '4.8s', delay: '2.1s' },
    { left: '75%', top: '72%', size: 6,  dur: '4.2s', delay: '0.8s' },
    { left: '88%', top: '76%', size: 3,  dur: '5.2s', delay: '1.7s' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>

      {/* ── Header (matches FrontPage) ── */}
      <header style={{
        background: 'var(--white)',
        borderBottom: '1px solid var(--border)',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 1px 8px rgba(0,0,0,0.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'var(--purple-dim)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18,
          }}>🏅</div>
          <div>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>
              Points &amp; Training
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 1 }}>
              Reward Points, Activity Points &amp; Training Slots
            </div>
          </div>
        </div>

        {/* Dark toggle */}
        <button
          onClick={() => setDarkMode(d => !d)}
          style={{
            background: 'none',
            border: '1.5px solid var(--border)',
            borderRadius: 20,
            padding: '5px 11px',
            cursor: 'pointer',
            fontSize: 13,
            color: 'var(--text2)',
            display: 'flex', alignItems: 'center', gap: 5,
            fontFamily: 'var(--font-body)',
            fontWeight: 600,
            transition: 'all 0.2s',
          }}
        >
          {darkMode ? '☀ Light' : '🌙 Dark'}
        </button>
      </header>

      {/* ── Body ── */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        position: 'relative',
        overflow: 'hidden',
      }}>

        {/* Floating particles */}
        {particles.map((p, i) => (
          <span key={i} className="fn-particle" style={{
            left: p.left, top: p.top,
            width: p.size, height: p.size,
            '--dur': p.dur, '--delay': p.delay,
            opacity: 0.35,
          }} />
        ))}

        {/* ── Orbiting rings around 404 ── */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>

          {/* Outer orbit ring */}
          <div className="fn-orbit-outer" style={{
            position: 'absolute',
            width: 280, height: 280,
            borderRadius: '50%',
            border: '1.5px dashed var(--purple-glow)',
            pointerEvents: 'none',
          }}>
            {/* dot on orbit */}
            <div style={{
              position: 'absolute', top: -5, left: '50%', transform: 'translateX(-50%)',
              width: 10, height: 10, borderRadius: '50%',
              background: 'var(--purple)', boxShadow: '0 0 8px var(--purple)',
            }} />
          </div>

          {/* Inner orbit ring */}
          <div className="fn-orbit-inner" style={{
            position: 'absolute',
            width: 210, height: 210,
            borderRadius: '50%',
            border: '1px dashed rgba(108,71,255,0.2)',
            pointerEvents: 'none',
          }}>
            <div style={{
              position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)',
              width: 8, height: 8, borderRadius: '50%',
              background: '#ff47c7', boxShadow: '0 0 6px #ff47c7',
            }} />
          </div>

          {/* 404 glitch text */}
          <div className="fn-glitch fn-fade fn-fade-1" data-text="404">404</div>
        </div>

        {/* Card */}
        <div className="fn-fade fn-fade-2" style={{
          background: 'var(--white)',
          border: '1.5px solid var(--border)',
          borderRadius: 20,
          padding: '32px 36px',
          maxWidth: 420,
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 8px 32px rgba(0,0,0,0.06)',
          marginTop: 12,
        }}>

          {/* Headline */}
          <div style={{
            fontFamily: 'var(--font-head)',
            fontSize: 22,
            fontWeight: 800,
            color: 'var(--text)',
            marginBottom: 8,
          }}>
            Page Not Found
          </div>

          {/* Sub */}
          <p style={{
            fontSize: 13,
            color: 'var(--text2)',
            lineHeight: 1.65,
            marginBottom: 28,
            maxWidth: 300,
            margin: '0 auto 28px',
          }}>
            The page you're looking for doesn't exist or has been moved.
            You'll be redirected automatically.
          </p>

          {/* Countdown row */}
          <div className="fn-fade fn-fade-3" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
            marginBottom: 28,
          }}>
            <div style={{ position: 'relative', width: 54, height: 54 }}>
              <CountdownRing seconds={seconds} total={REDIRECT_DELAY} />
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-head)',
                fontSize: 16, fontWeight: 800,
                color: 'var(--purple)',
              }}>
                {seconds}
              </div>
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Auto-redirecting</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                {seconds === 1 ? '1 second' : `${seconds} seconds`} remaining
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="fn-fade fn-fade-4" style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
            <button className="fn-btn" onClick={handleHome} style={{ width: '100%', justifyContent: 'center' }}>
              {/* Home icon */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12L12 3l9 9" /><path d="M9 21V12h6v9" /><path d="M3 12v9h18v-9" />
              </svg>
              Go to Home
            </button>

            <button className="fn-btn-ghost" onClick={() => window.history.back()}>
              {/* Arrow back */}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
              </svg>
              Go Back
            </button>
          </div>
        </div>

        {/* Path badge */}
        <div className="fn-fade fn-fade-4" style={{
          marginTop: 20,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: 'var(--white)',
          border: '1.5px solid var(--border)',
          borderRadius: 50,
          padding: '6px 14px',
          fontSize: 12,
          color: 'var(--text3)',
          fontFamily: 'monospace',
          maxWidth: 360,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          <span style={{ color: 'var(--purple)', fontWeight: 700 }}>404</span>
          <span>·</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {window.location.pathname}
          </span>
        </div>

      </main>

      {/* ── Footer ── */}
      <footer style={{
        padding: '16px 24px',
        textAlign: 'center',
        fontSize: 11,
        color: 'var(--text3)',
        borderTop: '1px solid var(--border)',
        background: 'var(--white)',
      }}>
        Points &amp; Training · © {new Date().getFullYear()}
      </footer>
    </div>
  )
}