import styles from './Header.module.css'
import { useApp } from '../context/AppContext'
import { useAuthStore } from '../../../store/authStore.jsx'
import { useNavigate } from 'react-router-dom'
import { authService } from '../../../services/features/authService'

export default function Header({ showBack = false }) {
  const { navigate, darkMode, toggleDark } = useApp()
  const routeNavigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  const user = useAuthStore((s) => s.user)
  const rawName = user?.name || user?.email || 'Admin'
  const baseName = String(rawName).split('@')[0]
  const displayName = baseName
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
  const initials = String(displayName).trim()?.charAt(0)?.toUpperCase() || 'A'

  const handleLogout = async () => {
    try {
      await authService.logout()
    } finally {
      logout()
      routeNavigate('/auth/login', { replace: true })
    }
  }

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        {showBack ? (
          <button className={styles.backBtn} onClick={() => navigate('dashboard')}>
            ← Back
          </button>
        ) : (
          <div className={styles.title}>
            PCDP Portal{' '}
            <span className={styles.adminBadge}>Admin</span>
          </div>
        )}
      </div>

      <div className={styles.right}>
        <button className={styles.darkBtn} onClick={toggleDark}>
          {darkMode ? '☀️ Light' : '🌙 Dark'}
        </button>

        <div className={styles.userPill} title={displayName}>
          <div className={styles.userAvatar}>{initials}</div>
          <div className={styles.userName}>{displayName}</div>
        </div>

        <button
          type="button"
          className={styles.logoutBtn}
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
    </header>
  )
}
