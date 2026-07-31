import styles from './Dashboard.module.css'
import Header from '../Header/Header'
import StatCard from '../../../components/ui/StatCard'
import NavBox from '../../../components/ui/NavBox'
import { useApp } from '../context/AppContext'
import { useData } from '../context/DataContext'
// ===== WELCOME INTRO (removable: delete this block + the state block + the render block) =====
import { useState, useEffect } from 'react'
import WelcomeIntro from '../../../components/WelcomeIntro'
import { useAuthStore } from '../../../store/authStore.jsx'
// ===== END WELCOME INTRO =====

export default function Dashboard() {
  const { navigate } = useApp()
  const { dashboardKPI, loading, bookingWindow } = useData()

  // ===== WELCOME INTRO (removable: delete this block + the WelcomeIntro import + the render block) =====
  const user = useAuthStore((s) => s.user)
  const [showIntro, setShowIntro] = useState(() => sessionStorage.getItem('pt_show_intro') === '1')
  const introFirstName = String(user?.name || '').trim().split(/\s+/)[0] || ''
  useEffect(() => { sessionStorage.removeItem('pt_show_intro') }, [])
  const handleIntroDone = () => { sessionStorage.removeItem('pt_show_intro'); setShowIntro(false) }
  // ===== END WELCOME INTRO =====

  const pad2 = (n) => String(n).padStart(2, '0')
  const bookingOpenLabel = bookingWindow
    ? (() => {
        const hh = bookingWindow.openHour
        const mm = pad2(bookingWindow.openMinute)
        const ampm = hh >= 12 ? 'PM' : 'AM'
        return `${hh % 12 || 12}:${mm} ${ampm}`
      })()
    : null

  return (
    <div className={styles.page}>
      {/* ===== WELCOME INTRO (removable: delete this block + the WelcomeIntro import + the state block) ===== */}
      {showIntro && <WelcomeIntro name={introFirstName} onDone={handleIntroDone} />}
      {/* ===== END WELCOME INTRO ===== */}
      <Header />

      {/* HERO STATS */}
      <div className={styles.hero}>
        <StatCard
          label="Total Students"
          value={loading || !dashboardKPI ? '...' : dashboardKPI.totalStudents}
          sub="All Departments"
          dotColor="var(--green)"
        />
        <StatCard
          label="Total Faculty"
          value={loading || !dashboardKPI ? '...' : dashboardKPI.totalFaculty}
          sub="Across all labs"
          dotColor="var(--purple)"
        />
        <StatCard
          label="Occupied Venues"
          value={loading || !dashboardKPI ? '...' : dashboardKPI.occupiedVenues}
          sub="Active Mappings"
          dotColor="var(--gold)"
        />
        <StatCard
          label="Pending Approvals"
          value={loading || !dashboardKPI ? '...' : dashboardKPI.pendingApprovals}
          sub="Needs attention"
          dotColor="var(--red)"
        />
      </div>

      {/* SECTION HEADER */}
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitle}>Admin Dashboard</div>
        <div className={styles.sectionSub}>
          Bannari Amman Institute of Technology · PCDP System
        </div>
      </div>

      {/* GROUPS */}
      <div className={styles.groups}>

        {/* SETUP & CONFIGURATION */}
        <div className={styles.group}>
          <div className={styles.groupLabel}>Setup & Configuration</div>
          <div className={styles.boxesGrid}>
            <NavBox
              iconColor="red"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M20 12h-2M6 12H4M19.07 19.07l-1.41-1.41M4.93 19.07l1.41-1.41M12 18v2M12 4V2" />
                </svg>
              }
              label="Courses, Levels & Assessments"
              desc="Manage courses/labs, levels, question bank & points"
              onClick={() => navigate('settings')}
            />
            <NavBox
              iconColor="indigo"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              }
              label="Venue Allocation"
              desc="Create venues & assign them to faculty"
              chips={[
                { label: `${loading || !dashboardKPI ? 0 : dashboardKPI.occupiedVenues + dashboardKPI.freeVenues} Total`, color: 'purple' },
                { label: `${loading || !dashboardKPI ? 0 : dashboardKPI.occupiedVenues} Occupied`, color: 'red' },
                { label: `${loading || !dashboardKPI ? 0 : dashboardKPI.freeVenues} Free`, color: 'green' },
              ]}
              onClick={() => navigate('venue-allocation')}
            />
            <NavBox
              iconColor="purple"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              }
              label="Faculty Management"
              desc="Create, edit, assign labs & revoke faculty"
              onClick={() => navigate('/faculty-management')}
            />
            <NavBox
              iconColor="green"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              }
              label="Student Management"
              desc="Create, edit & deactivate student accounts"
              onClick={() => navigate('students')}
            />
            {/* USER MANAGEMENT (non-student roles) — removable */}
            <NavBox
              iconColor="purple"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M19 8v6" />
                  <path d="M22 11h-6" />
                </svg>
              }
              label="User Management"
              desc="Add & manage faculty, admin, incharge & intern accounts"
              onClick={() => navigate('/user-management')}
            />
          </div>
        </div>

        {/* DAILY OPERATIONS */}
        <div className={styles.group}>
          <div className={styles.groupLabel}>Daily Operations</div>
          <div className={styles.boxesGrid}>
            <NavBox
              iconColor="green"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                  <circle cx="12" cy="16" r="2.5" />
                </svg>
              }
              label="Slot Scheduling"
              desc="Set the day's bookable slots, times & booking-open"
              chips={bookingOpenLabel ? [{ label: `Opens ${bookingOpenLabel}`, color: 'green' }] : []}
              onClick={() => navigate('slot-scheduling')}
            />
            <NavBox
              iconColor="purple"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                  <rect x="9" y="3" width="6" height="4" rx="1" />
                  <line x1="9" y1="12" x2="15" y2="12" />
                  <line x1="9" y1="16" x2="13" y2="16" />
                </svg>
              }
              label="All Bookings"
              desc="Every booking, attendance, results & score override · CSV"
              onClick={() => navigate('/admin-bookings')}
            />
            <NavBox
              iconColor="green"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 11l3 3L22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
              }
              label="Attendance"
              desc="Mark students present/absent for any lab"
              onClick={() => navigate('/admin-attendance')}
            />
          </div>
        </div>

        {/* APPROVALS & RESULTS */}
        <div className={styles.group}>
          <div className={styles.groupLabel}>Approvals & Results</div>
          <div className={styles.boxesGrid}>
            <NavBox
              iconColor="gold"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              }
              label="Lab Record Approvals"
              desc="Approve or reject student lab records"
              notifDot={true}
              badge={{ count: loading || !dashboardKPI ? 0 : dashboardKPI.pendingApprovals }}
              onClick={() => navigate('approvals')}
            />
            <NavBox
              iconColor="gold"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="8" r="6" />
                  <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
                </svg>
              }
              label="Activity Points"
              desc="Courses → slots → pass/fail · confirm results · export CSV"
              onClick={() => navigate('/activity-points')}
            />
            <NavBox
              iconColor="indigo"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 7l-8-4-8 4 8 4 8-4z" />
                  <path d="M4 7v10l8 4 8-4V7" />
                  <path d="M12 11v10" />
                </svg>
              }
              label="Inventory Management"
              desc="All stock, buying & return requests, approvals — full control"
              onClick={() => navigate('/admin-inventory')}
            />
          </div>
        </div>

        {/* REPORTS & POINTS */}
        <div className={styles.group}>
          <div className={styles.groupLabel}>Reports & Points</div>
          <div className={styles.boxesGrid}>
            <NavBox
              iconColor="blue"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
              }
              label="Reports & Analytics"
              desc="Attendance, scores, completion rates by dept"
              onClick={() => navigate('reports')}
            />
            <NavBox
              iconColor="gold"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="8" r="6" />
                  <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
                </svg>
              }
              label="Reward Points"
              desc="Department leaderboard, rankings & per-student details"
              onClick={() => navigate('/admin-reward-points')}
            />
          </div>
        </div>

        {/* ALERTS */}
        <div className={styles.group}>
          <div className={styles.groupLabel}>Alerts</div>
          <div className={styles.boxesGrid}>
            <NavBox
              iconColor="gold"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              }
              label="Alerts & Notifications"
              desc="Slots without incharge, stuck approvals, transfers"
              notifDot={true}
              badge={{ count: 7 }}
              onClick={() => navigate('notifications')}
            />
            <NavBox
              iconColor="purple"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 11l18-5v12L3 14v-3z" />
                  <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
                </svg>
              }
              label="Announcements"
              desc="Broadcast messages to students by dept/year"
              onClick={() => navigate('announcements')}
            />
            <NavBox
              iconColor="blue"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              }
              label="Feedback"
              desc="Student feedback & suggestions"
              onClick={() => navigate('feedback')}
            />
            <NavBox
              iconColor="purple"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 11l3 3L22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
              }
              label="Survey"
              desc="Create surveys & view responses"
              onClick={() => navigate('/survey')}
            />
          </div>
        </div>

      </div>
    </div>
  )
}

