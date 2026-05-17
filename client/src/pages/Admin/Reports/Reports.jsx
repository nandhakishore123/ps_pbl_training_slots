import styles from './Reports.module.css'
import Header from '../Header/Header'

const stats = [
  {
    label: 'Attendance Rate',
    val: '87%',
    color: 'var(--green)',
    sub: 'Across all slots today',
  },
  {
    label: 'Lab Records Submitted',
    val: '78%',
    color: 'var(--purple)',
    sub: 'Out of total students',
  },
  {
    label: 'AP Claims Approved',
    val: '62%',
    color: 'var(--gold)',
    sub: 'This month',
  },
  {
    label: 'Slots with Incharge',
    val: '92%',
    color: 'var(--blue)',
    sub: 'Fully covered',
  },
]

const deptCompletion = [
  { dept: 'CSE', pct: 76 },
  { dept: 'ECE', pct: 62 },
  { dept: 'MECH', pct: 48 },
  { dept: 'BIO', pct: 55 },
]

export default function Reports() {
  return (
    <div className={styles.page}>
      <Header showBack />

      <div className={styles.content}>
        <div className={styles.pageTitle}>Reports & Analytics</div>
        <div className={styles.pageSub}>
          System-wide performance, attendance and completion rates
        </div>

        {/* STATS GRID */}
        <div className={styles.grid}>

          {/* STAT CARDS */}
          {stats.map((s, i) => (
            <div key={i} className={styles.statCard}>
              <div className={styles.statLabel}>{s.label}</div>
              <div
                className={styles.statVal}
                style={{ color: s.color }}
              >
                {s.val}
              </div>
              <div className={styles.statSub}>{s.sub}</div>
            </div>
          ))}

          {/* DEPARTMENT COMPLETION */}
          <div className={`${styles.statCard} ${styles.fullWidth}`}>
            <div className={styles.deptTitle}>Department-wise Completion</div>
            {deptCompletion.map((d) => (
              <div key={d.dept} className={styles.deptRow}>
                <div className={styles.deptName}>{d.dept}</div>
                <div className={styles.progressWrap}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${d.pct}%` }}
                  />
                </div>
                <div className={styles.deptPct}>{d.pct}%</div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  )
}
