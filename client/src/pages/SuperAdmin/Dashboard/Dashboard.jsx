import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './Dashboard.module.css'
import NavBox from '../../../components/ui/NavBox'
import { authService } from '../../../services/features/authService'
import { useAuthStore } from '../../../store/authStore'
import { superAdminService } from '../../../services/features/superAdminService'

// ── Placeholder areas (Phase 0 — none wired up yet) ───────────────────────────
const AREAS = [
  {
    label: 'Students',
    desc: 'Create & manage student accounts (coming soon)',
    iconColor: 'green',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    label: 'Faculty',
    desc: 'Create faculty & venue mappings (coming soon)',
    iconColor: 'orange',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    label: 'Courses & Labs',
    desc: 'Manage PS courses & PBL labs (coming soon)',
    iconColor: 'indigo',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
  },
  {
    label: 'Question Bank',
    desc: 'Manage MCQ assessments & questions (coming soon)',
    iconColor: 'purple',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <line x1="9" y1="12" x2="15" y2="12" />
        <line x1="9" y1="16" x2="13" y2="16" />
      </svg>
    ),
  },
  {
    label: 'Bookings',
    desc: 'View & bulk-manage bookings (coming soon)',
    iconColor: 'blue',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    label: 'Slots',
    desc: 'Manage slot timings (coming soon)',
    iconColor: 'gold',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <polyline points="12 7 12 12 15 14" />
      </svg>
    ),
  },
]

export default function SuperAdminDashboard() {
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  const [pingOk, setPingOk] = useState(null) // null = pending, true/false = result

  useEffect(() => {
    let ignore = false
    superAdminService
      .ping()
      .then(() => { if (!ignore) setPingOk(true) })
      .catch(() => { if (!ignore) setPingOk(false) })
    return () => { ignore = true }
  }, [])

  const handleLogout = async () => {
    try { await authService.logout() } finally {
      logout()
      navigate('/auth/login', { replace: true })
    }
  }

  const openComingSoon = (area) =>
    navigate('/superadmin/coming-soon', { state: { area } })

  return (
    <div className={styles.page}>
      {/* HEADER */}
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.brandIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </span>
          <div>
            <div className={styles.brandTitle}>Super Admin</div>
            <div className={styles.brandSub}>Bannari Amman Institute of Technology · PCDP System</div>
          </div>
        </div>
        <button type="button" className={styles.logoutBtn} onClick={handleLogout}>
          Logout
        </button>
      </header>

      {/* SECTION HEADER */}
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitle}>Super Admin Dashboard</div>
        <div className={styles.sectionSub}>
          Foundation is ready. Management areas will be enabled in upcoming phases.
        </div>
        <div className={`${styles.ping} ${pingOk ? styles.pingOk : styles.pingWait}`}>
          {pingOk === null ? 'Connecting…' : pingOk ? '● Connected to Super Admin API' : '○ API not reachable'}
        </div>
      </div>

      {/* PLACEHOLDER AREAS */}
      <div className={styles.groups}>
        <div className={styles.boxesGrid}>
          {AREAS.map((a) => (
            <NavBox
              key={a.label}
              iconColor={a.iconColor}
              icon={a.icon}
              label={a.label}
              desc={a.desc}
              onClick={() => openComingSoon(a.label)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
