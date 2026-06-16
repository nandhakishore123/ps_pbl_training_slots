import { useLocation, useNavigate } from 'react-router-dom'

const P = '#6c47ff'
const font = "'Plus Jakarta Sans', 'Outfit', system-ui, sans-serif"

export default function ComingSoon() {
  const navigate = useNavigate()
  const location = useLocation()
  const area = location.state?.area

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f8', fontFamily: font, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: '40px 36px', maxWidth: 440, width: '100%', textAlign: 'center', boxShadow: '0 8px 40px rgba(108,71,255,0.12)' }}>
        <div style={{ width: 64, height: 64, borderRadius: 18, margin: '0 auto 18px', display: 'grid', placeItems: 'center', background: 'rgba(108,71,255,0.1)' }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={P} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <polyline points="12 7 12 12 15 14" />
          </svg>
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#1a1a2e', fontFamily: "'Outfit', sans-serif", marginBottom: 6 }}>
          {area ? `${area} — Coming Soon` : 'Coming Soon'}
        </div>
        <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6, marginBottom: 24 }}>
          This area is not available yet. It will be enabled in an upcoming phase of the Super Admin rollout.
        </div>
        <button
          type="button"
          onClick={() => navigate('/superadmin-dashboard')}
          style={{ padding: '12px 28px', background: P, border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: font, boxShadow: '0 4px 20px rgba(108,71,255,.35)' }}
        >
          ← Back to Super Admin
        </button>
      </div>
    </div>
  )
}
