import styles from './Dashboard.module.css'
import Header from '../Header/Header'
import StatCard from '../../../components/ui/StatCard'
import NavBox from '../../../components/ui/NavBox'
import { useApp } from '../context/AppContext'
import { useData } from '../context/DataContext'

export default function Dashboard() {
  const { navigate } = useApp()
  const { dashboardKPI, loading } = useData()

  return (
    <div className={styles.page}>
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

        {/* VENUE & FACULTY ALLOCATION */}
        <div className={styles.group}>
          <div className={styles.groupLabel}>Venue & Faculty Allocation</div>
          <div className={styles.boxesGrid}>
            <NavBox
              iconColor="indigo"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              }
              label="Venue Allocation"
              desc="Manage labs, rooms & slot assignments"
              chips={[
                { label: `${loading || !dashboardKPI ? 0 : dashboardKPI.occupiedVenues + dashboardKPI.freeVenues} Total`, color: 'purple' },
                { label: `${loading || !dashboardKPI ? 0 : dashboardKPI.occupiedVenues} Occupied`, color: 'red' },
                { label: `${loading || !dashboardKPI ? 0 : dashboardKPI.freeVenues} Free`, color: 'green' },
              ]}
              onClick={() => navigate('venue-allocation')}
            />
            <NavBox
              iconColor="orange"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              }
              label="Faculty Allocation"
              desc="Assign faculty to venues & transfer slots"
              chips={[
                { label: `${loading || !dashboardKPI ? 0 : dashboardKPI.totalFaculty} Total`, color: 'purple' },
              ]}
              onClick={() => navigate('faculty-allocation')}
            />
          </div>
        </div>

        {/* STUDENTS & APPROVALS */}
        <div className={styles.group}>
          <div className={styles.groupLabel}>Students & Approvals</div>
          <div className={styles.boxesGrid}>
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
              desc="View all students, PS/PBL points, override scores"
              onClick={() => navigate('students')}
            />
            <NavBox
              iconColor="gold"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              }
              label="System Approvals"
              desc="Lab records, AP claims across all faculty"
              notifDot={true}
              badge={{ count: loading || !dashboardKPI ? 0 : dashboardKPI.pendingApprovals }}
              onClick={() => navigate('approvals')}
            />
          </div>
        </div>

        {/* REPORTS & SETTINGS */}
        <div className={styles.group}>
          <div className={styles.groupLabel}>Reports & Points Details</div>
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
              iconColor="red"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M20 12h-2M6 12H4M19.07 19.07l-1.41-1.41M4.93 19.07l1.41-1.41M12 18v2M12 4V2" />
                </svg>
              }
              label="Points Details"
              desc="Manage training skills and point allocations"
              onClick={() => navigate('settings')}
            />
          </div>
        </div>

        {/* NOTIFICATIONS */}
        <div className={styles.group}>
          <div className={styles.groupLabel}>Notifications</div>
          <div className={styles.boxesGridSingle}>
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
          </div>
        </div>

      </div>
    </div>
  )
}

