import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore.jsx'
import { authService } from '../../services/features/authService'
import { facultyService } from '../../services/features/facultyService'
import StatCard from '../../components/ui/StatCard'
import NavBox from '../../components/ui/NavBox'
import styles from './FacultyDashboard.module.css'

export default function FacultyDashboard() {
  const routeNavigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  const user = useAuthStore((s) => s.user)

  const [kpi, setKpi] = useState({ assignedVenues: '—', totalStudents: '—', pendingTransfers: '—', pendingApprovals: '—' })
  const [kpiLoading, setKpiLoading] = useState(true)

  const rawName = user?.name || user?.email || 'Faculty'
  const baseName = String(rawName).split('@')[0]
  const displayName = baseName
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
  const initials = String(displayName).trim()?.charAt(0)?.toUpperCase() || 'F'

  useEffect(() => {
    setKpiLoading(true)
    facultyService.getDashboardKPI()
      .then(res => { if (res?.data) setKpi(res.data) })
      .catch(err => console.error('KPI load failed:', err))
      .finally(() => setKpiLoading(false))
  }, [])

  const handleLogout = async () => {
    try { await authService.logout() } finally {
      logout()
      routeNavigate('/auth/login', { replace: true })
    }
  }

  const navigate = (path) => {
    routeNavigate(path)
    window.scrollTo(0, 0)
  }

  return (
    <div className={styles.page}>

      {/* HEADER */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.title}>
            PCDP Portal{' '}
            <span className={styles.facultyBadge}>Faculty</span>
          </div>
        </div>

        <div className={styles.headerRight}>
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

      {/* HERO STATS */}
      <div className={styles.hero}>
        <StatCard
          label="Assigned Venues"
          value={kpiLoading ? '…' : String(kpi.assignedVenues ?? 0)}
          sub="Active mappings"
          dotColor="var(--gold)"
        />
        <StatCard
          label="Total Students"
          value={kpiLoading ? '…' : String(kpi.totalStudents ?? 0)}
          sub="Across all venues"
          dotColor="var(--purple)"
        />
        <StatCard
          label="Pending Transfers"
          value={kpiLoading ? '…' : String(kpi.pendingTransfers ?? 0)}
          sub={kpi.pendingTransfers > 0 ? 'Awaiting admin approval' : 'No pending requests'}
          dotColor="var(--green)"
        />
        <StatCard
          label="Pending Approvals"
          value={kpiLoading ? '…' : String(kpi.pendingApprovals ?? 0)}
          sub={kpi.pendingApprovals > 0 ? 'Action needed' : 'No action needed'}
          dotColor="var(--red)"
        />
      </div>

      {/* SECTION HEADER */}
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitle}>Faculty Dashboard</div>
        <div className={styles.sectionSub}>
          Bannari Amman Institute of Technology · PCDP System
        </div>
      </div>

      {/* GROUPS */}
      <div className={styles.groups}>

        {/* VENUE MANAGEMENT */}
        <div className={styles.group}>
          <div className={styles.groupLabel}>Venue Management</div>
          <div className={styles.boxesGrid}>
            <NavBox
              iconColor="indigo"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <path d="M3 9h18M9 21V9"/>
                </svg>
              }
              label="My Venues"
              desc="View allotted venues, manage students and mark attendance"
              chips={[
                { label: kpiLoading ? '…' : `${kpi.assignedVenues ?? 0} Assigned`, color: 'purple' },
              ]}
              onClick={() => navigate('/my-venues')}
            />
            <NavBox
              iconColor="orange"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 3l4 4-4 4"/>
                  <path d="M3 11V9a4 4 0 014-4h14"/>
                  <path d="M7 21l-4-4 4-4"/>
                  <path d="M21 13v2a4 4 0 01-4 4H3"/>
                </svg>
              }
              label="Request Transfer"
              desc="Transfer slot ownership to another faculty member"
              chips={kpi.pendingTransfers > 0 ? [{ label: `${kpi.pendingTransfers} Pending`, color: 'orange' }] : []}
              onClick={() => navigate('/request-transfer')}
            />
          </div>
        </div>

      </div>
    </div>
  )
}