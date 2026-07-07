// UserProfileBadge.jsx
// Shared, fully self-contained clickable name pill → premium user-profile modal.
// Reads the logged-in user from the auth store (or a `user` prop). Shows a generic
// initials avatar + Name + Register Number. Inline styles only (no page CSS classes);
// tokens have hard fallbacks so it renders correctly on every student page + dark mode.
import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';

// Inject the modal animation keyframes once (guarded by id).
const STYLE_ID = 'upb-styles';
function ensureStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.innerHTML = `
    @keyframes upbOverlayIn { from { opacity: 0 } to { opacity: 1 } }
    @keyframes upbCardIn { from { opacity: 0; transform: translateY(18px) scale(.96) } to { opacity: 1; transform: translateY(0) scale(1) } }
  `;
  document.head.appendChild(el);
}

// A tidy premium field row (label + value).
function Field({ label, value, mono }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 4,
      background: 'rgba(108,71,255,0.06)',
      border: '1px solid var(--border, #e5e4eb)',
      borderRadius: 8, padding: '13px 16px',
    }}>
      <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text2, #6b7280)' }}>{label}</span>
      <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text, #1a1a2e)', fontFamily: mono ? 'monospace' : 'inherit', letterSpacing: mono ? 0.5 : 0, wordBreak: 'break-word' }}>{value}</span>
    </div>
  );
}

export default function UserProfileBadge({ user: userProp, variant = 'desktop' }) {
  const storeUser = useAuthStore((s) => s.user);
  const user = userProp || storeUser;

  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);

  useEffect(() => { ensureStyles(); }, []);

  // While the modal is open: Esc closes it + lock background scroll.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (!user) return null;

  const name = user?.name || 'User';
  const regNum = user?.reg_num || '—';
  const initials = String(name).trim().charAt(0).toUpperCase() || 'U';
  const isStudent = Number(user?.role_id) === 1;
  const isMobile = variant === 'mobile';

  return (
    <>
      {/* ── Clickable name pill (matches the existing header pill size) ── */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        title="View profile"
        aria-haspopup="dialog"
        style={{
          display: 'flex', alignItems: 'center',
          gap: isMobile ? 6 : 10,
          padding: isMobile ? '3px 8px 3px 3px' : '4px 14px 4px 4px',
          background: 'var(--white, #fff)',
          border: `1.5px solid ${hover ? 'var(--purple, #6c47ff)' : 'var(--border, #e5e4eb)'}`,
          borderRadius: 8,
          maxWidth: isMobile ? 160 : undefined,
          marginRight: isMobile ? 2 : 0,
          flexShrink: 0,
          cursor: 'pointer',
          fontFamily: 'inherit',
          boxShadow: hover ? '0 4px 14px rgba(108,71,255,0.18)' : 'none',
          transition: 'border-color .18s, box-shadow .18s',
        }}
      >
        <div style={{ width: isMobile ? 26 : 36, height: isMobile ? 26 : 36, borderRadius: '50%', background: 'var(--purple-dim, rgba(108,71,255,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isMobile ? 12 : 15, fontWeight: 800, color: 'var(--purple, #6c47ff)', flexShrink: 0, overflow: 'hidden' }}>
          {initials}
        </div>
        <div style={{ fontSize: isMobile ? 11 : 13, fontWeight: isMobile ? 700 : 800, color: 'var(--text, #1a1a2e)', maxWidth: isMobile ? 96 : 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {name}
        </div>
      </button>

      {/* ── Premium profile modal ── */}
      {open && (
        <div
          onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
          role="dialog"
          aria-modal="true"
          aria-label="User profile"
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(15,10,40,0.55)',
            backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
            zIndex: 100000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
            animation: 'upbOverlayIn .2s ease',
          }}
        >
          <div style={{
            position: 'relative', width: '100%', maxWidth: 450,
            background: 'var(--white, #fff)',
            borderRadius: 8, overflow: 'hidden',
            boxShadow: '0 30px 80px rgba(15,10,40,0.45)',
            border: '1px solid var(--border, #e5e4eb)',
            animation: 'upbCardIn .32s cubic-bezier(0.22,1,0.36,1)',
            fontFamily: 'inherit',
          }}>
            {/* Close */}
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              style={{ position: 'absolute', top: 14, right: 14, zIndex: 2, width: 34, height: 34, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 20, fontWeight: 700, lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)', fontFamily: 'inherit' }}
            >×</button>

            {/* Gradient cover banner with soft decorative orbs */}
            <div style={{ height: 112, background: 'linear-gradient(135deg,#6c47ff 0%,#4b2fd6 58%,#3a1f9e 100%)', position: 'relative', overflow: 'hidden', borderRadius: '8px 8px 0 0' }}>
              <div style={{ position: 'absolute', top: -34, right: -18, width: 128, height: 128, borderRadius: '50%', background: 'rgba(255,255,255,0.10)' }} />
              <div style={{ position: 'absolute', bottom: -46, left: 22, width: 96, height: 96, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
              <div style={{ position: 'absolute', top: 16, left: 20, fontSize: 10, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.75)' }}>Profile</div>
            </div>

            {/* Generic avatar (initials) — solid opaque circle, sits clear of the banner so the whole letter shows */}
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: -46 }}>
              <div style={{ width: 104, height: 104, borderRadius: '50%', background: 'var(--white, #fff)', padding: 5, boxShadow: '0 12px 30px rgba(108,71,255,0.35)' }}>
                <div style={{ width: '100%', height: '100%', boxSizing: 'border-box', borderRadius: '50%', background: 'linear-gradient(135deg,#6c47ff 0%,#4b2fd6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 42, fontWeight: 900, lineHeight: 1, textTransform: 'uppercase', color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.28)', fontFamily: 'inherit' }}>
                  {initials}
                </div>
              </div>
            </div>

            {/* Name + role chip */}
            <div style={{ textAlign: 'center', padding: '16px 32px 2px' }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text, #1a1a2e)', letterSpacing: 0.2, lineHeight: 1.25 }}>{name}</div>
              {isStudent && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 9, padding: '4px 12px', borderRadius: 20, background: 'var(--purple-dim, rgba(108,71,255,0.1))', border: '1px solid rgba(108,71,255,0.25)', fontSize: 11, fontWeight: 800, color: 'var(--purple, #6c47ff)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} /> Student
                </div>
              )}
            </div>

            {/* Fields */}
            <div style={{ padding: '20px 32px 30px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field label="Full Name" value={name} />
              <Field label="Register Number" value={regNum} mono />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
