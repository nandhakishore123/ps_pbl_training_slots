import { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { authService } from '../../services/features/authService';
import { useStore } from '../../store/useStore';
import { useAuthStore } from '../../store/authStore.jsx';
import { useLocation, useNavigate } from 'react-router-dom';

const PARTICLES = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 3 + 1,
  duration: Math.random() * 6 + 4,
  delay: Math.random() * 5,
}));

const BADGES = [
  { label: 'Top Performer', color: '#f59e0b' },
  { label: '770 AP Earned', color: '#3b82f6' },
  { label: 'Quiz Master', color: '#10b981' },
  { label: 'Level 5 Reached', color: '#8b5cf6' },
];

// Layers SVG icon — matches the exact icon from the reference image
const LayersIcon = ({ size = 28, color = 'white' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Top layer filled */}
    <path d="M12 2L2 7L12 12L22 7L12 2Z" fill={color} fillOpacity="0.95" />
    {/* Middle layer stroke */}
    <path
      d="M2 12L12 17L22 12"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Bottom layer stroke */}
    <path
      d="M2 17L12 22L22 17"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function PCDPLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast: pushToast } = useStore();
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  const getHomeRoute = (roleId) => {
    const numericRoleId = Number(roleId);

    if (numericRoleId === 1) {
      return '/student-dashboard';
    }

    if (numericRoleId === 2 || numericRoleId === 3) {
      return '/admin-dashboard';
    }

    return '/auth/login';
  };

  const useWindowWidth = () => {
    const [width, setWidth] = useState(() =>
      typeof window === 'undefined' ? 1024 : window.innerWidth
    );

    useEffect(() => {
      const onResize = () => setWidth(window.innerWidth);
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }, []);

    return width;
  };

  const windowWidth = useWindowWidth();
  const googleBtnWidth = Math.min(360, Math.max(240, windowWidth - 64));

  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [errors, setErrors] = useState({});
  const [btnHover, setBtnHover] = useState(false);
  const passwordRef = useRef(null);
  const usernameRef = useRef(null);

  const handleKeyUp = (e) => {
    setCapsLock(e.getModifierState && e.getModifierState('CapsLock'));
  };

  useEffect(() => {
    if (accessToken && user) {
      const targetRoute = getHomeRoute(user.role_id);
      if (location.pathname !== targetRoute) {
        navigate(targetRoute, { replace: true });
      }
    }
  }, [accessToken, user, location.pathname, navigate]);

  const showToast = useCallback(
    (type, msg) => pushToast(msg, type !== 'success'),
    [pushToast]
  );

  const validate = useCallback(() => {
    const errs = {};
    if (!username.trim()) errs.username = 'Username is required';
    if (!password.trim()) errs.password = 'Password is required';
    else if (password.length < 4) errs.password = 'Password too short';
    return errs;
  }, [username, password]);

  const handleGoogleCredential = async (credential) => {
    try {
      setLoading(true);
      const payload = await authService.googleLogin(credential);
      const { accessToken, user } = payload?.data || {};

      if (!payload?.success || !accessToken) {
        showToast('error', payload?.message || 'Login failed');
        return;
      }
      showToast('success', `Welcome ${user?.email || ''}`.trim());
      // Navigate directly to the correct home route to avoid bouncing via '/'
      const targetRoute = getHomeRoute(user?.role_id);
      navigate(targetRoute, { replace: true });
    } catch (err) {
      const status = err?.response?.status;
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.message ||
        err?.message ||
        'Google login failed';

      if (status === 404 && (err?.response?.data?.code === 'USER_NOT_FOUND' || err?.response?.data?.code === 'USER_NOT_FOUND')) {
        showToast('error', 'User not found in database');
        return;
      }

      showToast('error', message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = useCallback(async () => {
    if (accessToken && user) {
      const targetRoute = getHomeRoute(user.role_id);
      if (location.pathname !== targetRoute) {
        navigate(targetRoute, { replace: true });
      }
      return;
    }

    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      setShake(true);
      setTimeout(() => setShake(false), 600);
      showToast('error', 'Please fix the errors before signing in.');
      return;
    }
    setLoading(true);
    try {
      const payload = await authService.googleLogin(username);
      const { accessToken: token, user: u } = payload?.data || {};

      if (!payload?.success || !token) {
        showToast('error', payload?.message || 'Login failed');
        return;
      }
      showToast('success', `Welcome back, ${u?.name || username}! Redirecting...`);
      const targetRoute = getHomeRoute(u?.role_id);
      navigate(targetRoute, { replace: true });
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Login failed';
      showToast('error', message);
    } finally {
      setLoading(false);
    }
  }, [accessToken, user, location.pathname, navigate, username, password, showToast, validate]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Enter') handleLogin();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleLogin]);

  return (
    <div style={styles.page} className="pcdp-page">
      {/* LEFT PANEL */}
      <div style={styles.leftPanel} className="pcdp-left">
        {/* Animated particles */}
        <div style={styles.particlesWrap}>
          {PARTICLES.map((p) => (
            <div
              key={p.id}
              style={{
                position: 'absolute',
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.6)',
                animation: `floatDot ${p.duration}s ${p.delay}s ease-in-out infinite alternate`,
              }}
            />
          ))}
        </div>

        <div style={styles.leftContent}>
          {/* Brand */}
          <div style={styles.brandRow}>
            <div style={styles.brandIconWrap}>
              <LayersIcon size={28} color="white" />
            </div>
            <span style={styles.brandName}>PCDP Portal</span>
          </div>

          <div style={styles.leftHero}>
            {/* Tagline */}
            <div style={styles.taglineWrap}>
              <h1 style={styles.tagLine1}>Achieve.</h1>
              <h1 style={styles.tagLine2}>Compete.</h1>
              <h1 style={styles.tagLine3}>Dominate.</h1>
            </div>

            <p style={styles.heroSub}>
              The official student achievement portal of
              <br />
              Bannari Amman Institute of Technology
            </p>

            {/* Project-Based Learning Mode */}
            <div style={styles.pblCard}>
              <h2 style={styles.pblTitle}>Project-Based Learning Mode</h2>
              <p style={styles.pblSub}>
                Empowering students through hands-on projects, real-world
                skills, and collaborative learning.
              </p>
            </div>

            {/* Stats */}
            <div style={styles.statsRow}>
              <div style={styles.statItem}>
                <span style={styles.statNum}>72</span>
                <span style={styles.statLabel}>Courses</span>
              </div>
              <div style={styles.statDivider} />
              <div style={styles.statItem}>
                <span style={styles.statNum}>180+</span>
                <span style={styles.statLabel}>Projects</span>
              </div>
              <div style={styles.statDivider} />
              <div style={styles.statItem}>
                <span style={styles.statNum}>1st</span>
                <span style={styles.statLabel}>Rank</span>
              </div>
            </div>

            {/* Badges */}
            <div style={styles.badgesRow} className="pcdp-badges">
              {BADGES.map((b) => (
                <div
                  key={b.label}
                  style={{ ...styles.badge, borderColor: b.color + '55' }}
                >
                  <span style={{ ...styles.badgeText, color: b.color }}>
                    {b.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div style={styles.rightPanel} className="pcdp-right">
        <div style={{ ...styles.formWrap, animation: 'slideIn 0.5s ease' }}>
          {/* Header */}
          <div style={styles.formHeader}>
            <div style={styles.formLogoWrap}>
              <LayersIcon size={22} color="#1e40af" />
            </div>
            <span style={styles.formLogoText}>PCDP Portal</span>
          </div>

          <div style={styles.rightPblTag}>Project-Based Learning Mode</div>

          <h1 style={styles.formTitle}>Welcome back</h1>
          <p style={styles.formSubtitle}>Sign in to your account to continue</p>

          {/* Username */}
          <div style={styles.field}>
            <label style={styles.label} htmlFor="username">
              Username
            </label>
            <div
              style={{
                ...styles.inputWrap,
                animation: shake ? 'shake 0.5s ease' : 'none',
              }}
            >
              <span style={styles.inputIcon}>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={errors.username ? '#ef4444' : '#93c5fd'}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                </svg>
              </span>
              <input
                id="username"
                ref={usernameRef}
                type="text"
                name="pcdp_username"
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="Enter your username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setErrors((ev) => ({ ...ev, username: '' }));
                }}
                style={{
                  ...styles.input,
                  borderColor: errors.username ? '#ef4444' : '#dbeafe',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = errors.username
                    ? '#ef4444'
                    : '#1a56db';
                  e.target.style.boxShadow = errors.username
                    ? '0 0 0 3px rgba(239,68,68,0.12)'
                    : '0 0 0 3px rgba(26,86,219,0.12)';
                  e.target.style.background = '#fff';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = errors.username
                    ? '#ef4444'
                    : '#dbeafe';
                  e.target.style.boxShadow = 'none';
                  e.target.style.background = '#f0f7ff';
                }}
              />
            </div>
            {errors.username && (
              <p style={styles.errorMsg}>⚠ {errors.username}</p>
            )}
          </div>

          {/* Password */}
          <div style={styles.field}>
            <div style={styles.labelRow}>
              <label style={styles.label} htmlFor="password">
                Password
              </label>
              <button style={styles.forgotBtn}>Forgot password?</button>
            </div>
            <div
              style={{
                ...styles.inputWrap,
                animation: shake ? 'shake 0.5s ease' : 'none',
              }}
            >
              <span style={styles.inputIcon}>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={errors.password ? '#ef4444' : '#93c5fd'}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <input
                id="password"
                ref={passwordRef}
                type={showPassword ? 'text' : 'password'}
                name="pcdp_password"
                autoComplete="new-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrors((ev) => ({ ...ev, password: '' }));
                }}
                onKeyUp={handleKeyUp}
                style={{
                  ...styles.input,
                  paddingRight: '44px',
                  borderColor: errors.password ? '#ef4444' : '#dbeafe',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = errors.password
                    ? '#ef4444'
                    : '#1a56db';
                  e.target.style.boxShadow = errors.password
                    ? '0 0 0 3px rgba(239,68,68,0.12)'
                    : '0 0 0 3px rgba(26,86,219,0.12)';
                  e.target.style.background = '#fff';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = errors.password
                    ? '#ef4444'
                    : '#dbeafe';
                  e.target.style.boxShadow = 'none';
                  e.target.style.background = '#f0f7ff';
                }}
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
                aria-label="Toggle password"
              >
                {showPassword ? (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#93c5fd"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#93c5fd"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {errors.password && (
              <p style={styles.errorMsg}>⚠ {errors.password}</p>
            )}
            {capsLock && !errors.password && (
              <p style={styles.capsMsg}>⇪ Caps Lock is ON</p>
            )}
          </div>

          {/* Remember me */}
          <div style={styles.rememberRow}>
            <label style={styles.checkLabel}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={styles.checkbox}
              />
              <span style={styles.checkText}>Remember me</span>
            </label>
          </div>

          {/* Login Button */}
          <button
            type="button"
            onMouseEnter={() => setBtnHover(true)}
            onMouseLeave={() => setBtnHover(false)}
            style={{
              ...styles.loginBtn,
              opacity: loading ? 0.85 : 1,
              transform: btnHover && !loading ? 'scale(1.02)' : 'scale(1)',
              boxShadow:
                btnHover && !loading
                  ? '0 8px 24px rgba(26,86,219,0.35)'
                  : 'none',
            }}
          >
            {loading ? (
              <>
                <div style={styles.spinner} />
                Signing in...
              </>
            ) : (
              <>
                Sign In
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </>
            )}
          </button>

          {/* Divider */}
          <div style={styles.divider}>
            <div style={styles.dividerLine} />
            <span style={styles.dividerText}>or</span>
            <div style={styles.dividerLine} />
          </div>

          {/* Google */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GoogleLogin
              onSuccess={(res) => handleGoogleCredential(res?.credential)}
              onError={() => showToast('error', 'Google login failed')}
              useOneTap={false}
              theme="outline"
              size="large"
              width={googleBtnWidth}
            />
          </div>

          <p style={styles.footer}>© 2026 PCDP Portal · Bitsathy</p>
        </div>
      </div>

      {/* Global keyframe styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes floatDot {
          0%   { transform: translateY(0px) scale(1);   opacity: 0.4; }
          100% { transform: translateY(-18px) scale(1.4); opacity: 0.9; }
        }
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%     { transform: translateX(-8px); }
          40%     { transform: translateX(8px); }
          60%     { transform: translateX(-5px); }
          80%     { transform: translateX(5px); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(-20px) translateX(-50%); }
          to   { opacity: 1; transform: translateY(0)    translateX(-50%); }
        }
        @keyframes badgePulse {
          0%,100% { opacity: 0.85; }
          50%     { opacity: 1; }
        }

        @media (max-width: 768px) {
          .pcdp-page { flex-direction: column !important; }
          .pcdp-left { display: none !important; }
          .pcdp-right { padding: 1.25rem !important; min-height: 100vh !important; }
          .pcdp-badges { flex-wrap: wrap !important; }
        }

        @media (max-width: 420px) {
          .pcdp-right { padding: 1rem !important; }
        }
      `}</style>
    </div>
  );
}

const styles = {
  page: {
    display: 'flex',
    minHeight: '100vh',
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    background: '#fff',
    position: 'relative',
  },

  /* TOAST */
  toast: {
    position: 'fixed',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    color: '#fff',
    padding: '12px 24px',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    zIndex: 9999,
    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
    animation: 'toastIn 0.3s ease',
    whiteSpace: 'nowrap',
  },

  /* LEFT */
  leftPanel: {
    flex: '0 0 48%',
    background:
      'linear-gradient(160deg, #0f172a 0%, #1e3a8a 50%, #1e40af 100%)',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    minHeight: '100vh',
  },
  particlesWrap: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    zIndex: 0,
  },
  leftContent: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    padding: '2rem 2.5rem',
  },
  brandRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  brandIconWrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
  },
  brandName: {
    color: '#fff',
    fontSize: '20px',
    fontWeight: 700,
    fontFamily: "'Sora', sans-serif",
    letterSpacing: '-0.3px',
  },
  leftHero: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: '0px',
  },
  taglineWrap: {
    marginBottom: '0.9rem',
  },
  tagLine1: {
    color: '#fff',
    fontSize: 'clamp(28px, 3.5vw, 44px)',
    fontWeight: 800,
    fontFamily: "'Sora', sans-serif",
    lineHeight: 1.12,
    letterSpacing: '-0.8px',
    margin: 0,
  },
  tagLine2: {
    color: '#fff',
    fontSize: 'clamp(28px, 3.5vw, 44px)',
    fontWeight: 800,
    fontFamily: "'Sora', sans-serif",
    lineHeight: 1.12,
    letterSpacing: '-0.8px',
    margin: 0,
  },
  tagLine3: {
    color: '#fbbf24',
    fontSize: 'clamp(28px, 3.5vw, 44px)',
    fontWeight: 800,
    fontFamily: "'Sora', sans-serif",
    lineHeight: 1.12,
    letterSpacing: '-0.8px',
    margin: 0,
  },
  heroSub: {
    color: 'rgba(255,255,255,0.60)',
    fontSize: '14px',
    lineHeight: 1.7,
    marginBottom: '1rem',
  },
  statsRow: {
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(255,255,255,0.08)',
    borderRadius: '16px',
    padding: '1rem 1.5rem',
    border: '1px solid rgba(255,255,255,0.15)',
    marginBottom: '1.4rem',
    maxWidth: '100%',
  },
  statItem: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
  },
  statNum: {
    color: '#fbbf24',
    fontSize: '22px',
    fontWeight: 700,
    fontFamily: "'Sora', sans-serif",
    letterSpacing: '-0.5px',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: '12px',
    fontWeight: 500,
  },
  statDivider: {
    width: '1px',
    height: '36px',
    background: 'rgba(255,255,255,0.15)',
    margin: '0 0.5rem',
  },
  badgesRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    maxWidth: '100%',
  },
  badge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid',
    borderRadius: '20px',
    padding: '6px 12px',
    animation: 'badgePulse 3s ease-in-out infinite',
  },
  badgeText: {
    fontSize: '12px',
    fontWeight: 600,
  },

  /* RIGHT */
  rightPanel: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f8faff',
    padding: '2rem',
    minHeight: '100vh',
  },
  formWrap: {
    width: '100%',
    maxWidth: '400px',
  },
  formHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '2rem',
  },
  formLogoWrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formLogoText: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#1e40af',
    fontFamily: "'Sora', sans-serif",
  },
  formTitle: {
    fontSize: '26px',
    fontWeight: 700,
    color: '#0f172a',
    marginBottom: '6px',
    letterSpacing: '-0.5px',
    fontFamily: "'Sora', sans-serif",
  },
  formSubtitle: {
    fontSize: '14px',
    color: '#64748b',
    marginBottom: '2rem',
  },
  field: {
    marginBottom: '1.1rem',
  },
  labelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: '#1e3a8a',
    marginBottom: '6px',
  },
  inputWrap: {
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    left: '13px',
    top: '50%',
    transform: 'translateY(-50%)',
    display: 'flex',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  input: {
    width: '100%',
    height: '46px',
    border: '1.5px solid #dbeafe',
    borderRadius: '12px',
    padding: '0 14px 0 42px',
    fontSize: '14px',
    fontFamily: 'inherit',
    color: '#0f172a',
    background: '#f0f7ff',
    outline: 'none',
    transition: 'border 0.18s, box-shadow 0.18s, background 0.18s',
  },
  eyeBtn: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
  },
  errorMsg: {
    fontSize: '12px',
    color: '#ef4444',
    marginTop: '5px',
    fontWeight: 500,
  },
  capsMsg: {
    fontSize: '12px',
    color: '#f59e0b',
    marginTop: '5px',
    fontWeight: 500,
  },
  forgotBtn: {
    fontSize: '12px',
    color: '#1a56db',
    fontWeight: 500,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    fontFamily: 'inherit',
  },
  rememberRow: {
    marginBottom: '1.4rem',
  },
  checkLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
  },
  checkbox: {
    width: '16px',
    height: '16px',
    accentColor: '#1a56db',
    cursor: 'pointer',
  },
  checkText: {
    fontSize: '13px',
    color: '#475569',
    fontWeight: 500,
  },
  loginBtn: {
    width: '100%',
    height: '48px',
    background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
    border: 'none',
    borderRadius: '12px',
    color: '#fff',
    fontFamily: 'inherit',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    letterSpacing: '0.02em',
    marginBottom: '1.2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'transform 0.18s, box-shadow 0.18s, opacity 0.18s',
  },
  spinner: {
    width: '18px',
    height: '18px',
    border: '2.5px solid rgba(255,255,255,0.3)',
    borderTop: '2.5px solid #fff',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '1rem',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    background: '#dbeafe',
  },
  dividerText: {
    fontSize: '12px',
    color: '#94a3b8',
    fontWeight: 500,
  },
  googleAvatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #1e40af, #2563eb)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 700,
    color: '#fff',
    flexShrink: 0,
  },
  googleInfo: {
    flex: 1,
    textAlign: 'left',
  },
  googleName: {
    fontSize: '12.5px',
    fontWeight: 600,
    color: '#0f172a',
    display: 'block',
    lineHeight: 1.2,
  },
  googleEmail: {
    fontSize: '11px',
    color: '#64748b',
    display: 'block',
  },
  footer: {
    textAlign: 'center',
    fontSize: '11.5px',
    color: '#94a3b8',
    marginTop: '2rem',
  },

  /* PROJECT-BASED LEARNING CARD */
  pblCard: {
    marginTop: '1.2rem',
    marginBottom: '1.2rem',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '16px',
    padding: '1.1rem 1.4rem',
    maxWidth: '100%',
  },
  pblTitle: {
    color: '#fff',
    fontSize: '18px',
    fontWeight: 800,
    fontFamily: "'Sora', sans-serif",
    lineHeight: 1.25,
    letterSpacing: '-0.3px',
    marginBottom: '6px',
  },
  pblSub: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: '12.5px',
    lineHeight: 1.6,
  },
  rightPblTag: {
    display: 'inline-block',
    background: '#eff6ff',
    color: '#1e40af',
    fontSize: '11.5px',
    fontWeight: 700,
    letterSpacing: '0.04em',
    borderRadius: '20px',
    padding: '4px 12px',
    marginBottom: '14px',
    border: '1px solid #bfdbfe',
  },
};
